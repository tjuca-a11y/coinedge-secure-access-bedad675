import React, { useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Power,
  Pause,
  AlertTriangle,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  FileCheck,
  ArrowRight,
  AlertCircle,
  PackageX,
} from 'lucide-react';
import {
  useSystemSettings,
  useUpdateSystemSetting,
  useSentTransfers,
  useDailyBtcSends,
  useInventoryStats,
} from '@/hooks/useBtcInventory';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAdminNotifications, useCreateNotification, useUnreadNotificationCount } from '@/hooks/useAdminNotifications';
import { useLatestReconciliation } from '@/hooks/useReconciliation';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const formatBtc = (amount: number | null) => {
  if (amount === null) return '—';
  return `₿ ${amount.toFixed(8)}`;
};

const formatCurrency = (amount: number | null) => {
  if (amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const AdminSystemControls: React.FC = () => {
  const { isSuperAdmin, adminUser } = useAdminAuth();
  const { data: settings, isLoading: settingsLoading } = useSystemSettings();
  const { data: transfers, isLoading: transfersLoading } = useSentTransfers();
  const { data: dailySends } = useDailyBtcSends();
  const { data: inventoryStats } = useInventoryStats();
  const { data: unreadCount } = useUnreadNotificationCount();
  const { data: notifications } = useAdminNotifications();
  const { data: latestReconciliation } = useLatestReconciliation();
  const createNotification = useCreateNotification();
  const updateSetting = useUpdateSystemSetting();

  const getSetting = (key: string) => settings?.find(s => s.setting_key === key)?.setting_value || '';
  
  const autoSendEnabled = getSetting('AUTO_SEND_ENABLED') === 'true';
  const payoutsPaused = getSetting('PAYOUTS_PAUSED') === 'true';
  const dailyLimit = getSetting('DAILY_BTC_LIMIT');
  const maxTxLimit = getSetting('MAX_TX_BTC_LIMIT');
  const lowThreshold = getSetting('LOW_INVENTORY_THRESHOLD_BTC');

  const todaysSends = dailySends?.find(d => d.send_date === new Date().toISOString().split('T')[0]);

  // Check for low inventory and create notification if needed
  const lowThresholdNum = parseFloat(lowThreshold) || 0;
  const currentInventory = inventoryStats?.eligible_btc || 0;
  const isLowInventory = lowThresholdNum > 0 && currentInventory < lowThresholdNum;

  // Count failed transfers
  const failedTransfers = transfers?.filter(t => t.status === 'FAILED') || [];
  const recentFailures = failedTransfers.slice(0, 5);

  // Check reconciliation status - latestReconciliation is a record keyed by asset type
  const btcReconciliation = latestReconciliation?.['BTC'];
  const hasOpenDiscrepancy = btcReconciliation?.status === 'DISCREPANCY' || 
    latestReconciliation?.['USDC']?.status === 'DISCREPANCY' ||
    latestReconciliation?.['COMPANY_USDC']?.status === 'DISCREPANCY';

  const handleToggle = async (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    await updateSetting.mutateAsync({ key, value: newValue });
  };

  const handleLimitChange = async (key: string, value: string) => {
    await updateSetting.mutateAsync({ key, value });
  };

  const handleCreateLowInventoryAlert = async () => {
    await createNotification.mutateAsync({
      type: 'LOW_BTC_INVENTORY',
      severity: 'warning',
      title: 'Low BTC Inventory Alert',
      message: `BTC inventory (${formatBtc(currentInventory)}) is below the threshold of ${formatBtc(lowThresholdNum)}. Consider adding more inventory.`,
      metadata: {
        current_inventory: currentInventory,
        threshold: lowThresholdNum,
        created_by: adminUser?.id,
      },
    });
  };

  if (!isSuperAdmin) {
    return (
      <AdminLayout title="System Controls" subtitle="BTC fulfillment system settings">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only SUPER_ADMIN users can access system controls.
          </AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="System Controls" subtitle="BTC fulfillment system settings">
      {/* Critical Alerts Section */}
      <div className="space-y-3 mb-6">
        {payoutsPaused && (
          <Alert variant="destructive">
            <Pause className="h-4 w-4" />
            <AlertTitle>Payouts Paused</AlertTitle>
            <AlertDescription>
              All automatic BTC payouts are currently paused. Toggle off below to resume.
            </AlertDescription>
          </Alert>
        )}

        {isLowInventory && (
          <Alert variant="destructive">
            <PackageX className="h-4 w-4" />
            <AlertTitle>Low BTC Inventory</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                Current eligible inventory ({formatBtc(currentInventory)}) is below threshold ({formatBtc(lowThresholdNum)}).
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateLowInventoryAlert}
                disabled={createNotification.isPending}
              >
                <Bell className="h-4 w-4 mr-1" />
                Create Alert
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {hasOpenDiscrepancy && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Open Reconciliation Discrepancy</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                There is an unresolved discrepancy. Please review treasury reconciliation.
              </span>
              <Link to="/admin/reconciliation">
                <Button variant="outline" size="sm">
                  <FileCheck className="h-4 w-4 mr-1" />
                  View
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {recentFailures.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Failed Fulfillments</AlertTitle>
            <AlertDescription>
              {recentFailures.length} transfer(s) have failed. Check the transfer log below for details.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Quick Stats Bar */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unread Notifications</p>
                <p className="text-2xl font-bold">{unreadCount || 0}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className={isLowInventory ? 'bg-destructive/10 border-destructive' : 'bg-muted/50'}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Eligible BTC</p>
                <p className="text-2xl font-bold">{formatBtc(currentInventory)}</p>
              </div>
              <PackageX className={`h-8 w-8 ${isLowInventory ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">System Status</p>
                <Badge variant={autoSendEnabled && !payoutsPaused ? 'default' : 'destructive'} className="mt-1">
                  {payoutsPaused ? 'PAUSED' : autoSendEnabled ? 'AUTO' : 'MANUAL'}
                </Badge>
              </div>
              <Power className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-3">
            <Link to="/admin/reconciliation" className="flex items-center justify-between hover:opacity-80">
              <div>
                <p className="text-xs text-muted-foreground">Reconciliation</p>
                <Badge variant={hasOpenDiscrepancy ? 'destructive' : 'outline'} className="mt-1">
                  {hasOpenDiscrepancy ? 'DISCREPANCY' : 'OK'}
                </Badge>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* System Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" />
              System Toggles
            </CardTitle>
            <CardDescription>
              Control automatic sending and payout status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingsLoading ? (
              <div className="h-20 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Auto-Send Enabled</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send BTC when orders are ready
                    </p>
                  </div>
                  <Switch
                    checked={autoSendEnabled}
                    onCheckedChange={() => handleToggle('AUTO_SEND_ENABLED', getSetting('AUTO_SEND_ENABLED'))}
                    disabled={updateSetting.isPending}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base text-destructive">Payouts Paused</Label>
                    <p className="text-sm text-muted-foreground">
                      Emergency stop for all BTC payouts
                    </p>
                  </div>
                  <Switch
                    checked={payoutsPaused}
                    onCheckedChange={() => handleToggle('PAYOUTS_PAUSED', getSetting('PAYOUTS_PAUSED'))}
                    disabled={updateSetting.isPending}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Limits & Thresholds
            </CardTitle>
            <CardDescription>
              Set transaction and inventory limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsLoading ? (
              <div className="h-20 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                <div>
                  <Label>Daily BTC Limit</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={dailyLimit}
                      onChange={(e) => handleLimitChange('DAILY_BTC_LIMIT', e.target.value)}
                      className="w-32"
                    />
                    <span className="self-center text-muted-foreground">BTC / day</span>
                  </div>
                </div>
                
                <div>
                  <Label>Max Transaction Limit</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={maxTxLimit}
                      onChange={(e) => handleLimitChange('MAX_TX_BTC_LIMIT', e.target.value)}
                      className="w-32"
                    />
                    <span className="self-center text-muted-foreground">BTC / transaction</span>
                  </div>
                </div>
                
                <div>
                  <Label>Low Inventory Threshold</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      step="0.5"
                      value={lowThreshold}
                      onChange={(e) => handleLimitChange('LOW_INVENTORY_THRESHOLD_BTC', e.target.value)}
                      className="w-32"
                    />
                    <span className="self-center text-muted-foreground">BTC (alert below)</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Today's Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">BTC Sent Today</p>
                <p className="text-2xl font-bold">
                  {formatBtc(todaysSends?.total_btc_sent || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">
                  {todaysSends?.transaction_count || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Remaining</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatBtc(Number(dailyLimit) - (todaysSends?.total_btc_sent || 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed Today</p>
                <p className={`text-2xl font-bold ${recentFailures.length > 0 ? 'text-destructive' : ''}`}>
                  {recentFailures.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Navigate to related admin pages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/reconciliation" className="block">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Treasury Reconciliation
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/admin/treasury" className="block">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Treasury Dashboard
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/admin/fulfillment" className="block">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Fulfillment Queue
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Log */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Transfers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transfersLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : transfers && transfers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>BTC Amount</TableHead>
                    <TableHead>BTC Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transfer ID</TableHead>
                    <TableHead>TX Hash</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-mono text-xs">
                        {transfer.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {transfer.profiles?.full_name || transfer.customer_id?.slice(0, 8) || '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatBtc(transfer.btc_amount)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(transfer.btc_price_used)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          transfer.status === 'SENT' ? 'default' : 
                          transfer.status === 'FAILED' ? 'destructive' : 'secondary'
                        }>
                          {transfer.status === 'SENT' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {transfer.status === 'FAILED' && <XCircle className="h-3 w-3 mr-1" />}
                          {transfer.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {transfer.fireblocks_transfer_id?.slice(0, 12) || '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {transfer.tx_hash ? (
                          <a 
                            href={`https://mempool.space/tx/${transfer.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {transfer.tx_hash.slice(0, 12)}...
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transfer.sent_at 
                          ? format(new Date(transfer.sent_at), 'PP p')
                          : '—'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No transfers recorded yet.
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminSystemControls;
