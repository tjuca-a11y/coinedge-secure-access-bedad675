import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { DynamicSignUpForm } from '@/components/auth/DynamicSignUpForm';

const SignUp: React.FC = () => {
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
      <DynamicSignUpForm />
    </div>
  );
};

export default SignUp;
