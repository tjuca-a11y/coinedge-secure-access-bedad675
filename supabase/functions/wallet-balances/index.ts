import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// USDC Contract on Ethereum Mainnet
const USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

interface BlockstreamAddressInfo {
  chain_stats: {
    funded_txo_sum: number;
    spent_txo_sum: number;
  };
  mempool_stats: {
    funded_txo_sum: number;
    spent_txo_sum: number;
  };
}

async function fetchBtcBalance(address: string): Promise<number> {
  try {
    // Use Blockstream API for Bitcoin balance (free, no API key required)
    const response = await fetch(`https://blockstream.info/api/address/${address}`);
    
    if (!response.ok) {
      console.error('Blockstream API error:', response.status, response.statusText);
      return 0;
    }
    
    const data: BlockstreamAddressInfo = await response.json();
    
    // Calculate confirmed balance (in satoshis, convert to BTC)
    const confirmedBalance = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000;
    
    // Include pending/mempool balance
    const pendingBalance = (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 100000000;
    
    return confirmedBalance + pendingBalance;
  } catch (error) {
    console.error('Error fetching BTC balance:', error);
    return 0;
  }
}

async function fetchUsdcBalance(address: string): Promise<number> {
  const alchemyApiKey = Deno.env.get('ALCHEMY_API_KEY');
  
  if (!alchemyApiKey) {
    console.warn('ALCHEMY_API_KEY not configured, returning 0 USDC balance');
    return 0;
  }
  
  try {
    const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
    
    // Prepare balanceOf(address) call data
    // Function selector for balanceOf(address): 0x70a08231
    // Address parameter (padded to 32 bytes)
    const addressWithoutPrefix = address.toLowerCase().replace('0x', '');
    const paddedAddress = addressWithoutPrefix.padStart(64, '0');
    const data = `0x70a08231${paddedAddress}`;
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: USDC_CONTRACT,
            data: data
          },
          'latest'
        ],
        id: 1
      })
    });
    
    if (!response.ok) {
      console.error('Alchemy API error:', response.status, response.statusText);
      return 0;
    }
    
    const result = await response.json();
    
    if (result.error) {
      console.error('Alchemy RPC error:', result.error);
      return 0;
    }
    
    // USDC has 6 decimals
    const balance = parseInt(result.result, 16) / 1000000;
    return balance;
  } catch (error) {
    console.error('Error fetching USDC balance:', error);
    return 0;
  }
}

// Test emails that should receive mock balances for testing
const TEST_EMAILS = [
  'demo@user.coinedge.com',
  'tjuca+dynamic_test@coinedge.io',
];

// Mock balances for test accounts
const MOCK_BALANCES = {
  btc: 0.05432,    // ~$5,000 worth at typical BTC prices
  usdc: 2500.00,   // $2,500 USDC for testing buy flows
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to get user from Supabase auth first
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    let userEmail: string | null = null;
    let profile: { btc_address: string | null; usdc_address: string | null; email: string | null } | null = null;

    if (user && !userError) {
      // Supabase user - get profile by user_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('btc_address, usdc_address, email')
        .eq('user_id', user.id)
        .single();
      
      profile = profileData;
      userEmail = user.email || profile?.email || null;
    } else {
      // Dynamic user - try to decode JWT to get email, or look up by token
      // For Dynamic users, we need to find the profile by looking at the JWT claims
      const token = authHeader.replace('Bearer ', '');
      try {
        // Decode JWT payload (without verification - edge function trusts the auth layer)
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        const dynamicEmail = payload.email || payload.verified_credentials?.[0]?.email;
        
        if (dynamicEmail) {
          // Use service role to query profile by email
          const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
          const { data: profileData } = await adminSupabase
            .from('profiles')
            .select('btc_address, usdc_address, email')
            .eq('email', dynamicEmail)
            .single();
          
          profile = profileData;
          userEmail = dynamicEmail;
        }
      } catch (decodeError) {
        console.error('Error decoding Dynamic token:', decodeError);
      }
    }

    if (!profile) {
      return new Response(JSON.stringify({ 
        btc: 0, 
        usdc: 0,
        message: 'No profile found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this is a test account - return mock balances
    const isTestAccount = userEmail && TEST_EMAILS.some(email => 
      userEmail!.toLowerCase() === email.toLowerCase()
    );

    if (isTestAccount) {
      console.log(`Returning mock balances for test account: ${userEmail}`);
      return new Response(JSON.stringify({
        btc: MOCK_BALANCES.btc,
        usdc: MOCK_BALANCES.usdc,
        btcAddress: profile.btc_address,
        usdcAddress: profile.usdc_address,
        lastUpdated: new Date().toISOString(),
        isTestAccount: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch real balances from blockchain in parallel for non-test accounts
    const [btcBalance, usdcBalance] = await Promise.all([
      profile.btc_address ? fetchBtcBalance(profile.btc_address) : Promise.resolve(0),
      profile.usdc_address ? fetchUsdcBalance(profile.usdc_address) : Promise.resolve(0),
    ]);

    return new Response(JSON.stringify({
      btc: btcBalance,
      usdc: usdcBalance,
      btcAddress: profile.btc_address,
      usdcAddress: profile.usdc_address,
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Balance fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: errorMessage,
      btc: 0,
      usdc: 0,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
