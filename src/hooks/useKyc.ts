import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicWallet } from '@/contexts/DynamicWalletContext';

export interface KycFormData {
  full_name: string;
  date_of_birth: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
}

interface PlaidIdentityResponse {
  success: boolean;
  link_token?: string;
  identity_verification_id?: string;
  error?: string;
  mock?: boolean;
  message?: string;
}

interface PlaidVerificationResultResponse {
  success: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  error?: string;
}

// Cooldown period in hours after a failed KYC attempt
const KYC_COOLDOWN_HOURS = 24;

export const useKyc = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { syncedProfile, isAuthenticated: isDynamicAuthenticated } = useDynamicWallet();
  
  // Determine the effective user ID - prefer Supabase auth, fall back to Dynamic synced profile
  const effectiveUserId = user?.id || syncedProfile?.userId;
  const isAuthenticated = !!user || isDynamicAuthenticated;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [identityVerificationId, setIdentityVerificationId] = useState<string | null>(null);

  // Calculate cooldown status
  const cooldownInfo = useMemo(() => {
    const retryAvailableAt = profile?.kyc_retry_available_at;
    if (!retryAvailableAt) {
      return { isInCooldown: false, remainingMs: 0, retryAvailableAt: null };
    }

    const retryDate = new Date(retryAvailableAt);
    const now = new Date();
    const remainingMs = retryDate.getTime() - now.getTime();
    
    return {
      isInCooldown: remainingMs > 0,
      remainingMs: Math.max(0, remainingMs),
      retryAvailableAt: retryDate,
    };
  }, [profile?.kyc_retry_available_at]);

  // Submit personal info to prefill Plaid Identity
  const submitPersonalInfo = async (data: KycFormData) => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          date_of_birth: data.date_of_birth,
          address_line1: data.address_line1,
          address_line2: data.address_line2 || null,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
          country: data.country,
          phone: data.phone,
        })
        .eq('user_id', effectiveUserId);

      if (updateError) throw updateError;

      await refreshProfile();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save personal info');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Create Plaid Identity verification link token
  const createIdentityVerificationToken = useCallback(async (): Promise<boolean> => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plaid-identity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({ action: 'create_identity_token' }),
        }
      );

      const data: PlaidIdentityResponse = await response.json();

      if (data.mock) {
        // Plaid not configured - show demo mode message
        setError(data.message || 'Plaid is not configured. Running in demo mode.');
        return false;
      }

      if (data.success && data.link_token) {
        setPlaidLinkToken(data.link_token);
        if (data.identity_verification_id) {
          setIdentityVerificationId(data.identity_verification_id);
        }
        return true;
      }

      setError(data.error || 'Failed to create verification session');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start identity verification');
      return false;
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  // Handle verification completion from Plaid
  const handleVerificationComplete = useCallback(async (
    verificationId: string
  ): Promise<PlaidVerificationResultResponse> => {
    if (!effectiveUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plaid-identity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'handle_verification_result',
            identity_verification_id: verificationId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // If verification failed, set cooldown period
        if (data.status === 'rejected') {
          const cooldownEnd = new Date();
          cooldownEnd.setHours(cooldownEnd.getHours() + KYC_COOLDOWN_HOURS);
          
          await supabase
            .from('profiles')
            .update({ kyc_retry_available_at: cooldownEnd.toISOString() })
            .eq('user_id', effectiveUserId);
        }
        
        await refreshProfile();
        return {
          success: true,
          status: data.status,
          rejection_reason: data.rejection_reason,
        };
      }

      setError(data.error || 'Failed to process verification');
      return { success: false, error: data.error };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process verification';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, refreshProfile]);

  // Reset KYC status for retry (clears rejection and allows new attempt)
  const initiateRetry = useCallback(async (): Promise<boolean> => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      return false;
    }

    if (cooldownInfo.isInCooldown) {
      setError('Please wait for the cooldown period to end before retrying');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'not_started',
          kyc_rejected_at: null,
          kyc_rejection_reason: null,
          kyc_retry_available_at: null,
        })
        .eq('user_id', effectiveUserId);

      if (updateError) throw updateError;

      await refreshProfile();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate retry');
      return false;
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId, refreshProfile, cooldownInfo.isInCooldown]);

  // Submit KYC for manual review (fallback when Plaid not configured)
  const submitKycForReview = async () => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'pending',
          kyc_submitted_at: new Date().toISOString(),
        })
        .eq('user_id', effectiveUserId);

      if (updateError) throw updateError;

      await refreshProfile();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit KYC');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // For demo purposes - simulate KYC approval
  const simulateKycApproval = async () => {
    if (!effectiveUserId) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate mock wallet addresses for demo
      const mockBtcAddress = `bc1q${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const mockUsdcAddress = `0x${Math.random().toString(16).substring(2, 42)}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'approved',
          kyc_approved_at: new Date().toISOString(),
          btc_address: mockBtcAddress,
          usdc_address: mockUsdcAddress,
          wallet_created_at: new Date().toISOString(),
        })
        .eq('user_id', effectiveUserId);

      if (updateError) throw updateError;

      await refreshProfile();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve KYC');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Clear Plaid tokens
  const clearPlaidTokens = useCallback(() => {
    setPlaidLinkToken(null);
    setIdentityVerificationId(null);
  }, []);

  return {
    loading,
    error,
    plaidLinkToken,
    identityVerificationId,
    cooldownInfo,
    isAuthenticated,
    effectiveUserId,
    submitPersonalInfo,
    createIdentityVerificationToken,
    handleVerificationComplete,
    submitKycForReview,
    simulateKycApproval,
    clearPlaidTokens,
    initiateRetry,
  };
};
