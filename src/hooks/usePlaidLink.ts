import { useState, useCallback } from 'react';
import { usePlaidLink as usePlaidLinkSDK, PlaidLinkOnSuccess, PlaidLinkOptions } from 'react-plaid-link';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface UsePlaidLinkResult {
  openPlaidLink: () => Promise<void>;
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

export const usePlaidLink = (onSuccess?: () => void): UsePlaidLinkResult => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Handle successful link
  const handleSuccess: PlaidLinkOnSuccess = useCallback(async (publicToken, metadata) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plaid-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ 
            action: 'exchange_public_token',
            public_token: publicToken 
          }),
        }
      );

      const data = await response.json();
      
      if (data.success && data.accounts?.length > 0) {
        toast.success(`Connected ${data.accounts.length} bank account(s)`);
        queryClient.invalidateQueries({ queryKey: ['user-bank-accounts'] });
        onSuccess?.();
      } else {
        throw new Error(data.error || 'Failed to link bank account');
      }
    } catch (err: any) {
      console.error('Plaid exchange error:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to link bank account');
    } finally {
      setIsLoading(false);
      setLinkToken(null);
    }
  }, [queryClient, onSuccess]);

  // Plaid Link SDK config
  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: (err) => {
      if (err) {
        console.log('Plaid Link exit error:', err);
      }
      setLinkToken(null);
    },
  };

  const { open, ready } = usePlaidLinkSDK(config);

  // Initialize Plaid Link
  const openPlaidLink = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.access_token) {
        throw new Error('Please sign in first');
      }

      // Get link token from edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plaid-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ action: 'create_link_token' }),
        }
      );

      const data = await response.json();

      if (data.mock) {
        // Plaid not configured - show message
        toast.info('Plaid is not configured yet. Contact admin to set up bank linking.');
        setIsLoading(false);
        return;
      }

      if (data.link_token) {
        setLinkToken(data.link_token);
        // The useEffect in usePlaidLinkSDK will open when ready
      } else {
        throw new Error(data.error || 'Failed to initialize bank linking');
      }
    } catch (err: any) {
      console.error('Plaid link error:', err);
      setError(err.message);
      toast.error(err.message || 'Failed to initialize bank linking');
      setIsLoading(false);
    }
  }, []);

  // Open Plaid Link when token is ready
  if (linkToken && ready) {
    open();
    setIsLoading(false);
  }

  return {
    openPlaidLink,
    isLoading,
    isReady: ready,
    error,
  };
};
