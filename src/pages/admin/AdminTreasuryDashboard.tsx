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
  Shield,
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
  useCompanyUsdcBalance,
  useCompanyUsdcLedger,
  useUpdateCompanyUsdcBalance,
  TreasuryWallet,
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
  const { data: companyUsdc, isLoading: companyLoading } = useCompanyUsdcBalance();
  const { data: companyLedger } = useCompanyUsdcLedger();
  
  const createWallet = useCreateTreasuryWallet();
  const createUsdcLot = useCreateUsdcInventoryLot();
  const updateCashoutOrder = useUpdateCashoutOrder();
  const updateSetting = useUpdateSystemSetting();
  const updateCompanyUsdc = useUpdateCompanyUsdcBalance();

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [usdcLotDialogOpen, setUsdcLotDialogOpen] = useState(false);
  const [companyUsdcDialogOpen, setCompanyUsdcDialogOpen] = useState(false);
  const [walletForm, setWalletForm] = useState({
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
  const [companyUsdcForm, setCompanyUsdcForm] = useState({
    amount: '',
    type: 'DEPOSIT' as 'DEPOSIT' | 'WITHDRAWAL' | 'FEE_COLLECTION' | 'OPERATIONAL_EXPENSE' | 'ADJUSTMENT',
    reference: '',
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

  const handleCompanyUsdcTransaction = async () => {
    await updateCompanyUsdc.mutateAsync({
      amount: parseFloat(companyUsdcForm.amount),
      type: companyUsdcForm.type,
      reference: companyUsdcForm.reference || undefined,
      notes: companyUsdcForm.notes || undefined,
    });
    setCompanyUsdcDialogOpen(false);
    setCompanyUsdcForm({ amount: '', type: 'DEPOSIT', reference: '', notes: '' });
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
    <AdminLayout title="Treasury Dashboard" subtitle="CoinEdge wallet and inventory management">
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
              CoinEdge Wallet
            </CardTitle>
            <CardDescription>Counterparty wallet for customer transactions</CardDescription>
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
                  <DialogTitle>Configure CoinEdge Wallet</DialogTitle>
                  <DialogDescription>
                    Set up the CoinEdge counterparty wallet addresses.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>BTC Address</Label>
                    <Input
                      value={walletForm.btc_address}
                      onChange={(e) => setWalletForm({ ...walletForm, btc_address: e.target.value })}
                      placeholder="bc1q..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Address for receiving BTC from customer sells
                    </p>
                  </div>
                  <div>
                    <Label>USDC Address (Ethereum)</Label>
                    <Input
                      value={walletForm.usdc_address}
                      onChange={(e) => setWalletForm({ ...walletForm, usdc_address: e.target.value })}
                      placeholder="0x..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Address for receiving USDC from customer cashouts
                    </p>
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
                    disabled={createWallet.isPending}
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Label</p>
                <p className="font-medium">{wallet.label}</p>
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
            <p className="text-muted-foreground">No CoinEdge wallet configured.</p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
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
            <CardTitle className="text-sm font-medium text-blue-600">Customer USDC</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {usdcStatsLoading ? '...' : formatUsdc(usdcStats?.available_usdc || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {usdcStats?.lots_count || 0} inventory lots
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-600">Company USDC</CardTitle>
            <Building2 className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {companyLoading ? '...' : formatUsdc(Number(companyUsdc?.balance_usdc || 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Operational funds
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Pending Cashouts</CardTitle>
            <ArrowUpFromLine className="h-5 w-5 text-green-600" />
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Model</CardTitle>
            <Shield className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>Customer Wallets</span>
                <Badge variant="default">Dynamic</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Counterparty</span>
                <Badge variant="default">CoinEdge</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for USDC Lots, Company USDC, and Cashout Orders */}
      <Tabs defaultValue="usdc-lots" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usdc-lots">Customer USDC Inventory</TabsTrigger>
          <TabsTrigger value="company-usdc">Company USDC</TabsTrigger>
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
              <div>
                <CardTitle>Customer USDC Inventory</CardTitle>
                <CardDescription>USDC held for customer swaps and fulfillment</CardDescription>
              </div>
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
                      Record USDC added to the CoinEdge wallet.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Amount (USDC) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={usdcLotForm.amount}
                        onChange={(e) => setUsdcLotForm({ ...usdcLotForm, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Source</Label>
                      <Select
                        value={usdcLotForm.source}
                        onValueChange={(v) => setUsdcLotForm({ ...usdcLotForm, source: v as typeof usdcLotForm.source })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual_topup">Manual Top-up</SelectItem>
                          <SelectItem value="user_sell">User Sell</SelectItem>
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
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={usdcLotForm.notes}
                        onChange={(e) => setUsdcLotForm({ ...usdcLotForm, notes: e.target.value })}
                        placeholder="Optional"
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
                      <TableHead>ID</TableHead>
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
                <p className="text-muted-foreground text-center py-8">No USDC inventory lots.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company-usdc">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Company USDC Balance</CardTitle>
                <CardDescription>Operational funds for fees and expenses</CardDescription>
              </div>
              <Dialog open={companyUsdcDialogOpen} onOpenChange={setCompanyUsdcDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Record Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Company USDC Transaction</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Transaction Type</Label>
                      <Select
                        value={companyUsdcForm.type}
                        onValueChange={(v) => setCompanyUsdcForm({ ...companyUsdcForm, type: v as typeof companyUsdcForm.type })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEPOSIT">Deposit</SelectItem>
                          <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                          <SelectItem value="FEE_COLLECTION">Fee Collection</SelectItem>
                          <SelectItem value="OPERATIONAL_EXPENSE">Operational Expense</SelectItem>
                          <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Amount (USDC) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={companyUsdcForm.amount}
                        onChange={(e) => setCompanyUsdcForm({ ...companyUsdcForm, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Reference</Label>
                      <Input
                        value={companyUsdcForm.reference}
                        onChange={(e) => setCompanyUsdcForm({ ...companyUsdcForm, reference: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={companyUsdcForm.notes}
                        onChange={(e) => setCompanyUsdcForm({ ...companyUsdcForm, notes: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCompanyUsdcDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCompanyUsdcTransaction} 
                      disabled={!companyUsdcForm.amount || updateCompanyUsdc.isPending}
                    >
                      {updateCompanyUsdc.isPending ? 'Recording...' : 'Record'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                {formatUsdc(Number(companyUsdc?.balance_usdc || 0))}
              </div>
              {companyLedger && companyLedger.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyLedger.slice(0, 10).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge variant="outline">{entry.type.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className={entry.amount_usdc < 0 ? 'text-destructive' : 'text-green-600'}>
                          {entry.amount_usdc > 0 ? '+' : ''}{formatUsdc(entry.amount_usdc)}
                        </TableCell>
                        <TableCell className="text-sm">{entry.reference || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashouts">
          <Card>
            <CardHeader>
              <CardTitle>Cash-out Orders</CardTitle>
              <CardDescription>Customer requests to withdraw to bank accounts</CardDescription>
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
                      <TableHead>Source</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
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
                        <TableCell>{formatCurrency(Number(order.fee_usd))}</TableCell>
                        <TableCell>{getCashoutStatusBadge(order.status)}</TableCell>
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
                <p className="text-muted-foreground text-center py-8">No cash-out orders.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminTreasuryDashboard;
