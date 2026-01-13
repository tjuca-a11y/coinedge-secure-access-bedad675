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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claims.claims.sub;

    // Check KYC status
    const { data: profile } = await supabase
      .from('profiles')
      .select('kyc_status')
      .eq('user_id', userId)
      .single();

    if (!profile || profile.kyc_status !== 'approved') {
      return new Response(JSON.stringify({ error: 'KYC approval required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid voucher code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean up the code
    const cleanCode = code.trim().toUpperCase();

    // Look up the bitcard
    const { data: bitcard, error: bitcardError } = await supabase
      .from('bitcards')
      .select('*')
      .eq('bitcard_id', cleanCode)
      .single();

    if (bitcardError || !bitcard) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'Voucher not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check bitcard status
    if (bitcard.status !== 'active') {
      let errorMessage = 'Voucher is not valid';
      
      switch (bitcard.status) {
        case 'issued':
          errorMessage = 'Voucher has not been activated yet';
          break;
        case 'redeemed':
          errorMessage = 'Voucher has already been redeemed';
          break;
        case 'expired':
          errorMessage = 'Voucher has expired';
          break;
        case 'canceled':
          errorMessage = 'Voucher has been canceled';
          break;
      }

      return new Response(JSON.stringify({ 
        valid: false, 
        error: errorMessage,
        status: bitcard.status,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Voucher is valid and active
    return new Response(JSON.stringify({
      valid: true,
      amount: bitcard.usd_value || 0,
      asset: 'BTC', // Bitcards are always redeemed as BTC
      bitcardId: bitcard.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Voucher validation error:', error);
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
