import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicAuth } from '@/hooks/useDynamicAuth';
import { DynamicSignUpForm } from '@/components/auth/DynamicSignUpForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

const SignUp: React.FC = () => {
  const { user, loading } = useAuth();
  const { user: dynamicUser, isConfigured: isDynamicConfigured } = useDynamicAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Redirect if authenticated via either method
  if (user || dynamicUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {isDynamicConfigured ? (
        <DynamicSignUpForm />
      ) : (
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
          <CardContent className="space-y-4">
            <SignUpForm />
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SignUp;
