import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlockstreamTx {
  txid: string;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
  vin: Array<{
    prevout?: {
      scriptpubkey_address?: string;
      value: number;
    };
  }>;
  vout: Array<{
    scriptpubkey_address?: string;
    value: number;
  }>;
}

// Fetch recent transactions for an address from Blockstream API
async function getAddressTransactions(address: string): Promise<BlockstreamTx[]> {
  try {
    const response = await fetch(`https://blockstream.info/api/address/${address}/txs`);
    if (!response.ok) {
      console.error(`Blockstream API error: ${response.status}`);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

// Get CoinEdge BTC address from system_settings
async function getCoinEdgeBtcAddress(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'coinedge_btc_address')
    .single();
  
  return data?.setting_value || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get CoinEdge treasury BTC address
    const coinedgeBtcAddress = await getCoinEdgeBtcAddress(supabase);
    
    if (!coinedgeBtcAddress) {
      console.log('CoinEdge BTC address not configured yet');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Treasury BTC address not configured',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Monitoring transactions for: ${coinedgeBtcAddress}`);

    // Get pending SELL_BTC orders awaiting incoming BTC
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('customer_swap_orders')
      .select('id, order_id, customer_id, btc_amount, usdc_amount, source_usdc_address, created_at')
      .eq('order_type', 'SELL_BTC')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('Error fetching pending orders:', ordersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch pending orders' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingOrders?.length) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending orders to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${pendingOrders.length} pending SELL_BTC orders`);

    // Fetch recent transactions to CoinEdge address
    const transactions = await getAddressTransactions(coinedgeBtcAddress);
    console.log(`Found ${transactions.length} recent transactions`);

    let processedCount = 0;
    const results: Array<{ orderId: string; status: string; txHash?: string }> = [];

    for (const order of pendingOrders) {
      // Look for a matching transaction
      // Match by: sender address matches order's source address AND amount matches
      const matchingTx = transactions.find(tx => {
        // Check if any input comes from the user's address
        const fromUserAddress = tx.vin.some(input => 
          input.prevout?.scriptpubkey_address === order.source_usdc_address
        );
        
        // Check if any output goes to CoinEdge with expected amount (within 1% tolerance for fees)
        const toCoinEdge = tx.vout.some(output => {
          if (output.scriptpubkey_address !== coinedgeBtcAddress) return false;
          const receivedBtc = output.value / 100000000; // satoshis to BTC
          const expectedBtc = order.btc_amount;
          const tolerance = expectedBtc * 0.01; // 1% tolerance for network fees
          return Math.abs(receivedBtc - expectedBtc) <= tolerance;
        });

        return fromUserAddress && toCoinEdge;
      });

      if (matchingTx) {
        const isConfirmed = matchingTx.status.confirmed;
        const newStatus = isConfirmed ? 'COMPLETED' : 'PROCESSING';

        // Update order status
        await supabase.from('customer_swap_orders').update({
          status: newStatus,
          tx_hash: matchingTx.txid,
          completed_at: isConfirmed ? new Date().toISOString() : null,
        }).eq('id', order.id);

        // If confirmed, credit USDC to user's profile balance
        // (In production, this would trigger an actual USDC transfer)
        if (isConfirmed) {
          await supabase.from('audit_logs').insert({
            action: 'BTC_RECEIVED_CONFIRMED',
            actor_type: 'system',
            event_id: order.order_id,
            metadata: {
              tx_hash: matchingTx.txid,
              btc_amount: order.btc_amount,
              usdc_to_credit: order.usdc_amount,
              block_height: matchingTx.status.block_height,
              customer_id: order.customer_id,
            },
          });
        }

        results.push({
          orderId: order.order_id,
          status: newStatus,
          txHash: matchingTx.txid,
        });
        processedCount++;

        console.log(`Order ${order.order_id}: Updated to ${newStatus}, tx: ${matchingTx.txid}`);
      }
    }

    // Also check for BUY_BTC orders that are PROCESSING (outgoing transfers)
    const { data: outgoingOrders } = await supabase
      .from('customer_swap_orders')
      .select('id, order_id, tx_hash, destination_address, btc_amount')
      .eq('order_type', 'BUY_BTC')
      .eq('status', 'PROCESSING')
      .not('tx_hash', 'is', null);

    for (const order of outgoingOrders || []) {
      if (!order.tx_hash) continue;

      // Check transaction confirmation status
      try {
        const txResponse = await fetch(`https://blockstream.info/api/tx/${order.tx_hash}`);
        if (txResponse.ok) {
          const txData: BlockstreamTx = await txResponse.json();
          
          if (txData.status.confirmed) {
            await supabase.from('customer_swap_orders').update({
              status: 'COMPLETED',
              completed_at: new Date().toISOString(),
            }).eq('id', order.id);

            await supabase.from('audit_logs').insert({
              action: 'BTC_SENT_CONFIRMED',
              actor_type: 'system',
              event_id: order.order_id,
              metadata: {
                tx_hash: order.tx_hash,
                btc_amount: order.btc_amount,
                block_height: txData.status.block_height,
                destination: order.destination_address,
              },
            });

            results.push({
              orderId: order.order_id,
              status: 'COMPLETED',
              txHash: order.tx_hash,
            });
            processedCount++;

            console.log(`BUY Order ${order.order_id}: Confirmed on-chain`);
          }
        }
      } catch (error) {
        console.error(`Error checking tx ${order.tx_hash}:`, error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} orders`,
      processed: processedCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Monitor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
