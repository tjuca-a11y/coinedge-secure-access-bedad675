import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// USDC Contract on Ethereum Mainnet (6 decimals)
const USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase();

// Minimum confirmations required for settlement
const MIN_CONFIRMATIONS = 12;

interface VerifyRequest {
  txHash: string;
  orderId: string;
  expectedAmount: number; // in USDC (not raw)
  expectedRecipient: string; // CoinEdge USDC address
}

interface AlchemyTransferLog {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  asset: string;
  rawContract: {
    value: string;
    address: string;
    decimal: string;
  };
}

interface AlchemyBlockResponse {
  result: string; // hex block number
}

// Get current block number from Alchemy
async function getCurrentBlockNumber(alchemyApiKey: string): Promise<number> {
  const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
  
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1
    })
  });
  
  const data: AlchemyBlockResponse = await response.json();
  return parseInt(data.result, 16);
}

// Fetch transaction receipt to verify confirmations
async function getTransactionReceipt(txHash: string, alchemyApiKey: string): Promise<{
  blockNumber: number | null;
  status: boolean;
} | null> {
  const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
  
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getTransactionReceipt',
      params: [txHash],
      id: 1
    })
  });
  
  const data = await response.json();
  
  if (!data.result) return null;
  
  return {
    blockNumber: data.result.blockNumber ? parseInt(data.result.blockNumber, 16) : null,
    status: data.result.status === '0x1',
  };
}

// Verify USDC transfer using Alchemy Asset Transfers API
async function verifyUsdcTransfer(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: number,
  alchemyApiKey: string
): Promise<{
  verified: boolean;
  confirmations: number;
  actualAmount: number;
  fromAddress: string;
  error?: string;
}> {
  const rpcUrl = `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
  
  // Get transfer details using alchemy_getAssetTransfers
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'alchemy_getAssetTransfers',
      params: [{
        category: ['erc20'],
        contractAddresses: [USDC_CONTRACT],
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: '0x64', // 100
        fromBlock: '0x0',
        toBlock: 'latest',
      }],
      id: 1
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    return {
      verified: false,
      confirmations: 0,
      actualAmount: 0,
      fromAddress: '',
      error: data.error.message,
    };
  }
  
  // Search for the specific transaction
  const transfers: AlchemyTransferLog[] = data.result?.transfers || [];
  const matchingTransfer = transfers.find(t => 
    t.hash.toLowerCase() === txHash.toLowerCase() &&
    t.to.toLowerCase() === expectedRecipient.toLowerCase() &&
    t.rawContract.address.toLowerCase() === USDC_CONTRACT
  );
  
  if (!matchingTransfer) {
    // Transaction not found via asset transfers - check receipt directly
    const receipt = await getTransactionReceipt(txHash, alchemyApiKey);
    
    if (!receipt) {
      return {
        verified: false,
        confirmations: 0,
        actualAmount: 0,
        fromAddress: '',
        error: 'Transaction not found',
      };
    }
    
    if (!receipt.status) {
      return {
        verified: false,
        confirmations: 0,
        actualAmount: 0,
        fromAddress: '',
        error: 'Transaction failed',
      };
    }
    
    return {
      verified: false,
      confirmations: 0,
      actualAmount: 0,
      fromAddress: '',
      error: 'USDC transfer not found in transaction',
    };
  }
  
  // Get current block and calculate confirmations
  const currentBlock = await getCurrentBlockNumber(alchemyApiKey);
  const txBlock = parseInt(matchingTransfer.blockNum, 16);
  const confirmations = currentBlock - txBlock;
  
  // Verify amount (USDC has 6 decimals)
  const actualAmount = matchingTransfer.value;
  const amountTolerance = expectedAmount * 0.001; // 0.1% tolerance for rounding
  const amountMatch = Math.abs(actualAmount - expectedAmount) <= amountTolerance;
  
  return {
    verified: amountMatch && confirmations >= MIN_CONFIRMATIONS,
    confirmations,
    actualAmount,
    fromAddress: matchingTransfer.from,
    error: !amountMatch ? `Amount mismatch: expected ${expectedAmount}, got ${actualAmount}` : undefined,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const alchemyApiKey = Deno.env.get('ALCHEMY_API_KEY');
    
    if (!alchemyApiKey) {
      return new Response(JSON.stringify({ 
        error: 'Alchemy API key not configured',
        verified: false,
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body: VerifyRequest = await req.json();
    const { txHash, orderId, expectedAmount, expectedRecipient } = body;

    // Validate inputs
    if (!txHash || !orderId || !expectedAmount || !expectedRecipient) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Anti-replay: Check if this tx hash was already used
    const { data: existingOrder } = await supabase
      .from('customer_swap_orders')
      .select('id, order_id, status')
      .eq('tx_hash', txHash)
      .single();

    if (existingOrder) {
      return new Response(JSON.stringify({ 
        error: 'Transaction already processed',
        existingOrderId: existingOrder.order_id,
        verified: false,
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the order to verify
    const { data: order, error: orderError } = await supabase
      .from('customer_swap_orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (order.status !== 'PENDING') {
      return new Response(JSON.stringify({ 
        error: `Order already in status: ${order.status}`,
        verified: false,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the USDC transfer on-chain
    const verification = await verifyUsdcTransfer(
      txHash,
      expectedRecipient,
      expectedAmount,
      alchemyApiKey
    );

    console.log('USDC verification result:', verification);

    // Log the verification attempt
    await supabase.from('audit_logs').insert({
      action: 'USDC_TRANSFER_VERIFICATION',
      actor_type: 'system',
      event_id: orderId,
      metadata: {
        tx_hash: txHash,
        expected_amount: expectedAmount,
        actual_amount: verification.actualAmount,
        confirmations: verification.confirmations,
        required_confirmations: MIN_CONFIRMATIONS,
        verified: verification.verified,
        from_address: verification.fromAddress,
        error: verification.error,
      },
    });

    if (verification.verified) {
      // Update order with verified tx hash and move to processing
      await supabase
        .from('customer_swap_orders')
        .update({
          tx_hash: txHash,
          status: 'PROCESSING',
          source_usdc_address: verification.fromAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Create fulfillment order for BTC send
      await supabase.from('fulfillment_orders').insert({
        order_type: 'BUY_ORDER',
        customer_id: order.customer_id,
        destination_wallet_address: order.destination_address,
        usd_value: order.usdc_amount,
        btc_amount: order.btc_amount,
        btc_price_used: order.btc_price_at_order,
        status: 'SUBMITTED',
        kyc_status: 'APPROVED', // Customer must have passed KYC to reach this point
      });

      return new Response(JSON.stringify({
        verified: true,
        confirmations: verification.confirmations,
        actualAmount: verification.actualAmount,
        fromAddress: verification.fromAddress,
        status: 'PROCESSING',
        message: 'USDC payment verified. BTC transfer queued.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Not yet verified - may need more confirmations
    const response: Record<string, unknown> = {
      verified: false,
      confirmations: verification.confirmations,
      requiredConfirmations: MIN_CONFIRMATIONS,
      actualAmount: verification.actualAmount,
    };

    if (verification.error) {
      response.error = verification.error;
    } else if (verification.confirmations < MIN_CONFIRMATIONS) {
      response.message = `Waiting for confirmations: ${verification.confirmations}/${MIN_CONFIRMATIONS}`;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: errorMessage,
      verified: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});