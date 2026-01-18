import { useMemo } from 'react';

export type PaymentMethod = 'CARD' | 'CASH';

export interface FeeBreakdown {
  baseAmount: number;
  totalFee: number;
  customerPays: number;
  salesRepFee: number;
  merchantFee: number;
  volatilityReserve: number;
  squareProcessing: number;
  coinedgeRevenue: number;
  merchantCommissionRate: number;
}

// Fee rates as percentages of base amount
const FEE_RATES = {
  SALES_REP: 0.02,        // 2%
  MERCHANT_CARD: 0.02,    // 2% for card
  MERCHANT_CASH: 0.05,    // 5% for cash
  VOLATILITY: 0.03,       // 3%
  SQUARE_PROCESSING: 0.03, // 3% (only for card)
  COINEDGE: 0.0375,       // 3.75%
};

export const TOTAL_FEE_RATE = 0.1375; // 13.75%

export function calculateFees(baseAmount: number, paymentMethod: PaymentMethod): FeeBreakdown {
  const totalFee = baseAmount * TOTAL_FEE_RATE;
  const customerPays = baseAmount + totalFee;
  
  const salesRepFee = baseAmount * FEE_RATES.SALES_REP;
  const merchantFee = paymentMethod === 'CASH' 
    ? baseAmount * FEE_RATES.MERCHANT_CASH 
    : baseAmount * FEE_RATES.MERCHANT_CARD;
  const volatilityReserve = baseAmount * FEE_RATES.VOLATILITY;
  const squareProcessing = paymentMethod === 'CARD' 
    ? baseAmount * FEE_RATES.SQUARE_PROCESSING 
    : 0;
  const coinedgeRevenue = baseAmount * FEE_RATES.COINEDGE;
  
  return {
    baseAmount,
    totalFee,
    customerPays,
    salesRepFee,
    merchantFee,
    volatilityReserve,
    squareProcessing,
    coinedgeRevenue,
    merchantCommissionRate: paymentMethod === 'CASH' ? 5 : 2,
  };
}

export function useFeeCalculation(baseAmount: number, paymentMethod: PaymentMethod): FeeBreakdown {
  return useMemo(() => calculateFees(baseAmount, paymentMethod), [baseAmount, paymentMethod]);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
