import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCommissions, useSalesReps } from '@/hooks/useAdminStats';
import { DollarSign, Download, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const AdminCommissions: React.FC = () => {
  const { data: commissions, isLoading } = useCommissions();
  const { data: salesReps } = useSalesReps();
  const [repFilter, setRepFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredCommissions = commissions?.filter((c) => {
    if (repFilter !== 'all' && c.rep_id !== repFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    totalAccrued:
      commissions
        ?.filter((c) => c.status === 'accrued')
        .reduce((sum, c) => sum + Number(c.rep_commission_usd), 0) || 0,
    totalPaid:
      commissions
        ?.filter((c) => c.status === 'paid')
        .reduce((sum, c) => sum + Number(c.rep_commission_usd), 0) || 0,
    totalCoinedgeRevenue:
      commissions?.reduce((sum, c) => sum + Number(c.coinedge_revenue_usd), 0) || 0,
    totalActivationFees:
      commissions?.reduce((sum, c) => sum + Number(c.activation_fee_usd), 0) || 0,
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'approved':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const exportCSV = () => {
    if (!filteredCommissions) return;

    const headers = [
      'Commission ID',
      'Rep Name',
      'Merchant',
      'BitCard ID',
      'Card Value',
      'Activation Fee',
      'Rep Commission',
      'CoinEdge Revenue',
      'Status',
      'Activated At',
    ];

    const rows = filteredCommissions.map((c) => [
      c.commission_id,
      c.sales_reps?.full_name || '',
      c.merchants?.business_name || '',
      c.bitcards?.bitcard_id || '',
      c.card_value_usd,
      c.activation_fee_usd,
      c.rep_commission_usd,
      c.coinedge_revenue_usd,
      c.status,
      c.activated_at,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <AdminLayout title="Commissions" subtitle="Track and manage sales rep commissions">
      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-warning/10 p-3">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Accrued</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalAccrued)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-success/10 p-3">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CoinEdge Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalCoinedgeRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-accent/10 p-3">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Activation Fees</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalActivationFees)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Commission Ledger</CardTitle>
          <div className="flex items-center gap-4">
            <Select value={repFilter} onValueChange={setRepFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by rep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reps</SelectItem>
                {salesReps?.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    {rep.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="accrued">Accrued</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredCommissions && filteredCommissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Commission ID</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Card Value</TableHead>
                  <TableHead>Activation Fee</TableHead>
                  <TableHead>Rep Commission</TableHead>
                  <TableHead>CoinEdge Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-mono text-xs">
                      {commission.commission_id}
                    </TableCell>
                    <TableCell>{commission.sales_reps?.full_name || '-'}</TableCell>
                    <TableCell>{commission.merchants?.business_name || '-'}</TableCell>
                    <TableCell>{formatCurrency(Number(commission.card_value_usd))}</TableCell>
                    <TableCell>{formatCurrency(Number(commission.activation_fee_usd))}</TableCell>
                    <TableCell className="font-medium text-success">
                      {formatCurrency(Number(commission.rep_commission_usd))}
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {formatCurrency(Number(commission.coinedge_revenue_usd))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(commission.status)}>
                        {commission.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(commission.activated_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No commissions found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminCommissions;
