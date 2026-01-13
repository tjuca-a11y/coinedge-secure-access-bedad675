import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { DynamicLoginForm } from '@/components/auth/DynamicLoginForm';

const Login: React.FC = () => {
  const { user, loading } = useAuth();
  const { user: dynamicUser } = useDynamicContext();

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
      <DynamicLoginForm />
    </div>
  );
};

export default Login;
