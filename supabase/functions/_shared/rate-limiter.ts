// Shared rate limiting utilities for edge functions
// Uses in-memory store (resets on cold start - use Redis for production at scale)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Critical endpoints (orders, transfers)
  critical: { windowMs: 60000, maxRequests: 10 },
  // Standard API endpoints
  standard: { windowMs: 60000, maxRequests: 30 },
  // Public/read-only endpoints
  public: { windowMs: 60000, maxRequests: 60 },
  // Auth endpoints (stricter)
  auth: { windowMs: 300000, maxRequests: 20 }, // 5 min window, 20 attempts
} as const;

// Global store for rate limits (per-isolate)
const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `${identifier}`;
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now >= v.resetAt) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getRateLimitHeaders(
  result: { remaining: number; resetAt: number },
  config: RateLimitConfig
): Record<string, string> {
  return {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };
}

export function getClientIdentifier(req: Request): string {
  // Try to get real IP from proxy headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback - use a hash of the authorization header for authenticated requests
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    // Simple hash for rate limiting purposes
    return `auth-${hashCode(authHeader)}`;
  }

  return 'unknown';
}

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function createRateLimitResponse(
  resetAt: number,
  config: RateLimitConfig,
  corsHeaders: Record<string, string>
): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        ...getRateLimitHeaders({ remaining: 0, resetAt }, config),
      },
    }
  );
}
