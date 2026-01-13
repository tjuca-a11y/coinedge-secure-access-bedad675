import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DynamicAuthRequest {
  dynamicUserId: string;
  email?: string;
  walletAddresses: Array<{ address: string; chain: 'BTC' | 'ETH' }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const dynamicPublicKey = Deno.env.get('DYNAMIC_PUBLIC_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Dynamic JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing Dynamic token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dynamicToken = authHeader.replace('Bearer ', '');

    // In production: Validate Dynamic JWT using JWKS
    // For now, we trust the token and extract the user info from the body
    // TODO: Implement proper JWT validation with Dynamic's JWKS endpoint
    // https://app.dynamic.xyz/api/v0/sdk/{environmentId}/.well-known/jwks

    const body: DynamicAuthRequest = await req.json();
    const { dynamicUserId, email, walletAddresses } = body;

    if (!dynamicUserId) {
      return new Response(JSON.stringify({ error: 'Missing Dynamic user ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already exists by Dynamic ID (stored in user metadata)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let supabaseUser = existingUsers?.users?.find(
      u => u.user_metadata?.dynamic_user_id === dynamicUserId
    );

    const btcAddress = walletAddresses.find(w => w.chain === 'BTC')?.address;
    const ethAddress = walletAddresses.find(w => w.chain === 'ETH')?.address;

    if (!supabaseUser) {
      // Create new Supabase user linked to Dynamic
      const userEmail = email || `${dynamicUserId}@dynamic.coinedge.io`;
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true, // Auto-confirm since they're authenticated via Dynamic
        user_metadata: {
          dynamic_user_id: dynamicUserId,
          wallet_btc: btcAddress,
          wallet_eth: ethAddress,
        },
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      supabaseUser = newUser.user;

      // Update profile with wallet addresses
      if (supabaseUser) {
        await supabase.from('profiles').update({
          btc_address: btcAddress,
          usdc_address: ethAddress,
          wallet_created_at: new Date().toISOString(),
        }).eq('user_id', supabaseUser.id);
      }
    } else {
      // Update existing user's wallet addresses if changed
      await supabase.auth.admin.updateUserById(supabaseUser.id, {
        user_metadata: {
          ...supabaseUser.user_metadata,
          wallet_btc: btcAddress,
          wallet_eth: ethAddress,
        },
      });

      // Sync to profile
      await supabase.from('profiles').update({
        btc_address: btcAddress || supabaseUser.user_metadata?.wallet_btc,
        usdc_address: ethAddress || supabaseUser.user_metadata?.wallet_eth,
      }).eq('user_id', supabaseUser.id);
    }

    if (!supabaseUser) {
      return new Response(JSON.stringify({ error: 'Failed to get or create user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a Supabase session for the user
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: supabaseUser.email!,
      options: {
        redirectTo: `${req.headers.get('origin') || 'https://coinedge.app'}/`,
      },
    });

    if (sessionError) {
      console.error('Error generating session:', sessionError);
      // Fallback: Return user ID so frontend can handle auth differently
      return new Response(JSON.stringify({ 
        userId: supabaseUser.id,
        message: 'User synced but session generation failed',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract token from magic link for immediate login
    // In production, you might want to use a different approach
    // like generating a custom JWT that Supabase will accept

    return new Response(JSON.stringify({
      success: true,
      userId: supabaseUser.id,
      message: 'User synced successfully',
      // Note: For proper session, the frontend should handle the magic link
      // or implement a custom JWT exchange mechanism
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Dynamic auth sync error:', error);
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
