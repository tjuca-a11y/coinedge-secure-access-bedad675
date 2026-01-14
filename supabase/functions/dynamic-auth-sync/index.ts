import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DynamicAuthRequest {
  dynamicUserId: string;
  email?: string;
  walletAddresses: Array<{ address: string; chain: 'BTC' | 'ETH' }>;
}

// Cache for JWKS to avoid fetching on every request
let jwksCache: jose.JWTVerifyGetKey | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_TTL = 3600000; // 1 hour

async function getJWKS(environmentId: string): Promise<jose.JWTVerifyGetKey> {
  const now = Date.now();
  
  if (jwksCache && (now - jwksCacheTime) < JWKS_CACHE_TTL) {
    return jwksCache;
  }
  
  // Dynamic Labs uses dynamicauth.com for JWKS
  const jwksUrl = `https://app.dynamicauth.com/api/v0/sdk/${environmentId}/.well-known/jwks`;
  const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
  
  jwksCache = JWKS;
  jwksCacheTime = now;
  
  return JWKS;
}

async function verifyDynamicToken(token: string, environmentId: string): Promise<jose.JWTPayload | null> {
  try {
    const JWKS = await getJWKS(environmentId);
    // Dynamic Labs uses app.dynamicauth.com as the issuer
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `app.dynamicauth.com/${environmentId}`,
    });
    return payload;
  } catch (error) {
    console.error('JWT verification failed:', error);
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
    const dynamicPublicKey = Deno.env.get('DYNAMIC_PUBLIC_KEY');
    
    // Dynamic Environment ID from the public key or extract from token
    // The public key format is typically: pk_live_XXXXX or pk_test_XXXXX
    // We need the environment ID which is different - we'll extract from JWT issuer
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Dynamic JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing Dynamic token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dynamicToken = authHeader.replace('Bearer ', '');
    
    // Decode token to get environment ID from issuer (without verification first)
    let environmentId: string | undefined;
    try {
      const decoded = jose.decodeJwt(dynamicToken);
      // Issuer format: app.dynamicauth.com/{environmentId}
      if (decoded.iss && decoded.iss.startsWith('app.dynamicauth.com/')) {
        environmentId = decoded.iss.replace('app.dynamicauth.com/', '');
      }
    } catch {
      // Continue without environment ID extraction
    }

    // Verify the Dynamic JWT if we have the environment ID
    let verifiedPayload: jose.JWTPayload | null = null;
    if (environmentId) {
      verifiedPayload = await verifyDynamicToken(dynamicToken, environmentId);
      if (!verifiedPayload) {
        return new Response(JSON.stringify({ error: 'Invalid Dynamic token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body: DynamicAuthRequest = await req.json();
    const { dynamicUserId, email, walletAddresses } = body;

    // Validate that the token's subject matches the provided user ID
    if (verifiedPayload && verifiedPayload.sub !== dynamicUserId) {
      return new Response(JSON.stringify({ error: 'Token subject mismatch' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!dynamicUserId) {
      return new Response(JSON.stringify({ error: 'Missing Dynamic user ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already exists by Dynamic ID (stored in user metadata)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let supabaseUser = existingUsers?.users?.find(
      u => u.user_metadata?.dynamic_user_id === dynamicUserId
    );

    const btcAddress = walletAddresses.find(w => w.chain === 'BTC')?.address;
    const ethAddress = walletAddresses.find(w => w.chain === 'ETH')?.address;

    // If not found by Dynamic ID, check by email (user may have signed up before via email/password)
    if (!supabaseUser && email) {
      supabaseUser = existingUsers?.users?.find(
        u => u.email?.toLowerCase() === email.toLowerCase()
      );

      // Link the Dynamic account to the existing email user
      if (supabaseUser) {
        console.log('Found existing user by email, linking Dynamic account:', supabaseUser.id);
        await supabase.auth.admin.updateUserById(supabaseUser.id, {
          user_metadata: {
            ...supabaseUser.user_metadata,
            dynamic_user_id: dynamicUserId,
            wallet_btc: btcAddress,
            wallet_eth: ethAddress,
          },
        });

        // Sync wallet addresses to profile
        await supabase.from('profiles').update({
          btc_address: btcAddress || supabaseUser.user_metadata?.wallet_btc,
          usdc_address: ethAddress || supabaseUser.user_metadata?.wallet_eth,
        }).eq('user_id', supabaseUser.id);
      }
    }

    if (!supabaseUser) {
      // Create new Supabase user linked to Dynamic
      const userEmail = email || `${dynamicUserId}@dynamic.coinedge.io`;

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true, // Auto-confirm since they're authenticated via Dynamic
        user_metadata: {
          dynamic_user_id: dynamicUserId,
          wallet_btc: btcAddress,
          wallet_eth: ethAddress,
        },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create user', details: createError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      supabaseUser = newUser.user;

      // Update profile with wallet addresses
      if (supabaseUser) {
        await supabase.from('profiles').update({
          btc_address: btcAddress,
          usdc_address: ethAddress,
          wallet_created_at: new Date().toISOString(),
        }).eq('user_id', supabaseUser.id);
      }
    } else {
      // Update existing user's wallet addresses if changed
      await supabase.auth.admin.updateUserById(supabaseUser.id, {
        user_metadata: {
          ...supabaseUser.user_metadata,
          dynamic_user_id: dynamicUserId,
          wallet_btc: btcAddress,
          wallet_eth: ethAddress,
        },
      });

      // Sync to profile
      await supabase.from('profiles').update({
        btc_address: btcAddress || supabaseUser.user_metadata?.wallet_btc,
        usdc_address: ethAddress || supabaseUser.user_metadata?.wallet_eth,
      }).eq('user_id', supabaseUser.id);
    }

    if (!supabaseUser) {
      return new Response(JSON.stringify({ error: 'Failed to get or create user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return success - the frontend will use Dynamic auth state
    // Supabase session is optional for this flow since Dynamic handles auth
    return new Response(JSON.stringify({
      success: true,
      userId: supabaseUser.id,
      email: supabaseUser.email,
      btcAddress,
      ethAddress,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Dynamic auth sync error:', error);
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
