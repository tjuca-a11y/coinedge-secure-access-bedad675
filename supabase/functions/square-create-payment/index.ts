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

    const { base_amount_usd, device_id, activation_event_id } = await req.json();
    
    if (!base_amount_usd || base_amount_usd <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const SQUARE_LOCATION_ID = Deno.env.get('SQUARE_LOCATION_ID');
    const SQUARE_ENVIRONMENT = Deno.env.get('SQUARE_ENVIRONMENT') || 'sandbox';

    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      console.error('Square credentials not configured');
      return new Response(JSON.stringify({ error: 'Payment service not configured' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Calculate Square processing fee: 2.6% + $0.15
    const SQUARE_PROCESSING_RATE = 0.026;
    const SQUARE_PROCESSING_FIXED = 0.15;
    const squareProcessingFee = (base_amount_usd * SQUARE_PROCESSING_RATE) + SQUARE_PROCESSING_FIXED;
    const customerPays = Math.round((base_amount_usd + squareProcessingFee) * 100); // Convert to cents

    const squareBaseUrl = SQUARE_ENVIRONMENT === 'production' 
      ? 'https://connect.squareup.com' 
      : 'https://connect.squareupsandbox.com';

    // Create Terminal Checkout for tap-to-pay
    const checkoutResponse = await fetch(`${squareBaseUrl}/v2/terminals/checkouts`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        checkout: {
          amount_money: {
            amount: customerPays,
            currency: 'USD',
          },
          device_options: {
            device_id: device_id || SQUARE_LOCATION_ID, // Default to location if no device
            tip_settings: { allow_tipping: false },
            skip_receipt_screen: true,
          },
          reference_id: activation_event_id,
          note: `BitCard Activation - $${base_amount_usd} BTC`,
          deadline_duration: 'PT5M', // 5 minute deadline
        },
      }),
    });

    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
      console.error('Square checkout error:', checkoutData);
      return new Response(JSON.stringify({ 
        error: 'Failed to create payment',
        details: checkoutData.errors?.[0]?.detail || 'Unknown error'
      }), { 
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log('Square checkout created:', checkoutData.checkout?.id);

    // Return checkout ID for polling - NO Square transaction details
    return new Response(JSON.stringify({ 
      checkout_id: checkoutData.checkout?.id,
      customer_pays: customerPays / 100,
      status: 'PENDING'
    }), { 
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Square payment error:', error);
    return new Response(JSON.stringify({ error: 'Payment failed' }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
