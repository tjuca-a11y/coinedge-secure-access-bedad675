import { useMemo } from 'react';

export type PaymentMethod = 'CARD' | 'CASH';

export interface PosFeeBreakdown {
  baseAmount: number;
  merchantFee: number;
  squareProcessing: number;
  totalPosFee: number;
  customerPays: number;
  merchantCommissionRate: number;
}

export interface RedemptionFeeBreakdown {
  baseAmount: number;
  salesRepFee: number;
  volatilityReserve: number;
  coinedgeRevenue: number;
  totalRedemptionFee: number;
  netValue: number;
}

export interface FeeBreakdown extends PosFeeBreakdown, RedemptionFeeBreakdown {
  totalFee: number;
}

// POS Fee rates (charged at purchase)
const POS_FEE_RATES = {
  MERCHANT_CARD: 0.02,     // 2%
  MERCHANT_CASH: 0.05,     // 5%
  SQUARE_PROCESSING: 0.03, // 3% (card only)
};

// Redemption fee rates (deducted when claiming BTC)
const REDEMPTION_FEE_RATES = {
  SALES_REP: 0.02,        // 2%
  VOLATILITY: 0.03,       // 3%
  COINEDGE: 0.0375,       // 3.75%
};

export const POS_FEE_RATE_CARD = POS_FEE_RATES.MERCHANT_CARD + POS_FEE_RATES.SQUARE_PROCESSING; // 5%
export const POS_FEE_RATE_CASH = POS_FEE_RATES.MERCHANT_CASH; // 5%
export const REDEMPTION_FEE_RATE = REDEMPTION_FEE_RATES.SALES_REP + REDEMPTION_FEE_RATES.VOLATILITY + REDEMPTION_FEE_RATES.COINEDGE; // 8.75%

// Legacy total for reference (not used at POS anymore)
export const TOTAL_FEE_RATE = 0.1375; // 13.75%

export function calculatePosFees(baseAmount: number, paymentMethod: PaymentMethod): PosFeeBreakdown {
  // Merchant commission: 2% for card, 5% for cash
  const merchantFee = paymentMethod === 'CASH' 
    ? baseAmount * POS_FEE_RATES.MERCHANT_CASH 
    : baseAmount * POS_FEE_RATES.MERCHANT_CARD;
  
  // Square charges 3% processing on card payments (not us)
  const squareProcessing = paymentMethod === 'CARD' 
    ? baseAmount * POS_FEE_RATES.SQUARE_PROCESSING 
    : 0;
  
  // For card: customer pays base + 3% Square processing
  // For cash: customer pays base only (merchant keeps 5% from their margin)
  const totalPosFee = squareProcessing; // Only Square fee is charged to customer
  const customerPays = baseAmount + totalPosFee;
  
  return {
    baseAmount,
    merchantFee,
    squareProcessing,
    totalPosFee,
    customerPays,
    merchantCommissionRate: paymentMethod === 'CASH' ? 5 : 2,
  };
}

export function calculateRedemptionFees(baseAmount: number): RedemptionFeeBreakdown {
  const salesRepFee = baseAmount * REDEMPTION_FEE_RATES.SALES_REP;
  const volatilityReserve = baseAmount * REDEMPTION_FEE_RATES.VOLATILITY;
  const coinedgeRevenue = baseAmount * REDEMPTION_FEE_RATES.COINEDGE;
  const totalRedemptionFee = salesRepFee + volatilityReserve + coinedgeRevenue;
  const netValue = baseAmount - totalRedemptionFee;
  
  return {
    baseAmount,
    salesRepFee,
    volatilityReserve,
    coinedgeRevenue,
    totalRedemptionFee,
    netValue,
  };
}

export function calculateFees(baseAmount: number, paymentMethod: PaymentMethod): FeeBreakdown {
  const posFees = calculatePosFees(baseAmount, paymentMethod);
  const redemptionFees = calculateRedemptionFees(baseAmount);
  
  return {
    ...posFees,
    ...redemptionFees,
    totalFee: posFees.totalPosFee + redemptionFees.totalRedemptionFee,
  };
}

export function useFeeCalculation(baseAmount: number, paymentMethod: PaymentMethod): FeeBreakdown {
  return useMemo(() => calculateFees(baseAmount, paymentMethod), [baseAmount, paymentMethod]);
}

export function usePosFeeCalculation(baseAmount: number, paymentMethod: PaymentMethod): PosFeeBreakdown {
  return useMemo(() => calculatePosFees(baseAmount, paymentMethod), [baseAmount, paymentMethod]);
}

export function useRedemptionFeeCalculation(baseAmount: number): RedemptionFeeBreakdown {
  return useMemo(() => calculateRedemptionFees(baseAmount), [baseAmount]);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
