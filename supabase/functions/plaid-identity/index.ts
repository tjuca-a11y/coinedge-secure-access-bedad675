import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaidIdentityRequest {
  action: 'create_identity_token' | 'handle_verification_result';
  identity_verification_id?: string;
  // For Dynamic Labs authenticated users
  userId?: string;
}

// Cache for Dynamic JWKS
let cachedJWKS: jose.JWTVerifyGetKey | null = null;
let jwksCacheTime = 0;
const JWKS_CACHE_DURATION = 3600000; // 1 hour

async function getDynamicJWKS(environmentId: string): Promise<jose.JWTVerifyGetKey> {
  const now = Date.now();
  if (cachedJWKS && (now - jwksCacheTime) < JWKS_CACHE_DURATION) {
    return cachedJWKS;
  }

  const jwksUrl = `https://app.dynamicauth.com/api/v0/sdk/${environmentId}/.well-known/jwks`;
  cachedJWKS = jose.createRemoteJWKSet(new URL(jwksUrl));
  jwksCacheTime = now;
  return cachedJWKS;
}

async function verifyDynamicToken(token: string, environmentId: string): Promise<jose.JWTPayload | null> {
  try {
    const JWKS = await getDynamicJWKS(environmentId);
    // Dynamic Labs uses app.dynamicauth.com as the issuer
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `app.dynamicauth.com/${environmentId}`,
    });
    return payload;
  } catch (error) {
    console.error('Dynamic JWT verification failed:', error);
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
    const plaidClientId = Deno.env.get('PLAID_CLIENT_ID');
    const plaidSecret = Deno.env.get('PLAID_SECRET');
    const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';
    const dynamicEnvironmentId = Deno.env.get('DYNAMIC_ENVIRONMENT_ID');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authorization - support both Supabase and Dynamic auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    let userEmail: string | null = null;

    // First try Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (user && !authError) {
      userId = user.id;
      userEmail = user.email || null;
      console.log('Authenticated via Supabase:', userId);
    } else if (dynamicEnvironmentId) {
      // Try Dynamic Labs JWT verification
      const dynamicPayload = await verifyDynamicToken(token, dynamicEnvironmentId);
      
      if (dynamicPayload) {
        console.log('Authenticated via Dynamic Labs');
        
        // Parse the request body to get the userId from the synced profile
        const body: PlaidIdentityRequest = await req.json();
        
        if (!body.userId) {
          return new Response(JSON.stringify({ error: 'Missing userId for Dynamic auth' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Verify the userId exists in our profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, email')
          .eq('user_id', body.userId)
          .single();
          
        if (profileError || !profile) {
          return new Response(JSON.stringify({ error: 'User profile not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const validUserId = profile.user_id as string;
        const validEmail = (profile.email as string) || '';
        
        // Continue processing with the body we already parsed
        return await handlePlaidRequest(req, supabase, validUserId, validEmail, body, plaidClientId, plaidSecret, plaidEnv);
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: PlaidIdentityRequest = await req.json();
    return await handlePlaidRequest(req, supabase, userId, userEmail || '', body, plaidClientId, plaidSecret, plaidEnv);

  } catch (error: unknown) {
    console.error('Plaid identity error:', error);
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

async function handlePlaidRequest(
  req: Request,
  supabase: any,
  userId: string,
  userEmail: string | null,
  body: PlaidIdentityRequest,
  plaidClientId: string | undefined,
  plaidSecret: string | undefined,
  plaidEnv: string
): Promise<Response> {
  const { action, identity_verification_id } = body;

  // Check if Plaid is configured
  if (!plaidClientId || !plaidSecret) {
    console.log('Plaid not configured - returning mock response');
    
    if (action === 'create_identity_token') {
      return new Response(JSON.stringify({
        success: false,
        mock: true,
        message: 'Plaid not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to enable identity verification.',
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      mock: true,
      message: 'Plaid not configured'
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const plaidBaseUrl = plaidEnv === 'production'
    ? 'https://production.plaid.com'
    : plaidEnv === 'development'
      ? 'https://development.plaid.com'
      : 'https://sandbox.plaid.com';

  // Get user profile for prefilling
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // === CREATE IDENTITY VERIFICATION LINK TOKEN ===
  if (action === 'create_identity_token') {
    // Create Identity Verification session
    const createResponse = await fetch(`${plaidBaseUrl}/identity_verification/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        template_id: Deno.env.get('PLAID_IDENTITY_TEMPLATE_ID') || 'idvtmp_default',
        gave_consent: true,
        user: {
          client_user_id: userId,
          email_address: userEmail || profile?.email,
          phone_number: profile?.phone || undefined,
          date_of_birth: profile?.date_of_birth || undefined,
          name: profile?.full_name ? {
            given_name: profile.full_name.split(' ')[0],
            family_name: profile.full_name.split(' ').slice(1).join(' ') || undefined,
          } : undefined,
          address: profile?.address_line1 ? {
            street: profile.address_line1,
            street2: profile.address_line2 || undefined,
            city: profile.city || undefined,
            region: profile.state || undefined,
            postal_code: profile.postal_code || undefined,
            country: profile.country || 'US',
          } : undefined,
        },
        is_shareable: true,
      }),
    });

    const createData = await createResponse.json();
    console.log('Plaid Identity Create Response:', JSON.stringify(createData));

    if (createData.error) {
      return new Response(JSON.stringify({
        success: false,
        error: createData.error.message || 'Failed to create identity verification session'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store the verification ID in the profile for later lookup
    await supabase
      .from('profiles')
      .update({
        kyc_status: 'pending',
        kyc_submitted_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Now create the link token for the frontend
    const linkResponse = await fetch(`${plaidBaseUrl}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        user: { client_user_id: userId },
        client_name: 'CoinEdge',
        products: ['identity_verification'],
        identity_verification: {
          template_id: Deno.env.get('PLAID_IDENTITY_TEMPLATE_ID') || 'idvtmp_default',
        },
        country_codes: ['US'],
        language: 'en',
      }),
    });

    const linkData = await linkResponse.json();
    console.log('Plaid Link Token Response:', JSON.stringify(linkData));

    if (linkData.link_token) {
      return new Response(JSON.stringify({
        success: true,
        link_token: linkData.link_token,
        expiration: linkData.expiration,
        identity_verification_id: createData.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: linkData.error?.message || 'Failed to create link token'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // === HANDLE VERIFICATION RESULT (called after user completes Plaid Identity flow) ===
  if (action === 'handle_verification_result') {
    if (!identity_verification_id) {
      return new Response(JSON.stringify({ error: 'Missing identity_verification_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the verification result from Plaid
    const getResponse = await fetch(`${plaidBaseUrl}/identity_verification/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        identity_verification_id,
      }),
    });

    const verificationData = await getResponse.json();
    console.log('Plaid Verification Result:', JSON.stringify(verificationData));

    if (verificationData.error) {
      return new Response(JSON.stringify({
        success: false,
        error: verificationData.error.message || 'Failed to get verification status'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const status = verificationData.status;
    const steps = verificationData.steps || {};

    // Map Plaid status to our KYC status
    let kycStatus: 'pending' | 'approved' | 'rejected' = 'pending';
    let rejectionReason: string | null = null;

    if (status === 'success') {
      kycStatus = 'approved';
    } else if (status === 'failed') {
      kycStatus = 'rejected';
      // Steps is an object with step names as keys, not an array
      // Find which steps failed
      const failedStepNames = Object.entries(steps)
        .filter(([_, stepStatus]) => stepStatus === 'failed')
        .map(([stepName, _]) => stepName.replace(/_/g, ' '));
      rejectionReason = failedStepNames.length > 0 
        ? `Verification failed: ${failedStepNames.join(', ')}`
        : 'Identity verification failed';
    } else if (status === 'expired') {
      kycStatus = 'rejected';
      rejectionReason = 'Verification session expired. Please try again.';
    }

    // Update profile with verification result
    const updateData: Record<string, unknown> = {
      kyc_status: kycStatus,
    };

    if (kycStatus === 'approved') {
      updateData.kyc_approved_at = new Date().toISOString();
      
      // Extract verified user data from Plaid
      const userData = verificationData.user || {};
      if (userData.name) {
        const fullName = [userData.name.given_name, userData.name.family_name].filter(Boolean).join(' ');
        if (fullName) updateData.full_name = fullName;
      }
      if (userData.date_of_birth) updateData.date_of_birth = userData.date_of_birth;
      if (userData.address) {
        if (userData.address.street) updateData.address_line1 = userData.address.street;
        if (userData.address.street2) updateData.address_line2 = userData.address.street2;
        if (userData.address.city) updateData.city = userData.address.city;
        if (userData.address.region) updateData.state = userData.address.region;
        if (userData.address.postal_code) updateData.postal_code = userData.address.postal_code;
        if (userData.address.country) updateData.country = userData.address.country;
      }
      if (userData.phone_number) updateData.phone = userData.phone_number;

      // Generate wallet addresses (in production, this would call Fireblocks)
      const btcAddress = `bc1q${crypto.randomUUID().replace(/-/g, '').substring(0, 32)}`;
      const usdcAddress = `0x${crypto.randomUUID().replace(/-/g, '')}`;
      updateData.btc_address = btcAddress;
      updateData.usdc_address = usdcAddress;
      updateData.wallet_created_at = new Date().toISOString();
    } else if (kycStatus === 'rejected') {
      updateData.kyc_rejected_at = new Date().toISOString();
      updateData.kyc_rejection_reason = rejectionReason;
    }

    await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId);

    return new Response(JSON.stringify({
      success: true,
      status: kycStatus,
      rejection_reason: rejectionReason,
      verified_data: kycStatus === 'approved' ? {
        full_name: updateData.full_name,
        date_of_birth: updateData.date_of_birth,
      } : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Invalid action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
