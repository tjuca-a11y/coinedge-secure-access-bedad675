import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicAuth } from '@/hooks/useDynamicAuth';
import { DynamicLoginForm } from '@/components/auth/DynamicLoginForm';
import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';

const Login: React.FC = () => {
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
        <DynamicLoginForm />
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
