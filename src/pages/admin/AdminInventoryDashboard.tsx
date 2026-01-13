import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Bitcoin,
  Lock,
  Unlock,
  AlertTriangle,
  Pause,
  Wallet,
  Plus,
  Clock,
  Shield,
} from 'lucide-react';
import {
  useTreasuryWallet,
  useCreateTreasuryWallet,
  useInventoryStats,
  useInventoryLots,
  useSystemSettings,
} from '@/hooks/useBtcInventory';
import { formatDistanceToNow, differenceInMinutes, format } from 'date-fns';

const formatBtc = (amount: number) => {
  return `₿ ${amount.toFixed(8)}`;
};

const AdminInventoryDashboard: React.FC = () => {
  const { data: wallet, isLoading: walletLoading } = useTreasuryWallet();
  const { data: stats, isLoading: statsLoading } = useInventoryStats();
  const { data: lots, isLoading: lotsLoading } = useInventoryLots();
  const { data: settings } = useSystemSettings();
  const createWallet = useCreateTreasuryWallet();

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [walletForm, setWalletForm] = useState({
    btc_address: '',
    label: 'CoinEdge Treasury',
  });

  const getSetting = (key: string) => settings?.find(s => s.setting_key === key)?.setting_value;
  const lowThreshold = Number(getSetting('LOW_INVENTORY_THRESHOLD_BTC') || 5);
  const payoutsPaused = getSetting('PAYOUTS_PAUSED') === 'true';

  const handleCreateWallet = async () => {
    await createWallet.mutateAsync({
      ...walletForm,
      is_active: true,
    });
    setWalletDialogOpen(false);
  };

  const getTimeRemaining = (eligibleAt: string) => {
    const now = new Date();
    const eligible = new Date(eligibleAt);
    const minutesRemaining = differenceInMinutes(eligible, now);
    
    if (minutesRemaining <= 0) return null;
    
    if (minutesRemaining >= 60) {
      const hours = Math.floor(minutesRemaining / 60);
      const mins = minutesRemaining % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutesRemaining}m`;
  };

  const getLotStatus = (lot: { eligible_at: string; amount_btc_available: number }) => {
    const now = new Date();
    const eligibleAt = new Date(lot.eligible_at);
    
    if (lot.amount_btc_available <= 0) {
      return { status: 'DEPLETED', color: 'secondary' as const };
    }
    if (now >= eligibleAt) {
      return { status: 'ELIGIBLE', color: 'default' as const };
    }
    return { status: 'LOCKED', color: 'destructive' as const };
  };

  // Get first 5 lots for preview
  const previewLots = lots?.slice(0, 5) || [];

  return (
    <AdminLayout title="BTC Inventory" subtitle="CoinEdge wallet and inventory health overview">
      {/* Alerts */}
      <div className="space-y-3 mb-6">
        {payoutsPaused && (
          <Alert variant="destructive">
            <Pause className="h-4 w-4" />
            <AlertTitle>Payouts Paused</AlertTitle>
            <AlertDescription>
              All BTC payouts are currently paused. Go to System Controls to resume.
            </AlertDescription>
          </Alert>
        )}
        
        {stats && stats.eligible_btc < lowThreshold && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Low Eligible Inventory</AlertTitle>
            <AlertDescription>
              Eligible BTC ({formatBtc(stats.eligible_btc)}) is below threshold of {formatBtc(lowThreshold)}.
              Add more inventory or wait for locked lots to mature.
            </AlertDescription>
          </Alert>
        )}

        {stats && stats.locked_btc > stats.eligible_btc * 2 && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Large Locked Inventory</AlertTitle>
            <AlertDescription>
              {formatBtc(stats.locked_btc)} BTC is locked and will become eligible over the next 60 minutes.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Treasury Wallet */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              CoinEdge Wallet
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Self-Custody Model
            </Badge>
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
                    Set up the CoinEdge counterparty wallet for BTC inventory.
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
                      CoinEdge counterparty address for customer transactions
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
                <p className="font-mono text-sm truncate">
                  {wallet.btc_address || '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={wallet.is_active ? 'default' : 'secondary'}>
                  {wallet.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No CoinEdge wallet configured. Click "Configure Wallet" to set up.</p>
          )}
        </CardContent>
      </Card>

      {/* Inventory Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Inventory
            </CardTitle>
            <Bitcoin className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : formatBtc(stats?.total_btc || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined eligible + locked
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Eligible BTC
            </CardTitle>
            <Unlock className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : formatBtc(stats?.eligible_btc || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.eligible_lots_count || 0} lots ready
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">
              Locked BTC
            </CardTitle>
            <Lock className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? '...' : formatBtc(stats?.locked_btc || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.locked_lots_count || 0} lots maturing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Threshold
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBtc(lowThreshold)}</div>
            <p className="text-xs text-muted-foreground">Alert if eligible below</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Lots Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Inventory Lots</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <a href="/admin/inventory-lots">View All Lots</a>
          </Button>
        </CardHeader>
        <CardContent>
          {lotsLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : previewLots.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot ID</TableHead>
                  <TableHead>Total BTC</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time Remaining</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewLots.map((lot) => {
                  const { status, color } = getLotStatus(lot);
                  const timeRemaining = getTimeRemaining(lot.eligible_at);
                  
                  return (
                    <TableRow key={lot.id}>
                      <TableCell className="font-mono text-xs">
                        {lot.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{formatBtc(lot.amount_btc_total)}</TableCell>
                      <TableCell>{formatBtc(lot.amount_btc_available)}</TableCell>
                      <TableCell>
                        <Badge variant={color}>{status}</Badge>
                      </TableCell>
                      <TableCell>
                        {status === 'LOCKED' && timeRemaining ? (
                          <span className="flex items-center gap-1 text-orange-600">
                            <Clock className="h-3 w-3" />
                            {timeRemaining}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(lot.received_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No inventory lots found. Go to Inventory Lots to add BTC.
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminInventoryDashboard;
