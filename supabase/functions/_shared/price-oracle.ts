// Shared BTC price oracle with caching and fallback
// Uses CoinGecko free API (no API key required)

interface PriceCache {
  btcUsd: number;
  updatedAt: number;
}

// Module-level cache (persists for isolate lifetime)
let priceCache: PriceCache | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds - balance between freshness and API limits

// Fallback price sources
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

export interface BtcPriceResult {
  price: number;
  currency: 'USD';
  source: string;
  timestamp: string;
  cached: boolean;
}

export async function getBtcPrice(): Promise<BtcPriceResult> {
  const now = Date.now();

  // Return cached price if still valid
  if (priceCache && now - priceCache.updatedAt < CACHE_TTL_MS) {
    return {
      price: priceCache.btcUsd,
      currency: 'USD',
      source: 'cache',
      timestamp: new Date(priceCache.updatedAt).toISOString(),
      cached: true,
    };
  }

  // Try each price source
  let lastError: Error | null = null;
  
  for (const source of PRICE_SOURCES) {
    try {
      const response = await fetch(source.url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`${source.name} returned ${response.status}`);
      }

      const data = await response.json();
      const price = source.parser(data);

      if (typeof price !== 'number' || isNaN(price) || price <= 0) {
        throw new Error(`Invalid price from ${source.name}: ${price}`);
      }

      // Sanity check - BTC should be within reasonable bounds
      if (price < 1000 || price > 1000000) {
        throw new Error(`Price ${price} outside reasonable bounds`);
      }

      // Update cache
      priceCache = { btcUsd: price, updatedAt: now };

      console.log(`BTC price from ${source.name}: $${price.toLocaleString()}`);

      return {
        price,
        currency: 'USD',
        source: source.name,
        timestamp: new Date().toISOString(),
        cached: false,
      };
    } catch (error) {
      console.error(`Failed to fetch from ${source.name}:`, error);
      lastError = error as Error;
    }
  }

  // If we have stale cache, use it as last resort
  if (priceCache) {
    console.warn('Using stale cache after all sources failed');
    return {
      price: priceCache.btcUsd,
      currency: 'USD',
      source: 'stale-cache',
      timestamp: new Date(priceCache.updatedAt).toISOString(),
      cached: true,
    };
  }

  throw new Error(`All price sources failed: ${lastError?.message}`);
}

// Convert USD to BTC amount
export function usdToBtc(usdAmount: number, btcPrice: number): number {
  if (btcPrice <= 0) throw new Error('Invalid BTC price');
  return usdAmount / btcPrice;
}

// Convert BTC to USD amount
export function btcToUsd(btcAmount: number, btcPrice: number): number {
  if (btcPrice <= 0) throw new Error('Invalid BTC price');
  return btcAmount * btcPrice;
}

// Calculate fee based on percentage
export function calculateFee(amount: number, feePercent: number): number {
  return amount * (feePercent / 100);
}
