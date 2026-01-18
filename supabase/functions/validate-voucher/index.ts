import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Decode JWT payload without verification (for Dynamic tokens we trust the source)
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
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
    let userId: string | null = null;

    // Try Supabase auth first
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (!userError && user) {
      userId = user.id;
    } else {
      // Try Dynamic JWT - decode and look up user by Dynamic ID
      const payload = decodeJwtPayload(token);
      
      if (payload && payload.sub && typeof payload.iss === 'string' && payload.iss.includes('dynamicauth.com')) {
        const dynamicUserId = payload.sub as string;
        
        // Look up profile by Dynamic user_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, kyc_status')
          .eq('user_id', dynamicUserId)
          .single();
        
        if (profile) {
          userId = profile.user_id;
        }
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Get the activation event to check for stored redemption fee rate
    const { data: activationEvent } = await supabase
      .from('bitcard_activation_events')
      .select('redemption_fee_rate')
      .eq('bitcard_id', bitcard.id)
      .single();

    const redemptionFeeRate = activationEvent?.redemption_fee_rate ?? 0.0875; // Default 8.75%
    const grossAmount = bitcard.usd_value || 0;
    const redemptionFee = grossAmount * redemptionFeeRate;
    const netAmount = grossAmount - redemptionFee;

    // Voucher is valid and active
    return new Response(JSON.stringify({
      valid: true,
      amount: grossAmount,
      netAmount: netAmount,
      redemptionFee: redemptionFee,
      redemptionFeeRate: redemptionFeeRate,
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
