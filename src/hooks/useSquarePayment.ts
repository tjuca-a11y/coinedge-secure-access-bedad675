import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PaymentStatus = 'IDLE' | 'CREATING' | 'PENDING' | 'POLLING' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'EXPIRED';

interface UseSquarePaymentOptions {
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  pollingInterval?: number;
  maxPollingAttempts?: number;
}

interface UseSquarePaymentReturn {
  status: PaymentStatus;
  error: string | null;
  customerPays: number | null;
  createPayment: (baseAmount: number, activationEventId?: string) => Promise<void>;
  cancelPayment: () => void;
  reset: () => void;
}

export function useSquarePayment(options: UseSquarePaymentOptions = {}): UseSquarePaymentReturn {
  const {
    onSuccess,
    onError,
    pollingInterval = 2000,
    maxPollingAttempts = 150, // 5 minutes at 2 second intervals
  } = options;

  const [status, setStatus] = useState<PaymentStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [customerPays, setCustomerPays] = useState<number | null>(null);
  
  const checkoutIdRef = useRef<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    checkoutIdRef.current = null;
    attemptCountRef.current = 0;
    setStatus('IDLE');
    setError(null);
    setCustomerPays(null);
  }, [stopPolling]);

  const pollPaymentStatus = useCallback(async () => {
    if (!checkoutIdRef.current) return;

    attemptCountRef.current++;
    
    if (attemptCountRef.current >= maxPollingAttempts) {
      stopPolling();
      setStatus('EXPIRED');
      setError('Payment timed out');
      onError?.('Payment timed out');
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/square-check-payment?checkout_id=${checkoutIdRef.current}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      switch (result.status) {
        case 'COMPLETED':
          stopPolling();
          setStatus('COMPLETED');
          onSuccess?.(result._internal_payment_id || 'completed');
          break;
        case 'CANCELED':
        case 'EXPIRED':
          stopPolling();
          setStatus(result.status);
          setError(result.status === 'CANCELED' ? 'Payment was canceled' : 'Payment expired');
          onError?.(result.status === 'CANCELED' ? 'Payment was canceled' : 'Payment expired');
          break;
        case 'FAILED':
          stopPolling();
          setStatus('FAILED');
          setError(result.error || 'Payment failed');
          onError?.(result.error || 'Payment failed');
          break;
        default:
          // Still pending, continue polling
          break;
      }
    } catch (err) {
      console.error('Polling error:', err);
      // Don't stop on network errors, keep trying
    }
  }, [maxPollingAttempts, onSuccess, onError, stopPolling]);

  const createPayment = useCallback(async (baseAmount: number, activationEventId?: string) => {
    reset();
    setStatus('CREATING');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('square-create-payment', {
        body: {
          base_amount_usd: baseAmount,
          activation_event_id: activationEventId,
        },
      });

      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || 'Failed to create payment');
      }

      checkoutIdRef.current = data.checkout_id;
      setCustomerPays(data.customer_pays);
      setStatus('PENDING');

      // Start polling
      pollingRef.current = setInterval(pollPaymentStatus, pollingInterval);
      setStatus('POLLING');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment';
      setStatus('FAILED');
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [reset, pollPaymentStatus, pollingInterval, onError]);

  const cancelPayment = useCallback(() => {
    stopPolling();
    setStatus('CANCELED');
    setError('Payment canceled by user');
  }, [stopPolling]);

  return {
    status,
    error,
    customerPays,
    createPayment,
    cancelPayment,
    reset,
  };
}
