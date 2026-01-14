import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicWallet } from '@/contexts/DynamicWalletContext';

export const KycBanner: React.FC = () => {
  const { isKycApproved: supabaseKycApproved, kycStatus: supabaseKycStatus } = useAuth();
  const { isAuthenticated: isDynamicAuthenticated, syncedProfile } = useDynamicWallet();

  // Use centralized KYC status from syncedProfile for Dynamic users
  const effectiveKycStatus = isDynamicAuthenticated 
    ? (syncedProfile?.kycStatus || 'not_started') 
    : supabaseKycStatus;
  
  const isKycApproved = isDynamicAuthenticated
    ? syncedProfile?.kycStatus === 'approved'
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
