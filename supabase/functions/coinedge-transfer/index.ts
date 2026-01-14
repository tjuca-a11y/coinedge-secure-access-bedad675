import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransferRequest {
  quoteId: string;
  type: 'BUY_BTC' | 'SELL_BTC' | 'REDEEM' | 'CASHOUT';
  signature?: string;
  userBtcAddress?: string;
  userEthAddress?: string;
  bankAccountId?: string;
  voucherCode?: string;
  usdcAmount?: number;
  btcAmount?: number;
  btcPrice?: number;
  feeUsdc?: number;
}

// Helper to get CoinEdge treasury addresses from system_settings
async function getTreasuryAddresses(supabase: any) {
  const { data: settings } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['coinedge_btc_address', 'coinedge_usdc_address']);
  
  const addresses: { btc?: string; usdc?: string } = {};
  settings?.forEach((s: { setting_key: string; setting_value: string }) => {
    if (s.setting_key === 'coinedge_btc_address') addresses.btc = s.setting_value;
    if (s.setting_key === 'coinedge_usdc_address') addresses.usdc = s.setting_value;
  });
  
  return addresses;
}

// Placeholder for direct blockchain BTC transfer (CoinEdge → User)
// TODO: Implement with bitcoinjs-lib when treasury wallet is ready
async function sendBtcToUser(
  _destinationAddress: string,
  _btcAmount: number,
  _orderId: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  // This will be implemented when:
  // 1. CoinEdge treasury BTC address is configured
  // 2. Private key is securely stored as COINEDGE_BTC_PRIVATE_KEY secret
  // 3. bitcoinjs-lib is integrated for transaction signing
  
  console.log('sendBtcToUser: Treasury wallet not configured yet');
  return {
    success: false,
    error: 'Treasury wallet not configured. BTC transfers pending admin setup.',
  };
}

// Placeholder for monitoring incoming BTC transfers (User → CoinEdge)
// TODO: Implement with Blockstream API webhook or polling
async function monitorIncomingBtc(
  _fromAddress: string,
  _expectedAmount: number,
  _orderId: string
): Promise<{ detected: boolean; txHash?: string }> {
  // This will poll Blockstream API for incoming transactions
  // to the CoinEdge treasury address
  console.log('monitorIncomingBtc: Monitoring not implemented yet');
  return { detected: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Client for auth validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });
    
    // Service client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claims.claims.sub;

    // Check KYC status
    const { data: profile } = await supabase
      .from('profiles')
      .select('kyc_status, btc_address, usdc_address')
      .eq('user_id', userId)
      .single();

    if (!profile || profile.kyc_status !== 'approved') {
      return new Response(JSON.stringify({ error: 'KYC approval required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: TransferRequest = await req.json();
    const { quoteId, type, signature, userBtcAddress, userEthAddress, bankAccountId, voucherCode, usdcAmount, btcAmount, btcPrice, feeUsdc } = body;

    if (!quoteId || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For SELL_BTC and CASHOUT, signature is required
    if ((type === 'SELL_BTC' || type === 'CASHOUT') && !signature) {
      return new Response(JSON.stringify({ error: 'User signature required for this transfer type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TODO: Validate quote from cache/database (check expiry, amounts, etc.)
    // For now, we'll proceed with the transfer logic

    const orderId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Get CoinEdge treasury addresses from system_settings
    const treasuryAddresses = await getTreasuryAddresses(supabase);

    // Process based on transfer type
    switch (type) {
      case 'BUY_BTC': {
        // CoinEdge sends BTC to user's wallet (direct blockchain transfer)
        const destinationAddress = userBtcAddress || profile.btc_address;
        if (!destinationAddress) {
          return new Response(JSON.stringify({ error: 'No BTC wallet address found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Use amounts from quote
        const btcAmountToSend = btcAmount || 0;
        const usdcAmountCharged = usdcAmount || 0;
        const priceUsed = btcPrice || 93500;
        const fee = feeUsdc || 0;

        // Create order record
        const { data: order, error: orderError } = await supabase.from('customer_swap_orders').insert({
          customer_id: userId,
          order_type: 'BUY_BTC',
          usdc_amount: usdcAmountCharged,
          btc_amount: btcAmountToSend,
          btc_price_at_order: priceUsed,
          fee_usdc: fee,
          status: 'PENDING',
          destination_address: destinationAddress,
        }).select().single();

        if (orderError) {
          console.error('Failed to create order:', orderError);
          return new Response(JSON.stringify({ error: 'Failed to create order' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Attempt to send BTC (will fail gracefully if treasury not configured)
        const transferResult = await sendBtcToUser(destinationAddress, btcAmountToSend, order.id);
        
        // Update order with transfer result
        if (transferResult.success && transferResult.txHash) {
          await supabase.from('customer_swap_orders').update({
            status: 'PROCESSING',
            tx_hash: transferResult.txHash,
          }).eq('id', order.id);
        }

        // Log audit event
        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_BUY_BTC',
          actor_type: 'system',
          actor_id: userId,
          event_id: orderId,
          metadata: {
            quote_id: quoteId,
            destination: destinationAddress,
            btc_amount: btcAmountToSend,
            usdc_amount: usdcAmountCharged,
            transfer_initiated: transferResult.success,
            tx_hash: transferResult.txHash,
            status: transferResult.success ? 'TRANSFER_INITIATED' : 'AWAITING_TREASURY_CONFIG',
          },
        });

        return new Response(JSON.stringify({
          success: true,
          orderId: order.order_id,
          status: transferResult.success ? 'PROCESSING' : 'PENDING',
          message: transferResult.success 
            ? 'BTC purchase initiated. Transaction broadcasting to network.'
            : 'BTC purchase recorded. Transfer pending treasury configuration.',
          txHash: transferResult.txHash || null,
          btcAmount: btcAmountToSend,
          usdcAmount: usdcAmountCharged,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'SELL_BTC': {
        // User sends BTC to CoinEdge wallet (requires user signature)
        // CoinEdge receives BTC and credits USDC to user
        
        const btcAmountToReceive = btcAmount || 0;
        const usdcAmountToCredit = usdcAmount || 0;
        const priceUsed = btcPrice || 93500;
        const fee = feeUsdc || 0;

        // Check if treasury address is configured
        if (!treasuryAddresses.btc) {
          return new Response(JSON.stringify({ 
            error: 'CoinEdge BTC receiving address not configured. Please contact support.' 
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create order record
        const { data: order, error: orderError } = await supabase.from('customer_swap_orders').insert({
          customer_id: userId,
          order_type: 'SELL_BTC',
          usdc_amount: usdcAmountToCredit,
          btc_amount: btcAmountToReceive,
          btc_price_at_order: priceUsed,
          fee_usdc: fee,
          status: 'PENDING',
          source_usdc_address: userBtcAddress || profile.btc_address,
        }).select().single();

        if (orderError) {
          console.error('Failed to create order:', orderError);
          return new Response(JSON.stringify({ error: 'Failed to create order' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Log audit event
        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_SELL_BTC',
          actor_type: 'system',
          actor_id: userId,
          event_id: orderId,
          metadata: {
            quote_id: quoteId,
            user_signed: true,
            btc_amount: btcAmountToReceive,
            usdc_to_credit: usdcAmountToCredit,
            coinedge_btc_address: treasuryAddresses.btc,
            status: 'AWAITING_USER_TRANSFER',
          },
        });

        return new Response(JSON.stringify({
          success: true,
          orderId: order.order_id,
          status: 'AWAITING_TRANSFER',
          message: 'BTC sale initiated. Send BTC to the address below to complete the transaction.',
          coinedgeBtcAddress: treasuryAddresses.btc,
          btcAmount: btcAmountToReceive,
          usdcAmount: usdcAmountToCredit,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'REDEEM': {
        // Validate voucher and send BTC to user
        if (!voucherCode) {
          return new Response(JSON.stringify({ error: 'Voucher code required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const destinationAddress = userBtcAddress || profile.btc_address;
        if (!destinationAddress) {
          return new Response(JSON.stringify({ error: 'No BTC wallet address found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // TODO: Validate voucher from bitcards table
        // TODO: Mark voucher as redeemed
        // TODO: Create fulfillment order

        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_REDEEM',
          actor_type: 'system',
          actor_id: userId,
          event_id: orderId,
          metadata: {
            voucher_code: voucherCode,
            destination: destinationAddress,
            status: 'INITIATED',
          },
        });

        return new Response(JSON.stringify({
          success: true,
          orderId,
          status: 'PENDING',
          message: 'Voucher redemption initiated. BTC will be sent to your wallet.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'CASHOUT': {
        // User sends USDC to CoinEdge, CoinEdge initiates bank payout via Plaid
        if (!bankAccountId) {
          return new Response(JSON.stringify({ error: 'Bank account selection required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Check if treasury USDC address is configured
        if (!treasuryAddresses.usdc) {
          return new Response(JSON.stringify({ 
            error: 'CoinEdge USDC receiving address not configured. Please contact support.' 
          }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const sourceAmount = usdcAmount || 0;
        const fee = feeUsdc || 0;
        const usdToSend = sourceAmount - fee;

        // Create cashout order
        const { data: cashoutOrder, error: cashoutError } = await supabase.from('cashout_orders').insert({
          user_id: userId,
          bank_account_id: bankAccountId,
          source_asset: 'USDC',
          source_amount: sourceAmount,
          usd_amount: usdToSend,
          fee_usd: fee,
          status: 'pending',
        }).select().single();

        if (cashoutError) {
          console.error('Failed to create cashout order:', cashoutError);
          return new Response(JSON.stringify({ error: 'Failed to create cashout order' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_CASHOUT',
          actor_type: 'system',
          actor_id: userId,
          event_id: orderId,
          metadata: {
            bank_account_id: bankAccountId,
            user_signed: true,
            source_amount: sourceAmount,
            usd_to_bank: usdToSend,
            fee: fee,
            coinedge_usdc_address: treasuryAddresses.usdc,
            status: 'AWAITING_USDC_TRANSFER',
          },
        });

        return new Response(JSON.stringify({
          success: true,
          orderId: cashoutOrder.order_id,
          status: 'AWAITING_TRANSFER',
          message: 'Cash out initiated. Send USDC to the address below to complete.',
          coinedgeUsdcAddress: treasuryAddresses.usdc,
          usdcAmount: sourceAmount,
          usdAmount: usdToSend,
          fee: fee,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid transfer type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error: unknown) {
    console.error('Transfer error:', error);
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
