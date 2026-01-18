import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type MerchantUserRole = 'MERCHANT_ADMIN' | 'CASHIER';
type MerchantUserStatus = 'ACTIVE' | 'DISABLED';

interface MerchantUser {
  id: string;
  merchant_id: string;
  user_id: string;
  role: MerchantUserRole;
  full_name: string;
  email: string;
  phone: string | null;
  status: MerchantUserStatus;
  must_reset_password: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface Merchant {
  id: string;
  merchant_id: string;
  business_name: string;
  status: string;
  is_initially_funded: boolean;
  rep_id: string | null;
}

interface MerchantWallet {
  id: string;
  merchant_id: string;
  balance_usd: number;
  cash_credit_balance: number;
  updated_at: string;
}

interface MerchantAuthContextType {
  user: User | null;
  session: Session | null;
  merchantUser: MerchantUser | null;
  merchant: Merchant | null;
  wallet: MerchantWallet | null;
  loading: boolean;
  isMerchantAdmin: boolean;
  isCashier: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshMerchantData: () => Promise<void>;
}

const MerchantAuthContext = createContext<MerchantAuthContextType | undefined>(undefined);

export const MerchantAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [merchantUser, setMerchantUser] = useState<MerchantUser | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [wallet, setWallet] = useState<MerchantWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMerchantData = useCallback(async (userId: string) => {
    // Fetch merchant user data
    const { data: merchantUserData, error: merchantUserError } = await supabase
      .from('merchant_users')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (merchantUserError || !merchantUserData) {
      console.error('Error fetching merchant user:', merchantUserError);
      return { merchantUser: null, merchant: null, wallet: null };
    }

    // Fetch merchant data
    const { data: merchantData, error: merchantError } = await supabase
      .from('merchants')
      .select('id, merchant_id, business_name, status, is_initially_funded, rep_id')
      .eq('id', merchantUserData.merchant_id)
      .maybeSingle();

    if (merchantError) {
      console.error('Error fetching merchant:', merchantError);
    }

    // Fetch wallet data
    const { data: walletData, error: walletError } = await supabase
      .from('merchant_wallets')
      .select('*')
      .eq('merchant_id', merchantUserData.merchant_id)
      .maybeSingle();

    if (walletError) {
      console.error('Error fetching wallet:', walletError);
    }

    // Update last_login_at
    await supabase
      .from('merchant_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', merchantUserData.id);

    return {
      merchantUser: merchantUserData as MerchantUser,
      merchant: merchantData as Merchant | null,
      wallet: walletData as MerchantWallet | null,
    };
  }, []);

  const refreshMerchantData = useCallback(async () => {
    if (user) {
      const { merchantUser: mu, merchant: m, wallet: w } = await fetchMerchantData(user.id);
      setMerchantUser(mu);
      setMerchant(m);
      setWallet(w);
    }
  }, [user, fetchMerchantData]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const { merchantUser: mu, merchant: m, wallet: w } = await fetchMerchantData(session.user.id);
            setMerchantUser(mu);
            setMerchant(m);
            setWallet(w);
            setLoading(false);
          }, 0);
        } else {
          setMerchantUser(null);
          setMerchant(null);
          setWallet(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { merchantUser: mu, merchant: m, wallet: w } = await fetchMerchantData(session.user.id);
        setMerchantUser(mu);
        setMerchant(m);
        setWallet(w);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchMerchantData]);

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
    setMerchantUser(null);
    setMerchant(null);
    setWallet(null);
  };

  const isMerchantAdmin = merchantUser?.role === 'MERCHANT_ADMIN';
  const isCashier = merchantUser?.role === 'CASHIER' || isMerchantAdmin;

  return (
    <MerchantAuthContext.Provider
      value={{
        user,
        session,
        merchantUser,
        merchant,
        wallet,
        loading,
        isMerchantAdmin,
        isCashier,
        signIn,
        signOut,
        refreshMerchantData,
      }}
    >
      {children}
    </MerchantAuthContext.Provider>
  );
};

export const useMerchantAuth = () => {
  const context = useContext(MerchantAuthContext);
  if (context === undefined) {
    throw new Error('useMerchantAuth must be used within a MerchantAuthProvider');
  }
  return context;
};
