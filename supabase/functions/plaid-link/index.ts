import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaidRequest {
  action: 'create_link_token' | 'exchange_public_token' | 'get_accounts' | 'remove_account';
  public_token?: string;
  account_id?: string;
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
    let userId: string | null = null;
    
    // Try Supabase JWT first
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (user && !authError) {
      userId = user.id;
    } else {
      // Try to verify as Dynamic JWT and find the associated Supabase user
      try {
        // Decode the JWT to get the Dynamic user ID and email
        const jwtParts = token.split('.');
        if (jwtParts.length === 3) {
          const payload = JSON.parse(atob(jwtParts[1]));
          
          if (payload.email) {
            // Find the Supabase user by email from profiles
            const { data: profile } = await supabase
              .from('profiles')
              .select('user_id, email')
              .eq('email', payload.email)
              .maybeSingle();
              
            if (profile) {
              userId = profile.user_id;
              console.log('Dynamic user authenticated via email lookup:', payload.email);
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse Dynamic JWT:', e);
      }
    }
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: PlaidRequest = await req.json();
    const { action, public_token, account_id } = body;

    // KYC verification required for exchange_public_token (linking bank accounts)
    if (action === 'exchange_public_token') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('user_id', userId)
        .single();

      if (profile?.kyc_status !== 'approved') {
        return new Response(JSON.stringify({ 
          error: 'KYC verification required',
          code: 'KYC_REQUIRED'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Check if Plaid is configured
    if (!plaidClientId || !plaidSecret) {
      console.log('Plaid not configured - returning mock response');
      
      if (action === 'create_link_token') {
        return new Response(JSON.stringify({
          success: false,
          mock: true,
          message: 'Plaid not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to enable bank linking.',
          link_token: null
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (action === 'get_accounts') {
        // Return accounts from database for development
        const { data: accounts } = await supabase
          .from('user_bank_accounts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        return new Response(JSON.stringify({
          success: true,
          accounts: accounts || [],
          mock: !plaidClientId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        mock: true,
        message: 'Plaid not configured. Add PLAID_CLIENT_ID and PLAID_SECRET secrets.'
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

    // === PLAID API INTEGRATION ===
    
    if (action === 'create_link_token') {
      const response = await fetch(`${plaidBaseUrl}/link/token/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: plaidClientId,
          secret: plaidSecret,
          user: { client_user_id: userId },
          client_name: 'CoinEdge',
          products: ['auth', 'transfer'],
          country_codes: ['US'],
          language: 'en',
        }),
      });

      const data = await response.json();
      
      if (data.link_token) {
        return new Response(JSON.stringify({
          success: true,
          link_token: data.link_token,
          expiration: data.expiration
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: false,
        error: data.error_message || 'Failed to create link token'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_public_token') {
      if (!public_token) {
        return new Response(JSON.stringify({ error: 'Missing public_token' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Exchange public token for access token
      const exchangeResponse = await fetch(`${plaidBaseUrl}/item/public_token/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: plaidClientId,
          secret: plaidSecret,
          public_token,
        }),
      });

      const exchangeData = await exchangeResponse.json();
      
      if (!exchangeData.access_token) {
        return new Response(JSON.stringify({
          success: false,
          error: exchangeData.error_message || 'Failed to exchange token'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get account info
      const accountsResponse = await fetch(`${plaidBaseUrl}/auth/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: plaidClientId,
          secret: plaidSecret,
          access_token: exchangeData.access_token,
        }),
      });

      const accountsData = await accountsResponse.json();
      const accounts = accountsData.accounts || [];

      // Save accounts to database
      const savedAccounts: Record<string, unknown>[] = [];
      for (const account of accounts) {
        const { data: accountData } = await supabase
          .from('user_bank_accounts')
          .insert({
            user_id: userId,
            plaid_access_token: exchangeData.access_token,
            plaid_account_id: account.account_id,
            plaid_item_id: exchangeData.item_id,
            bank_name: account.name || 'Bank Account',
            account_mask: account.mask || '****',
            account_type: account.subtype === 'savings' ? 'savings' : 'checking',
            is_verified: true,
            is_primary: savedAccounts.length === 0, // First account is primary
          })
          .select()
          .single();

        if (accountData) {
          savedAccounts.push(accountData);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        accounts: savedAccounts
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_accounts') {
      const { data: accounts } = await supabase
        .from('user_bank_accounts')
        .select('id, bank_name, account_mask, account_type, is_verified, is_primary, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return new Response(JSON.stringify({
        success: true,
        accounts: accounts || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'remove_account') {
      if (!account_id) {
        return new Response(JSON.stringify({ error: 'Missing account_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify account belongs to user
      const { data: account } = await supabase
        .from('user_bank_accounts')
        .select('*')
        .eq('id', account_id)
        .eq('user_id', userId)
        .single();

      if (!account) {
        return new Response(JSON.stringify({ error: 'Account not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Remove from Plaid if access token exists
      if (account.plaid_access_token) {
        await fetch(`${plaidBaseUrl}/item/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: plaidClientId,
            secret: plaidSecret,
            access_token: account.plaid_access_token,
          }),
        });
      }

      // Delete from database
      await supabase
        .from('user_bank_accounts')
        .delete()
        .eq('id', account_id);

      return new Response(JSON.stringify({
        success: true,
        message: 'Account removed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Plaid link error:', error);
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
