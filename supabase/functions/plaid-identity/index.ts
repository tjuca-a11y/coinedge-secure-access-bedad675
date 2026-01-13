import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaidIdentityRequest {
  action: 'create_identity_token' | 'handle_verification_result';
  identity_verification_id?: string;
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: PlaidIdentityRequest = await req.json();
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
      .eq('user_id', user.id)
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
            client_user_id: user.id,
            email_address: user.email,
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
        .eq('user_id', user.id);

      // Now create the link token for the frontend
      const linkResponse = await fetch(`${plaidBaseUrl}/link/token/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: plaidClientId,
          secret: plaidSecret,
          user: { client_user_id: user.id },
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
        .eq('user_id', user.id);

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
