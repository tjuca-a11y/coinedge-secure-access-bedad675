import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export const useKyc = () => {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitPersonalInfo = async (data: KycFormData) => {
    if (!user) {
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
        .eq('user_id', user.id);

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

  const submitKycForReview = async () => {
    if (!user) {
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
        .eq('user_id', user.id);

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
    if (!user) {
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
        .eq('user_id', user.id);

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

  return {
    loading,
    error,
    submitPersonalInfo,
    submitKycForReview,
    simulateKycApproval,
  };
};
