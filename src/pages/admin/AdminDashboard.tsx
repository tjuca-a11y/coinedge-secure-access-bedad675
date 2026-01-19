import React from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminStats, useMerchants } from '@/hooks/useAdminStats';
import {
  CreditCard,
  DollarSign,
  Store,
  Users,
  TrendingUp,
  AlertCircle,
  Wallet,
  PieChart,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Fee allocation structure (all fees deducted at redemption)
const FEE_ALLOCATIONS = [
  { name: 'Merchant Commission', rate: 4.00, color: 'text-success' },
  { name: 'Sales Rep Commission', rate: 2.00, color: 'text-warning' },
  { name: 'CoinEdge Revenue', rate: 7.75, color: 'text-primary' },
];

const TOTAL_FEE_RATE = FEE_ALLOCATIONS.reduce((sum, fee) => sum + fee.rate, 0); // 13.75%

const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: merchants, isLoading: merchantsLoading } = useMerchants();

  const statCards = [
    {
      title: 'BitCards Activated',
      value: stats?.totalBitcardsActivated || 0,
      subvalue: formatCurrency(stats?.totalActivatedUsd || 0),
      icon: CreditCard,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Activation Fees',
      value: formatCurrency(stats?.totalActivationFees || 0),
      subvalue: `${TOTAL_FEE_RATE.toFixed(2)}% at redemption`,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'CoinEdge Revenue',
      value: formatCurrency(stats?.coinedgeRevenue || 0),
      subvalue: '7.75% at redemption',
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Rep Commissions',
      value: formatCurrency(stats?.totalRepCommissions || 0),
      subvalue: '2% at redemption',
      icon: Users,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const summaryCards = [
    {
      title: 'Total Merchants',
      value: stats?.merchantCount || 0,
      icon: Store,
    },
    {
      title: 'Sales Reps',
      value: stats?.salesRepCount || 0,
      icon: Users,
    },
    {
      title: 'Pending Activation',
      value: stats?.pendingApprovalCount || 0,
      icon: AlertCircle,
    },
    {
      title: 'Merchant Cash Credit Liability',
      value: formatCurrency(stats?.totalMerchantCashCredit || 0),
      icon: Wallet,
      highlight: true,
    },
  ];

  return (
    <AdminLayout title="Dashboard" subtitle="Overview of CoinEdge operations">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subvalue}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {summaryCards.map((card) => (
          <Card 
            key={card.title}
            className={card.highlight ? 'border-amber-500/20 bg-amber-500/5' : ''}
          >
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`rounded-lg p-3 ${card.highlight ? 'bg-amber-500/10' : 'bg-muted'}`}>
                <card.icon className={`h-6 w-6 ${card.highlight ? 'text-amber-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className={`text-sm ${card.highlight ? 'text-amber-600' : 'text-muted-foreground'}`}>{card.title}</p>
                <p className={`text-2xl font-bold ${card.highlight ? 'text-amber-600' : ''}`}>{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fee Allocation Breakdown */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <PieChart className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Fee Allocation Model</CardTitle>
          </div>
          <Badge variant="outline" className="text-sm font-semibold">
            Total: {TOTAL_FEE_RATE.toFixed(2)}%
          </Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Allocation</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FEE_ALLOCATIONS.map((fee) => (
                <TableRow key={fee.name}>
                  <TableCell className={`font-medium ${fee.color}`}>
                    {fee.name}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${fee.color}`}>
                    {fee.rate.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-primary/20 bg-muted/50">
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold text-primary">
                  {TOTAL_FEE_RATE.toFixed(2)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Merchant Performance Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Merchant Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {merchantsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : merchants && merchants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Rep</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchants.slice(0, 10).map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{merchant.business_name}</p>
                        <p className="text-xs text-muted-foreground">{merchant.merchant_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          merchant.status === 'active'
                            ? 'default'
                            : merchant.status === 'paused'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {merchant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {merchant.sales_reps?.full_name || (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {merchant.city}, {merchant.state}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No merchants found. Create your first merchant to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminDashboard;
