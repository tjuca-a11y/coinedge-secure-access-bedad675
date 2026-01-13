import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteRequest {
  type: 'BUY_BTC' | 'SELL_BTC' | 'REDEEM' | 'CASHOUT';
  amount: number;
  asset: 'BTC' | 'USDC';
}

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

    const body: QuoteRequest = await req.json();
    const { type, amount, asset } = body;

    if (!type || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch current BTC price (mock for now - in production, call a price oracle)
    const btcPrice = 93500; // TODO: Fetch from price oracle/API

    // Calculate quote based on type
    let inputAmount: number;
    let inputAsset: string;
    let outputAmount: number;
    let outputAsset: string;
    let fee: number;
    let feeAsset: string;
    let rate: number;

    const FEE_PERCENTAGE = 0.015; // 1.5% fee

    switch (type) {
      case 'BUY_BTC':
        // User pays USDC, receives BTC from CoinEdge
        inputAsset = 'USDC';
        outputAsset = 'BTC';
        inputAmount = asset === 'USDC' ? amount : amount * btcPrice;
        fee = inputAmount * FEE_PERCENTAGE;
        outputAmount = (inputAmount - fee) / btcPrice;
        feeAsset = 'USDC';
        rate = btcPrice;
        break;

      case 'SELL_BTC':
        // User sends BTC to CoinEdge, receives USDC
        inputAsset = 'BTC';
        outputAsset = 'USDC';
        inputAmount = asset === 'BTC' ? amount : amount / btcPrice;
        const usdValue = inputAmount * btcPrice;
        fee = usdValue * FEE_PERCENTAGE;
        outputAmount = usdValue - fee;
        feeAsset = 'USDC';
        rate = btcPrice;
        break;

      case 'CASHOUT':
        // User sends USDC to CoinEdge, receives fiat to bank
        inputAsset = 'USDC';
        outputAsset = 'USD';
        inputAmount = amount;
        fee = inputAmount * FEE_PERCENTAGE;
        outputAmount = inputAmount - fee;
        feeAsset = 'USDC';
        rate = 1; // 1:1 for USDC to USD
        break;

      case 'REDEEM':
        // Voucher redemption - CoinEdge sends BTC to user
        inputAsset = 'VOUCHER';
        outputAsset = 'BTC';
        inputAmount = amount; // USD value of voucher
        fee = 0; // No fee for redemption
        outputAmount = inputAmount / btcPrice;
        feeAsset = 'USD';
        rate = btcPrice;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid transfer type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Generate quote with 5 minute expiry
    const quoteId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store quote for validation during execution
    // In production, store in Redis/cache with TTL
    console.log('Quote generated:', { quoteId, type, inputAmount, outputAmount, expiresAt });

    return new Response(JSON.stringify({
      quoteId,
      type,
      inputAmount,
      inputAsset,
      outputAmount,
      outputAsset,
      rate,
      fee,
      feeAsset,
      expiresAt,
      coinedgeWallet: {
        btc: 'bc1q_coinedge_btc_wallet_placeholder',
        usdc: '0x_coinedge_usdc_wallet_placeholder',
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Quote error:', error);
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
