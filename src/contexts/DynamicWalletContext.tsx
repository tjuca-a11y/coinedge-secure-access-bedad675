import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDynamicContext, useUserWallets, getAuthToken, useEmbeddedWallet } from '@dynamic-labs/sdk-react-core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDynamicConfigured } from '@/providers/DynamicProvider';

interface WalletInfo {
  address: string;
  chain: 'BTC' | 'ETH';
  publicKey?: string;
}

interface SyncedProfile {
  userId: string;
  email: string;
  btcAddress?: string;
  ethAddress?: string;
  kycStatus?: 'not_started' | 'pending' | 'approved' | 'rejected';
}

interface DynamicWalletContextType {
  // Wallet state
  wallets: WalletInfo[];
  btcWallet: WalletInfo | null;
  ethWallet: WalletInfo | null;
  
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isWalletInitializing: boolean;
  sdkHasLoaded: boolean;
  
  // User state from Dynamic
  dynamicUser: any;
  isAuthenticated: boolean;
  
  // Synced Supabase profile (from dynamic-auth-sync)
  syncedProfile: SyncedProfile | null;
  
  // Actions
  disconnectWallet: () => Promise<void>;
  signMessage: (message: string, chain: 'BTC' | 'ETH') => Promise<string | null>;
  syncWalletToProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // Balance state (fetched from backend)
  btcBalance: number;
  usdcBalance: number;
  refreshBalances: () => Promise<void>;
}

const DynamicWalletContext = createContext<DynamicWalletContextType | undefined>(undefined);

// Default/fallback context values when Dynamic is not configured
const defaultContextValue: DynamicWalletContextType = {
  wallets: [],
  btcWallet: null,
  ethWallet: null,
  isConnected: false,
  isLoading: false,
  isConfigured: false,
  isWalletInitializing: false,
  sdkHasLoaded: true, // Default to true so it doesn't block when Dynamic isn't configured
  dynamicUser: null,
  isAuthenticated: false,
  syncedProfile: null,
  disconnectWallet: async () => console.warn('Dynamic SDK not configured'),
  signMessage: async () => null,
  syncWalletToProfile: async () => console.warn('Dynamic SDK not configured'),
  refreshProfile: async () => {},
  btcBalance: 0,
  usdcBalance: 0,
  refreshBalances: async () => {},
};

// Internal provider that uses Dynamic hooks (only rendered when Dynamic is configured)
const DynamicWalletProviderInternal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    user: dynamicUser, 
    primaryWallet, 
    handleLogOut,
    sdkHasLoaded,
  } = useDynamicContext();
  
  const userWallets = useUserWallets();
  const { createEmbeddedWallet, userHasEmbeddedWallet } = useEmbeddedWallet();
  
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [btcBalance, setBtcBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isWalletInitializing, setIsWalletInitializing] = useState(false);
  const [syncedProfile, setSyncedProfile] = useState<SyncedProfile | null>(null);
  
  // Derive isAuthenticated from user presence
  const isAuthenticated = !!dynamicUser;

  // Auto-create embedded wallet when user authenticates
  useEffect(() => {
    const createWallet = async () => {
      if (dynamicUser && sdkHasLoaded && !userHasEmbeddedWallet) {
        setIsWalletInitializing(true);
        try {
          await createEmbeddedWallet();
          console.log('Embedded wallet created automatically');
        } catch (e) {
          console.error('Failed to create embedded wallet:', e);
        } finally {
          setIsWalletInitializing(false);
        }
      }
    };
    
    createWallet();
  }, [dynamicUser, sdkHasLoaded, userHasEmbeddedWallet, createEmbeddedWallet]);

  // Parse wallets from Dynamic
  useEffect(() => {
    if (userWallets && userWallets.length > 0) {
      const parsedWallets: WalletInfo[] = userWallets.map((wallet) => ({
        address: wallet.address,
        chain: wallet.chain?.toLowerCase().includes('bitcoin') ? 'BTC' : 'ETH',
        publicKey: wallet.address,
      }));
      setWallets(parsedWallets);
      setIsWalletInitializing(false);
    } else {
      setWallets([]);
    }
  }, [userWallets]);

  // Derived wallet getters
  const btcWallet = wallets.find(w => w.chain === 'BTC') || null;
  const ethWallet = wallets.find(w => w.chain === 'ETH') || null;
  // User is connected if authenticated (wallet will auto-create)
  const isConnected = isAuthenticated;

  // Sync Dynamic auth to Supabase (creates/updates user profile)
  useEffect(() => {
    const syncToSupabase = async () => {
      const authToken = getAuthToken();
      if (dynamicUser && authToken) {
        try {
          // Call edge function to validate Dynamic JWT and create/sync Supabase user
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dynamic-auth-sync`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                dynamicUserId: dynamicUser.userId,
                email: dynamicUser.email,
                walletAddresses: wallets.map((w) => ({ address: w.address, chain: w.chain })),
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log('Dynamic auth synced to Supabase:', data.userId, 'kycStatus:', data.kycStatus);
            // Store the synced profile info including KYC status
            setSyncedProfile({
              userId: data.userId,
              email: data.email,
              btcAddress: data.btcAddress,
              ethAddress: data.ethAddress,
              kycStatus: data.kycStatus,
            });
          } else {
            const error = await response.json();
            console.error('Failed to sync Dynamic auth:', error);
          }
        } catch (error) {
          console.error('Failed to sync Dynamic auth to Supabase:', error);
        }
      }
    };

    syncToSupabase();
  }, [dynamicUser, wallets]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      await handleLogOut();
      await supabase.auth.signOut();
      setWallets([]);
      setBtcBalance(0);
      setUsdcBalance(0);
      setSyncedProfile(null);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  }, [handleLogOut]);

  // Sign message for transactions
  const signMessage = useCallback(async (message: string, chain: 'BTC' | 'ETH'): Promise<string | null> => {
    const wallet = chain === 'BTC' ? btcWallet : ethWallet;
    
    if (!wallet || !primaryWallet) {
      toast.error('No wallet available for signing');
      return null;
    }

    try {
      // Use the Dynamic wallet connector to sign
      const connector = primaryWallet.connector;
      if (connector && 'signMessage' in connector) {
        const signature = await (connector as any).signMessage(message);
        return signature;
      }
      
      toast.error('Wallet does not support message signing');
      return null;
    } catch (error) {
      console.error('Error signing message:', error);
      toast.error('Failed to sign message');
      return null;
    }
  }, [btcWallet, ethWallet, primaryWallet]);

  // Sync wallet addresses to user profile
  const syncWalletToProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('No Supabase user to sync wallet to');
      return;
    }

    try {
      const updates: Record<string, string | null> = {};
      
      if (btcWallet) {
        updates.btc_address = btcWallet.address;
      }
      if (ethWallet) {
        updates.usdc_address = ethWallet.address; // USDC on ETH
      }
      updates.wallet_created_at = new Date().toISOString();

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error syncing wallet to profile:', error);
    }
  }, [btcWallet, ethWallet]);

  // Refresh profile data (e.g., after KYC status changes)
  const refreshProfile = useCallback(async () => {
    if (!syncedProfile?.userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('kyc_status')
        .eq('user_id', syncedProfile.userId)
        .maybeSingle();

      if (error) {
        console.error('Error refreshing profile:', error);
        return;
      }

      if (data) {
        setSyncedProfile(prev => prev ? {
          ...prev,
          kycStatus: data.kyc_status,
        } : null);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [syncedProfile?.userId]);

  // Fetch balances from backend
  const refreshBalances = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-balances`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBtcBalance(data.btc || 0);
        setUsdcBalance(data.usdc || 0);
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Auto-refresh balances on connect
  useEffect(() => {
    if (isConnected) {
      refreshBalances();
    }
  }, [isConnected, refreshBalances]);

  return (
    <DynamicWalletContext.Provider
      value={{
        wallets,
        btcWallet,
        ethWallet,
        isConnected,
        isLoading,
        isConfigured: true,
        isWalletInitializing,
        sdkHasLoaded,
        dynamicUser,
        isAuthenticated,
        syncedProfile,
        disconnectWallet,
        signMessage,
        syncWalletToProfile,
        refreshProfile,
        btcBalance,
        usdcBalance,
        refreshBalances,
      }}
    >
      {children}
    </DynamicWalletContext.Provider>
  );
};

// Main provider that switches between internal (with Dynamic) and fallback (without)
export const DynamicWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isConfigured = useDynamicConfigured();

  if (!isConfigured) {
    // Provide default context when Dynamic is not configured
    return (
      <DynamicWalletContext.Provider value={defaultContextValue}>
        {children}
      </DynamicWalletContext.Provider>
    );
  }

  // Use the internal provider that has access to Dynamic hooks
  return <DynamicWalletProviderInternal>{children}</DynamicWalletProviderInternal>;
};

export const useDynamicWallet = () => {
  const context = useContext(DynamicWalletContext);
  // Return default values if context is undefined (e.g., during HMR or outside provider)
  if (context === undefined) {
    console.warn('useDynamicWallet called outside DynamicWalletProvider, returning defaults');
    return defaultContextValue;
  }
  return context;
};
