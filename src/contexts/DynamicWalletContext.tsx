import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDynamicContext, useUserWallets, getAuthToken } from '@dynamic-labs/sdk-react-core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDynamicConfigured } from '@/providers/DynamicProvider';

interface WalletInfo {
  address: string;
  chain: 'BTC' | 'ETH';
  publicKey?: string;
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
  
  // User state from Dynamic
  dynamicUser: any;
  
  // Actions
  connectWallet: () => void;
  disconnectWallet: () => Promise<void>;
  signMessage: (message: string, chain: 'BTC' | 'ETH') => Promise<string | null>;
  syncWalletToProfile: () => Promise<void>;
  
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
  dynamicUser: null,
  connectWallet: () => console.warn('Dynamic SDK not configured'),
  disconnectWallet: async () => console.warn('Dynamic SDK not configured'),
  signMessage: async () => null,
  syncWalletToProfile: async () => console.warn('Dynamic SDK not configured'),
  btcBalance: 0,
  usdcBalance: 0,
  refreshBalances: async () => {},
};

// Internal provider that uses Dynamic hooks (only rendered when Dynamic is configured)
const DynamicWalletProviderInternal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    user: dynamicUser, 
    primaryWallet, 
    setShowAuthFlow, 
    handleLogOut,
  } = useDynamicContext();
  
  const userWallets = useUserWallets();
  
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [btcBalance, setBtcBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Derive isAuthenticated from user presence
  const isAuthenticated = !!dynamicUser;

  // Parse wallets from Dynamic
  useEffect(() => {
    if (userWallets && userWallets.length > 0) {
      const parsedWallets: WalletInfo[] = userWallets.map((wallet) => ({
        address: wallet.address,
        chain: wallet.chain?.toLowerCase().includes('bitcoin') ? 'BTC' : 'ETH',
        publicKey: wallet.address,
      }));
      setWallets(parsedWallets);
    } else {
      setWallets([]);
    }
  }, [userWallets]);

  // Derived wallet getters
  const btcWallet = wallets.find(w => w.chain === 'BTC') || null;
  const ethWallet = wallets.find(w => w.chain === 'ETH') || null;
  const isConnected = isAuthenticated && wallets.length > 0;

  // Sync Dynamic auth to Supabase (creates/updates user profile)
  useEffect(() => {
    const syncToSupabase = async () => {
      const authToken = getAuthToken();
      if (dynamicUser && authToken && wallets.length > 0) {
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
                walletAddresses: wallets.map(w => ({ address: w.address, chain: w.chain })),
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log('Dynamic auth synced to Supabase:', data.userId);
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

  // Connect wallet - triggers Dynamic modal
  const connectWallet = useCallback(() => {
    setShowAuthFlow(true);
  }, [setShowAuthFlow]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      await handleLogOut();
      await supabase.auth.signOut();
      setWallets([]);
      setBtcBalance(0);
      setUsdcBalance(0);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [handleLogOut]);

  // Sign message for transactions
  const signMessage = useCallback(async (message: string, chain: 'BTC' | 'ETH'): Promise<string | null> => {
    const wallet = chain === 'BTC' ? btcWallet : ethWallet;
    
    if (!wallet || !primaryWallet) {
      toast.error('No wallet connected for signing');
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
      toast.success('Wallet synced to profile');
    } catch (error) {
      console.error('Error syncing wallet to profile:', error);
      toast.error('Failed to sync wallet');
    }
  }, [btcWallet, ethWallet]);

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
        dynamicUser,
        connectWallet,
        disconnectWallet,
        signMessage,
        syncWalletToProfile,
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
  if (context === undefined) {
    throw new Error('useDynamicWallet must be used within a DynamicWalletProvider');
  }
  return context;
};
