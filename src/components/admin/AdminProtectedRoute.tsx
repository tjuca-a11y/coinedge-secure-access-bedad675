import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  children,
  requireSuperAdmin = false,
}) => {
  const { user, loading, isAdmin, isSuperAdmin, role } = useAdminAuth();
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
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="text-center p-8 bg-card rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access the Admin Console.
            Only SUPER_ADMIN and ADMIN users can access this portal.
          </p>
          <p className="text-sm text-muted-foreground">
            Your current role: {role || 'None'}
          </p>
        </div>
      </div>
    );
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sidebar">
        <div className="text-center p-8 bg-card rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-4">Access Denied</h2>
          <p className="text-muted-foreground">
            This page requires SUPER_ADMIN privileges.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
