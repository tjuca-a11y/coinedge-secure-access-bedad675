import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useDynamicConfigured } from '@/providers/DynamicProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicWallet } from '@/contexts/DynamicWalletContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, LogIn, Loader2, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login: React.FC = () => {
  const { user, loading } = useAuth();
  const isConfigured = useDynamicConfigured();
  const { isAuthenticated, isWalletInitializing, isConnected } = useDynamicWallet();
  const location = useLocation();

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If authenticated via Dynamic, check wallet state
  if (isConfigured && isAuthenticated) {
    // Show wallet initialization loading state
    if (isWalletInitializing) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
                  <Wallet className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Setting up your wallet...</h3>
                <p className="text-muted-foreground text-sm">
                  Creating your secure self-custody wallet. This only happens once.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Wallet is ready, redirect to wallet home
    if (isConnected) {
      const from = location.state?.from?.pathname || '/wallet';
      return <Navigate to={from} replace />;
    }
  }

  // Redirect if authenticated via Supabase (non-Dynamic)
  if (user) {
    return <Navigate to="/wallet" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {isConfigured ? (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Sign in to CoinEdge</CardTitle>
            <CardDescription>
              Access your account and wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dynamic Email Sign In */}
            <div className="space-y-4">
              <DynamicWidget
                innerButtonComponent={
                  <Button className="w-full h-12 text-base" size="lg">
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In with Email
                  </Button>
                }
              />
              
              {/* Self-custody messaging */}
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Your CoinEdge account includes a secure self-custody wallet where only you control your funds.
                </p>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Sign in to CoinEdge</CardTitle>
            <CardDescription>
              Access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Login;