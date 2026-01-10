import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireKyc?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireKyc = false,
}) => {
  const { user, loading, isKycApproved, kycStatus } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If KYC is required and not approved, redirect to KYC
  if (requireKyc && !isKycApproved) {
    return <Navigate to="/kyc" replace />;
  }

  // If on a protected page and KYC is not approved, always redirect to KYC
  // (except if we're already on the KYC page)
  if (!isKycApproved && kycStatus !== null && location.pathname !== '/kyc') {
    return <Navigate to="/kyc" replace />;
  }

  return <>{children}</>;
};
