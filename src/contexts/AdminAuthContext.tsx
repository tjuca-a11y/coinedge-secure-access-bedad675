import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'super_admin' | 'admin' | 'sales_rep';

interface AdminUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  dob: string | null;
  status: string;
  force_password_reset: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  adminUser: AdminUser | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshAdminUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = useCallback(async (userId: string) => {
    // First check the user's role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Error fetching role or no role found:', roleError);
      return { adminUser: null, role: null };
    }

    const userRole = roleData.role as AppRole;

    // Only proceed if user is admin or super_admin
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return { adminUser: null, role: null };
    }

    // Fetch admin user data
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (adminError) {
      console.error('Error fetching admin user:', adminError);
      return { adminUser: null, role: userRole };
    }

    // Update last_login_at
    if (adminData) {
      await supabase
        .from('admin_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    return { adminUser: adminData as AdminUser, role: userRole };
  }, []);

  const refreshAdminUser = useCallback(async () => {
    if (user) {
      const { adminUser: adminData, role: userRole } = await fetchAdminData(user.id);
      setAdminUser(adminData);
      setRole(userRole);
    }
  }, [user, fetchAdminData]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const { adminUser: adminData, role: userRole } = await fetchAdminData(session.user.id);
            setAdminUser(adminData);
            setRole(userRole);
            setLoading(false);
          }, 0);
        } else {
          setAdminUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { adminUser: adminData, role: userRole } = await fetchAdminData(session.user.id);
        setAdminUser(adminData);
        setRole(userRole);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchAdminData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAdminUser(null);
    setRole(null);
  };

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        session,
        adminUser,
        role,
        loading,
        isAdmin,
        isSuperAdmin,
        signIn,
        signOut,
        refreshAdminUser,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
