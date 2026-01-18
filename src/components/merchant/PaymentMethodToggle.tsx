import React from 'react';
import { CreditCard, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentMethod } from '@/hooks/useFeeCalculation';
import { formatCurrency } from '@/hooks/useFeeCalculation';

interface PaymentMethodToggleProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  cashBalance: number;
  baseAmount: number;
  cardCommission: number;
  cashCommission: number;
  disabled?: boolean;
}

export const PaymentMethodToggle: React.FC<PaymentMethodToggleProps> = ({
  value,
  onChange,
  cashBalance,
  baseAmount,
  cardCommission,
  cashCommission,
  disabled = false,
}) => {
  const canUseCash = cashBalance >= baseAmount && baseAmount > 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Card Option */}
      <button
        type="button"
        onClick={() => onChange('CARD')}
        disabled={disabled}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all",
          value === 'CARD'
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <CreditCard className="h-8 w-8" />
        <span className="text-lg font-semibold">Card</span>
        <span className="text-sm text-muted-foreground">Tap to Pay</span>
        <span className="text-xs font-medium text-green-600">
          +{formatCurrency(cardCommission)} commission
        </span>
      </button>

      {/* Cash Option */}
      <button
        type="button"
        onClick={() => canUseCash && onChange('CASH')}
        disabled={disabled || !canUseCash}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all",
          value === 'CASH'
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card hover:border-primary/50",
          (!canUseCash || disabled) && "opacity-50 cursor-not-allowed"
        )}
      >
        <Banknote className="h-8 w-8" />
        <span className="text-lg font-semibold">Cash</span>
        <span className="text-sm text-muted-foreground">
          {canUseCash ? `${formatCurrency(cashBalance)} available` : 'Insufficient credit'}
        </span>
        <span className="text-xs font-medium text-green-600">
          +{formatCurrency(cashCommission)} commission
        </span>
      </button>
    </div>
  );
};
