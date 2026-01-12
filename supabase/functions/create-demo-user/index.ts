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

    // Demo customer credentials
    const demoEmail = 'demo@user.coinedge.com';
    const demoPassword = 'Demo123!';

    // Check if demo user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', demoEmail)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ 
          message: 'Demo user account already exists',
          email: demoEmail,
          password: demoPassword,
          loginUrl: '/login'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Create profile with KYC approved for demo
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        email: demoEmail,
        full_name: 'Demo Customer',
        phone: '555-0003',
        username: 'democustomer',
        date_of_birth: '1995-03-20',
        address_line1: '456 Demo Avenue',
        city: 'San Francisco',
        state: 'CA',
        postal_code: '94103',
        country: 'US',
        kyc_status: 'approved',
        kyc_submitted_at: new Date().toISOString(),
        kyc_approved_at: new Date().toISOString(),
        btc_address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        usdc_address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        wallet_created_at: new Date().toISOString(),
      });

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo customer account created',
        email: demoEmail,
        password: demoPassword,
        loginUrl: '/login',
        features: [
          'KYC pre-approved',
          'BTC wallet address configured',
          'USDC wallet address configured',
          'Ready to test buy/sell BTC'
        ]
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
