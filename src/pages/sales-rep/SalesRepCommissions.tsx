import React from 'react';
import { SalesRepLayout } from '@/components/sales-rep/SalesRepLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSalesRepCommissions, useSalesRepStats } from '@/hooks/useSalesRepData';
import { DollarSign, CreditCard, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const SalesRepCommissions: React.FC = () => {
  const { data: commissions, isLoading } = useSalesRepCommissions();
  const { data: stats } = useSalesRepStats();

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
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Activation Fee</p>
              <p className="font-bold text-lg">10%</p>
              <p className="text-xs text-muted-foreground">of card value</p>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="text-center">
              <p className="text-muted-foreground">CoinEdge Share</p>
              <p className="font-bold text-lg">70%</p>
              <p className="text-xs text-muted-foreground">of fee</p>
            </div>
            <div className="text-2xl text-muted-foreground">+</div>
            <div className="text-center">
              <p className="text-muted-foreground">Your Commission</p>
              <p className="font-bold text-lg text-success">30%</p>
              <p className="text-xs text-muted-foreground">of fee (3% of card)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : commissions && commissions.length > 0 ? (
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
                {commissions.map((commission) => (
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
              <p className="mt-4 text-lg font-medium text-muted-foreground">No commissions yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your commissions will appear here when your merchants activate BitCards.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </SalesRepLayout>
  );
};

export default SalesRepCommissions;
