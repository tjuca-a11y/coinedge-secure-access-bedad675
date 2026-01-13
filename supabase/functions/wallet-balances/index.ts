import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Verify user JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claims.claims.sub;

    // Get user profile to get wallet addresses
    const { data: profile } = await supabase
      .from('profiles')
      .select('btc_address, usdc_address')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ 
        btc: 0, 
        usdc: 0,
        message: 'No profile found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // In production, this would query on-chain balances via:
    // - Bitcoin: Blockstream API, Mempool.space, or similar
    // - USDC (ETH): Alchemy, Infura, or direct RPC call
    
    // For now, return placeholder/demo values
    // The frontend could also query these directly from the user's Dynamic wallet
    
    let btcBalance = 0;
    let usdcBalance = 0;

    if (profile.btc_address) {
      // TODO: Query Bitcoin balance
      // const btcResponse = await fetch(`https://blockstream.info/api/address/${profile.btc_address}`);
      // btcBalance = (await btcResponse.json()).chain_stats.funded_txo_sum / 100000000;
      btcBalance = 0; // Demo value
    }

    if (profile.usdc_address) {
      // TODO: Query USDC balance on Ethereum
      // Use ethers.js or viem to call balanceOf on USDC contract
      usdcBalance = 0; // Demo value
    }

    return new Response(JSON.stringify({
      btc: btcBalance,
      usdc: usdcBalance,
      btcAddress: profile.btc_address,
      usdcAddress: profile.usdc_address,
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Balance fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: errorMessage,
      btc: 0,
      usdc: 0,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
