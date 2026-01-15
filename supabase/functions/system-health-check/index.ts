import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RATE_LIMIT_CONFIGS, checkRateLimit, getClientIdentifier, createRateLimitResponse, getRateLimitHeaders } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthCheckResult {
  name: string;
  status: "healthy" | "degraded" | "down" | "not_configured";
  latency_ms?: number;
  message?: string;
  details?: Record<string, unknown>;
}

interface SystemHealthResponse {
  overall_status: "healthy" | "degraded" | "down";
  checked_at: string;
  checks: HealthCheckResult[];
}

// Helper to measure latency
async function measureLatency<T>(fn: () => Promise<T>): Promise<{ result: T; latency: number }> {
  const start = performance.now();
  const result = await fn();
  const latency = Math.round(performance.now() - start);
  return { result, latency };
}

// Check database connectivity
// deno-lint-ignore no-explicit-any
async function checkDatabase(supabase: any): Promise<HealthCheckResult> {
  try {
    const { result, latency } = await measureLatency(async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      return { count, error };
    });

    if (result.error) {
      return {
        name: "Database",
        status: "down",
        latency_ms: latency,
        message: result.error.message,
      };
    }

    return {
      name: "Database",
      status: latency > 500 ? "degraded" : "healthy",
      latency_ms: latency,
      message: latency > 500 ? "High latency detected" : "Connected",
      details: { profiles_count: result.count },
    };
  } catch (error) {
    return {
      name: "Database",
      status: "down",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Check Plaid integration
async function checkPlaid(): Promise<HealthCheckResult> {
  const clientId = Deno.env.get("PLAID_CLIENT_ID");
  const secret = Deno.env.get("PLAID_SECRET");
  const env = Deno.env.get("PLAID_ENV") || "sandbox";

  if (!clientId || !secret) {
    return {
      name: "Plaid",
      status: "not_configured",
      message: "Missing PLAID_CLIENT_ID or PLAID_SECRET",
    };
  }

  try {
    const baseUrl = env === "production" 
      ? "https://production.plaid.com"
      : env === "development"
        ? "https://development.plaid.com"
        : "https://sandbox.plaid.com";

    const { result, latency } = await measureLatency(async () => {
      // Simple API test - get categories (public endpoint)
      const response = await fetch(`${baseUrl}/categories/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return response.ok;
    });

    return {
      name: "Plaid",
      status: result ? (latency > 1000 ? "degraded" : "healthy") : "down",
      latency_ms: latency,
      message: result ? "API responding" : "API not responding",
      details: { environment: env, configured: true },
    };
  } catch (error) {
    return {
      name: "Plaid",
      status: "down",
      message: error instanceof Error ? error.message : "Connection failed",
      details: { environment: env, configured: true },
    };
  }
}

// Check Dynamic.xyz integration
async function checkDynamic(): Promise<HealthCheckResult> {
  const environmentId = Deno.env.get("DYNAMIC_ENVIRONMENT_ID");

  if (!environmentId) {
    return {
      name: "Dynamic Auth",
      status: "not_configured",
      message: "Missing DYNAMIC_ENVIRONMENT_ID",
    };
  }

  // Dynamic doesn't have a public health endpoint, so we just verify config
  return {
    name: "Dynamic Auth",
    status: "healthy",
    message: "Configured",
    details: { 
      environment_id_present: true,
      environment_id_preview: environmentId.substring(0, 8) + "...",
    },
  };
}

// Check Alchemy API
async function checkAlchemy(): Promise<HealthCheckResult> {
  const apiKey = Deno.env.get("ALCHEMY_API_KEY");

  if (!apiKey) {
    return {
      name: "Alchemy (USDC)",
      status: "not_configured",
      message: "Missing ALCHEMY_API_KEY",
    };
  }

  try {
    const { result, latency } = await measureLatency(async () => {
      const response = await fetch(
        `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1,
          }),
        }
      );
      const data = await response.json();
      return { ok: response.ok && !data.error, blockNumber: data.result };
    });

    return {
      name: "Alchemy (USDC)",
      status: result.ok ? (latency > 1000 ? "degraded" : "healthy") : "down",
      latency_ms: latency,
      message: result.ok ? "API responding" : "API error",
      details: { 
        configured: true,
        latest_block: result.blockNumber,
      },
    };
  } catch (error) {
    return {
      name: "Alchemy (USDC)",
      status: "down",
      message: error instanceof Error ? error.message : "Connection failed",
      details: { configured: true },
    };
  }
}

// Check BTC Price Oracle
async function checkBtcPriceOracle(): Promise<HealthCheckResult> {
  try {
    const { result, latency } = await measureLatency(async () => {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
      );
      const data = await response.json();
      return { ok: response.ok && data.bitcoin?.usd, price: data.bitcoin?.usd };
    });

    return {
      name: "BTC Price Oracle",
      status: result.ok ? (latency > 1000 ? "degraded" : "healthy") : "down",
      latency_ms: latency,
      message: result.ok ? `$${result.price?.toLocaleString()}` : "API not responding",
      details: { 
        source: "CoinGecko",
        current_price_usd: result.price,
      },
    };
  } catch (error) {
    return {
      name: "BTC Price Oracle",
      status: "down",
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

// Check Fireblocks/Treasury integration
async function checkFireblocks(): Promise<HealthCheckResult> {
  const apiKey = Deno.env.get("FIREBLOCKS_API_KEY");
  const apiSecret = Deno.env.get("FIREBLOCKS_API_SECRET");

  if (!apiKey || !apiSecret) {
    return {
      name: "Fireblocks (Treasury)",
      status: "not_configured",
      message: "Missing FIREBLOCKS_API_KEY or FIREBLOCKS_API_SECRET",
    };
  }

  // Just verify config exists - actual API check would require signed request
  return {
    name: "Fireblocks (Treasury)",
    status: "healthy",
    message: "Configured",
    details: { configured: true },
  };
}

// List edge functions status
async function checkEdgeFunctions(): Promise<HealthCheckResult> {
  const edgeFunctions = [
    "bootstrap-admin",
    "create-sales-rep",
    "plaid-link",
    "plaid-transfer",
    "plaid-identity",
    "plaid-webhook",
    "dynamic-auth-sync",
    "coinedge-quote",
    "coinedge-transfer",
    "validate-voucher",
    "wallet-balances",
    "btc-price",
    "process-fulfillment-queue",
    "monitor-btc-transactions",
    "verify-usdc-transfer",
  ];

  // We can't easily check if functions are deployed from within an edge function
  // Just report that this function is running (which proves edge functions work)
  return {
    name: "Edge Functions",
    status: "healthy",
    message: `${edgeFunctions.length} functions configured`,
    details: {
      functions: edgeFunctions,
      count: edgeFunctions.length,
    },
  };
}

// Check Auth configuration
// deno-lint-ignore no-explicit-any
async function checkAuth(supabase: any): Promise<HealthCheckResult> {
  try {
    const { result, latency } = await measureLatency(async () => {
      // Just check if we can make an auth-related query
      const { count, error } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true });
      return { count, error };
    });

    return {
      name: "Authentication",
      status: result.error ? "degraded" : "healthy",
      latency_ms: latency,
      message: result.error ? "Auth tables issue" : "Operational",
      details: { roles_configured: !result.error },
    };
  } catch (error) {
    return {
      name: "Authentication",
      status: "down",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimitResult = checkRateLimit(`health-check:${clientId}`, RATE_LIMIT_CONFIGS.standard);
  
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult.resetAt, RATE_LIMIT_CONFIGS.standard, corsHeaders);
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.user.id)
      .single();

    if (!roleData || (roleData.role !== "admin" && roleData.role !== "super_admin")) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Run all health checks in parallel
    const checks = await Promise.all([
      checkDatabase(supabase),
      checkAuth(supabase),
      checkPlaid(),
      checkDynamic(),
      checkAlchemy(),
      checkBtcPriceOracle(),
      checkFireblocks(),
      checkEdgeFunctions(),
    ]);

    // Determine overall status
    const hasDown = checks.some((c) => c.status === "down");
    const hasDegraded = checks.some((c) => c.status === "degraded");
    const overall_status = hasDown ? "down" : hasDegraded ? "degraded" : "healthy";

    const response: SystemHealthResponse = {
      overall_status,
      checked_at: new Date().toISOString(),
      checks,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...getRateLimitHeaders(rateLimitResult, RATE_LIMIT_CONFIGS.standard),
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
