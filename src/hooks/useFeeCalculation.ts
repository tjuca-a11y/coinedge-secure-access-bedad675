import { useMemo } from 'react';

// Fee structure: All fees are deducted at REDEMPTION (when customer claims BTC)
// At purchase, customer pays exact face value, deducted from merchant's cash credit

export interface FeeBreakdown {
  baseAmount: number;
  merchantCommission: number;
  salesRepCommission: number;
  coinedgeRevenue: number;
  totalFee: number;
  netBtcValue: number;
}

// Fee rates (all applied at redemption)
export const FEE_RATES = {
  MERCHANT: 0.04,      // 4% - paid to merchant
  SALES_REP: 0.02,     // 2% - paid to sales rep
  COINEDGE: 0.0775,    // 7.75% - CoinEdge revenue
};

export const TOTAL_FEE_RATE = FEE_RATES.MERCHANT + FEE_RATES.SALES_REP + FEE_RATES.COINEDGE; // 13.75%

// Setup/funding constants
export const SETUP_FEE = 50;           // $50 one-time setup fee (credited to sales rep)
export const MIN_INITIAL_FUNDING = 300; // $300 minimum to start
export const MIN_CASH_CREDIT = 250;    // $300 - $50 = $250 minimum cash credit

/**
 * Calculate fee breakdown for a given USD amount
 * All fees are deducted at redemption, not at purchase
 */
export function calculateFees(baseAmount: number): FeeBreakdown {
  const merchantCommission = baseAmount * FEE_RATES.MERCHANT;
  const salesRepCommission = baseAmount * FEE_RATES.SALES_REP;
  const coinedgeRevenue = baseAmount * FEE_RATES.COINEDGE;
  const totalFee = merchantCommission + salesRepCommission + coinedgeRevenue;
  const netBtcValue = baseAmount - totalFee;
  
  return {
    baseAmount,
    merchantCommission,
    salesRepCommission,
    coinedgeRevenue,
    totalFee,
    netBtcValue,
  };
}

/**
 * Hook to calculate fees with memoization
 */
export function useFeeCalculation(baseAmount: number): FeeBreakdown {
  return useMemo(() => calculateFees(baseAmount), [baseAmount]);
}

/**
 * Format a number as USD currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a percentage
 */
export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}
