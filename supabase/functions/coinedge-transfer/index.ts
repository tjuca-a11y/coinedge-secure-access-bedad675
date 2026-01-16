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

// ============ Rate Limiting (Stricter for transfers) ============
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 transfers per minute (stricter)

function checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(clientId);

  if (rateLimitStore.size > 500) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now >= v.resetAt) rateLimitStore.delete(k);
    }
  }

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetAt: entry.resetAt };
}

function getClientId(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';
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

// Check if we have eligible BTC inventory (held > 1 hour)
async function getEligibleInventory(supabase: any): Promise<number> {
  const { data } = await supabase
    .from('inventory_lots')
    .select('amount_btc_available')
    .lte('eligible_at', new Date().toISOString())
    .gt('amount_btc_available', 0);
  
  if (!data || data.length === 0) return 0;
  return data.reduce((sum: number, lot: { amount_btc_available: number }) => sum + lot.amount_btc_available, 0);
}

// Allocate BTC from eligible lots using FIFO
async function allocateBtcFifo(supabase: any, btcAmount: number, fulfillmentId: string): Promise<boolean> {
  // Get eligible lots ordered by received_at (FIFO)
  const { data: lots, error } = await supabase
    .from('inventory_lots')
    .select('id, amount_btc_available')
    .lte('eligible_at', new Date().toISOString())
    .gt('amount_btc_available', 0)
    .order('received_at', { ascending: true });

  if (error || !lots) {
    console.error('Failed to get inventory lots:', error);
    return false;
  }

  let remaining = btcAmount;
  for (const lot of lots) {
    if (remaining <= 0) break;
    
    const allocateAmount = Math.min(remaining, lot.amount_btc_available);
    
    // Create allocation record
    const { error: allocError } = await supabase.from('lot_allocations').insert({
      lot_id: lot.id,
      fulfillment_id: fulfillmentId,
      amount_btc_allocated: allocateAmount,
    });
    
    if (allocError) {
      console.error('Failed to create allocation:', allocError);
      return false;
    }
    
    // Update lot available amount
    const { error: updateError } = await supabase
      .from('inventory_lots')
      .update({ amount_btc_available: lot.amount_btc_available - allocateAmount })
      .eq('id', lot.id);
    
    if (updateError) {
      console.error('Failed to update lot:', updateError);
      return false;
    }
    
    remaining -= allocateAmount;
  }
  
  return remaining <= 0;
}

// BTC transfer to user - creates fulfillment order and auto-fills if eligible inventory exists
async function createAndFulfillBtcOrder(
  supabase: any,
  destinationAddress: string,
  btcAmount: number,
  usdValue: number,
  btcPrice: number,
  customerProfileId: string,
  swapOrderId: string
): Promise<{ success: boolean; fulfillmentId?: string; autoFilled: boolean; txHash?: string; error?: string }> {
  try {
    // Check eligible inventory first
    const eligibleBtc = await getEligibleInventory(supabase);
    const canAutoFill = eligibleBtc >= btcAmount;

    console.log(`Eligible BTC: ${eligibleBtc}, Required: ${btcAmount}, Can auto-fill: ${canAutoFill}`);

    // Create fulfillment order (FK expects profiles.id)
    const { data, error } = await supabase.from('fulfillment_orders').insert({
      customer_id: customerProfileId,
      order_type: 'BUY_ORDER',
      destination_wallet_address: destinationAddress,
      btc_amount: btcAmount,
      btc_price_used: btcPrice,
      usd_value: usdValue,
      status: canAutoFill ? 'READY_TO_SEND' : 'WAITING_INVENTORY',
      kyc_status: 'APPROVED',
    }).select().single();

    if (error) throw error;

    console.log('Created fulfillment order:', data.id, 'status:', data.status);

    // If we can auto-fill, allocate inventory and mark as sent
    if (canAutoFill) {
      const allocated = await allocateBtcFifo(supabase, btcAmount, data.id);

      if (allocated) {
        // Generate mock tx hash for party-to-party transfer
        const txHash = `p2p_${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`;

        // Mark fulfillment as SENT
        await supabase.from('fulfillment_orders').update({
          status: 'SENT',
          tx_hash: txHash,
          sent_at: new Date().toISOString(),
        }).eq('id', data.id);

        // Update swap order to COMPLETED
        await supabase.from('customer_swap_orders').update({
          status: 'COMPLETED',
          tx_hash: txHash,
          inventory_allocated: true,
          completed_at: new Date().toISOString(),
        }).eq('id', swapOrderId);

        console.log('Auto-filled order with tx_hash:', txHash);
        return { success: true, fulfillmentId: data.id, autoFilled: true, txHash };
      }
    }

    return { success: true, fulfillmentId: data.id, autoFilled: false };
  } catch (error) {
    console.error('Failed to create/fulfill order:', error);
    return { success: false, autoFilled: false, error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const clientId = getClientId(req);
    const rateLimitResult = checkRateLimit(clientId);
    
    const rateLimitHeaders = {
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetAt / 1000).toString(),
    };

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Service client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    let userId: string | null = null;
    let userEmail: string | null = null;
    
    // Try Supabase auth first
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: claims, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (!claimsError && claims?.claims?.sub) {
      userId = claims.claims.sub;
    } else {
      // Try Dynamic token - decode JWT to get email
      try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        userEmail = payload.email || payload.verified_credentials?.[0]?.email;
        console.log('Dynamic token detected, email:', userEmail);
      } catch (decodeError) {
        console.error('Failed to decode token:', decodeError);
      }
    }

    if (!userId && !userEmail) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get profile - by user_id for Supabase users, by email for Dynamic users
    let profile: { id: string; kyc_status: string; btc_address: string | null; usdc_address: string | null; user_id: string } | null = null;

    if (userId) {
      const { data } = await supabase
        .from('profiles')
        .select('id, kyc_status, btc_address, usdc_address, user_id')
        .eq('user_id', userId)
        .single();
      profile = data;
    } else if (userEmail) {
      const { data } = await supabase
        .from('profiles')
        .select('id, kyc_status, btc_address, usdc_address, user_id')
        .eq('email', userEmail)
        .single();
      profile = data;
      if (data) userId = data.user_id;
    }

    if (!profile || profile.kyc_status !== 'approved') {
      return new Response(JSON.stringify({ error: 'KYC approval required' }), {
        status: 403,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      });
    }

    // auth user id for swap orders + audit
    const customerId = userId || profile.user_id;
    // profile.id for fulfillment_orders FK
    const customerProfileId = profile.id;

    const body: TransferRequest = await req.json();
    const { quoteId, type, signature, userBtcAddress, userEthAddress, bankAccountId, voucherCode, usdcAmount, btcAmount, btcPrice, feeUsdc } = body;

    if (!quoteId || !type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For SELL_BTC and CASHOUT, signature is required
    if ((type === 'SELL_BTC' || type === 'CASHOUT') && !signature) {
      return new Response(JSON.stringify({ error: 'User signature required for this transfer type' }), {
        status: 400,
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Get CoinEdge treasury addresses from system_settings
    const treasuryAddresses = await getTreasuryAddresses(supabase);

    // Process based on transfer type
    switch (type) {
      case 'BUY_BTC': {
        const destinationAddress = userBtcAddress || profile.btc_address;
        if (!destinationAddress) {
          return new Response(JSON.stringify({ error: 'No BTC wallet address found' }), {
            status: 400,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        const btcAmountToSend = btcAmount || 0;
        const usdcAmountCharged = usdcAmount || 0;
        const priceUsed = btcPrice || 0;
        const fee = feeUsdc || 0;

        // Create order record
        const { data: order, error: orderError } = await supabase.from('customer_swap_orders').insert({
          customer_id: customerId,
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
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create fulfillment order and auto-fill if eligible inventory exists
        const fulfillmentResult = await createAndFulfillBtcOrder(
          supabase,
          destinationAddress,
          btcAmountToSend,
          usdcAmountCharged,
          priceUsed,
          customerProfileId,
          order.id
        );
        
        // If fulfillment creation failed, mark swap order failed and return error
        if (!fulfillmentResult.success) {
          await supabase.from('customer_swap_orders').update({
            status: 'FAILED',
            failed_reason: fulfillmentResult.error || 'Fulfillment creation failed',
          }).eq('id', order.id);

          return new Response(JSON.stringify({
            success: false,
            orderId: order.order_id,
            status: 'FAILED',
            error: fulfillmentResult.error || 'Fulfillment creation failed',
          }), {
            status: 500,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update swap order status based on result
        if (!fulfillmentResult.autoFilled) {
          await supabase.from('customer_swap_orders').update({
            status: 'PROCESSING',
          }).eq('id', order.id);
        }

        // Log audit event
        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_BUY_BTC',
          actor_type: 'system',
          actor_id: customerId,
          event_id: orderId,
          metadata: {
            quote_id: quoteId,
            destination: destinationAddress,
            btc_amount: btcAmountToSend,
            usdc_amount: usdcAmountCharged,
            btc_price: priceUsed,
            fulfillment_created: true,
            fulfillment_id: fulfillmentResult.fulfillmentId,
            auto_filled: fulfillmentResult.autoFilled,
            tx_hash: fulfillmentResult.txHash,
          },
        });

        return new Response(JSON.stringify({
          success: true,
          orderId: order.order_id,
          status: fulfillmentResult.autoFilled ? 'COMPLETED' : 'PROCESSING',
          message: fulfillmentResult.autoFilled
            ? 'BTC purchase completed! Your BTC has been sent.'
            : 'BTC purchase submitted. Your order is being processed.',
          btcAmount: btcAmountToSend,
          usdcAmount: usdcAmountCharged,
          btcPrice: priceUsed,
          txHash: fulfillmentResult.txHash,
        }), {
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'SELL_BTC': {
        const btcAmountToReceive = btcAmount || 0;
        const usdcAmountToCredit = usdcAmount || 0;
        const priceUsed = btcPrice || 0;
        const fee = feeUsdc || 0;

        if (!treasuryAddresses.btc) {
          return new Response(JSON.stringify({ 
            error: 'CoinEdge BTC receiving address not configured. Please contact support.' 
          }), {
            status: 503,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: order, error: orderError } = await supabase.from('customer_swap_orders').insert({
          customer_id: customerId,
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
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_SELL_BTC',
          actor_type: 'system',
          actor_id: customerId,
          event_id: orderId,
          metadata: {
            quote_id: quoteId,
            user_signed: true,
            btc_amount: btcAmountToReceive,
            usdc_to_credit: usdcAmountToCredit,
            btc_price: priceUsed,
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
          btcPrice: priceUsed,
        }), {
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'REDEEM': {
        if (!voucherCode) {
          return new Response(JSON.stringify({ error: 'Voucher code required' }), {
            status: 400,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        const destinationAddress = userBtcAddress || profile.btc_address;
        if (!destinationAddress) {
          return new Response(JSON.stringify({ error: 'No BTC wallet address found' }), {
            status: 400,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate bitcard exists and is active
        const cleanVoucherCode = voucherCode.trim().toUpperCase();
        const { data: bitcard, error: bitcardError } = await supabase
          .from('bitcards')
          .select('*')
          .eq('bitcard_id', cleanVoucherCode)
          .single();

        if (bitcardError || !bitcard) {
          return new Response(JSON.stringify({ error: 'Voucher not found' }), {
            status: 404,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (bitcard.status !== 'active') {
          let errorMessage = 'Voucher is not valid';
          switch (bitcard.status) {
            case 'issued': errorMessage = 'Voucher has not been activated yet'; break;
            case 'redeemed': errorMessage = 'Voucher has already been redeemed'; break;
            case 'expired': errorMessage = 'Voucher has expired'; break;
            case 'canceled': errorMessage = 'Voucher has been canceled'; break;
          }
          return new Response(JSON.stringify({ error: errorMessage, status: bitcard.status }), {
            status: 400,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get current BTC price
        const { getBtcPrice } = await import('../_shared/price-oracle.ts');
        const priceResult = await getBtcPrice();
        const btcPrice = priceResult.price;
        const usdValue = bitcard.usd_value || 0;
        const btcAmount = usdValue / btcPrice;

        // Mark bitcard as redeemed FIRST (prevent double redemption)
        const { error: updateError } = await supabase
          .from('bitcards')
          .update({ 
            status: 'redeemed', 
            redeemed_at: new Date().toISOString() 
          })
          .eq('id', bitcard.id)
          .eq('status', 'active'); // Only update if still active (race condition protection)

        if (updateError) {
          console.error('Failed to mark bitcard as redeemed:', updateError);
          return new Response(JSON.stringify({ error: 'Failed to process redemption' }), {
            status: 500,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create fulfillment order for BTC redemption
        const { data: fulfillmentOrder, error: fulfillmentError } = await supabase
          .from('fulfillment_orders')
          .insert({
            customer_id: profile.id,
            order_type: 'BITCARD_REDEMPTION',
            bitcard_id: bitcard.id,
            destination_wallet_address: destinationAddress,
            btc_amount: btcAmount,
            btc_price_used: btcPrice,
            usd_value: usdValue,
            status: 'SUBMITTED',
            kyc_status: 'APPROVED',
          })
          .select()
          .single();

        if (fulfillmentError) {
          console.error('Failed to create fulfillment order:', fulfillmentError);
          // Rollback bitcard status
          await supabase.from('bitcards').update({ status: 'active', redeemed_at: null }).eq('id', bitcard.id);
          return new Response(JSON.stringify({ error: 'Failed to create redemption order' }), {
            status: 500,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Try to auto-fill from eligible inventory
        const eligibleBtc = await getEligibleInventory(supabase);
        let autoFilled = false;
        let txHash: string | undefined;

        if (eligibleBtc >= btcAmount) {
          const allocated = await allocateBtcFifo(supabase, btcAmount, fulfillmentOrder.id);
          
          if (allocated) {
            txHash = `redeem_${crypto.randomUUID().replace(/-/g, '').slice(0, 32)}`;
            
            await supabase.from('fulfillment_orders').update({
              status: 'SENT',
              tx_hash: txHash,
              sent_at: new Date().toISOString(),
            }).eq('id', fulfillmentOrder.id);

            autoFilled = true;
          }
        }

        // Update status if not auto-filled
        if (!autoFilled) {
          await supabase.from('fulfillment_orders').update({
            status: 'WAITING_INVENTORY',
          }).eq('id', fulfillmentOrder.id);
        }

        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_REDEEM',
          actor_type: 'system',
          actor_id: customerId,
          event_id: orderId,
          metadata: {
            voucher_code: cleanVoucherCode,
            bitcard_id: bitcard.id,
            usd_value: usdValue,
            btc_amount: btcAmount,
            btc_price: btcPrice,
            destination: destinationAddress,
            fulfillment_id: fulfillmentOrder.id,
            auto_filled: autoFilled,
            tx_hash: txHash,
            status: autoFilled ? 'COMPLETED' : 'PENDING_INVENTORY',
          },
        });

        return new Response(JSON.stringify({
          success: true,
          orderId: fulfillmentOrder.id,
          status: autoFilled ? 'COMPLETED' : 'PENDING',
          message: autoFilled 
            ? 'Voucher redeemed! BTC has been sent to your wallet.'
            : 'Voucher redeemed! BTC will be sent to your wallet shortly.',
          btcAmount,
          usdValue,
          btcPrice,
          txHash,
          autoFilled,
        }), {
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'CASHOUT': {
        if (!bankAccountId) {
          return new Response(JSON.stringify({ error: 'Bank account selection required' }), {
            status: 400,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!treasuryAddresses.usdc) {
          return new Response(JSON.stringify({ 
            error: 'CoinEdge USDC receiving address not configured. Please contact support.' 
          }), {
            status: 503,
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        const sourceAmount = usdcAmount || 0;
        const fee = feeUsdc || 0;
        const usdToSend = sourceAmount - fee;

        const { data: cashoutOrder, error: cashoutError } = await supabase.from('cashout_orders').insert({
          user_id: customerId,
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
            headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabase.from('audit_logs').insert({
          action: 'COINEDGE_TRANSFER_CASHOUT',
          actor_type: 'system',
          actor_id: customerId,
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
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid transfer type' }), {
          status: 400,
          headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
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
