import React from 'react';
import { DynamicContextProvider, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { BitcoinWalletConnectors } from '@dynamic-labs/bitcoin';
import { DynamicWalletProvider } from '@/contexts/DynamicWalletContext';

// Environment ID from Dynamic.xyz dashboard
const DYNAMIC_ENVIRONMENT_ID = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || '';

interface DynamicProviderProps {
  children: React.ReactNode;
}

export const DynamicProvider: React.FC<DynamicProviderProps> = ({ children }) => {
  // Check if Dynamic is configured
  const isDynamicConfigured = !!DYNAMIC_ENVIRONMENT_ID && DYNAMIC_ENVIRONMENT_ID !== 'YOUR_DYNAMIC_ENVIRONMENT_ID';

  if (!isDynamicConfigured) {
    console.warn('Dynamic SDK not configured. Set VITE_DYNAMIC_ENVIRONMENT_ID in your environment.');
    // Still render children but without Dynamic context
    return <>{children}</>;
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENVIRONMENT_ID,
        walletConnectors: [
          EthereumWalletConnectors,
          BitcoinWalletConnectors,
        ],
        appName: 'CoinEdge',
        appLogoUrl: '/favicon.ico',
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
      <DynamicWalletProvider>
        {children}
      </DynamicWalletProvider>
    </DynamicContextProvider>
  );
};

// Export the widget for use in UI
export { DynamicWidget };
