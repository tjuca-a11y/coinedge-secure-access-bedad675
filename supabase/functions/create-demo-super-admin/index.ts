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

    // Demo super admin credentials
    const demoEmail = 'superadmin@coinedge.com';
    const demoPassword = 'SuperAdmin123!';

    // Check if demo super admin already exists
    const { data: existingAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', demoEmail)
      .maybeSingle();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ 
          message: 'Demo super admin account already exists',
          email: demoEmail,
          password: demoPassword,
          loginUrl: '/admin/login'
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

    // Create admin user record
    const { error: adminUserError } = await supabase
      .from('admin_users')
      .insert({
        user_id: authData.user.id,
        full_name: 'Demo Super Admin',
        email: demoEmail,
        phone: '555-0000',
        status: 'active',
        force_password_reset: false,
        dob: '1985-01-01',
      });

    if (adminUserError) throw adminUserError;

    // Create user role for SUPER_ADMIN
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'super_admin',
      });

    if (roleError) {
      console.error('Role error:', roleError);
      throw roleError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo super admin account created',
        email: demoEmail,
        password: demoPassword,
        loginUrl: '/admin/login'
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
