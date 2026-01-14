import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Copy,
  ExternalLink,
  RefreshCw,
  Send,
  Banknote,
  CircleDollarSign,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface SwapOrder {
  id: string;
  order_id: string;
  customer_id: string;
  order_type: 'BUY_BTC' | 'SELL_BTC';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  btc_amount: number;
  usdc_amount: number;
  btc_price_at_order: number;
  fee_usdc: number;
  destination_address: string | null;
  source_usdc_address: string | null;
  tx_hash: string | null;
  created_at: string;
  completed_at: string | null;
  failed_reason: string | null;
  usdc_payout_tx_hash?: string | null;
  usdc_payout_at?: string | null;
}

const AdminSwapOrders: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<SwapOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHashInput, setTxHashInput] = useState('');
  const [usdcTxHashInput, setUsdcTxHashInput] = useState('');
  const [customerUsdcAddress, setCustomerUsdcAddress] = useState<string | null>(null);
  const [pendingPayoutsFilter, setPendingPayoutsFilter] = useState(false);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-swap-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_swap_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SwapOrder[];
    },
  });

  // Real-time subscription for swap orders
  useEffect(() => {
    const channel = supabase
      .channel('admin-swap-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_swap_orders',
        },
        (payload) => {
          console.log('Swap order change:', payload);
          queryClient.invalidateQueries({ queryKey: ['admin-swap-orders'] });
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New Order',
              description: `New ${(payload.new as SwapOrder).order_type === 'BUY_BTC' ? 'buy' : 'sell'} order received`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // Fetch customer USDC address when selecting a SELL_BTC order
  useEffect(() => {
    if (selectedOrder?.order_type === 'SELL_BTC' && selectedOrder.customer_id) {
      fetchCustomerUsdcAddress(selectedOrder.customer_id);
    } else {
      setCustomerUsdcAddress(null);
    }
    setUsdcTxHashInput('');
  }, [selectedOrder?.id]);

  const handleProcessOrder = async (orderId: string, newStatus: 'PENDING' | 'PROCESSING' | 'CANCELLED') => {
    setIsProcessing(true);
    try {
      const updateData: { status: 'PENDING' | 'PROCESSING' | 'CANCELLED'; failed_reason?: null } = { status: newStatus };
      if (newStatus === 'PENDING') {
        updateData.failed_reason = null;
      }
      
      const { error } = await supabase
        .from('customer_swap_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({ 
        title: 'Order Updated', 
        description: `Order status changed to ${newStatus}` 
      });
      refetch();
      setSelectedOrder(null);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to update order status',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('customer_swap_orders')
        .update({ 
          status: 'COMPLETED',
          completed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({ 
        title: 'Order Completed', 
        description: 'Order has been marked as completed' 
      });
      refetch();
      setSelectedOrder(null);
      setTxHashInput('');
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to complete order',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsSent = async (orderId: string) => {
    if (!txHashInput.trim()) {
      toast({
        title: 'Transaction Hash Required',
        description: 'Please enter the BTC transaction hash',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('customer_swap_orders')
        .update({ 
          status: 'COMPLETED' as const,
          tx_hash: txHashInput.trim(),
          completed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      toast({ 
        title: 'BTC Sent', 
        description: 'Order marked as sent with transaction hash' 
      });
      refetch();
      setSelectedOrder(null);
      setTxHashInput('');
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to update order',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTxHash = async (orderId: string) => {
    if (!txHashInput.trim()) {
      toast({
        title: 'Transaction Hash Required',
        description: 'Please enter the BTC transaction hash',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('customer_swap_orders')
        .update({ tx_hash: txHashInput.trim() })
        .eq('id', orderId);

      if (error) throw error;

      toast({ 
        title: 'Transaction Hash Updated', 
        description: 'The transaction hash has been saved' 
      });
      refetch();
      // Update the selected order locally
      setSelectedOrder(prev => prev ? { ...prev, tx_hash: txHashInput.trim() } : null);
      setTxHashInput('');
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to update transaction hash',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Fetch customer's USDC address when selecting a SELL_BTC order
  const fetchCustomerUsdcAddress = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('usdc_address')
        .eq('id', customerId)
        .single();
      
      if (error) throw error;
      setCustomerUsdcAddress(data?.usdc_address || null);
    } catch (error) {
      console.error('Error fetching customer USDC address:', error);
      setCustomerUsdcAddress(null);
    }
  };

  // Handle USDC payout for SELL_BTC orders
  const handleUsdcPayout = async (orderId: string) => {
    if (!usdcTxHashInput.trim()) {
      toast({
        title: 'USDC Transaction Hash Required',
        description: 'Please enter the USDC transaction hash from Etherscan',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Update order with USDC payout info
      const { error: updateError } = await supabase
        .from('customer_swap_orders')
        .update({ 
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Log audit event
      await supabase.from('audit_logs').insert({
        action: 'USDC_PAYOUT_SENT',
        actor_type: 'admin',
        event_id: selectedOrder?.order_id || orderId,
        metadata: {
          order_id: selectedOrder?.order_id,
          usdc_amount: selectedOrder?.usdc_amount,
          usdc_tx_hash: usdcTxHashInput.trim(),
          customer_id: selectedOrder?.customer_id,
          customer_usdc_address: customerUsdcAddress,
        },
      });

      toast({ 
        title: 'USDC Payout Recorded', 
        description: `Payout of $${selectedOrder?.usdc_amount?.toFixed(2)} USDC recorded successfully` 
      });
      refetch();
      setSelectedOrder(null);
      setUsdcTxHashInput('');
      setCustomerUsdcAddress(null);
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to record USDC payout',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Get orders pending USDC payout (SELL_BTC with status COMPLETED and tx_hash present but no usdc_payout)
  const ordersPendingUsdcPayout = orders.filter(
    (o) => o.order_type === 'SELL_BTC' && 
           o.status === 'COMPLETED' && 
           o.tx_hash && 
           !o.usdc_payout_tx_hash
  );

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.destination_address?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (order.tx_hash?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesType = typeFilter === 'all' || order.order_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    // Additional filter for pending payouts
    if (pendingPayoutsFilter) {
      return order.order_type === 'SELL_BTC' && 
             order.status === 'COMPLETED' && 
             order.tx_hash;
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    totalOrders: orders.length,
    totalBuyBtc: orders.filter((o) => o.order_type === 'BUY_BTC').length,
    totalSellBtc: orders.filter((o) => o.order_type === 'SELL_BTC').length,
    totalBtcVolume: orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + o.btc_amount, 0),
    totalUsdcVolume: orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + o.usdc_amount, 0),
    totalFees: orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + o.fee_usdc, 0),
    pendingOrders: orders.filter((o) => o.status === 'PENDING' || o.status === 'PROCESSING').length,
    completedOrders: orders.filter((o) => o.status === 'COMPLETED').length,
    failedOrders: orders.filter((o) => o.status === 'FAILED').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><AlertCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOrderTypeBadge = (type: string) => {
    if (type === 'BUY_BTC') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <ArrowDownLeft className="h-3 w-3 mr-1" />
          Buy BTC
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        <ArrowUpRight className="h-3 w-3 mr-1" />
        Sell BTC
      </Badge>
    );
  };

  const handleDownload = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const headers = ['Order ID', 'Type', 'Status', 'BTC Amount', 'USDC Amount', 'Fee', 'Price', 'Date'];
      const rows = filteredOrders.map((order) => [
        order.order_id,
        order.order_type,
        order.status,
        order.btc_amount.toFixed(8),
        order.usdc_amount.toFixed(2),
        order.fee_usdc.toFixed(2),
        order.btc_price_at_order.toFixed(2),
        format === 'csv' ? new Date(order.created_at).toISOString() : '',
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `swap-orders-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast({ title: 'Downloaded', description: 'CSV file downloaded successfully' });
    } else {
      toast({ title: 'Coming Soon', description: 'PDF export will be available soon' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  const formatBtc = (amount: number) => amount.toFixed(8);
  const formatUsdc = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <AdminLayout title="Buy/Sell Orders" subtitle="Track all BTC and USDC transactions from CoinEdge inventory">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Orders
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
              <ArrowDownLeft className="h-4 w-4" />
              Buy Orders
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalBuyBtc}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
              <ArrowUpRight className="h-4 w-4" />
              Sell Orders
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalSellBtc}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingDown className="h-4 w-4" />
              BTC Volume
            </div>
            <p className="text-xl font-bold text-foreground">{formatBtc(stats.totalBtcVolume)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              USDC Volume
            </div>
            <p className="text-xl font-bold text-foreground">{formatUsdc(stats.totalUsdcVolume)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Fees
            </div>
            <p className="text-xl font-bold text-foreground">{formatUsdc(stats.totalFees)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-yellow-400 text-sm">Pending/Processing</p>
              <p className="text-2xl font-bold text-foreground">{stats.pendingOrders}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400/50" />
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm">Completed</p>
              <p className="text-2xl font-bold text-foreground">{stats.completedOrders}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400/50" />
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-red-400 text-sm">Failed</p>
              <p className="text-2xl font-bold text-foreground">{stats.failedOrders}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400/50" />
          </CardContent>
        </Card>

        {/* Pending USDC Payouts Card */}
        <Card 
          className={cn(
            "border-2 cursor-pointer transition-all",
            pendingPayoutsFilter 
              ? "bg-primary/20 border-primary" 
              : "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40"
          )}
          onClick={() => setPendingPayoutsFilter(!pendingPayoutsFilter)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-sm">Pending USDC Payouts</p>
              <p className="text-2xl font-bold text-foreground">{ordersPendingUsdcPayout.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatUsdc(ordersPendingUsdcPayout.reduce((sum, o) => sum + o.usdc_amount, 0))} total
              </p>
            </div>
            <CircleDollarSign className="h-8 w-8 text-blue-400/50" />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-card border-border mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>All Orders</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-background"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 bg-background">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BUY_BTC">Buy BTC</SelectItem>
                  <SelectItem value="SELL_BTC">Sell BTC</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleDownload('csv')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
              {orders.length === 0 && (
                <p className="text-sm mt-2">Orders will appear here when customers buy or sell BTC/USDC</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">BTC Amount</TableHead>
                    <TableHead className="text-right">USDC Amount</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">BTC Price</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <TableCell className="font-mono text-sm">{order.order_id}</TableCell>
                      <TableCell>{getOrderTypeBadge(order.order_type)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right font-mono">{formatBtc(order.btc_amount)}</TableCell>
                      <TableCell className="text-right">{formatUsdc(order.usdc_amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatUsdc(order.fee_usdc)}</TableCell>
                      <TableCell className="text-right">{formatUsdc(order.btc_price_at_order)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order Details
              {selectedOrder && getOrderTypeBadge(selectedOrder.order_type)}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{selectedOrder.order_id}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedOrder.order_id)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">BTC Amount</p>
                  <p className="font-mono font-semibold">{formatBtc(selectedOrder.btc_amount)} BTC</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">USDC Amount</p>
                  <p className="font-semibold">{formatUsdc(selectedOrder.usdc_amount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fee</p>
                  <p>{formatUsdc(selectedOrder.fee_usdc)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">BTC Price at Order</p>
                  <p>{formatUsdc(selectedOrder.btc_price_at_order)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Customer ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm truncate">{selectedOrder.customer_id}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedOrder.customer_id)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {selectedOrder.destination_address && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.order_type === 'BUY_BTC' ? 'BTC Destination Address' : 'Destination Address'}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm truncate">{selectedOrder.destination_address}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedOrder.destination_address!)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.source_usdc_address && selectedOrder.order_type === 'SELL_BTC' && (
                <div>
                  <p className="text-sm text-muted-foreground">Customer's BTC Source Address</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm truncate">{selectedOrder.source_usdc_address}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedOrder.source_usdc_address!)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                      <a href={`https://mempool.space/address/${selectedOrder.source_usdc_address}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.tx_hash && (
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Hash</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm truncate">{selectedOrder.tx_hash}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(selectedOrder.tx_hash!)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                      <a href={`https://mempool.space/tx/${selectedOrder.tx_hash}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.failed_reason && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 font-medium">Failed Reason</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.failed_reason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{format(new Date(selectedOrder.created_at), 'MMM d, yyyy HH:mm:ss')}</p>
                </div>
                {selectedOrder.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-sm">{format(new Date(selectedOrder.completed_at), 'MMM d, yyyy HH:mm:ss')}</p>
                  </div>
                )}
              </div>

              {/* Admin Actions */}
              {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'PROCESSING' || selectedOrder.status === 'FAILED') && (
                <div className="pt-4 border-t border-border space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Admin Actions</p>
                  
                  {/* Transaction Hash Input */}
                  {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'PROCESSING') && selectedOrder.order_type === 'BUY_BTC' && (
                    <div className="space-y-2">
                      <Label htmlFor="tx-hash" className="text-sm">Transaction Hash</Label>
                      <div className="flex gap-2">
                        <Input
                          id="tx-hash"
                          placeholder="Enter BTC transaction hash..."
                          value={txHashInput}
                          onChange={(e) => setTxHashInput(e.target.value)}
                          className="font-mono text-sm"
                        />
                        {selectedOrder.tx_hash ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleUpdateTxHash(selectedOrder.id)}
                            disabled={isProcessing || !txHashInput.trim()}
                          >
                            Update
                          </Button>
                        ) : null}
                      </div>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handleMarkAsSent(selectedOrder.id)}
                        disabled={isProcessing || !txHashInput.trim()}
                      >
                        <Send className={`h-4 w-4 mr-2`} />
                        {isProcessing ? 'Processing...' : 'Mark as Sent & Complete'}
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {selectedOrder.status === 'PENDING' && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleProcessOrder(selectedOrder.id, 'PROCESSING')}
                          disabled={isProcessing}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                          Process
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleProcessOrder(selectedOrder.id, 'CANCELLED')}
                          disabled={isProcessing}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    )}
                    {selectedOrder.status === 'PROCESSING' && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleProcessOrder(selectedOrder.id, 'CANCELLED')}
                        disabled={isProcessing}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Order
                      </Button>
                    )}
                    {selectedOrder.status === 'FAILED' && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleProcessOrder(selectedOrder.id, 'PENDING')}
                        disabled={isProcessing}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                        Retry Order
                      </Button>
                    )}
                  </div>
                  
                  {selectedOrder.status === 'PENDING' && selectedOrder.order_type === 'SELL_BTC' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full bg-green-600/10 border-green-600/30 text-green-400 hover:bg-green-600/20"
                      onClick={() => handleCompleteOrder(selectedOrder.id)}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Completed
                    </Button>
                  )}
                </div>
              )}

              {/* USDC Payout Section for SELL_BTC orders */}
              {selectedOrder.order_type === 'SELL_BTC' && selectedOrder.status === 'COMPLETED' && selectedOrder.tx_hash && (
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-5 w-5 text-blue-400" />
                    <p className="text-sm font-medium text-blue-400">USDC Payout Required</p>
                  </div>
                  
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount to Send:</span>
                      <span className="font-semibold text-foreground">{formatUsdc(selectedOrder.usdc_amount)} USDC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">BTC Received:</span>
                      <span className="font-mono text-foreground">{formatBtc(selectedOrder.btc_amount)} BTC</span>
                    </div>
                    {customerUsdcAddress ? (
                      <div className="pt-2 border-t border-blue-500/20">
                        <p className="text-xs text-muted-foreground mb-1">Customer USDC Address (Ethereum):</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs bg-background/50 p-2 rounded flex-1 truncate">
                            {customerUsdcAddress}
                          </p>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(customerUsdcAddress)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={`https://etherscan.io/address/${customerUsdcAddress}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-blue-500/20">
                        <p className="text-xs text-yellow-400">⚠️ Customer USDC address not found in profile</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usdc-tx-hash" className="text-sm">USDC Transaction Hash (Etherscan)</Label>
                    <Input
                      id="usdc-tx-hash"
                      placeholder="Enter USDC transaction hash from Etherscan..."
                      value={usdcTxHashInput}
                      onChange={(e) => setUsdcTxHashInput(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleUsdcPayout(selectedOrder.id)}
                      disabled={isProcessing || !usdcTxHashInput.trim()}
                    >
                      <Banknote className="h-4 w-4 mr-2" />
                      {isProcessing ? 'Processing...' : 'Record USDC Payout'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSwapOrders;
