import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SignUpForm } from '@/components/auth/SignUpForm';

const SignUp: React.FC = () => {
  const { user, loading, isKycApproved } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    // If user is logged in, route based on KYC status
    return isKycApproved ? <Navigate to="/" replace /> : <Navigate to="/kyc" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignUpForm />
    </div>
  );
};

export default SignUp;
