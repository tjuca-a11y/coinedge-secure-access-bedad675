import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicWallet } from '@/contexts/DynamicWalletContext';
import { KycFlow } from '@/components/kyc/KycFlow';

const Kyc: React.FC = () => {
  const { user, loading, isKycApproved } = useAuth();
  const {
    isAuthenticated: isDynamicAuthenticated,
    syncedProfile,
    isConfigured,
    sdkHasLoaded,
  } = useDynamicWallet();

  useEffect(() => {
    console.log('[KYC Page] mounted', {
      hasSupabaseUser: !!user,
      loading,
      isDynamicAuthenticated,
      hasSyncedProfile: !!syncedProfile,
    });
    toast.info('KYC page opened');
  }, [user, loading, isDynamicAuthenticated, syncedProfile]);

  // Wait for BOTH auth systems to settle.
  // For Dynamic-auth users, also wait for the backend sync that provides a linked userId.
  const isDynamicLoading = isConfigured && !sdkHasLoaded;
  const isSyncingDynamic = isDynamicAuthenticated && !syncedProfile;

  if (loading || isDynamicLoading || isSyncingDynamic) {
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

  // If KYC is already approved, redirect to dashboard
  if (isKycApproved) {
    console.log('[KYC Page] already approved, redirecting to /');
    return <Navigate to="/" replace />;
  }

  return <KycFlow />;
};

export default Kyc;
