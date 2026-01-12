import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FulfillmentOrder {
  id: string;
  order_type: string;
  customer_id: string | null;
  usd_value: number;
  destination_wallet_address: string;
  kyc_status: string;
  btc_amount: number | null;
  btc_price_used: number | null;
  status: string;
}

interface InventoryLot {
  id: string;
  amount_btc_available: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get system settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value');

    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    const btcPayoutsPaused = settingsMap.get('BTC_PAYOUTS_PAUSED') === 'true';
    const usdcPayoutsPaused = settingsMap.get('USDC_PAYOUTS_PAUSED') === 'true';

    if (btcPayoutsPaused && usdcPayoutsPaused) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All payouts are paused',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get inventory stats
    const { data: btcStats } = await supabase.rpc('get_inventory_stats');
    const { data: usdcStats } = await supabase.rpc('get_usdc_inventory_stats');

    const eligibleBtc = Number(btcStats?.[0]?.eligible_btc || 0);
    const availableUsdc = Number(usdcStats?.[0]?.available_usdc || 0);

    console.log(`Available inventory - BTC: ${eligibleBtc}, USDC: ${availableUsdc}`);

    // Process orders in SUBMITTED or WAITING_INVENTORY status
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('fulfillment_orders')
      .select('*')
      .in('status', ['SUBMITTED', 'WAITING_INVENTORY', 'KYC_PENDING'])
      .order('created_at', { ascending: true })
      .limit(50);

    if (ordersError) throw ordersError;

    let processed = 0;
    let allocated = 0;
    const results: { orderId: string; status: string; action: string }[] = [];

    for (const order of (pendingOrders || []) as FulfillmentOrder[]) {
      try {
        // Check KYC status for customer orders
        if (order.customer_id && order.kyc_status !== 'APPROVED') {
          // Query customer KYC status
          const { data: profile } = await supabase
            .from('profiles')
            .select('kyc_status')
            .eq('id', order.customer_id)
            .single();

          if (profile?.kyc_status === 'approved') {
            // Update order KYC status
            await supabase
              .from('fulfillment_orders')
              .update({ 
                kyc_status: 'APPROVED',
                status: 'WAITING_INVENTORY',
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id);
            
            results.push({ orderId: order.id, status: 'WAITING_INVENTORY', action: 'kyc_approved' });
            processed++;
          } else if (order.status !== 'KYC_PENDING') {
            // Move to KYC_PENDING
            await supabase
              .from('fulfillment_orders')
              .update({ 
                status: 'KYC_PENDING',
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id);
            
            results.push({ orderId: order.id, status: 'KYC_PENDING', action: 'awaiting_kyc' });
            processed++;
          }
          continue;
        }

        // Skip if payouts paused
        if (btcPayoutsPaused && order.order_type === 'BITCARD_REDEMPTION') continue;
        if (btcPayoutsPaused && order.order_type === 'BUY_ORDER') continue;

        // Calculate BTC amount if not set
        let btcAmount = order.btc_amount;
        let btcPrice = order.btc_price_used;

        if (!btcAmount && order.usd_value > 0) {
          // Get current BTC price (mock for now - would use external API)
          btcPrice = 93500; // TODO: Fetch real price
          btcAmount = order.usd_value / btcPrice;
        }

        if (!btcAmount) continue;

        // Check if we have enough inventory
        if (btcAmount > eligibleBtc) {
          if (order.status !== 'WAITING_INVENTORY') {
            await supabase
              .from('fulfillment_orders')
              .update({ 
                status: 'WAITING_INVENTORY',
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id);
            
            results.push({ orderId: order.id, status: 'WAITING_INVENTORY', action: 'insufficient_inventory' });
            processed++;
          }
          continue;
        }

        // Allocate inventory using FIFO
        const allocationSuccess = await supabase.rpc('allocate_btc_fifo', {
          p_btc_amount: btcAmount,
          p_fulfillment_id: order.id
        });

        if (allocationSuccess.data) {
          // Update order to READY_TO_SEND
          await supabase
            .from('fulfillment_orders')
            .update({
              status: 'READY_TO_SEND',
              btc_amount: btcAmount,
              btc_price_used: btcPrice,
              kyc_status: 'APPROVED',
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          results.push({ orderId: order.id, status: 'READY_TO_SEND', action: 'inventory_allocated' });
          allocated++;
          processed++;
        } else {
          console.log(`Failed to allocate for order ${order.id}`);
        }

      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
        results.push({ orderId: order.id, status: 'ERROR', action: String(orderError) });
      }
    }

    // Process customer swap orders (BUY_BTC orders)
    const { data: swapOrders, error: swapError } = await supabase
      .from('customer_swap_orders')
      .select('*')
      .eq('status', 'PENDING')
      .eq('order_type', 'BUY_BTC')
      .is('inventory_allocated', false)
      .order('created_at', { ascending: true })
      .limit(20);

    if (!swapError && swapOrders) {
      for (const swap of swapOrders) {
        if (swap.btc_amount <= eligibleBtc) {
          // Create fulfillment order for this swap
          const { data: profile } = await supabase
            .from('profiles')
            .select('btc_address, kyc_status')
            .eq('user_id', swap.customer_id)
            .single();

          if (profile?.btc_address) {
            const kycApproved = profile.kyc_status === 'approved';

            const { data: fulfillment } = await supabase
              .from('fulfillment_orders')
              .insert({
                order_type: 'BUY_ORDER',
                customer_id: swap.customer_id,
                usd_value: swap.usdc_amount,
                destination_wallet_address: profile.btc_address,
                btc_amount: swap.btc_amount,
                btc_price_used: swap.btc_price_at_order,
                kyc_status: kycApproved ? 'APPROVED' : 'PENDING',
                status: kycApproved ? 'WAITING_INVENTORY' : 'KYC_PENDING',
              })
              .select()
              .single();

            if (fulfillment) {
              // Mark swap as processing
              await supabase
                .from('customer_swap_orders')
                .update({ 
                  status: 'PROCESSING',
                  inventory_allocated: true,
                  updated_at: new Date().toISOString()
                })
                .eq('id', swap.id);

              results.push({ orderId: swap.id, status: 'PROCESSING', action: 'fulfillment_created' });
              processed++;
            }
          }
        }
      }
    }

    console.log(`Processed ${processed} orders, allocated ${allocated}`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      allocated,
      results,
      inventory: {
        btc: eligibleBtc,
        usdc: availableUsdc
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Fulfillment queue processing error:', error);
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
