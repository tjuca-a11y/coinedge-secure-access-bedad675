import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useBitcards } from '@/hooks/useAdminStats';
import { Search, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const AdminBitcards: React.FC = () => {
  const { data: bitcards, isLoading } = useBitcards();
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'redeemed':
        return 'secondary';
      case 'expired':
      case 'canceled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredBitcards = bitcards?.filter(
    (b) =>
      b.bitcard_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.merchants?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: bitcards?.length || 0,
    active: bitcards?.filter((b) => b.status === 'active').length || 0,
    redeemed: bitcards?.filter((b) => b.status === 'redeemed').length || 0,
    totalValue: bitcards?.reduce((sum, b) => sum + Number(b.usd_value), 0) || 0,
  };

  return (
    <AdminLayout title="BitCards" subtitle="Manage and track BitCard lifecycle">
      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cards</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-success/10 p-3">
              <CreditCard className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-secondary p-3">
              <CreditCard className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Redeemed</p>
              <p className="text-2xl font-bold">{stats.redeemed}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-lg bg-accent/10 p-3">
              <CreditCard className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>BitCards</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by ID or merchant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredBitcards && filteredBitcards.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BitCard ID</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>Redeemed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBitcards.map((bitcard) => (
                  <TableRow key={bitcard.id}>
                    <TableCell className="font-mono font-medium">{bitcard.bitcard_id}</TableCell>
                    <TableCell>
                      {bitcard.merchants?.business_name || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(Number(bitcard.usd_value))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(bitcard.status)}>
                        {bitcard.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(bitcard.issued_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {bitcard.activated_at
                        ? format(new Date(bitcard.activated_at), 'MMM d, yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {bitcard.redeemed_at
                        ? format(new Date(bitcard.redeemed_at), 'MMM d, yyyy HH:mm')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {searchTerm ? 'No BitCards match your search.' : 'No BitCards found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminBitcards;
