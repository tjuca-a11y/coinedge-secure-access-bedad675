import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { useInventoryStats } from '@/hooks/useBtcInventory';
import { useUsdcInventoryStats, useCompanyUsdcBalance } from '@/hooks/useTreasury';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface TreasurySnapshot {
  id: string;
  snapshot_date: string;
  btc_eligible: number;
  btc_total: number;
  usdc_available: number;
  usdc_total: number;
  company_usdc: number;
  created_at: string;
}

export const useTreasurySnapshots = () => {
  return useQuery({
    queryKey: ['treasury-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treasury_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: true })
        .limit(30);

      if (error) throw error;
      return data as TreasurySnapshot[];
    },
  });
};

export const useRecordTreasurySnapshot = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (snapshot: {
      btc_eligible: number;
      btc_total: number;
      usdc_available: number;
      usdc_total: number;
      company_usdc: number;
    }) => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('treasury_snapshots')
        .upsert({
          snapshot_date: today,
          ...snapshot,
        }, { onConflict: 'snapshot_date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-snapshots'] });
      toast({ title: 'Snapshot recorded successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error recording snapshot', description: error.message, variant: 'destructive' });
    },
  });
};

const chartConfig = {
  btc_eligible: {
    label: 'BTC Eligible',
    color: 'hsl(var(--chart-1))',
  },
  usdc_available: {
    label: 'USDC Available',
    color: 'hsl(var(--chart-2))',
  },
  company_usdc: {
    label: 'Company USDC',
    color: 'hsl(var(--chart-3))',
  },
};

// BTC price assumption for chart display (could be fetched dynamically)
const BTC_PRICE_USD = 100000;

export const TreasuryBalanceChart: React.FC = () => {
  const { data: snapshots, isLoading } = useTreasurySnapshots();
  const { data: inventoryStats } = useInventoryStats();
  const { data: usdcStats } = useUsdcInventoryStats();
  const { data: companyUsdc } = useCompanyUsdcBalance();
  const recordSnapshot = useRecordTreasurySnapshot();

  const handleRecordSnapshot = () => {
    recordSnapshot.mutate({
      btc_eligible: inventoryStats?.eligible_btc || 0,
      btc_total: inventoryStats?.total_btc || 0,
      usdc_available: usdcStats?.available_usdc || 0,
      usdc_total: usdcStats?.total_usdc || 0,
      company_usdc: companyUsdc?.balance_usdc || 0,
    });
  };

  // Transform data for chart - convert BTC to USD equivalent for comparison
  const chartData = snapshots?.map(s => ({
    date: format(new Date(s.snapshot_date), 'MMM d'),
    btc_usd: Number(s.btc_eligible) * BTC_PRICE_USD,
    usdc_available: Number(s.usdc_available),
    company_usdc: Number(s.company_usdc),
  })) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Treasury Balance History
          </CardTitle>
          <CardDescription>
            BTC (in USD equivalent) and USDC balances over time
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRecordSnapshot}
          disabled={recordSnapshot.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${recordSnapshot.isPending ? 'animate-spin' : ''}`} />
          Record Snapshot
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <p>No historical data available.</p>
            <p className="text-sm">Click "Record Snapshot" to start tracking.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="btcGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="usdcGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="companyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number, name: string) => [
                  `$${value.toLocaleString()}`,
                  name === 'btc_usd' ? 'BTC (USD)' : name === 'usdc_available' ? 'USDC Inventory' : 'Company USDC'
                ]}
              />
              <Area
                type="monotone"
                dataKey="btc_usd"
                stroke="hsl(var(--chart-1))"
                fill="url(#btcGradient)"
                strokeWidth={2}
                name="BTC (USD)"
              />
              <Area
                type="monotone"
                dataKey="usdc_available"
                stroke="hsl(var(--chart-2))"
                fill="url(#usdcGradient)"
                strokeWidth={2}
                name="USDC Inventory"
              />
              <Area
                type="monotone"
                dataKey="company_usdc"
                stroke="hsl(var(--chart-3))"
                fill="url(#companyGradient)"
                strokeWidth={2}
                name="Company USDC"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default TreasuryBalanceChart;
