import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REQUIRED_CONFIRMATIONS = 3; // BTC confirmations required

interface AlchemyTransfer {
  hash: string;
  from: string;
  to: string;
  value: number;
  asset: string;
  blockNum: string;
  category: string;
  metadata?: {
    blockTimestamp?: string;
  };
}

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

// Get BTC transactions using Alchemy (primary) with Blockstream fallback
async function getBtcTransactionsAlchemy(
  address: string, 
  alchemyApiKey: string
): Promise<{ transfers: AlchemyTransfer[]; currentBlock: number }> {
  // Note: Alchemy BTC API is different from EVM - use their dedicated BTC endpoint
  // For now, we'll use Blockstream as primary (more reliable for BTC) with enhanced logic
  return { transfers: [], currentBlock: 0 };
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

// Get current block height from Blockstream
async function getCurrentBlockHeight(): Promise<number> {
  try {
    const response = await fetch('https://blockstream.info/api/blocks/tip/height');
    if (!response.ok) return 0;
    return parseInt(await response.text(), 10);
  } catch (error) {
    console.error('Error fetching block height:', error);
    return 0;
  }
}

// Get transaction confirmation count
async function getTransactionConfirmations(txHash: string): Promise<{ confirmed: boolean; confirmations: number; blockHeight?: number }> {
  try {
    const [txResponse, currentHeight] = await Promise.all([
      fetch(`https://blockstream.info/api/tx/${txHash}`),
      getCurrentBlockHeight()
    ]);
    
    if (!txResponse.ok) {
      return { confirmed: false, confirmations: 0 };
    }
    
    const txData: BlockstreamTx = await txResponse.json();
    
    if (!txData.status.confirmed || !txData.status.block_height) {
      return { confirmed: false, confirmations: 0 };
    }
    
    const confirmations = currentHeight - txData.status.block_height + 1;
    return { 
      confirmed: confirmations >= REQUIRED_CONFIRMATIONS, 
      confirmations,
      blockHeight: txData.status.block_height
    };
  } catch (error) {
    console.error(`Error checking tx ${txHash}:`, error);
    return { confirmed: false, confirmations: 0 };
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

// Check if tx_hash already used (anti-replay)
async function isTxHashUsed(supabase: any, txHash: string): Promise<boolean> {
  const { data } = await supabase
    .from('customer_swap_orders')
    .select('id')
    .eq('tx_hash', txHash)
    .maybeSingle();
  
  return !!data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const alchemyApiKey = Deno.env.get('ALCHEMY_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log that we have Alchemy configured (for future use)
    if (alchemyApiKey) {
      console.log('Alchemy API key configured for enhanced monitoring');
    }

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
      .select('id, order_id, customer_id, btc_amount, usdc_amount, source_usdc_address, tx_hash, status, created_at')
      .eq('order_type', 'SELL_BTC')
      .in('status', ['PENDING', 'PROCESSING'])
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('Error fetching pending orders:', ordersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch pending orders' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pendingOrders?.length) {
      console.log('No pending SELL_BTC orders to process');
    }

    console.log(`Found ${pendingOrders?.length || 0} pending/processing SELL_BTC orders`);

    // Fetch recent transactions to CoinEdge address
    const transactions = await getAddressTransactions(coinedgeBtcAddress);
    console.log(`Found ${transactions.length} recent transactions to treasury`);

    let processedCount = 0;
    let completedCount = 0;
    const results: Array<{ orderId: string; status: string; txHash?: string; confirmations?: number }> = [];

    // Process SELL_BTC orders
    for (const order of pendingOrders || []) {
      // If order already has tx_hash, check for confirmations
      if (order.tx_hash && order.status === 'PROCESSING') {
        const { confirmed, confirmations, blockHeight } = await getTransactionConfirmations(order.tx_hash);
        
        console.log(`Order ${order.order_id} tx ${order.tx_hash}: ${confirmations} confirmations`);
        
        if (confirmed) {
          // Update to COMPLETED
          const { error: updateError } = await supabase
            .from('customer_swap_orders')
            .update({
              status: 'COMPLETED',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (!updateError) {
            completedCount++;
            
            // Log audit event
            await supabase.from('audit_logs').insert({
              action: 'SELL_BTC_ORDER_COMPLETED',
              actor_type: 'system',
              event_id: order.order_id,
              metadata: {
                tx_hash: order.tx_hash,
                btc_amount: order.btc_amount,
                usdc_amount: order.usdc_amount,
                confirmations,
                block_height: blockHeight,
              },
            });

            // Create admin notification for USDC payout
            await supabase.from('admin_notifications').insert({
              type: 'SELL_BTC_READY_FOR_PAYOUT',
              title: 'SELL_BTC Order Ready for USDC Payout',
              message: `Order ${order.order_id} confirmed with ${confirmations} confirmations. Send ${order.usdc_amount} USDC to customer.`,
              severity: 'info',
              metadata: {
                order_id: order.order_id,
                customer_id: order.customer_id,
                btc_amount: order.btc_amount,
                usdc_amount: order.usdc_amount,
                tx_hash: order.tx_hash,
              },
            });

            results.push({
              orderId: order.order_id,
              status: 'COMPLETED',
              txHash: order.tx_hash,
              confirmations,
            });

            console.log(`Order ${order.order_id}: Completed with ${confirmations} confirmations`);
          }
        } else {
          results.push({
            orderId: order.order_id,
            status: 'PROCESSING',
            txHash: order.tx_hash,
            confirmations,
          });
        }
        continue;
      }

      // For PENDING orders without tx_hash, look for matching transaction
      if (order.status === 'PENDING' && !order.tx_hash) {
        const expectedSatoshis = Math.round(order.btc_amount * 100000000);
        const tolerance = expectedSatoshis * 0.01; // 1% tolerance for network fees

        for (const tx of transactions) {
          // Check if this tx goes to CoinEdge with expected amount
          const matchingOutput = tx.vout.find(output => {
            if (output.scriptpubkey_address !== coinedgeBtcAddress) return false;
            const receivedSatoshis = output.value;
            return Math.abs(receivedSatoshis - expectedSatoshis) <= tolerance;
          });

          if (!matchingOutput) continue;

          // Anti-replay: Check if tx already used
          if (await isTxHashUsed(supabase, tx.txid)) {
            console.log(`Transaction ${tx.txid} already used for another order`);
            continue;
          }

          // Get sender address from first input
          const senderAddress = tx.vin[0]?.prevout?.scriptpubkey_address;
          
          // Get confirmation status
          const { confirmed, confirmations, blockHeight } = await getTransactionConfirmations(tx.txid);
          const newStatus = confirmed ? 'COMPLETED' : 'PROCESSING';

          console.log(`Found matching tx ${tx.txid} for order ${order.order_id}: ${confirmations} confirmations`);

          // Update order
          const { error: updateError } = await supabase
            .from('customer_swap_orders')
            .update({
              status: newStatus,
              tx_hash: tx.txid,
              completed_at: confirmed ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (!updateError) {
            processedCount++;
            if (confirmed) completedCount++;

            // Log audit event
            await supabase.from('audit_logs').insert({
              action: confirmed ? 'SELL_BTC_ORDER_COMPLETED' : 'SELL_BTC_PAYMENT_DETECTED',
              actor_type: 'system',
              event_id: order.order_id,
              metadata: {
                tx_hash: tx.txid,
                btc_amount: order.btc_amount,
                usdc_amount: order.usdc_amount,
                from_address: senderAddress,
                confirmations,
                block_height: blockHeight,
              },
            });

            // If completed, notify admin for USDC payout
            if (confirmed) {
              await supabase.from('admin_notifications').insert({
                type: 'SELL_BTC_READY_FOR_PAYOUT',
                title: 'SELL_BTC Order Ready for USDC Payout',
                message: `Order ${order.order_id} confirmed. Send ${order.usdc_amount} USDC to customer.`,
                severity: 'info',
                metadata: {
                  order_id: order.order_id,
                  customer_id: order.customer_id,
                  btc_amount: order.btc_amount,
                  usdc_amount: order.usdc_amount,
                  tx_hash: tx.txid,
                },
              });
            }

            results.push({
              orderId: order.order_id,
              status: newStatus,
              txHash: tx.txid,
              confirmations,
            });

            console.log(`Order ${order.order_id}: Updated to ${newStatus}`);
          }

          break; // Move to next order
        }
      }
    }

    // Also check for BUY_BTC orders that are PROCESSING (outgoing transfers)
    const { data: outgoingOrders } = await supabase
      .from('customer_swap_orders')
      .select('id, order_id, tx_hash, destination_address, btc_amount, customer_id')
      .eq('order_type', 'BUY_BTC')
      .eq('status', 'PROCESSING')
      .not('tx_hash', 'is', null);

    for (const order of outgoingOrders || []) {
      if (!order.tx_hash) continue;

      const { confirmed, confirmations, blockHeight } = await getTransactionConfirmations(order.tx_hash);
      
      console.log(`BUY Order ${order.order_id} tx ${order.tx_hash}: ${confirmations} confirmations`);

      if (confirmed) {
        const { error: updateError } = await supabase
          .from('customer_swap_orders')
          .update({
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (!updateError) {
          completedCount++;

          await supabase.from('audit_logs').insert({
            action: 'BUY_BTC_ORDER_COMPLETED',
            actor_type: 'system',
            event_id: order.order_id,
            metadata: {
              tx_hash: order.tx_hash,
              btc_amount: order.btc_amount,
              destination: order.destination_address,
              confirmations,
              block_height: blockHeight,
            },
          });

          results.push({
            orderId: order.order_id,
            status: 'COMPLETED',
            txHash: order.tx_hash,
            confirmations,
          });

          console.log(`BUY Order ${order.order_id}: Completed with ${confirmations} confirmations`);
        }
      }
    }

    console.log(`Monitoring complete: ${processedCount} processed, ${completedCount} completed`);

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} orders, completed ${completedCount}`,
      processed: processedCount,
      completed: completedCount,
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
