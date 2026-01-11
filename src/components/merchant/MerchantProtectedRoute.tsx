import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';

interface MerchantProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const MerchantProtectedRoute: React.FC<MerchantProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { user, merchantUser, merchant, loading, isMerchantAdmin } = useMerchantAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !merchantUser) {
    return <Navigate to="/merchant/login" state={{ from: location }} replace />;
  }

  // Check if merchant is active
  if (merchant?.status !== 'active' && merchant?.status !== 'ACTIVE') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Merchant Account Paused</h1>
          <p className="mt-2 text-muted-foreground">
            Your merchant account is currently paused. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  // Check if user needs to reset password
  if (merchantUser.must_reset_password && location.pathname !== '/merchant/reset-password') {
    return <Navigate to="/merchant/reset-password" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isMerchantAdmin) {
    return <Navigate to="/merchant/cashier" replace />;
  }

  return <>{children}</>;
};
