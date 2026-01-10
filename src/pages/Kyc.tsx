import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { KycFlow } from '@/components/kyc/KycFlow';

const Kyc: React.FC = () => {
  const { user, loading, isKycApproved } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If KYC is already approved, redirect to dashboard
  if (isKycApproved) {
    return <Navigate to="/" replace />;
  }

  return <KycFlow />;
};

export default Kyc;
