import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SalesRep {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  dob: string;
  status: 'draft' | 'cleared' | 'active' | 'disabled';
  force_password_reset: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface SalesRepAuthContextType {
  user: User | null;
  session: Session | null;
  salesRep: SalesRep | null;
  loading: boolean;
  requiresPasswordReset: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; requiresReset?: boolean }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  refreshSalesRep: () => Promise<void>;
}

const SalesRepAuthContext = createContext<SalesRepAuthContextType | undefined>(undefined);

export const SalesRepAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [salesRep, setSalesRep] = useState<SalesRep | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);

  const fetchSalesRepData = useCallback(async (userId: string) => {
    // Check user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (roleError || !roleData || roleData.role !== 'sales_rep') {
      return null;
    }

    // Fetch sales rep data
    const { data: repData, error: repError } = await supabase
      .from('sales_reps')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (repError || !repData) {
      return null;
    }

    // Check if rep is active or cleared (cleared = verified but first login)
    if (repData.status !== 'active' && repData.status !== 'cleared') {
      return null;
    }

    // Update last_login_at
    await supabase
      .from('sales_reps')
      .update({ last_login_at: new Date().toISOString() })
      .eq('user_id', userId);

    return repData as SalesRep;
  }, []);

  const refreshSalesRep = useCallback(async () => {
    if (user) {
      const repData = await fetchSalesRepData(user.id);
      setSalesRep(repData);
      if (repData) {
        setRequiresPasswordReset(repData.force_password_reset);
      }
    }
  }, [user, fetchSalesRepData]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const repData = await fetchSalesRepData(session.user.id);
            setSalesRep(repData);
            if (repData) {
              setRequiresPasswordReset(repData.force_password_reset);
            }
            setLoading(false);
          }, 0);
        } else {
          setSalesRep(null);
          setRequiresPasswordReset(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const repData = await fetchSalesRepData(session.user.id);
        setSalesRep(repData);
        if (repData) {
          setRequiresPasswordReset(repData.force_password_reset);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchSalesRepData]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error as Error };
    }

    // Check if user is a sales rep
    if (data.user) {
      const repData = await fetchSalesRepData(data.user.id);
      if (!repData) {
        await supabase.auth.signOut();
        return { error: new Error('Access denied. Only active sales representatives can access this portal.') };
      }
      
      setSalesRep(repData);
      setRequiresPasswordReset(repData.force_password_reset);
      return { error: null, requiresReset: repData.force_password_reset };
    }

    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      return { error: error as Error };
    }

    // Clear force_password_reset flag
    if (salesRep) {
      await supabase
        .from('sales_reps')
        .update({ force_password_reset: false })
        .eq('id', salesRep.id);
      
      setRequiresPasswordReset(false);
      setSalesRep({ ...salesRep, force_password_reset: false });
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSalesRep(null);
    setRequiresPasswordReset(false);
  };

  return (
    <SalesRepAuthContext.Provider
      value={{
        user,
        session,
        salesRep,
        loading,
        requiresPasswordReset,
        signIn,
        signOut,
        updatePassword,
        refreshSalesRep,
      }}
    >
      {children}
    </SalesRepAuthContext.Provider>
  );
};

export const useSalesRepAuth = () => {
  const context = useContext(SalesRepAuthContext);
  if (context === undefined) {
    throw new Error('useSalesRepAuth must be used within a SalesRepAuthProvider');
  }
  return context;
};
