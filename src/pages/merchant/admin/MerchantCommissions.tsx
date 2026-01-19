import React, { useState } from 'react';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Percent,
  Receipt,
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { FEE_RATES } from '@/hooks/useFeeCalculation';

const MerchantCommissions: React.FC = () => {
  const { merchant } = useMerchantAuth();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

  const commissionRate = FEE_RATES.MERCHANT * 100; // 4%

  // Fetch commission data
  const { data: commissionData, isLoading } = useQuery({
    queryKey: ['merchant-commissions', merchant?.id, period],
    queryFn: async () => {
      if (!merchant?.id) return null;

      const now = new Date();
      let startDate: Date | null = null;
      
      switch (period) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        default:
          startDate = null;
      }

      let query = supabase
        .from('bitcard_activation_events')
        .select('id, created_at, usd_value, merchant_commission_usd, bitcard_id')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: events, error } = await query;
      if (error) throw error;

      // Calculate totals
      let totalCommission = 0;
      let totalVolume = 0;
      let salesCount = 0;

      for (const event of events || []) {
        const commission = event.merchant_commission_usd || 0;
        const volume = event.usd_value || 0;
        totalCommission += commission;
        totalVolume += volume;
        salesCount++;
      }

      // Get daily breakdown
      const dailyMap = new Map<string, { commission: number; volume: number; count: number }>();
      for (const event of events || []) {
        const day = format(new Date(event.created_at), 'yyyy-MM-dd');
        const existing = dailyMap.get(day) || { commission: 0, volume: 0, count: 0 };
        existing.commission += event.merchant_commission_usd || 0;
        existing.volume += event.usd_value || 0;
        existing.count++;
        dailyMap.set(day, existing);
      }

      const dailyBreakdown = Array.from(dailyMap.entries())
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => b.date.localeCompare(a.date));

      return {
        events: events || [],
        totals: {
          totalCommission,
          totalVolume,
          salesCount,
        },
        dailyBreakdown,
      };
    },
    enabled: !!merchant?.id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <MerchantLayout title="Commission Summary" subtitle="Track your earnings from card redemptions">
      {/* Commission Rate Banner */}
      <Card className="mb-6 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800 dark:text-green-200">Your Commission Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-green-600" />
              <Badge className="font-bold text-lg px-4 py-1 bg-green-600 hover:bg-green-600">
                {commissionRate}% at redemption
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)} className="mb-6">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(commissionData?.totals.totalCommission ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {commissionData?.totals.salesCount ?? 0} redemptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(commissionData?.totals.totalVolume ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Card activations value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cards Activated</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commissionData?.totals.salesCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {commissionData?.dailyBreakdown && commissionData.dailyBreakdown.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Cards</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionData.dailyBreakdown.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">
                      {format(new Date(day.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {day.count}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(day.volume)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      +{formatCurrency(day.commission)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No commission data for this period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Commission Events</CardTitle>
        </CardHeader>
        <CardContent>
          {commissionData?.events && commissionData.events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Card ID</TableHead>
                  <TableHead className="text-right">Card Value</TableHead>
                  <TableHead className="text-right">Commission ({commissionRate}%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionData.events.slice(0, 20).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(event.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.bitcard_id?.slice(-8) ?? 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(event.usd_value)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      +{formatCurrency(event.merchant_commission_usd ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No transactions yet
            </p>
          )}
        </CardContent>
      </Card>
    </MerchantLayout>
  );
};

export default MerchantCommissions;
