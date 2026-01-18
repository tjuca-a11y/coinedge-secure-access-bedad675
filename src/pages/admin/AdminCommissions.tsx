import React, { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { DollarSign, Download, TrendingUp, CalendarIcon, X, Gift } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const filteredCommissions = useMemo(() => {
    return commissions?.filter((c) => {
      if (repFilter !== 'all' && c.rep_id !== repFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      
      // Type filter: bonus = card_value_usd is 0, redemption = card_value_usd > 0
      if (typeFilter === 'bonus' && Number(c.card_value_usd) !== 0) return false;
      if (typeFilter === 'redemption' && Number(c.card_value_usd) === 0) return false;
      
      // Date filter
      if (dateRange.from || dateRange.to) {
        const commissionDate = new Date(c.activated_at);
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(commissionDate, {
            start: startOfDay(dateRange.from),
            end: endOfDay(dateRange.to),
          })) return false;
        } else if (dateRange.from) {
          if (commissionDate < startOfDay(dateRange.from)) return false;
        }
      }
      
      return true;
    });
  }, [commissions, repFilter, statusFilter, typeFilter, dateRange]);

  // Separate stats for bonuses vs redemption commissions
  const stats = useMemo(() => {
    const signupBonuses = commissions?.filter(c => Number(c.card_value_usd) === 0) || [];
    const redemptionCommissions = commissions?.filter(c => Number(c.card_value_usd) > 0) || [];
    
    return {
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
      totalRedemptionFees:
        commissions?.reduce((sum, c) => sum + Number(c.activation_fee_usd), 0) || 0,
      signupBonusTotal: signupBonuses.reduce((sum, c) => sum + Number(c.rep_commission_usd), 0),
      signupBonusCount: signupBonuses.length,
      redemptionTotal: redemptionCommissions.reduce((sum, c) => sum + Number(c.rep_commission_usd), 0),
      redemptionCount: redemptionCommissions.length,
    };
  }, [commissions]);

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

  const getCommissionType = (cardValue: number) => {
    return cardValue === 0 ? 'Signup Bonus' : 'Redemption (2%)';
  };

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  const exportCSV = () => {
    if (!filteredCommissions) return;

    const headers = [
      'Commission ID',
      'Type',
      'Rep Name',
      'Merchant',
      'BitCard ID',
      'Card Value',
      'Redemption Fee',
      'Rep Commission',
      'CoinEdge Revenue',
      'Status',
      'Date',
    ];

    const rows = filteredCommissions.map((c) => [
      c.commission_id,
      Number(c.card_value_usd) === 0 ? 'Signup Bonus' : 'Redemption',
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
      {/* Commission Model Info */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium mb-1">Sales Rep Commission Model</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-success" />
                  <span><strong className="text-success">$50</strong> per merchant signup</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span><strong className="text-primary">2%</strong> on each BitCard redemption</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Signup Bonuses</p>
                <p className="font-bold text-success">{formatCurrency(stats.signupBonusTotal)}</p>
                <p className="text-xs text-muted-foreground">({stats.signupBonusCount} merchants)</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Redemption Fees</p>
                <p className="font-bold text-primary">{formatCurrency(stats.redemptionTotal)}</p>
                <p className="text-xs text-muted-foreground">({stats.redemptionCount} redemptions)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-sm text-muted-foreground">Total Redemption Fees</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRedemptionFees)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Commission Ledger</CardTitle>
              <Button variant="outline" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={repFilter} onValueChange={setRepFilter}>
                <SelectTrigger className="w-40">
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bonus">Signup Bonus</SelectItem>
                  <SelectItem value="redemption">Redemption</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="accrued">Accrued</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !dateRange.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                        </>
                      ) : (
                        format(dateRange.from, 'MMM d, yyyy')
                      )
                    ) : (
                      <span>Date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
              {(dateRange.from || dateRange.to) && (
                <Button variant="ghost" size="icon" onClick={clearDateFilter}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="text-right">Card Value</TableHead>
                  <TableHead className="text-right">Rep Commission</TableHead>
                  <TableHead className="text-right">CoinEdge Revenue</TableHead>
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
                    <TableCell>
                      <Badge variant={Number(commission.card_value_usd) === 0 ? 'secondary' : 'outline'}>
                        {getCommissionType(Number(commission.card_value_usd))}
                      </Badge>
                    </TableCell>
                    <TableCell>{commission.sales_reps?.full_name || '-'}</TableCell>
                    <TableCell>{commission.merchants?.business_name || '-'}</TableCell>
                    <TableCell className="text-right">
                      {Number(commission.card_value_usd) > 0 
                        ? formatCurrency(Number(commission.card_value_usd))
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      {formatCurrency(Number(commission.rep_commission_usd))}
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {Number(commission.coinedge_revenue_usd) > 0
                        ? formatCurrency(Number(commission.coinedge_revenue_usd))
                        : '-'}
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
