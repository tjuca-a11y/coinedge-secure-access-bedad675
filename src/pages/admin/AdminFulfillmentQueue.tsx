import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Pause,
  Play,
  RotateCcw,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Zap,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  useFulfillmentOrders,
  useUpdateFulfillmentOrder,
  useInventoryStats,
  useSystemSettings,
  useUpdateSystemSetting,
  FulfillmentOrder,
} from '@/hooks/useBtcInventory';
import { formatDistanceToNow, format } from 'date-fns';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatBtc = (amount: number | null) => {
  if (amount === null) return 'Calculated at send';
  return `₿ ${amount.toFixed(8)}`;
};

const statusConfig: Record<string, { color: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  SUBMITTED: { color: 'secondary', icon: Clock },
  KYC_PENDING: { color: 'outline', icon: AlertTriangle },
  WAITING_INVENTORY: { color: 'outline', icon: Clock },
  READY_TO_SEND: { color: 'default', icon: CheckCircle },
  SENDING: { color: 'default', icon: Clock },
  SENT: { color: 'default', icon: CheckCircle },
  FAILED: { color: 'destructive', icon: XCircle },
  HOLD: { color: 'destructive', icon: Pause },
};

const AdminFulfillmentQueue: React.FC = () => {
  const { isSuperAdmin } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: orders, isLoading, refetch } = useFulfillmentOrders(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const { data: stats } = useInventoryStats();
  const { data: settings } = useSystemSettings();
  const updateSetting = useUpdateSystemSetting();
  const updateOrder = useUpdateFulfillmentOrder();

  const btcPayoutsPaused = settings?.find(s => s.setting_key === 'BTC_PAYOUTS_PAUSED')?.setting_value === 'true';

  const handleTogglePayouts = async () => {
    await updateSetting.mutateAsync({
      key: 'BTC_PAYOUTS_PAUSED',
      value: btcPayoutsPaused ? 'false' : 'true'
    });
  };

  const handleProcessQueue = async () => {
    setIsProcessing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-fulfillment-queue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();
      
      if (response.ok) {
        toast.success(`Processed ${result.processed} orders, allocated ${result.allocated}`);
        refetch();
      } else {
        toast.error(result.message || 'Failed to process queue');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process queue');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHold = async (order: FulfillmentOrder, reason: string = 'Admin hold') => {
    await updateOrder.mutateAsync({
      id: order.id,
      updates: { status: 'HOLD', blocked_reason: reason },
      action: 'hold',
    });
  };

  const handleRelease = async (order: FulfillmentOrder) => {
    // Determine next status based on conditions
    let nextStatus: 'READY_TO_SEND' | 'WAITING_INVENTORY' | 'KYC_PENDING' = 'READY_TO_SEND';
    if (order.kyc_status !== 'APPROVED') {
      nextStatus = 'KYC_PENDING';
    }
    
    await updateOrder.mutateAsync({
      id: order.id,
      updates: { status: nextStatus, blocked_reason: null },
      action: 'release',
    });
  };

  const handleRetry = async (order: FulfillmentOrder) => {
    await updateOrder.mutateAsync({
      id: order.id,
      updates: { status: 'READY_TO_SEND' },
      action: 'retry',
    });
  };

  const filteredOrders = orders?.filter(order => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(search) ||
      order.merchants?.business_name?.toLowerCase().includes(search) ||
      order.destination_wallet_address.toLowerCase().includes(search)
    );
  });

  // Count orders by status
  const pendingCount = orders?.filter(o => ['SUBMITTED', 'WAITING_INVENTORY', 'KYC_PENDING'].includes(o.status)).length || 0;
  const readyCount = orders?.filter(o => o.status === 'READY_TO_SEND').length || 0;

  return (
    <AdminLayout title="Fulfillment Queue" subtitle="Manage pending BTC fulfillment orders">
      {/* Auto-Processing Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eligible BTC</p>
                <p className="text-2xl font-bold">₿ {stats?.eligible_btc?.toFixed(4) || '0.0000'}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-btc opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready to Send</p>
                <p className="text-2xl font-bold">{readyCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="payouts-toggle" className="text-sm">
                BTC Payouts
              </Label>
              <Switch
                id="payouts-toggle"
                checked={!btcPayoutsPaused}
                onCheckedChange={handleTogglePayouts}
                disabled={updateSetting.isPending}
              />
            </div>
            <Button
              onClick={handleProcessQueue}
              disabled={isProcessing || btcPayoutsPaused}
              className="w-full gap-2"
              size="sm"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Process Queue
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle>Pending Orders</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="KYC_PENDING">KYC Pending</SelectItem>
                  <SelectItem value="WAITING_INVENTORY">Waiting Inventory</SelectItem>
                  <SelectItem value="READY_TO_SEND">Ready to Send</SelectItem>
                  <SelectItem value="SENDING">Sending</SelectItem>
                  <SelectItem value="HOLD">On Hold</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredOrders && filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Rep</TableHead>
                    <TableHead>USD Value</TableHead>
                    <TableHead>BTC Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const config = statusConfig[order.status] || statusConfig.SUBMITTED;
                    const StatusIcon = config.icon;
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {order.order_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.merchants?.business_name || '—'}
                        </TableCell>
                        <TableCell>
                          {order.sales_reps?.full_name || '—'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.usd_value)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatBtc(order.btc_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={config.color} className="flex items-center gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {order.status.replace('_', ' ')}
                            </Badge>
                            {order.blocked_reason && (
                              <span className="text-xs text-destructive max-w-[100px] truncate" title={order.blocked_reason}>
                                ({order.blocked_reason})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {order.status !== 'HOLD' && order.status !== 'SENT' && (
                                <DropdownMenuItem onClick={() => handleHold(order)}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Put on Hold
                                </DropdownMenuItem>
                              )}
                              {order.status === 'HOLD' && (
                                <DropdownMenuItem onClick={() => handleRelease(order)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Release Hold
                                </DropdownMenuItem>
                              )}
                              {order.status === 'FAILED' && (
                                <DropdownMenuItem onClick={() => handleRetry(order)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Retry
                                </DropdownMenuItem>
                              )}
                              {isSuperAdmin && order.status === 'READY_TO_SEND' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => {
                                      // Manual send would go here (mock for now)
                                      updateOrder.mutateAsync({
                                        id: order.id,
                                        updates: { status: 'SENDING' },
                                        action: 'manual_send_initiated',
                                      });
                                    }}
                                  >
                                    Manual Send Now (SUPER_ADMIN)
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No fulfillment orders found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminFulfillmentQueue;
