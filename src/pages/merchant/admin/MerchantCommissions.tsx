import React, { useState } from 'react';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CreditCard,
  Banknote,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { format, startOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns';

const MerchantCommissions: React.FC = () => {
  const { merchant } = useMerchantAuth();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

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
        .select('id, created_at, usd_value, merchant_commission_usd, payment_method, bitcard_id')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: events, error } = await query;
      if (error) throw error;

      // Calculate totals
      let totalCommission = 0;
      let cardCommission = 0;
      let cashCommission = 0;
      let cardCount = 0;
      let cashCount = 0;
      let cardVolume = 0;
      let cashVolume = 0;

      for (const event of events || []) {
        const commission = event.merchant_commission_usd || 0;
        const volume = event.usd_value || 0;
        totalCommission += commission;
        
        if (event.payment_method === 'CARD') {
          cardCommission += commission;
          cardCount++;
          cardVolume += volume;
        } else if (event.payment_method === 'CASH') {
          cashCommission += commission;
          cashCount++;
          cashVolume += volume;
        }
      }

      // Get daily breakdown for chart
      const dailyMap = new Map<string, { card: number; cash: number; total: number }>();
      for (const event of events || []) {
        const day = format(new Date(event.created_at), 'yyyy-MM-dd');
        const existing = dailyMap.get(day) || { card: 0, cash: 0, total: 0 };
        const commission = event.merchant_commission_usd || 0;
        
        if (event.payment_method === 'CARD') {
          existing.card += commission;
        } else {
          existing.cash += commission;
        }
        existing.total += commission;
        dailyMap.set(day, existing);
      }

      const dailyBreakdown = Array.from(dailyMap.entries())
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => b.date.localeCompare(a.date));

      return {
        events: events || [],
        totals: {
          totalCommission,
          cardCommission,
          cashCommission,
          cardCount,
          cashCount,
          cardVolume,
          cashVolume,
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
    <MerchantLayout title="Commission Summary" subtitle="Track your earnings by payment method">
      {/* Commission Rates Banner */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-success/5">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="font-semibold">Your Commission Rates</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Card Sales:</span>
                <Badge variant="outline" className="font-bold text-blue-600 border-blue-300">
                  2%
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-500" />
                <span className="text-sm">Cash Sales:</span>
                <Badge variant="outline" className="font-bold text-green-600 border-green-300">
                  5%
                </Badge>
              </div>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
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
              {(commissionData?.totals.cardCount ?? 0) + (commissionData?.totals.cashCount ?? 0)} total sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Card Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(commissionData?.totals.cardCommission ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissionData?.totals.cardCount ?? 0} sales @ 2%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Sales</CardTitle>
            <Banknote className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(commissionData?.totals.cashCommission ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissionData?.totals.cashCount ?? 0} sales @ 5%
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
              {formatCurrency((commissionData?.totals.cardVolume ?? 0) + (commissionData?.totals.cashVolume ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              BTC voucher value
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
                  <TableHead className="text-right">Card</TableHead>
                  <TableHead className="text-right">Cash</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionData.dailyBreakdown.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">
                      {format(new Date(day.date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(day.card)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(day.cash)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(day.total)}
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
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
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
                    <TableCell>{formatCurrency(event.usd_value)}</TableCell>
                    <TableCell>
                      <Badge variant={event.payment_method === 'CASH' ? 'secondary' : 'outline'}>
                        {event.payment_method === 'CASH' ? (
                          <><Banknote className="h-3 w-3 mr-1" /> Cash</>
                        ) : (
                          <><CreditCard className="h-3 w-3 mr-1" /> Card</>
                        )}
                      </Badge>
                    </TableCell>
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
