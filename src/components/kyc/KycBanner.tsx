import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicWallet } from '@/contexts/DynamicWalletContext';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type KycStatus = Database['public']['Enums']['kyc_status'];

export const KycBanner: React.FC = () => {
  const { isKycApproved: supabaseKycApproved, kycStatus: supabaseKycStatus } = useAuth();
  const { isAuthenticated: isDynamicAuthenticated, syncedProfile } = useDynamicWallet();

  const [dynamicKycStatus, setDynamicKycStatus] = useState<KycStatus | null>(null);

  useEffect(() => {
    const fetchDynamicKyc = async () => {
      if (!isDynamicAuthenticated || !syncedProfile?.userId) {
        setDynamicKycStatus(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('user_id', syncedProfile.userId)
        .maybeSingle();

      if (error) {
        console.error('[KycBanner] failed to fetch dynamic kyc status', error);
        return;
      }

      setDynamicKycStatus(data?.kyc_status ?? null);
    };

    fetchDynamicKyc();
  }, [isDynamicAuthenticated, syncedProfile?.userId]);

  const effectiveKycStatus = isDynamicAuthenticated ? dynamicKycStatus : supabaseKycStatus;
  const isKycApproved = isDynamicAuthenticated
    ? dynamicKycStatus === 'approved'
    : supabaseKycApproved;

  if (isKycApproved) return null;

  const getMessage = () => {
    switch (effectiveKycStatus) {
      case 'pending':
        return 'Your identity verification is under review. Wallet features will be unlocked once approved.';
      case 'rejected':
        return 'Your identity verification was not approved. Please contact support.';
      default:
        return 'Complete KYC to unlock wallet features.';
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <p className="text-amber-800 text-sm flex-1">{getMessage()}</p>
        {effectiveKycStatus === 'not_started' && (
          <Link to="/kyc" className="text-sm font-medium text-amber-700 hover:text-amber-900 underline">
            Start verification
          </Link>
        )}
      </div>
    </div>
  );
};
