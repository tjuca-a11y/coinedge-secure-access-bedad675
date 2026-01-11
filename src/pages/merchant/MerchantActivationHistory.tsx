import React, { useState } from 'react';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, CreditCard, Calendar, DollarSign, User } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

type DateFilter = 'today' | 'week' | 'month' | 'all';

const MerchantActivationHistory: React.FC = () => {
  const { merchant, merchantUser, isMerchantAdmin } = useMerchantAuth();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');

  const getDateRange = (filter: DateFilter) => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case 'all':
        return { start: null, end: null };
    }
  };

  const { data: activations, isLoading } = useQuery({
    queryKey: ['activation-history', merchant?.id, dateFilter, merchantUser?.id, isMerchantAdmin],
    queryFn: async () => {
      if (!merchant?.id) return [];

      const dateRange = getDateRange(dateFilter);
      
      let query = supabase
        .from('bitcard_activation_events')
        .select(`
          *,
          bitcards (
            bitcard_id,
            status
          ),
          merchant_users (
            full_name,
            email
          )
        `)
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      // Cashiers only see their own activations
      if (!isMerchantAdmin && merchantUser?.id) {
        query = query.eq('activated_by_merchant_user_id', merchantUser.id);
      }

      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start.toISOString());
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!merchant?.id,
  });

  const filteredActivations = activations?.filter((activation) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const bitcardId = (activation.bitcards as { bitcard_id: string } | null)?.bitcard_id || '';
    const cashierName = (activation.merchant_users as { full_name: string } | null)?.full_name || '';
    return (
      bitcardId.toLowerCase().includes(searchLower) ||
      cashierName.toLowerCase().includes(searchLower) ||
      activation.usd_value?.toString().includes(search)
    );
  });

  const totalValue = filteredActivations?.reduce(
    (sum, a) => sum + (Number(a.usd_value) || 0),
    0
  ) ?? 0;

  return (
    <MerchantLayout title="Activation History" subtitle="View card activations">
      {/* Stats Summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Activations</p>
              <p className="text-2xl font-bold">{filteredActivations?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="text-2xl font-bold capitalize">{dateFilter === 'all' ? 'All Time' : `Last ${dateFilter === 'today' ? 'Day' : dateFilter === 'week' ? '7 Days' : '30 Days'}`}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by card ID, cashier, or amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Activations List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredActivations && filteredActivations.length > 0 ? (
        <div className="space-y-3">
          {filteredActivations.map((activation) => {
            const bitcard = activation.bitcards as { bitcard_id: string; status: string } | null;
            const cashier = activation.merchant_users as { full_name: string; email: string } | null;
            
            return (
              <Card key={activation.id}>
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                      <CreditCard className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{bitcard?.bitcard_id ?? 'Unknown Card'}</p>
                        <Badge variant="outline" className="border-green-500 text-green-500">
                          {bitcard?.status ?? 'active'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{cashier?.full_name ?? 'Unknown'}</span>
                        <span>•</span>
                        <span>{format(new Date(activation.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-500">
                      ${Number(activation.usd_value).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activation.activation_method}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Activations Found</h3>
            <p className="text-muted-foreground">
              {search ? 'Try adjusting your search' : 'Activated cards will appear here'}
            </p>
          </CardContent>
        </Card>
      )}
    </MerchantLayout>
  );
};

export default MerchantActivationHistory;
