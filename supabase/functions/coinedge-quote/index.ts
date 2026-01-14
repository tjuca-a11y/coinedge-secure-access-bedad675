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

// ============ Rate Limiting ============
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

  // Cleanup old entries if store gets too large
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now >= v.resetAt) rateLimitStore.delete(k);
    }
  }

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetAt: entry.resetAt };
}

function getClientId(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';
}

// ============ Price Oracle (Real-time) ============
interface PriceCache {
  btcUsd: number;
  updatedAt: number;
}

let priceCache: PriceCache | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds

const PRICE_SOURCES = [
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    parser: (data: any) => data?.bitcoin?.usd,
  },
  {
    name: 'Coinbase',
    url: 'https://api.coinbase.com/v2/prices/BTC-USD/spot',
    parser: (data: any) => parseFloat(data?.data?.amount),
  },
];

async function fetchBtcPrice(): Promise<number> {
  const now = Date.now();

  // Return cached price if still valid
  if (priceCache && now - priceCache.updatedAt < CACHE_TTL_MS) {
    console.log('Using cached BTC price:', priceCache.btcUsd);
    return priceCache.btcUsd;
  }

  // Try each price source
  for (const source of PRICE_SOURCES) {
    try {
      const response = await fetch(source.url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const price = source.parser(data);

      if (typeof price === 'number' && !isNaN(price) && price > 1000 && price < 1000000) {
        priceCache = { btcUsd: price, updatedAt: now };
        console.log(`Fresh BTC price from ${source.name}: $${price.toLocaleString()}`);
        return price;
      }
    } catch (error) {
      console.error(`Failed to fetch from ${source.name}:`, error);
    }
  }

  // Fallback to stale cache
  if (priceCache) {
    console.warn('Using stale cache - all sources failed');
    return priceCache.btcUsd;
  }

  throw new Error('All price sources failed and no cache available');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientId = getClientId(req);
    const rateLimitResult = checkRateLimit(clientId);
    
    const rateLimitHeaders = {
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetAt / 1000).toString(),
    };

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: QuoteRequest = await req.json();
    const { type, amount, asset } = body;

    if (!type || !amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch real-time BTC price from oracle
    const btcPrice = await fetchBtcPrice();

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
        inputAsset = 'USDC';
        outputAsset = 'BTC';
        inputAmount = asset === 'USDC' ? amount : amount * btcPrice;
        fee = inputAmount * FEE_PERCENTAGE;
        outputAmount = (inputAmount - fee) / btcPrice;
        feeAsset = 'USDC';
        rate = btcPrice;
        break;

      case 'SELL_BTC':
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
        inputAsset = 'USDC';
        outputAsset = 'USD';
        inputAmount = amount;
        fee = inputAmount * FEE_PERCENTAGE;
        outputAmount = inputAmount - fee;
        feeAsset = 'USDC';
        rate = 1;
        break;

      case 'REDEEM':
        inputAsset = 'VOUCHER';
        outputAsset = 'BTC';
        inputAmount = amount;
        fee = 0;
        outputAmount = inputAmount / btcPrice;
        feeAsset = 'USD';
        rate = btcPrice;
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid transfer type' }), {
          status: 400,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Generate quote with 5 minute expiry
    const quoteId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Log quote for audit
    const supabaseService = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await supabaseService.from('audit_logs').insert({
      action: 'QUOTE_GENERATED',
      actor_type: 'system',
      actor_id: userId,
      event_id: quoteId,
      metadata: {
        type,
        btc_price: btcPrice,
        input_amount: inputAmount,
        output_amount: outputAmount,
        fee,
        expires_at: expiresAt,
      },
    });

    console.log('Quote generated:', { quoteId, type, btcPrice, inputAmount, outputAmount, expiresAt });

    // Get treasury addresses from system_settings
    const { data: settings } = await supabaseService
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['coinedge_btc_address', 'coinedge_usdc_address']);
    
    const coinedgeWallet: { btc?: string; usdc?: string } = {};
    settings?.forEach((s: { setting_key: string; setting_value: string }) => {
      if (s.setting_key === 'coinedge_btc_address') coinedgeWallet.btc = s.setting_value;
      if (s.setting_key === 'coinedge_usdc_address') coinedgeWallet.usdc = s.setting_value;
    });

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
      priceSource: priceCache && Date.now() - priceCache.updatedAt < 1000 ? 'live' : 'cached',
      coinedgeWallet: {
        btc: coinedgeWallet.btc || 'Not configured - contact admin',
        usdc: coinedgeWallet.usdc || 'Not configured - contact admin',
      },
    }), {
      headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
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
