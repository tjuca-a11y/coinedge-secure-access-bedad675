import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  action: 'initiate_cashout' | 'check_status';
  bank_account_id?: string;
  amount_usd?: number;
  source_asset?: 'BTC' | 'USDC';
  cashout_order_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
    const plaidSecret = Deno.env.get('PLAID_SECRET');
    const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: TransferRequest = await req.json();
    const { action, bank_account_id, amount_usd, source_asset, cashout_order_id } = body;

    // Get system settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value');
    
    const getSetting = (key: string) => settings?.find(s => s.setting_key === key)?.setting_value;
    const dailyLimit = Number(getSetting('ACH_DAILY_LIMIT_USD') || 10000);
    const estimatedDays = Number(getSetting('ACH_ESTIMATED_DAYS') || 3);

    // Check if Plaid is configured
    if (!plaidClientId || !plaidSecret) {
      console.log('Plaid not configured for transfers');
      
      if (action === 'initiate_cashout') {
        return new Response(JSON.stringify({
          success: false,
          mock: true,
          message: 'Plaid not configured. Add PLAID_CLIENT_ID and PLAID_SECRET secrets to enable ACH transfers.'
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const plaidBaseUrl = plaidEnv === 'production' 
      ? 'https://production.plaid.com'
      : plaidEnv === 'development'
        ? 'https://development.plaid.com'
        : 'https://sandbox.plaid.com';

    if (action === 'initiate_cashout') {
      if (!bank_account_id || !amount_usd || !source_asset) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: bank_account_id, amount_usd, source_asset' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check daily limit
      const today = new Date().toISOString().split('T')[0];
      const { data: todayOrders } = await supabase
        .from('cashout_orders')
        .select('usd_amount')
        .eq('user_id', user.id)
        .gte('created_at', today)
        .not('status', 'in', '("FAILED","CANCELLED")');

      const todayTotal = todayOrders?.reduce((sum, o) => sum + Number(o.usd_amount), 0) || 0;
      
      if (todayTotal + amount_usd > dailyLimit) {
        return new Response(JSON.stringify({
          success: false,
          error: `Daily limit exceeded. You can transfer up to $${(dailyLimit - todayTotal).toFixed(2)} more today.`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get bank account
      const { data: bankAccount } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('id', bank_account_id)
        .eq('user_id', user.id)
        .single();

      if (!bankAccount) {
        return new Response(JSON.stringify({ error: 'Bank account not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!bankAccount.is_verified) {
        return new Response(JSON.stringify({ error: 'Bank account not verified' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Calculate fee (0.5% with $1 minimum)
      const feeUsd = Math.max(1, amount_usd * 0.005);
      const netAmount = amount_usd - feeUsd;

      // Calculate estimated arrival (skip weekends)
      let arrivalDate = new Date();
      let daysAdded = 0;
      while (daysAdded < estimatedDays) {
        arrivalDate.setDate(arrivalDate.getDate() + 1);
        const day = arrivalDate.getDay();
        if (day !== 0 && day !== 6) daysAdded++;
      }

      // Create cashout order
      const { data: order, error: orderError } = await supabase
        .from('cashout_orders')
        .insert({
          user_id: user.id,
          bank_account_id,
          source_asset,
          source_amount: source_asset === 'USDC' ? amount_usd : null,
          usd_amount: amount_usd,
          fee_usd: feeUsd,
          status: 'PENDING',
          estimated_arrival: arrivalDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating cashout order:', orderError);
        return new Response(JSON.stringify({ error: 'Failed to create order' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If Plaid is configured, initiate the transfer
      if (plaidClientId && plaidSecret && bankAccount.plaid_access_token) {
        try {
          // Create transfer authorization
          const authResponse = await fetch(`${plaidBaseUrl}/transfer/authorization/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: plaidClientId,
              secret: plaidSecret,
              access_token: bankAccount.plaid_access_token,
              account_id: bankAccount.plaid_account_id,
              type: 'credit',
              network: 'ach',
              amount: netAmount.toFixed(2),
              ach_class: 'ppd',
              user: {
                legal_name: user.email, // Should be actual name from profile
              },
            }),
          });

          const authData = await authResponse.json();
          
          if (authData.authorization?.id) {
            // Create the transfer
            const transferResponse = await fetch(`${plaidBaseUrl}/transfer/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                client_id: plaidClientId,
                secret: plaidSecret,
                access_token: bankAccount.plaid_access_token,
                account_id: bankAccount.plaid_account_id,
                authorization_id: authData.authorization.id,
                description: 'CoinEdge Cash Out',
              }),
            });

            const transferData = await transferResponse.json();
            
            if (transferData.transfer?.id) {
              // Update order with Plaid transfer ID
              await supabase
                .from('cashout_orders')
                .update({ 
                  plaid_transfer_id: transferData.transfer.id,
                  status: 'ACH_INITIATED'
                })
                .eq('id', order.id);

              return new Response(JSON.stringify({
                success: true,
                order_id: order.order_id,
                net_amount: netAmount,
                fee: feeUsd,
                estimated_arrival: arrivalDate.toISOString().split('T')[0],
                status: 'ACH_INITIATED'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }

          // Authorization or transfer failed
          await supabase
            .from('cashout_orders')
            .update({ 
              status: 'FAILED',
              failed_reason: authData.authorization?.decision_rationale?.description || 'Transfer authorization failed'
            })
            .eq('id', order.id);

        } catch (plaidError) {
          console.error('Plaid transfer error:', plaidError);
          await supabase
            .from('cashout_orders')
            .update({ 
              status: 'FAILED',
              failed_reason: 'Plaid API error'
            })
            .eq('id', order.id);
        }
      }

      // Return order info (will be manually processed if Plaid not configured)
      return new Response(JSON.stringify({
        success: true,
        order_id: order.order_id,
        net_amount: netAmount,
        fee: feeUsd,
        estimated_arrival: arrivalDate.toISOString().split('T')[0],
        status: order.status,
        message: plaidClientId ? undefined : 'Order created. Manual ACH transfer required (Plaid not configured).'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check_status') {
      if (!cashout_order_id) {
        return new Response(JSON.stringify({ error: 'Missing cashout_order_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: order } = await supabase
        .from('cashout_orders')
        .select('*')
        .eq('order_id', cashout_order_id)
        .eq('user_id', user.id)
        .single();

      if (!order) {
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If Plaid configured and transfer exists, check status
      if (plaidClientId && plaidSecret && order.plaid_transfer_id) {
        const { data: bankAccount } = await supabase
          .from('user_bank_accounts')
          .select('plaid_access_token')
          .eq('id', order.bank_account_id)
          .single();

        if (bankAccount?.plaid_access_token) {
          const statusResponse = await fetch(`${plaidBaseUrl}/transfer/get`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: plaidClientId,
              secret: plaidSecret,
              transfer_id: order.plaid_transfer_id,
            }),
          });

          const statusData = await statusResponse.json();
          
          if (statusData.transfer) {
            const plaidStatus = statusData.transfer.status;
            let newStatus = order.status;
            
            if (plaidStatus === 'settled') newStatus = 'COMPLETED';
            else if (plaidStatus === 'failed' || plaidStatus === 'returned') newStatus = 'FAILED';
            
            if (newStatus !== order.status) {
              await supabase
                .from('cashout_orders')
                .update({ 
                  status: newStatus,
                  completed_at: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
                  failed_reason: plaidStatus === 'failed' ? statusData.transfer.failure_reason : null
                })
                .eq('id', order.id);
              
              order.status = newStatus;
            }
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        order: {
          order_id: order.order_id,
          status: order.status,
          source_asset: order.source_asset,
          usd_amount: order.usd_amount,
          fee_usd: order.fee_usd,
          estimated_arrival: order.estimated_arrival,
          completed_at: order.completed_at,
          failed_reason: order.failed_reason
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Plaid transfer error:', error);
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