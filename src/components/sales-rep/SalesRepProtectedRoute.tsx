import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSalesRepAuth } from '@/contexts/SalesRepAuthContext';

interface SalesRepProtectedRouteProps {
  children: React.ReactNode;
}

export const SalesRepProtectedRoute: React.FC<SalesRepProtectedRouteProps> = ({ children }) => {
  const { user, loading, salesRep, requiresPasswordReset } = useSalesRepAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sidebar-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/rep/login" state={{ from: location }} replace />;
  }

  if (!salesRep) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="text-center p-8 bg-card rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-4">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access the Sales Rep Portal.
            Only active sales representatives can access this portal.
          </p>
        </div>
      </div>
    );
  }

  // Redirect to password reset if required
  if (requiresPasswordReset && location.pathname !== '/rep/reset-password') {
    return <Navigate to="/rep/reset-password" replace />;
  }

  return <>{children}</>;
};
