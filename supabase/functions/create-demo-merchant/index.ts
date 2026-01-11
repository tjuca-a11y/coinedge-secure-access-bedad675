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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Demo merchant admin credentials
    const demoEmail = 'demo@merchant.coinedge.com';
    const demoPassword = 'Demo123!';

    // Check if demo user already exists
    const { data: existingUser } = await supabase
      .from('merchant_users')
      .select('id')
      .eq('email', demoEmail)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          message: 'Demo account already exists',
          email: demoEmail,
          password: demoPassword
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or get demo merchant
    let merchantId: string;
    const { data: existingMerchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('merchant_id', 'demo-merchant-001')
      .maybeSingle();

    if (existingMerchant) {
      merchantId = existingMerchant.id;
    } else {
      const { data: newMerchant, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          merchant_id: 'demo-merchant-001',
          business_name: 'Demo Coffee Shop',
          point_of_contact: 'Demo Admin',
          email: demoEmail,
          phone: '555-0100',
          street: '123 Demo Street',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          status: 'active',
        })
        .select()
        .single();

      if (merchantError) throw merchantError;
      merchantId = newMerchant.id;
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Create merchant user
    const { error: merchantUserError } = await supabase
      .from('merchant_users')
      .insert({
        merchant_id: merchantId,
        user_id: authData.user.id,
        role: 'MERCHANT_ADMIN',
        full_name: 'Demo Admin',
        email: demoEmail,
        phone: '555-0100',
        status: 'ACTIVE',
        must_reset_password: false,
      });

    if (merchantUserError) throw merchantUserError;

    // Add some demo balance
    const { error: ledgerError } = await supabase
      .from('merchant_wallet_ledger')
      .insert({
        merchant_id: merchantId,
        type: 'TOPUP',
        amount_usd: 500,
        reference: 'demo-initial-balance',
      });

    if (ledgerError) console.error('Ledger error:', ledgerError);

    // Create some demo bitcards for the merchant
    const demoCards = [];
    for (let i = 1; i <= 5; i++) {
      demoCards.push({
        bitcard_id: `demo-card-${String(i).padStart(4, '0')}`,
        merchant_id: merchantId,
        status: 'issued',
        pin_hash: '1234', // Simple PIN for demo
        pin_required: true,
        usd_value: null,
      });
    }

    const { error: cardsError } = await supabase
      .from('bitcards')
      .insert(demoCards);

    if (cardsError) console.error('Cards error:', cardsError);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo merchant account created',
        email: demoEmail,
        password: demoPassword,
        merchantId,
        demoCards: demoCards.map(c => ({ id: c.bitcard_id, pin: '1234' })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
