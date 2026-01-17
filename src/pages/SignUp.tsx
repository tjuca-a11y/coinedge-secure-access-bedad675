import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicAuth } from '@/hooks/useDynamicAuth';
import { useDynamicConfigured } from '@/providers/DynamicProvider';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Shield, AlertTriangle } from 'lucide-react';

const SignUp: React.FC = () => {
  const { user, loading } = useAuth();
  const { user: dynamicUser } = useDynamicAuth();
  const isConfigured = useDynamicConfigured();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Redirect if authenticated via either method
  if (user || dynamicUser) {
    return <Navigate to="/wallet" replace />;
  }

  // Dynamic must be configured for auth to work
  if (!isConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Configuration Required</CardTitle>
            <CardDescription>
              Authentication is not configured. Please contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create Your CoinEdge Account</CardTitle>
          <CardDescription>
            Buy, sell, and hold Bitcoin & USDC
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dynamic Email Sign Up - Single Widget */}
          <div className="space-y-4">
            <DynamicWidget
              innerButtonComponent={
                <Button className="w-full h-12 text-base" size="lg">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Continue with Email
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
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUp;
