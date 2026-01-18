import React, { useState } from 'react';
import { SalesRepLayout } from '@/components/sales-rep/SalesRepLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSalesRepStats, useSalesRepTrendData } from '@/hooks/useSalesRepData';
import { useSalesRepAuth } from '@/contexts/SalesRepAuthContext';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, parseISO, startOfDay, startOfWeek, startOfMonth } from 'date-fns';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const SalesRepDashboard: React.FC = () => {
  const { salesRep } = useSalesRepAuth();
  const { data: stats, isLoading: statsLoading } = useSalesRepStats();
  const [trendPeriod, setTrendPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { data: trendData, isLoading: trendLoading } = useSalesRepTrendData(trendPeriod);

  // Process trend data for charts
  const processedTrendData = React.useMemo(() => {
    if (!trendData) return [];

    const grouped = new Map<string, { activations: number; usd: number; commission: number }>();

    trendData.forEach((item) => {
      const date = parseISO(item.activated_at);
      let key: string;

      if (trendPeriod === 'daily') {
        key = format(startOfDay(date), 'MMM d');
      } else if (trendPeriod === 'weekly') {
        key = format(startOfWeek(date, { weekStartsOn: 1 }), 'MMM d');
      } else {
        key = format(startOfMonth(date), 'MMM yyyy');
      }

      const existing = grouped.get(key) || { activations: 0, usd: 0, commission: 0 };
      grouped.set(key, {
        activations: existing.activations + 1,
        usd: existing.usd + Number(item.card_value_usd),
        commission: existing.commission + Number(item.rep_commission_usd),
      });
    });

    return Array.from(grouped.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));
  }, [trendData, trendPeriod]);

  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
    { key: 'year', label: 'This Year' },
    { key: 'lifetime', label: 'Lifetime' },
  ] as const;

  return (
    <SalesRepLayout title="Dashboard" subtitle={`Welcome back, ${salesRep?.full_name}`}>
      {/* Commission Model Info */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Your Commission Model</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-success">$50</span> per merchant signup + 
                  <span className="font-semibold text-primary ml-1">2%</span> on every BitCard redemption
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Stats */}
      <Tabs defaultValue="month" className="mb-6">
        <TabsList className="mb-4">
          {periods.map((period) => (
            <TabsTrigger key={period.key} value={period.key}>
              {period.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {periods.map((period) => (
          <TabsContent key={period.key} value={period.key}>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Activated USD
                  </CardTitle>
                  <div className="rounded-lg bg-primary/10 p-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : formatCurrency(stats?.[period.key]?.activatedUsd || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total BitCard value activated</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cards Activated
                  </CardTitle>
                  <div className="rounded-lg bg-accent/10 p-2">
                    <BarChart3 className="h-4 w-4 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.[period.key]?.cardsActivated || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Number of BitCards activated</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Commission Earned
                  </CardTitle>
                  <div className="rounded-lg bg-success/10 p-2">
                    <DollarSign className="h-4 w-4 text-success" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {statsLoading ? '...' : formatCurrency(stats?.[period.key]?.commissionEarned || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Your earnings (2% of redemptions + bonuses)</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Trend Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Activation Trends
            </CardTitle>
            <div className="flex gap-1">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTrendPeriod(p)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    trendPeriod === p
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : processedTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={processedTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value, 'Activations']}
                  />
                  <Bar dataKey="activations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No activation data for this period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Commission Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : processedTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={processedTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Commission']}
                  />
                  <Line
                    type="monotone"
                    dataKey="commission"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--success))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No commission data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commission Breakdown */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Commission Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left font-medium text-muted-foreground">Period</th>
                  <th className="pb-3 text-right font-medium text-muted-foreground">Activated USD</th>
                  <th className="pb-3 text-right font-medium text-muted-foreground">Cards</th>
                  <th className="pb-3 text-right font-medium text-muted-foreground">Commission</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.key} className="border-b last:border-0">
                    <td className="py-3 font-medium">{period.label}</td>
                    <td className="py-3 text-right">
                      {statsLoading ? '...' : formatCurrency(stats?.[period.key]?.activatedUsd || 0)}
                    </td>
                    <td className="py-3 text-right">
                      {statsLoading ? '...' : stats?.[period.key]?.cardsActivated || 0}
                    </td>
                    <td className="py-3 text-right font-medium text-success">
                      {statsLoading ? '...' : formatCurrency(stats?.[period.key]?.commissionEarned || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </SalesRepLayout>
  );
};

export default SalesRepDashboard;
