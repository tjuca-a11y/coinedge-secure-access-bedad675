import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

// Price cache to reduce external API calls
let priceCache: { price: number; updatedAt: number } | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds cache

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

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

async function fetchBtcPrice(): Promise<number> {
  // Check cache first
  if (priceCache && Date.now() - priceCache.updatedAt < CACHE_TTL_MS) {
    console.log('Returning cached BTC price:', priceCache.price);
    return priceCache.price;
  }

  try {
    // Use CoinGecko free API (no key required)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.bitcoin?.usd;

    if (typeof price !== 'number' || price <= 0) {
      throw new Error('Invalid price data from CoinGecko');
    }

    // Update cache
    priceCache = { price, updatedAt: Date.now() };
    console.log('Fetched fresh BTC price:', price);

    return price;
  } catch (error) {
    console.error('Error fetching BTC price from CoinGecko:', error);

    // If we have a stale cache, use it as fallback
    if (priceCache) {
      console.log('Using stale cached price as fallback:', priceCache.price);
      return priceCache.price;
    }

    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract client identifier for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    // Check rate limit
    const rateLimitResult = checkRateLimit(clientIp);
    
    const rateLimitHeaders = {
      ...corsHeaders,
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetAt / 1000).toString(),
    };

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch real-time BTC price
    const btcPrice = await fetchBtcPrice();

    // Log the price fetch for audit
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store price snapshot for historical tracking
    await supabase.from('audit_logs').insert({
      action: 'BTC_PRICE_FETCHED',
      actor_type: 'system',
      event_id: `price-${Date.now()}`,
      metadata: { price: btcPrice, cached: priceCache?.updatedAt === Date.now() ? false : true },
    });

    return new Response(
      JSON.stringify({
        price: btcPrice,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        cached: Date.now() - (priceCache?.updatedAt || 0) < CACHE_TTL_MS,
      }),
      {
        status: 200,
        headers: { ...rateLimitHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in btc-price function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch BTC price' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
