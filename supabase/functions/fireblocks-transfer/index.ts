import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  action: 'send_btc' | 'send_usdc' | 'get_balance';
  fulfillment_id?: string;
  destination_address?: string;
  amount?: number;
  asset: 'BTC' | 'USDC_ETH';
  vault_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const fireblocksApiKey = Deno.env.get('FIREBLOCKS_API_KEY');
    const fireblocksSecretKey = Deno.env.get('FIREBLOCKS_SECRET_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify admin authorization
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
    
    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['super_admin', 'admin'])
      .single();
    
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: TransferRequest = await req.json();
    const { action, fulfillment_id, destination_address, amount, asset, vault_id } = body;

    // Check if Fireblocks is configured
    if (!fireblocksApiKey || !fireblocksSecretKey) {
      console.log('Fireblocks not configured - returning mock response');
      
      // Return mock response for development
      if (action === 'get_balance') {
        return new Response(JSON.stringify({
          success: true,
          mock: true,
          message: 'Fireblocks not configured - returning mock data',
          data: {
            asset,
            balance: asset === 'BTC' ? 10.5 : 250000,
            available: asset === 'BTC' ? 8.25 : 200000,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (action === 'send_btc' || action === 'send_usdc') {
        // Log the transfer intent
        console.log(`Mock transfer: ${amount} ${asset} to ${destination_address}`);
        
        return new Response(JSON.stringify({
          success: false,
          mock: true,
          message: 'Fireblocks not configured. Add FIREBLOCKS_API_KEY and FIREBLOCKS_SECRET_KEY secrets to enable transfers.',
          data: {
            fulfillment_id,
            destination_address,
            amount,
            asset,
            status: 'NOT_CONFIGURED'
          }
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // === FIREBLOCKS API INTEGRATION ===
    // When API keys are configured, this is where real Fireblocks calls happen
    
    if (action === 'get_balance') {
      // TODO: Implement real Fireblocks API call
      // const balance = await fireblocksClient.getVaultAccountAsset(vaultId, asset);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Fireblocks balance check - implement with real API',
        data: { asset, vault_id }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'send_btc' || action === 'send_usdc') {
      if (!destination_address || !amount || !fulfillment_id) {
        return new Response(JSON.stringify({ 
          error: 'Missing required fields: destination_address, amount, fulfillment_id' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update fulfillment order status to SENDING
      await supabase
        .from('fulfillment_orders')
        .update({ status: 'SENDING', updated_at: new Date().toISOString() })
        .eq('id', fulfillment_id);

      // TODO: Implement real Fireblocks transfer
      // const transfer = await fireblocksClient.createTransaction({
      //   assetId: asset,
      //   source: { type: 'VAULT_ACCOUNT', id: vaultId },
      //   destination: { type: 'ONE_TIME_ADDRESS', oneTimeAddress: { address: destination_address } },
      //   amount: amount.toString(),
      // });

      // Log audit event
      await supabase.from('audit_logs').insert({
        action: `FIREBLOCKS_TRANSFER_${asset}`,
        actor_type: 'admin',
        actor_id: user.id,
        event_id: `transfer-${fulfillment_id}`,
        metadata: {
          fulfillment_id,
          destination_address,
          amount,
          asset,
          status: 'PENDING_INTEGRATION'
        }
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Transfer initiated - waiting for Fireblocks integration',
        data: {
          fulfillment_id,
          destination_address,
          amount,
          asset,
          fireblocks_status: 'PENDING_INTEGRATION'
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
    console.error('Fireblocks transfer error:', error);
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