import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const url = new URL(req.url);
    const checkout_id = url.searchParams.get('checkout_id');
    
    if (!checkout_id) {
      return new Response(JSON.stringify({ error: 'Missing checkout_id' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const SQUARE_ENVIRONMENT = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox';

    if (!SQUARE_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: 'Payment service not configured' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const squareBaseUrl = SQUARE_ENVIRONMENT === 'production' 
      ? 'https://connect.squareup.com' 
      : 'https://connect.squareupsandbox.com';

    // Get checkout status
    const checkoutResponse = await fetch(`${squareBaseUrl}/v2/terminals/checkouts/${checkout_id}`, {
      method: 'GET',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
      console.error('Square checkout status error:', checkoutData);
      return new Response(JSON.stringify({ 
        status: 'FAILED',
        error: checkoutData.errors?.[0]?.detail || 'Failed to check status'
      }), { 
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const checkout = checkoutData.checkout;
    let status = 'PENDING';
    
    // Map Square status to simple status
    switch (checkout?.status) {
      case 'COMPLETED':
        status = 'COMPLETED';
        break;
      case 'CANCELED':
        status = 'CANCELED';
        break;
      case 'EXPIRED':
        status = 'EXPIRED';
        break;
      case 'CANCEL_REQUESTED':
        status = 'CANCELING';
        break;
      default:
        status = 'PENDING';
    }

    console.log('Checkout status:', checkout?.id, status);

    // Return ONLY status - no Square transaction IDs to merchant
    return new Response(JSON.stringify({ 
      status,
      // Only include payment_id for internal use (stored in DB, not shown to merchant)
      ...(status === 'COMPLETED' && checkout?.payment_ids?.[0] && { 
        _internal_payment_id: checkout.payment_ids[0] 
      })
    }), { 
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Square check payment error:', error);
    return new Response(JSON.stringify({ status: 'FAILED', error: 'Check failed' }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
