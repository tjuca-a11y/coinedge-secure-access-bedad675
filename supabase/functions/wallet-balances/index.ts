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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Get user profile to get wallet addresses
    const { data: profile } = await supabase
      .from('profiles')
      .select('btc_address, usdc_address')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ 
        btc: 0, 
        usdc: 0,
        message: 'No profile found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch balances from blockchain in parallel
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
