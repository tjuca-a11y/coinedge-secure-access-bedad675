import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bitcoin,
  DollarSign,
  Wallet,
  Plus,
  AlertTriangle,
  Building2,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Settings,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import {
  useTreasuryWallet,
  useCreateTreasuryWallet,
  useInventoryStats,
  useSystemSettings,
  useUpdateSystemSetting,
} from '@/hooks/useBtcInventory';
import {
  useUsdcInventoryStats,
  useUsdcInventoryLots,
  useCreateUsdcInventoryLot,
  useCashoutOrders,
  useUpdateCashoutOrder,
  useTreasuryOverview,
} from '@/hooks/useTreasury';
import { formatDistanceToNow, format } from 'date-fns';

const formatBtc = (amount: number) => `₿ ${amount.toFixed(8)}`;
const formatUsdc = (amount: number) => `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AdminTreasuryDashboard: React.FC = () => {
  const { data: wallet, isLoading: walletLoading } = useTreasuryWallet();
  const { data: btcStats, isLoading: btcStatsLoading } = useInventoryStats();
  const { data: usdcStats, isLoading: usdcStatsLoading } = useUsdcInventoryStats();
  const { data: usdcLots } = useUsdcInventoryLots();
  const { data: cashoutOrders, isLoading: cashoutLoading } = useCashoutOrders();
  const { data: settings } = useSystemSettings();
  const { data: overview } = useTreasuryOverview();
  
  const createWallet = useCreateTreasuryWallet();
  const createUsdcLot = useCreateUsdcInventoryLot();
  const updateCashoutOrder = useUpdateCashoutOrder();
  const updateSetting = useUpdateSystemSetting();

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [usdcLotDialogOpen, setUsdcLotDialogOpen] = useState(false);
  const [walletForm, setWalletForm] = useState({
    fireblocks_vault_id: '',
    fireblocks_wallet_id: '',
    btc_address: '',
    usdc_address: '',
    label: 'CoinEdge Treasury',
  });
  const [usdcLotForm, setUsdcLotForm] = useState({
    amount: '',
    source: 'manual_topup' as const,
    reference_id: '',
    notes: '',
  });

  const getSetting = (key: string) => settings?.find(s => s.setting_key === key)?.setting_value;
  const lowBtcThreshold = Number(getSetting('LOW_INVENTORY_THRESHOLD_BTC') || 5);
  const lowUsdcThreshold = Number(getSetting('LOW_USDC_THRESHOLD') || 50000);
  const btcPayoutsPaused = getSetting('PAYOUTS_PAUSED') === 'true';
  const usdcPayoutsPaused = getSetting('USDC_PAYOUTS_PAUSED') === 'true';

  const handleCreateWallet = async () => {
    await createWallet.mutateAsync({
      ...walletForm,
      is_active: true,
    });
    setWalletDialogOpen(false);
  };

  const handleCreateUsdcLot = async () => {
    if (!wallet) return;
    await createUsdcLot.mutateAsync({
      treasury_wallet_id: wallet.id,
      amount_usdc_total: parseFloat(usdcLotForm.amount),
      source: usdcLotForm.source,
      reference_id: usdcLotForm.reference_id || undefined,
      notes: usdcLotForm.notes || undefined,
    });
    setUsdcLotDialogOpen(false);
    setUsdcLotForm({ amount: '', source: 'manual_topup', reference_id: '', notes: '' });
  };

  const handleCashoutAction = async (orderId: string, action: 'complete' | 'fail' | 'process') => {
    const updates: Record<string, unknown> = {};
    if (action === 'complete') {
      updates.status = 'COMPLETED';
      updates.completed_at = new Date().toISOString();
    } else if (action === 'fail') {
      updates.status = 'FAILED';
      updates.failed_reason = 'Manually marked as failed by admin';
    } else if (action === 'process') {
      updates.status = 'PROCESSING';
    }
    await updateCashoutOrder.mutateAsync({ id: orderId, updates });
  };

  const getCashoutStatusBadge = (status: string) => {
    const config: Record<string, { color: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
      PENDING: { color: 'secondary', icon: Clock },
      PROCESSING: { color: 'outline', icon: RefreshCw },
      ACH_INITIATED: { color: 'default', icon: ArrowUpFromLine },
      COMPLETED: { color: 'default', icon: CheckCircle2 },
      FAILED: { color: 'destructive', icon: XCircle },
      CANCELLED: { color: 'secondary', icon: XCircle },
    };
    const { color, icon: Icon } = config[status] || config.PENDING;
    return (
      <Badge variant={color} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const pendingCashouts = cashoutOrders?.filter(o => ['PENDING', 'PROCESSING', 'ACH_INITIATED'].includes(o.status)) || [];

  return (
    <AdminLayout title="Treasury Dashboard" subtitle="Unified BTC & USDC inventory management">
      {/* Alerts */}
      <div className="space-y-3 mb-6">
        {(btcPayoutsPaused || usdcPayoutsPaused) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Payouts Paused</AlertTitle>
            <AlertDescription>
              {btcPayoutsPaused && usdcPayoutsPaused 
                ? 'All BTC and USDC payouts are paused.' 
                : btcPayoutsPaused 
                  ? 'BTC payouts are paused.' 
                  : 'USDC payouts are paused.'}
              {' '}Go to System Controls to resume.
            </AlertDescription>
          </Alert>
        )}
        
        {btcStats && btcStats.eligible_btc < lowBtcThreshold && (
          <Alert variant="destructive">
            <Bitcoin className="h-4 w-4" />
            <AlertTitle>Low BTC Inventory</AlertTitle>
            <AlertDescription>
              Eligible BTC ({formatBtc(btcStats.eligible_btc)}) is below threshold of {formatBtc(lowBtcThreshold)}.
            </AlertDescription>
          </Alert>
        )}

        {usdcStats && usdcStats.available_usdc < lowUsdcThreshold && (
          <Alert variant="destructive">
            <DollarSign className="h-4 w-4" />
            <AlertTitle>Low USDC Inventory</AlertTitle>
            <AlertDescription>
              Available USDC ({formatUsdc(usdcStats.available_usdc)}) is below threshold of {formatUsdc(lowUsdcThreshold)}.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Treasury Wallet */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Treasury Wallet (Fireblocks)
            </CardTitle>
            <CardDescription>BTC & USDC (ERC-20 on Ethereum) inventory</CardDescription>
          </div>
          {!wallet && (
            <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Configure Wallet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Treasury Wallet</DialogTitle>
                  <DialogDescription>
                    Set up the Fireblocks vault for BTC and USDC inventory.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Fireblocks Vault ID *</Label>
                    <Input
                      value={walletForm.fireblocks_vault_id}
                      onChange={(e) => setWalletForm({ ...walletForm, fireblocks_vault_id: e.target.value })}
                      placeholder="Enter vault ID"
                    />
                  </div>
                  <div>
                    <Label>BTC Address</Label>
                    <Input
                      value={walletForm.btc_address}
                      onChange={(e) => setWalletForm({ ...walletForm, btc_address: e.target.value })}
                      placeholder="bc1q..."
                    />
                  </div>
                  <div>
                    <Label>USDC Address (Ethereum)</Label>
                    <Input
                      value={walletForm.usdc_address}
                      onChange={(e) => setWalletForm({ ...walletForm, usdc_address: e.target.value })}
                      placeholder="0x..."
                    />
                  </div>
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={walletForm.label}
                      onChange={(e) => setWalletForm({ ...walletForm, label: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setWalletDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateWallet} 
                    disabled={!walletForm.fireblocks_vault_id || createWallet.isPending}
                  >
                    {createWallet.isPending ? 'Creating...' : 'Create Wallet'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {walletLoading ? (
            <div className="h-20 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : wallet ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Label</p>
                <p className="font-medium">{wallet.label}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vault ID</p>
                <p className="font-mono text-sm">{wallet.fireblocks_vault_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">BTC Address</p>
                <p className="font-mono text-xs truncate">{wallet.btc_address || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">USDC Address</p>
                <p className="font-mono text-xs truncate">{(wallet as TreasuryWallet & { usdc_address?: string }).usdc_address || '—'}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No treasury wallet configured.</p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">BTC Eligible</CardTitle>
            <Bitcoin className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {btcStatsLoading ? '...' : formatBtc(btcStats?.eligible_btc || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatBtc(btcStats?.locked_btc || 0)} locked
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">USDC Available</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {usdcStatsLoading ? '...' : formatUsdc(usdcStats?.available_usdc || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {usdcStats?.lots_count || 0} lots
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Pending Cashouts</CardTitle>
            <Building2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {pendingCashouts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pendingCashouts.reduce((sum, o) => sum + Number(o.usd_amount), 0))} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Integration Status</CardTitle>
            <Settings className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Fireblocks</span>
                <Badge variant="secondary">Not Configured</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Plaid ACH</span>
                <Badge variant="secondary">Not Configured</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for USDC Lots and Cashout Orders */}
      <Tabs defaultValue="usdc-lots" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usdc-lots">USDC Inventory</TabsTrigger>
          <TabsTrigger value="cashouts">
            Cash-out Orders
            {pendingCashouts.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCashouts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usdc-lots">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>USDC Inventory Lots</CardTitle>
              <Dialog open={usdcLotDialogOpen} onOpenChange={setUsdcLotDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!wallet}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add USDC
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add USDC Inventory</DialogTitle>
                    <DialogDescription>
                      Record USDC added to the treasury wallet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Amount (USDC) *</Label>
                      <Input
                        type="number"
                        value={usdcLotForm.amount}
                        onChange={(e) => setUsdcLotForm({ ...usdcLotForm, amount: e.target.value })}
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <Label>Source</Label>
                      <Select
                        value={usdcLotForm.source}
                        onValueChange={(value) => setUsdcLotForm({ ...usdcLotForm, source: value as typeof usdcLotForm.source })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual_topup">Manual Top-up</SelectItem>
                          <SelectItem value="user_sell">User Sell (BTC → USDC)</SelectItem>
                          <SelectItem value="exchange_withdraw">Exchange Withdraw</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Reference ID</Label>
                      <Input
                        value={usdcLotForm.reference_id}
                        onChange={(e) => setUsdcLotForm({ ...usdcLotForm, reference_id: e.target.value })}
                        placeholder="TX hash or order ID"
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={usdcLotForm.notes}
                        onChange={(e) => setUsdcLotForm({ ...usdcLotForm, notes: e.target.value })}
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUsdcLotDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateUsdcLot} 
                      disabled={!usdcLotForm.amount || createUsdcLot.isPending}
                    >
                      {createUsdcLot.isPending ? 'Adding...' : 'Add USDC'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {usdcLots && usdcLots.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lot ID</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usdcLots.slice(0, 10).map((lot) => (
                      <TableRow key={lot.id}>
                        <TableCell className="font-mono text-xs">{lot.id.slice(0, 8)}...</TableCell>
                        <TableCell>{formatUsdc(lot.amount_usdc_total)}</TableCell>
                        <TableCell>{formatUsdc(lot.amount_usdc_available)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{lot.source.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(lot.received_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No USDC inventory lots. Click "Add USDC" to record inventory.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashouts">
          <Card>
            <CardHeader>
              <CardTitle>Cash-out Orders (ACH)</CardTitle>
              <CardDescription>Users selling BTC/USDC for USD to their bank accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {cashoutLoading ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : cashoutOrders && cashoutOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>USD Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Est. Arrival</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashoutOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.order_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.source_asset}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(Number(order.usd_amount))}</TableCell>
                        <TableCell className="text-muted-foreground">{formatCurrency(Number(order.fee_usd))}</TableCell>
                        <TableCell>{getCashoutStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-sm">
                          {order.estimated_arrival ? format(new Date(order.estimated_arrival), 'MMM d') : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          {order.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCashoutAction(order.id, 'process')}
                              >
                                Process
                              </Button>
                            </div>
                          )}
                          {order.status === 'PROCESSING' && (
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleCashoutAction(order.id, 'complete')}
                              >
                                Complete
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleCashoutAction(order.id, 'fail')}
                              >
                                Fail
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No cash-out orders yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

interface TreasuryWallet {
  usdc_address?: string;
}

export default AdminTreasuryDashboard;