import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, plaid-verification',
};

interface PlaidWebhookPayload {
  webhook_type: string;
  webhook_code: string;
  identity_verification_id?: string;
  item_id?: string;
  error?: {
    error_type: string;
    error_code: string;
    error_message: string;
  };
  environment?: string;
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

    // Parse webhook payload
    const payload: PlaidWebhookPayload = await req.json();
    console.log('Received Plaid webhook:', JSON.stringify(payload));

    const { webhook_type, webhook_code, identity_verification_id, item_id, error } = payload;

    // Log webhook event
    console.log(`Plaid webhook: ${webhook_type} / ${webhook_code}`);

    // === IDENTITY VERIFICATION WEBHOOKS ===
    if (webhook_type === 'IDENTITY_VERIFICATION') {
      if (!identity_verification_id) {
        console.error('Missing identity_verification_id in webhook');
        return new Response(JSON.stringify({ received: true, error: 'Missing identity_verification_id' }), {
          status: 200, // Always return 200 to acknowledge receipt
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if Plaid is configured
      if (!plaidClientId || !plaidSecret) {
        console.log('Plaid not configured - cannot process webhook');
        return new Response(JSON.stringify({ received: true, error: 'Plaid not configured' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const plaidBaseUrl = plaidEnv === 'production'
        ? 'https://production.plaid.com'
        : plaidEnv === 'development'
          ? 'https://development.plaid.com'
          : 'https://sandbox.plaid.com';

      // Get verification details from Plaid
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
      console.log('Verification data:', JSON.stringify(verificationData));

      if (verificationData.error) {
        console.error('Error fetching verification:', verificationData.error);
        return new Response(JSON.stringify({ received: true, error: verificationData.error.message }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user_id from client_user_id
      const clientUserId = verificationData.user?.client_user_id;
      if (!clientUserId) {
        console.error('No client_user_id in verification data');
        return new Response(JSON.stringify({ received: true, error: 'No client_user_id' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process based on webhook code
      switch (webhook_code) {
        case 'STATUS_UPDATED': {
          const status = verificationData.status;
          const steps = verificationData.steps || [];

          let kycStatus: 'pending' | 'approved' | 'rejected' = 'pending';
          let rejectionReason: string | null = null;

          if (status === 'success') {
            kycStatus = 'approved';
          } else if (status === 'failed') {
            kycStatus = 'rejected';
            const failedSteps = steps.filter((s: { status: string }) => s.status === 'failed');
            rejectionReason = failedSteps.length > 0
              ? `Verification failed: ${failedSteps.map((s: { name: string }) => s.name).join(', ')}`
              : 'Identity verification failed';
          } else if (status === 'expired') {
            kycStatus = 'rejected';
            rejectionReason = 'Verification session expired. Please try again.';
          }
          // status === 'active' or 'pending_review' stays as 'pending'

          // Prepare update data
          const updateData: Record<string, unknown> = {
            kyc_status: kycStatus,
          };

          if (kycStatus === 'approved') {
            updateData.kyc_approved_at = new Date().toISOString();

            // Extract verified user data
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

            // Generate wallet addresses (in production, call Fireblocks here)
            const btcAddress = `bc1q${crypto.randomUUID().replace(/-/g, '').substring(0, 32)}`;
            const usdcAddress = `0x${crypto.randomUUID().replace(/-/g, '')}`;
            updateData.btc_address = btcAddress;
            updateData.usdc_address = usdcAddress;
            updateData.wallet_created_at = new Date().toISOString();

            console.log(`KYC APPROVED for user ${clientUserId}`);
          } else if (kycStatus === 'rejected') {
            updateData.kyc_rejected_at = new Date().toISOString();
            updateData.kyc_rejection_reason = rejectionReason;
            console.log(`KYC REJECTED for user ${clientUserId}: ${rejectionReason}`);
          } else {
            console.log(`KYC status unchanged (${status}) for user ${clientUserId}`);
          }

          // Update profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('user_id', clientUserId);

          if (updateError) {
            console.error('Error updating profile:', updateError);
            return new Response(JSON.stringify({ received: true, error: updateError.message }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          console.log(`Profile updated for user ${clientUserId} with status ${kycStatus}`);
          break;
        }

        case 'STEP_UPDATED': {
          // Individual step completed - log for debugging
          const currentStep = verificationData.steps?.find((s: { status: string }) => s.status === 'active');
          console.log(`Step updated for user ${clientUserId}. Current step: ${currentStep?.name || 'unknown'}`);
          break;
        }

        case 'RETRIED': {
          // User retried verification - reset to pending
          await supabase
            .from('profiles')
            .update({
              kyc_status: 'pending',
              kyc_rejection_reason: null,
              kyc_rejected_at: null,
            })
            .eq('user_id', clientUserId);
          console.log(`Verification retried for user ${clientUserId}`);
          break;
        }

        default:
          console.log(`Unhandled identity verification webhook code: ${webhook_code}`);
      }

      return new Response(JSON.stringify({ received: true, processed: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === ITEM WEBHOOKS (for bank linking) ===
    if (webhook_type === 'ITEM') {
      console.log(`Item webhook: ${webhook_code} for item ${item_id}`);

      if (webhook_code === 'ERROR' && error) {
        console.error(`Plaid item error: ${error.error_code} - ${error.error_message}`);
        
        // If item has error, mark associated bank accounts as needing re-linking
        if (item_id) {
          await supabase
            .from('user_bank_accounts')
            .update({ is_verified: false })
            .eq('plaid_item_id', item_id);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === AUTH WEBHOOKS ===
    if (webhook_type === 'AUTH') {
      console.log(`Auth webhook: ${webhook_code} for item ${item_id}`);
      // Handle auth updates if needed
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // === TRANSFER WEBHOOKS ===
    if (webhook_type === 'TRANSFER') {
      console.log(`Transfer webhook: ${webhook_code}`);
      // Forward to plaid-transfer handler if needed
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Unknown webhook type - acknowledge receipt
    console.log(`Unknown webhook type: ${webhook_type}`);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Plaid webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Always return 200 to acknowledge receipt, even on errors
    return new Response(JSON.stringify({
      received: true,
      error: errorMessage
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
