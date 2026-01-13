import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDynamicWallet } from '@/contexts/DynamicWalletContext';
import { toast } from 'sonner';

export type TransferType = 'BUY_BTC' | 'SELL_BTC' | 'REDEEM' | 'CASHOUT';

interface QuoteRequest {
  type: TransferType;
  amount: number;
  asset: 'BTC' | 'USDC';
}

interface Quote {
  inputAmount: number;
  inputAsset: string;
  outputAmount: number;
  outputAsset: string;
  rate: number;
  fee: number;
  feeAsset: string;
  expiresAt: string;
  quoteId: string;
}

interface TransferRequest {
  quoteId: string;
  type: TransferType;
  signature?: string;
}

interface TransferResult {
  success: boolean;
  txHash?: string;
  orderId?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  message?: string;
}

export const useCoinEdgeTransfer = () => {
  const { signMessage, btcWallet, ethWallet, refreshBalances } = useDynamicWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);

  // Get a quote for a transfer
  const getQuote = useCallback(async (request: QuoteRequest): Promise<Quote | null> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please connect your wallet first');
        return null;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coinedge-quote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get quote');
      }

      const quoteData = await response.json();
      setQuote(quoteData);
      return quoteData;
    } catch (error) {
      console.error('Error getting quote:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get quote');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Execute a transfer (requires signing for user-initiated sends)
  const executeTransfer = useCallback(async (request: TransferRequest): Promise<TransferResult> => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please connect your wallet first');
        return { success: false, status: 'FAILED', message: 'Not authenticated' };
      }

      // For SELL_BTC and CASHOUT, user must sign the transfer
      let signature: string | undefined;
      
      if (request.type === 'SELL_BTC' || request.type === 'CASHOUT') {
        const messageToSign = `CoinEdge Transfer\nQuote ID: ${request.quoteId}\nTimestamp: ${Date.now()}`;
        const chain = request.type === 'CASHOUT' ? 'ETH' : 'BTC';
        
        const sig = await signMessage(messageToSign, chain);
        if (!sig) {
          return { success: false, status: 'FAILED', message: 'User rejected signing' };
        }
        signature = sig;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coinedge-transfer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ...request,
            signature,
            userBtcAddress: btcWallet?.address,
            userEthAddress: ethWallet?.address,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Transfer failed');
      }

      // Refresh balances after successful transfer
      await refreshBalances();

      toast.success(result.message || 'Transfer initiated');
      return {
        success: true,
        txHash: result.txHash,
        orderId: result.orderId,
        status: result.status || 'PENDING',
      };
    } catch (error) {
      console.error('Error executing transfer:', error);
      toast.error(error instanceof Error ? error.message : 'Transfer failed');
      return { 
        success: false, 
        status: 'FAILED', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      setIsLoading(false);
      setQuote(null);
    }
  }, [signMessage, btcWallet, ethWallet, refreshBalances]);

  // Validate a voucher code
  const validateVoucher = useCallback(async (code: string): Promise<{ valid: boolean; amount?: number; asset?: 'BTC' | 'USDC'; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { valid: false, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-voucher`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        return { valid: false, error: result.message || 'Invalid voucher' };
      }

      return { valid: true, amount: result.amount, asset: result.asset };
    } catch (error) {
      console.error('Error validating voucher:', error);
      return { valid: false, error: 'Failed to validate voucher' };
    }
  }, []);

  // Clear current quote
  const clearQuote = useCallback(() => {
    setQuote(null);
  }, []);

  return {
    isLoading,
    quote,
    getQuote,
    executeTransfer,
    validateVoucher,
    clearQuote,
  };
};
