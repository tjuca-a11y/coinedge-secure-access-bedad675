import React, { useState, useMemo } from 'react';
import { SalesRepLayout } from '@/components/sales-rep/SalesRepLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useSalesRepCommissions, useSalesRepStats } from '@/hooks/useSalesRepData';
import { DollarSign, CreditCard, TrendingUp, CalendarIcon, X } from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const SalesRepCommissions: React.FC = () => {
  const { data: commissions, isLoading } = useSalesRepCommissions();
  const { data: stats } = useSalesRepStats();
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const filteredCommissions = useMemo(() => {
    if (!commissions) return [];
    if (!dateRange.from && !dateRange.to) return commissions;

    return commissions.filter((commission) => {
      const commissionDate = new Date(commission.activated_at);
      
      if (dateRange.from && dateRange.to) {
        return isWithinInterval(commissionDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      }
      
      if (dateRange.from) {
        return commissionDate >= startOfDay(dateRange.from);
      }
      
      return true;
    });
  }, [commissions, dateRange]);

  const filteredStats = useMemo(() => {
    return {
      totalCommission: filteredCommissions.reduce((sum, c) => sum + Number(c.rep_commission_usd), 0),
      totalActivatedUsd: filteredCommissions.reduce((sum, c) => sum + Number(c.card_value_usd), 0),
      count: filteredCommissions.length,
    };
  }, [filteredCommissions]);

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

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <SalesRepLayout title="Commissions" subtitle="Track your earnings from BitCard activations">
      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-success/10 p-3">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lifetime Earned</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(stats?.lifetime?.commissionEarned || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">
                {formatCurrency(stats?.month?.commissionEarned || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-accent/10 p-3">
              <CreditCard className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cards Activated</p>
              <p className="text-2xl font-bold">{stats?.lifetime?.cardsActivated || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-warning/10 p-3">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Activated USD</p>
              <p className="text-2xl font-bold">
                {formatCurrency(stats?.lifetime?.activatedUsd || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Model */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How You Earn</CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-full bg-success/10 p-2">
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="font-semibold">Merchant Signup Bonus</p>
                  <p className="text-2xl font-bold text-success">$50</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                One-time bonus when your merchant completes their initial cash credit funding
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-full bg-primary/10 p-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Redemption Commission</p>
                  <p className="text-2xl font-bold text-primary">2%</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Earned each time a customer redeems a BitCard from your merchant
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Commission History</CardTitle>
            <div className="flex items-center gap-2">
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
                          {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                        </>
                      ) : (
                        format(dateRange.from, 'MMM d, yyyy')
                      )
                    ) : (
                      <span>Select date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
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
          {(dateRange.from || dateRange.to) && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <div className="rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">Filtered Total: </span>
                <span className="font-semibold text-success">{formatCurrency(filteredStats.totalCommission)}</span>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">Activated USD: </span>
                <span className="font-semibold">{formatCurrency(filteredStats.totalActivatedUsd)}</span>
              </div>
              <div className="rounded-lg bg-muted px-3 py-2">
                <span className="text-muted-foreground">Records: </span>
                <span className="font-semibold">{filteredStats.count}</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredCommissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>BitCard</TableHead>
                  <TableHead className="text-right">Card Value</TableHead>
                  <TableHead className="text-right">Activation Fee</TableHead>
                  <TableHead className="text-right">Your Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      {format(new Date(commission.activated_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {commission.merchants?.business_name || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {commission.bitcards?.bitcard_id || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(commission.card_value_usd))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(Number(commission.activation_fee_usd))}
                    </TableCell>
                    <TableCell className="text-right font-medium text-success">
                      {formatCurrency(Number(commission.rep_commission_usd))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(commission.status)}>
                        {commission.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                {dateRange.from || dateRange.to ? 'No commissions in this date range' : 'No commissions yet'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {dateRange.from || dateRange.to
                  ? 'Try selecting a different date range'
                  : 'Your commissions will appear here when your merchants activate BitCards.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </SalesRepLayout>
  );
};

export default SalesRepCommissions;
