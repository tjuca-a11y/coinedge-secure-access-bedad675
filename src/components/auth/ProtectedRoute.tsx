import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicWallet } from '@/contexts/DynamicWalletContext';
import { Loader2, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireKyc?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireKyc = false,
}) => {
  const { user, loading, isKycApproved } = useAuth();
  const { isAuthenticated, isWalletInitializing, isConfigured, sdkHasLoaded } = useDynamicWallet();
  const location = useLocation();

  // User is authenticated if they have either Supabase OR Dynamic session
  const isLoggedIn = !!user || isAuthenticated;

  // Wait for BOTH Supabase and Dynamic SDK to finish loading
  const isDynamicLoading = isConfigured && !sdkHasLoaded;
  const isLoading = loading || isDynamicLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show wallet initialization state for Dynamic users
  if (isConfigured && isAuthenticated && isWalletInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
                <Wallet className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Loading your wallet...</h3>
              <p className="text-muted-foreground text-sm">
                Preparing your secure self-custody wallet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only redirect to KYC if explicitly required (e.g., for redemption)
  if (requireKyc && !isKycApproved) {
    return <Navigate to="/kyc" replace />;
  }

  return <>{children}</>;
};
