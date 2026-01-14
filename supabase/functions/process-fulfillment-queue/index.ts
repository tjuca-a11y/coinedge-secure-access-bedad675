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

interface SwapOrder {
  id: string;
  order_id: string;
  customer_id: string;
  btc_amount: number;
  usdc_amount: number;
  btc_price_at_order: number;
  destination_address: string | null;
  status: string;
  order_type: string;
  inventory_allocated: boolean;
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

    if (btcPayoutsPaused) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'BTC payouts are paused',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get inventory stats - this already filters by eligible_at <= now()
    const { data: btcStats } = await supabase.rpc('get_inventory_stats');
    const eligibleBtc = Number(btcStats?.[0]?.eligible_btc || 0);

    console.log(`Available eligible BTC inventory (held >1hr): ${eligibleBtc}`);

    if (eligibleBtc <= 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No eligible inventory available (must be held for at least 1 hour)',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;
    let completed = 0;
    const results: { orderId: string; status: string; action: string }[] = [];

    // ==============================================
    // STEP 1: Process pending customer swap orders
    // Auto-fill orders when eligible inventory exists
    // ==============================================
    const { data: pendingSwaps, error: swapError } = await supabase
      .from('customer_swap_orders')
      .select('*')
      .eq('status', 'PENDING')
      .eq('order_type', 'BUY_BTC')
      .order('created_at', { ascending: true })
      .limit(50);

    if (swapError) {
      console.error('Error fetching swap orders:', swapError);
    }

    let remainingInventory = eligibleBtc;

    for (const swap of (pendingSwaps || []) as SwapOrder[]) {
      try {
        // Skip if no BTC amount or already allocated
        if (!swap.btc_amount || swap.btc_amount <= 0) {
          console.log(`Skipping swap ${swap.order_id}: no BTC amount`);
          continue;
        }

        // Check if we have enough inventory
        if (swap.btc_amount > remainingInventory) {
          console.log(`Skipping swap ${swap.order_id}: insufficient inventory (need ${swap.btc_amount}, have ${remainingInventory})`);
          continue;
        }

        // Get customer profile for BTC address and KYC status
        const { data: profile } = await supabase
          .from('profiles')
          .select('btc_address, kyc_status, id')
          .eq('user_id', swap.customer_id)
          .single();

        if (!profile) {
          console.log(`Skipping swap ${swap.order_id}: no profile found for customer`);
          continue;
        }

        // Check KYC status - must be approved for auto-fill
        if (profile.kyc_status !== 'approved') {
          console.log(`Skipping swap ${swap.order_id}: KYC not approved (${profile.kyc_status})`);
          continue;
        }

        const destinationAddress = swap.destination_address || profile.btc_address;
        if (!destinationAddress) {
          console.log(`Skipping swap ${swap.order_id}: no destination address`);
          continue;
        }

        // Create fulfillment order
        const { data: fulfillment, error: fulfillmentError } = await supabase
          .from('fulfillment_orders')
          .insert({
            order_type: 'BUY_ORDER',
            customer_id: profile.id,
            usd_value: swap.usdc_amount,
            destination_wallet_address: destinationAddress,
            btc_amount: swap.btc_amount,
            btc_price_used: swap.btc_price_at_order,
            kyc_status: 'APPROVED',
            status: 'READY_TO_SEND',
          })
          .select()
          .single();

        if (fulfillmentError || !fulfillment) {
          console.error(`Failed to create fulfillment for ${swap.order_id}:`, fulfillmentError);
          continue;
        }

        // Allocate inventory using FIFO (only uses lots where eligible_at <= now())
        const { data: allocationSuccess, error: allocError } = await supabase.rpc('allocate_btc_fifo', {
          p_btc_amount: swap.btc_amount,
          p_fulfillment_id: fulfillment.id
        });

        if (allocError || !allocationSuccess) {
          console.error(`Failed to allocate inventory for ${swap.order_id}:`, allocError);
          // Rollback fulfillment order
          await supabase.from('fulfillment_orders').delete().eq('id', fulfillment.id);
          continue;
        }

        // Party-to-party system: Auto-complete the transfer
        // In a real system, this would trigger an actual blockchain transaction
        // For party-to-party, we mark as complete since both parties are within the system
        const mockTxHash = `p2p_${Date.now()}_${swap.order_id}`;

        // Update fulfillment to SENT
        await supabase
          .from('fulfillment_orders')
          .update({
            status: 'SENT',
            tx_hash: mockTxHash,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', fulfillment.id);

        // Complete the swap order
        await supabase
          .from('customer_swap_orders')
          .update({
            status: 'COMPLETED',
            inventory_allocated: true,
            tx_hash: mockTxHash,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', swap.id);

        // Deduct from remaining inventory tracking
        remainingInventory -= swap.btc_amount;

        results.push({ 
          orderId: swap.order_id, 
          status: 'COMPLETED', 
          action: `auto_filled_${swap.btc_amount.toFixed(8)}_btc` 
        });
        processed++;
        completed++;

        console.log(`✅ Auto-filled swap ${swap.order_id}: ${swap.btc_amount} BTC -> ${destinationAddress}`);

      } catch (orderError) {
        console.error(`Error processing swap ${swap.order_id}:`, orderError);
        results.push({ orderId: swap.order_id, status: 'ERROR', action: String(orderError) });
      }
    }

    // ==============================================
    // STEP 2: Process existing fulfillment orders
    // (e.g., bitcard redemptions in READY_TO_SEND)
    // ==============================================
    const { data: readyOrders, error: ordersError } = await supabase
      .from('fulfillment_orders')
      .select('*')
      .eq('status', 'READY_TO_SEND')
      .order('created_at', { ascending: true })
      .limit(50);

    if (!ordersError && readyOrders) {
      for (const order of readyOrders as FulfillmentOrder[]) {
        try {
          // Party-to-party: Auto-complete
          const mockTxHash = `p2p_${Date.now()}_${order.id}`;

          await supabase
            .from('fulfillment_orders')
            .update({
              status: 'SENT',
              tx_hash: mockTxHash,
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          results.push({ 
            orderId: order.id, 
            status: 'SENT', 
            action: 'auto_sent' 
          });
          processed++;
          completed++;

          console.log(`✅ Auto-sent fulfillment ${order.id}`);

        } catch (orderError) {
          console.error(`Error processing fulfillment ${order.id}:`, orderError);
        }
      }
    }

    console.log(`Processed ${processed} orders, completed ${completed}`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      completed,
      results,
      inventory: {
        eligible_btc: eligibleBtc,
        remaining_after_processing: remainingInventory
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
