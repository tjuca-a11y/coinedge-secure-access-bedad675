import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicWallet } from '@/contexts/DynamicWalletContext';
import { KycFlow } from '@/components/kyc/KycFlow';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type KycStatus = Database['public']['Enums']['kyc_status'];

const Kyc: React.FC = () => {
  const { user, loading, isKycApproved: supabaseKycApproved } = useAuth();
  const {
    isAuthenticated: isDynamicAuthenticated,
    syncedProfile,
    isConfigured,
    sdkHasLoaded,
  } = useDynamicWallet();

  const [dynamicKycStatus, setDynamicKycStatus] = useState<KycStatus | null>(null);
  const [checkingDynamicKyc, setCheckingDynamicKyc] = useState(false);

  // Fetch KYC status for Dynamic users directly from database
  useEffect(() => {
    const fetchDynamicKycStatus = async () => {
      if (isDynamicAuthenticated && syncedProfile?.userId) {
        setCheckingDynamicKyc(true);
        const { data } = await supabase
          .from('profiles')
          .select('kyc_status')
          .eq('user_id', syncedProfile.userId)
          .maybeSingle();
        if (data) {
          setDynamicKycStatus(data.kyc_status);
        }
        setCheckingDynamicKyc(false);
      }
    };
    fetchDynamicKycStatus();
  }, [isDynamicAuthenticated, syncedProfile?.userId]);

  useEffect(() => {
    console.log('[KYC Page] mounted', {
      hasSupabaseUser: !!user,
      loading,
      isDynamicAuthenticated,
      hasSyncedProfile: !!syncedProfile,
      dynamicKycStatus,
    });
  }, [user, loading, isDynamicAuthenticated, syncedProfile, dynamicKycStatus]);

  // Wait for BOTH auth systems to settle.
  const isDynamicLoading = isConfigured && !sdkHasLoaded;
  const isSyncingDynamic = isDynamicAuthenticated && !syncedProfile;

  if (loading || isDynamicLoading || isSyncingDynamic || checkingDynamicKyc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // User is authenticated if they have Supabase session OR Dynamic auth
  const isAuthenticated = !!user || isDynamicAuthenticated;

  if (!isAuthenticated) {
    console.log('[KYC Page] not authenticated, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // Check KYC approval from either source
  const isKycApproved = supabaseKycApproved || dynamicKycStatus === 'approved';

  // If KYC is already approved, redirect to wallet
  if (isKycApproved) {
    console.log('[KYC Page] already approved, redirecting to /wallet');
    toast.success('KYC already verified!');
    return <Navigate to="/wallet" replace />;
  }

  return <KycFlow />;
};

export default Kyc;