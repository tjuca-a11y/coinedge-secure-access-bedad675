import React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrency, type PaymentMethod } from '@/hooks/useFeeCalculation';

interface CommissionDisplayProps {
  commission: number;
  paymentMethod: PaymentMethod;
  showRate?: boolean;
}

export const CommissionDisplay: React.FC<CommissionDisplayProps> = ({
  commission,
  paymentMethod,
  showRate = true,
}) => {
  const rate = paymentMethod === 'CASH' ? 5 : 2;

  return (
    <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Your Commission
            </p>
            {showRate && (
              <p className="text-xs text-green-600 dark:text-green-400">
                {rate}% on {paymentMethod.toLowerCase()} sales
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-2xl font-bold text-green-700 dark:text-green-300">
            {commission.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

interface CommissionSuccessProps {
  commission: number;
  paymentMethod: PaymentMethod;
}

export const CommissionSuccess: React.FC<CommissionSuccessProps> = ({
  commission,
  paymentMethod,
}) => {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900 p-4 mb-4">
        <TrendingUp className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>
      <p className="text-lg text-muted-foreground mb-2">You Earned</p>
      <p className="text-4xl font-bold text-green-600 dark:text-green-400">
        {formatCurrency(commission)}
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        {paymentMethod === 'CASH' ? 'Cash' : 'Card'} Sale Commission
      </p>
    </div>
  );
};
