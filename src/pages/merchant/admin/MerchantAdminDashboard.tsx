import React, { useState } from 'react';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Package,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { DailyEarningsBanner } from '@/components/merchant/DailyEarningsBanner';

const MerchantAdminDashboard: React.FC = () => {
  const { merchant, wallet } = useMerchantAuth();
  const [showEarningsBanner, setShowEarningsBanner] = useState(true);

  // Fetch recent ledger entries
  const { data: ledgerEntries } = useQuery({
    queryKey: ['merchant-ledger', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) return [];
      const { data, error } = await supabase
        .from('merchant_wallet_ledger')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!merchant?.id,
  });

  // Fetch activation stats with commission totals
  const { data: activationStats } = useQuery({
    queryKey: ['activation-stats', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) return { today: 0, week: 0, month: 0, totalCommission: 0, cardCommission: 0, cashCommission: 0 };

      const now = new Date();
      const todayStart = startOfDay(now).toISOString();
      const weekStart = startOfDay(subDays(now, 7)).toISOString();
      const monthStart = startOfDay(subDays(now, 30)).toISOString();

      const [todayRes, weekRes, monthRes, commissionsRes] = await Promise.all([
        supabase
          .from('bitcard_activation_events')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id)
          .gte('created_at', todayStart),
        supabase
          .from('bitcard_activation_events')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id)
          .gte('created_at', weekStart),
        supabase
          .from('bitcard_activation_events')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', merchant.id)
          .gte('created_at', monthStart),
        supabase
          .from('bitcard_activation_events')
          .select('merchant_commission_usd, payment_method')
          .eq('merchant_id', merchant.id),
      ]);

      // Calculate commission totals
      let totalCommission = 0;
      let cardCommission = 0;
      let cashCommission = 0;
      
      if (commissionsRes.data) {
        for (const event of commissionsRes.data) {
          const commission = event.merchant_commission_usd || 0;
          totalCommission += commission;
          if (event.payment_method === 'CARD') {
            cardCommission += commission;
          } else if (event.payment_method === 'CASH') {
            cashCommission += commission;
          }
        }
      }

      return {
        today: todayRes.count ?? 0,
        week: weekRes.count ?? 0,
        month: monthRes.count ?? 0,
        totalCommission,
        cardCommission,
        cashCommission,
      };
    },
    enabled: !!merchant?.id,
  });

  const formatLedgerType = (type: string) => {
    switch (type) {
      case 'TOPUP':
        return { label: 'Top Up', icon: ArrowUpRight, color: 'text-green-500' };
      case 'ACTIVATION_DEBIT':
        return { label: 'Card Activation', icon: ArrowDownRight, color: 'text-red-500' };
      case 'ADJUSTMENT':
        return { label: 'Adjustment', icon: Activity, color: 'text-blue-500' };
      case 'MERCHANT_COMMISSION_CARD':
        return { label: 'Card Sale Commission', icon: TrendingUp, color: 'text-green-500' };
      case 'MERCHANT_COMMISSION_CASH':
        return { label: 'Cash Sale Commission', icon: TrendingUp, color: 'text-green-500' };
      case 'CASH_SALE_DEBIT':
        return { label: 'Cash Sale', icon: ArrowDownRight, color: 'text-orange-500' };
      case 'INITIAL_FUNDING':
        return { label: 'Initial Funding', icon: ArrowUpRight, color: 'text-green-500' };
      default:
        return { label: type, icon: Activity, color: 'text-muted-foreground' };
    }
  };

  return (
    <MerchantLayout title="Dashboard" subtitle="Overview of your merchant account">
      {/* Daily Earnings Notification */}
      {showEarningsBanner && (
        <DailyEarningsBanner onDismiss={() => setShowEarningsBanner(false)} />
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${activationStats?.totalCommission?.toFixed(2) ?? '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Credit</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${wallet?.cash_credit_balance?.toFixed(2) ?? '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">For cash sales (5% commission)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Card Commissions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${activationStats?.cardCommission?.toFixed(2) ?? '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">2% on card sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${activationStats?.cashCommission?.toFixed(2) ?? '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">5% on cash sales</p>
          </CardContent>
        </Card>
      </div>

      {/* Activation Stats */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Activations</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activationStats?.today ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">7-Day Activations</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activationStats?.week ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">30-Day Activations</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activationStats?.month ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link to="/merchant/admin/add-balance">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Add Balance</h3>
                <p className="text-sm text-muted-foreground">Top up your cash credit</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/merchant/admin/order-cards">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <Package className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Order Cards</h3>
                <p className="text-sm text-muted-foreground">Purchase BitCards</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/merchant/admin/cashiers">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold">Manage Cashiers</h3>
                <p className="text-sm text-muted-foreground">Add or edit team members</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Ledger Entries */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {ledgerEntries && ledgerEntries.length > 0 ? (
            <div className="space-y-4">
              {ledgerEntries.map((entry) => {
                const typeInfo = formatLedgerType(entry.type);
                const Icon = typeInfo.icon;
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2 ${typeInfo.color} bg-muted`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{typeInfo.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${Number(entry.amount_usd) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Number(entry.amount_usd) >= 0 ? '+' : ''}${Number(entry.amount_usd).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </MerchantLayout>
  );
};

export default MerchantAdminDashboard;
