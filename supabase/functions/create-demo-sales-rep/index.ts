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

    // Demo sales rep credentials
    const demoEmail = 'demo@rep.coinedge.com';
    const demoPassword = 'Demo123!';

    // Check if demo sales rep already exists
    const { data: existingRep } = await supabase
      .from('sales_reps')
      .select('id')
      .eq('email', demoEmail)
      .maybeSingle();

    if (existingRep) {
      return new Response(
        JSON.stringify({ 
          message: 'Demo sales rep account already exists',
          email: demoEmail,
          password: demoPassword,
          loginUrl: '/sales-rep/login'
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

    // Create sales rep record
    const { error: repError } = await supabase
      .from('sales_reps')
      .insert({
        user_id: authData.user.id,
        full_name: 'Demo Sales Rep',
        email: demoEmail,
        phone: '555-0002',
        dob: '1992-06-15',
        status: 'active',
        force_password_reset: false,
      });

    if (repError) throw repError;

    // Create user role for sales rep
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'sales_rep',
      });

    if (roleError) console.error('Role error:', roleError);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo sales rep account created',
        email: demoEmail,
        password: demoPassword,
        loginUrl: '/sales-rep/login'
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
