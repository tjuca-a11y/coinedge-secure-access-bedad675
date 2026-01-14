import React, { createContext, useContext } from 'react';
import { DynamicContextProvider, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { BitcoinWalletConnectors } from '@dynamic-labs/bitcoin';

// Environment ID from Dynamic.xyz dashboard
const DYNAMIC_ENVIRONMENT_ID = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || '';

interface DynamicProviderProps {
  children: React.ReactNode;
}

// Create a context to track if Dynamic is configured
const DynamicConfigContext = createContext<boolean>(false);
export const useDynamicConfigured = () => useContext(DynamicConfigContext);

export const DynamicProvider: React.FC<DynamicProviderProps> = ({ children }) => {
  // Check if Dynamic is configured
  const isDynamicConfigured = !!DYNAMIC_ENVIRONMENT_ID && DYNAMIC_ENVIRONMENT_ID !== 'YOUR_DYNAMIC_ENVIRONMENT_ID';

  if (!isDynamicConfigured) {
    console.warn('Dynamic SDK not configured. Set VITE_DYNAMIC_ENVIRONMENT_ID in your environment.');
    // Provide false config context but still render children
    return (
      <DynamicConfigContext.Provider value={false}>
        {children}
      </DynamicConfigContext.Provider>
    );
  }

  return (
    <DynamicConfigContext.Provider value={true}>
      <DynamicContextProvider
        settings={{
          environmentId: DYNAMIC_ENVIRONMENT_ID,
          walletConnectors: [
            EthereumWalletConnectors,
            BitcoinWalletConnectors,
          ],
          appName: 'CoinEdge',
          appLogoUrl: '/favicon.ico',
          // Email-first authentication with automatic embedded wallet
          initialAuthenticationMode: 'connect-and-sign',
          // Force email-only authentication
          // Disable social providers
          socialProvidersFilter: () => [],
          // Wallet creation happens automatically after email auth
          events: {
            onAuthSuccess: (args) => {
              console.log('Dynamic auth success:', args.user?.userId);
            },
            onLogout: () => {
              console.log('Dynamic logout');
            },
          },
        }}
      >
        {children}
      </DynamicContextProvider>
    </DynamicConfigContext.Provider>
  );
};

// Export the widget for use in UI
export { DynamicWidget };
