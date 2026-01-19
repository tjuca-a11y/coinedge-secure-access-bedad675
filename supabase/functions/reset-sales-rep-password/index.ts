import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is an admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('user_id', requestingUser.id)
      .single();

    if (adminError || !adminUser) {
      console.error('Admin check error:', adminError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { rep_id, new_password } = await req.json();

    if (!rep_id || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: rep_id, new_password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resetting password for sales rep:', rep_id);

    // Get the sales rep's user_id
    const { data: salesRep, error: repError } = await supabaseAdmin
      .from('sales_reps')
      .select('user_id, full_name, email')
      .eq('id', rep_id)
      .single();

    if (repError || !salesRep) {
      console.error('Sales rep lookup error:', repError);
      return new Response(
        JSON.stringify({ error: 'Sales rep not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset the password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      salesRep.user_id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to reset password: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark the rep as needing to reset password
    const { error: flagError } = await supabaseAdmin
      .from('sales_reps')
      .update({ force_password_reset: true })
      .eq('id', rep_id);

    if (flagError) {
      console.warn('Failed to set force_password_reset flag:', flagError);
    }

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      event_id: `evt-${Date.now()}`,
      actor_type: 'admin',
      actor_id: requestingUser.id,
      action: 'reset_sales_rep_password',
      metadata: { 
        rep_id, 
        rep_name: salesRep.full_name,
        rep_email: salesRep.email 
      },
    });

    console.log('Password reset successful for:', salesRep.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password reset for ${salesRep.full_name}`,
        email: salesRep.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
