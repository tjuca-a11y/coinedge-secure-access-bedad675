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
    const { quoteId, type, signature, userBtcAddress, userEthAddress, bankAccountId, voucherCode } = body;

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

    // Process based on transfer type
    switch (type) {
      case 'BUY_BTC': {
        // CoinEdge sends BTC to user's wallet
        // In production: Call Fireblocks API (backend-only) to send from CoinEdge vault
        
        const destinationAddress = userBtcAddress || profile.btc_address;
        if (!destinationAddress) {
          return new Response(JSON.stringify({ error: 'No BTC wallet address found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create order record
        await supabase.from('customer_swap_orders').insert({
          customer_id: userId,
          order_type: 'BUY_BTC',
          usdc_amount: 0, // TODO: Get from quote
          btc_amount: 0, // TODO: Get from quote
          btc_price_at_order: 93500, // TODO: Get from quote
          fee_usdc: 0,
          status: 'PENDING',
          destination_address: destinationAddress,
        });

        // Log audit event
        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_BUY_BTC',
          actor_type: 'system',
          actor_id: userId,
          event_id: orderId,
          metadata: {
            quote_id: quoteId,
            destination: destinationAddress,
            status: 'INITIATED',
          },
        });

        return new Response(JSON.stringify({
          success: true,
          orderId,
          status: 'PENDING',
          message: 'BTC purchase initiated. CoinEdge → Your Wallet transfer in progress.',
          txHash: null, // Will be updated when on-chain tx completes
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'SELL_BTC': {
        // User sends BTC to CoinEdge wallet (requires user signature)
        // CoinEdge receives BTC and credits USDC to user
        
        // Create order record
        await supabase.from('customer_swap_orders').insert({
          customer_id: userId,
          order_type: 'SELL_BTC',
          usdc_amount: 0, // TODO: Get from quote
          btc_amount: 0, // TODO: Get from quote
          btc_price_at_order: 93500,
          fee_usdc: 0,
          status: 'PENDING',
          source_usdc_address: userBtcAddress || profile.btc_address,
        });

        // Log audit event
        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_SELL_BTC',
          actor_type: 'system',
          actor_id: userId,
          event_id: orderId,
          metadata: {
            quote_id: quoteId,
            user_signed: true,
            status: 'AWAITING_USER_TRANSFER',
          },
        });

        return new Response(JSON.stringify({
          success: true,
          orderId,
          status: 'PENDING',
          message: 'BTC sale initiated. Please sign the transaction in your wallet to send BTC to CoinEdge.',
          coinedgeBtcAddress: 'bc1q_coinedge_receiving_address', // TODO: Get from config
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
        // User sends USDC to CoinEdge, CoinEdge initiates bank payout
        if (!bankAccountId) {
          return new Response(JSON.stringify({ error: 'Bank account selection required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create cashout order
        await supabase.from('cashout_orders').insert({
          user_id: userId,
          bank_account_id: bankAccountId,
          source_asset: 'USDC',
          source_amount: 0, // TODO: Get from quote
          usd_amount: 0, // TODO: Get from quote
          fee_usd: 0,
          status: 'pending',
        });

        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_CASHOUT',
          actor_type: 'system',
          actor_id: userId,
          event_id: orderId,
          metadata: {
            bank_account_id: bankAccountId,
            user_signed: true,
            status: 'AWAITING_USDC_TRANSFER',
          },
        });

        return new Response(JSON.stringify({
          success: true,
          orderId,
          status: 'PENDING',
          message: 'Cash out initiated. Please sign the transaction to send USDC to CoinEdge.',
          coinedgeUsdcAddress: '0x_coinedge_usdc_receiving_address', // TODO: Get from config
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
