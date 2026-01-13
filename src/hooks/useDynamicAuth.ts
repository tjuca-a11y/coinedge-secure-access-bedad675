import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

// Check if Dynamic SDK is configured
const isDynamicConfigured = () => {
  const envId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;
  return !!envId && envId !== 'YOUR_DYNAMIC_ENVIRONMENT_ID';
};

/**
 * Safe wrapper for useDynamicContext that returns null values when Dynamic isn't configured.
 * Prevents crashes when VITE_DYNAMIC_ENVIRONMENT_ID is not set.
 */
export const useDynamicAuth = () => {
  // If Dynamic is not configured, return mock values
  if (!isDynamicConfigured()) {
    return {
      user: null,
      isAuthenticated: false,
      setShowAuthFlow: () => {},
      handleLogOut: async () => {},
      primaryWallet: null,
      isConfigured: false,
    };
  }

  // Dynamic is configured, use the real context
  try {
    const context = useDynamicContext();
    return {
      user: context.user,
      isAuthenticated: !!context.user,
      setShowAuthFlow: context.setShowAuthFlow,
      handleLogOut: context.handleLogOut,
      primaryWallet: context.primaryWallet,
      isConfigured: true,
    };
  } catch {
    // Fallback if context is not available
    return {
      user: null,
      isAuthenticated: false,
      setShowAuthFlow: () => {},
      handleLogOut: async () => {},
      primaryWallet: null,
      isConfigured: false,
    };
  }
};

export { isDynamicConfigured };
