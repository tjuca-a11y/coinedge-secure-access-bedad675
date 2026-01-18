import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfDay, subDays } from 'date-fns';

interface DailyEarningsBannerProps {
  onDismiss?: () => void;
}

export const DailyEarningsBanner: React.FC<DailyEarningsBannerProps> = ({ onDismiss }) => {
  const { merchant } = useMerchantAuth();

  // Fetch yesterday's earnings
  const { data: yesterdayEarnings, isLoading } = useQuery({
    queryKey: ['yesterday-earnings', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) return null;

      const now = new Date();
      const yesterdayStart = startOfDay(subDays(now, 1)).toISOString();
      const todayStart = startOfDay(now).toISOString();

      const { data, error } = await supabase
        .from('bitcard_activation_events')
        .select('merchant_commission_usd, payment_method')
        .eq('merchant_id', merchant.id)
        .gte('created_at', yesterdayStart)
        .lt('created_at', todayStart);

      if (error) throw error;

      let total = 0;
      let cardTotal = 0;
      let cashTotal = 0;
      let count = 0;

      for (const event of data || []) {
        const commission = event.merchant_commission_usd || 0;
        total += commission;
        count++;
        if (event.payment_method === 'CARD') {
          cardTotal += commission;
        } else {
          cashTotal += commission;
        }
      }

      return { total, cardTotal, cashTotal, count };
    },
    enabled: !!merchant?.id,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Don't show if no earnings or still loading
  if (isLoading || !yesterdayEarnings || yesterdayEarnings.total === 0) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="relative rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white shadow-lg mb-4">
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
          <TrendingUp className="h-6 w-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Yesterday's Earnings</h3>
          <p className="text-white/90 text-sm">
            You earned <span className="font-bold">{formatCurrency(yesterdayEarnings.total)}</span> from{' '}
            {yesterdayEarnings.count} sale{yesterdayEarnings.count !== 1 ? 's' : ''}
          </p>
          {yesterdayEarnings.cardTotal > 0 && yesterdayEarnings.cashTotal > 0 && (
            <p className="text-white/70 text-xs mt-1">
              Card: {formatCurrency(yesterdayEarnings.cardTotal)} • Cash: {formatCurrency(yesterdayEarnings.cashTotal)}
            </p>
          )}
        </div>
        
        <div className="text-right">
          <p className="text-3xl font-bold">{formatCurrency(yesterdayEarnings.total)}</p>
        </div>
      </div>
    </div>
  );
};
