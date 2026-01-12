import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
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
  Building2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Scale,
} from 'lucide-react';
import {
  useReconciliationRecords,
  useLatestReconciliation,
  useCreateReconciliation,
  useResolveReconciliation,
  ReconciliationRecord,
} from '@/hooks/useReconciliation';
import { useInventoryStats } from '@/hooks/useBtcInventory';
import { useUsdcInventoryStats, useCompanyUsdcBalance } from '@/hooks/useTreasury';
import { formatDistanceToNow, format } from 'date-fns';

const formatBtc = (amount: number) => `₿ ${amount.toFixed(8)}`;
const formatUsdc = (amount: number) => `$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getStatusBadge = (status: ReconciliationRecord['status']) => {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
    PENDING: { variant: 'secondary', icon: RefreshCw },
    MATCHED: { variant: 'default', icon: CheckCircle2 },
    DISCREPANCY: { variant: 'destructive', icon: AlertTriangle },
    RESOLVED: { variant: 'outline', icon: CheckCircle2 },
  };
  const { variant, icon: Icon } = config[status] || config.PENDING;
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
};

const getAssetIcon = (type: string) => {
  switch (type) {
    case 'BTC': return <Bitcoin className="h-4 w-4 text-orange-500" />;
    case 'USDC': return <DollarSign className="h-4 w-4 text-blue-500" />;
    case 'COMPANY_USDC': return <Building2 className="h-4 w-4 text-purple-500" />;
    default: return null;
  }
};

const AdminReconciliation: React.FC = () => {
  const { data: records, isLoading } = useReconciliationRecords();
  const { data: latestByAsset } = useLatestReconciliation();
  const { data: btcStats } = useInventoryStats();
  const { data: usdcStats } = useUsdcInventoryStats();
  const { data: companyUsdc } = useCompanyUsdcBalance();
  
  const createReconciliation = useCreateReconciliation();
  const resolveReconciliation = useResolveReconciliation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
  const [form, setForm] = useState({
    asset_type: 'BTC' as 'BTC' | 'USDC' | 'COMPANY_USDC',
    onchain_balance: '',
    notes: '',
  });
  const [resolveNotes, setResolveNotes] = useState('');

  // Get current database balances
  const getDatabaseBalance = (type: string) => {
    switch (type) {
      case 'BTC': return btcStats?.total_btc || 0;
      case 'USDC': return usdcStats?.total_usdc || 0;
      case 'COMPANY_USDC': return Number(companyUsdc?.balance_usdc || 0);
      default: return 0;
    }
  };

  const handleCreateReconciliation = async () => {
    const databaseBalance = getDatabaseBalance(form.asset_type);
    await createReconciliation.mutateAsync({
      asset_type: form.asset_type,
      onchain_balance: parseFloat(form.onchain_balance),
      database_balance: databaseBalance,
      notes: form.notes || undefined,
    });
    setDialogOpen(false);
    setForm({ asset_type: 'BTC', onchain_balance: '', notes: '' });
  };

  const handleResolve = async () => {
    if (!selectedRecord) return;
    await resolveReconciliation.mutateAsync({
      id: selectedRecord.id,
      notes: resolveNotes || undefined,
    });
    setResolveDialogOpen(false);
    setSelectedRecord(null);
    setResolveNotes('');
  };

  const openDiscrepancies = records?.filter(r => r.status === 'DISCREPANCY') || [];

  return (
    <AdminLayout title="Treasury Reconciliation" subtitle="Compare on-chain balances with database records">
      {/* Open Discrepancies Alert */}
      {openDiscrepancies.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Open Discrepancies</AlertTitle>
          <AlertDescription>
            {openDiscrepancies.length} unresolved discrepanc{openDiscrepancies.length === 1 ? 'y' : 'ies'} found. Review and resolve below.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Status Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {/* BTC */}
        <Card className={latestByAsset?.BTC?.status === 'DISCREPANCY' ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bitcoin className="h-4 w-4 text-orange-500" />
              BTC
            </CardTitle>
            {latestByAsset?.BTC && getStatusBadge(latestByAsset.BTC.status)}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Database:</span>
                <span className="font-mono">{formatBtc(btcStats?.total_btc || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last On-chain:</span>
                <span className="font-mono">
                  {latestByAsset?.BTC ? formatBtc(Number(latestByAsset.BTC.onchain_balance)) : '—'}
                </span>
              </div>
              {latestByAsset?.BTC && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discrepancy:</span>
                  <span className={`font-mono ${Number(latestByAsset.BTC.discrepancy) !== 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatBtc(Number(latestByAsset.BTC.discrepancy))}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {latestByAsset?.BTC 
                ? `Last checked ${formatDistanceToNow(new Date(latestByAsset.BTC.created_at), { addSuffix: true })}`
                : 'Never reconciled'}
            </p>
          </CardContent>
        </Card>

        {/* USDC */}
        <Card className={latestByAsset?.USDC?.status === 'DISCREPANCY' ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Customer USDC
            </CardTitle>
            {latestByAsset?.USDC && getStatusBadge(latestByAsset.USDC.status)}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Database:</span>
                <span className="font-mono">{formatUsdc(usdcStats?.total_usdc || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last On-chain:</span>
                <span className="font-mono">
                  {latestByAsset?.USDC ? formatUsdc(Number(latestByAsset.USDC.onchain_balance)) : '—'}
                </span>
              </div>
              {latestByAsset?.USDC && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discrepancy:</span>
                  <span className={`font-mono ${Number(latestByAsset.USDC.discrepancy) !== 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatUsdc(Number(latestByAsset.USDC.discrepancy))}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {latestByAsset?.USDC 
                ? `Last checked ${formatDistanceToNow(new Date(latestByAsset.USDC.created_at), { addSuffix: true })}`
                : 'Never reconciled'}
            </p>
          </CardContent>
        </Card>

        {/* Company USDC */}
        <Card className={latestByAsset?.COMPANY_USDC?.status === 'DISCREPANCY' ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-500" />
              Company USDC
            </CardTitle>
            {latestByAsset?.COMPANY_USDC && getStatusBadge(latestByAsset.COMPANY_USDC.status)}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Database:</span>
                <span className="font-mono">{formatUsdc(Number(companyUsdc?.balance_usdc || 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last On-chain:</span>
                <span className="font-mono">
                  {latestByAsset?.COMPANY_USDC ? formatUsdc(Number(latestByAsset.COMPANY_USDC.onchain_balance)) : '—'}
                </span>
              </div>
              {latestByAsset?.COMPANY_USDC && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discrepancy:</span>
                  <span className={`font-mono ${Number(latestByAsset.COMPANY_USDC.discrepancy) !== 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatUsdc(Number(latestByAsset.COMPANY_USDC.discrepancy))}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {latestByAsset?.COMPANY_USDC 
                ? `Last checked ${formatDistanceToNow(new Date(latestByAsset.COMPANY_USDC.created_at), { addSuffix: true })}`
                : 'Never reconciled'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Reconciliation History
            </CardTitle>
            <CardDescription>Log of all balance comparisons</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Reconciliation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Reconciliation</DialogTitle>
                <DialogDescription>
                  Enter the on-chain balance to compare with database records.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Asset Type *</Label>
                  <Select
                    value={form.asset_type}
                    onValueChange={(value) => setForm({ ...form, asset_type: value as typeof form.asset_type })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTC">BTC</SelectItem>
                      <SelectItem value="USDC">Customer USDC</SelectItem>
                      <SelectItem value="COMPANY_USDC">Company USDC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Current Database Balance</Label>
                  <Input
                    value={form.asset_type === 'BTC' 
                      ? formatBtc(getDatabaseBalance(form.asset_type))
                      : formatUsdc(getDatabaseBalance(form.asset_type))}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label>On-chain Balance *</Label>
                  <Input
                    type="number"
                    step={form.asset_type === 'BTC' ? '0.00000001' : '0.01'}
                    value={form.onchain_balance}
                    onChange={(e) => setForm({ ...form, onchain_balance: e.target.value })}
                    placeholder={form.asset_type === 'BTC' ? '0.00000000' : '0.00'}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the actual balance from Fireblocks or blockchain explorer.
                  </p>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional notes about this reconciliation"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateReconciliation} 
                  disabled={!form.onchain_balance || createReconciliation.isPending}
                >
                  {createReconciliation.isPending ? 'Recording...' : 'Record'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : records && records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>On-chain</TableHead>
                  <TableHead>Database</TableHead>
                  <TableHead>Discrepancy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id} className={record.status === 'DISCREPANCY' ? 'bg-destructive/5' : ''}>
                    <TableCell className="font-mono text-xs">{record.reconciliation_id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getAssetIcon(record.asset_type)}
                        <span className="text-sm">{record.asset_type.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {record.asset_type === 'BTC' 
                        ? formatBtc(Number(record.onchain_balance))
                        : formatUsdc(Number(record.onchain_balance))}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {record.asset_type === 'BTC' 
                        ? formatBtc(Number(record.database_balance))
                        : formatUsdc(Number(record.database_balance))}
                    </TableCell>
                    <TableCell className={`font-mono text-sm ${Number(record.discrepancy) !== 0 ? 'text-destructive font-medium' : 'text-green-600'}`}>
                      {record.asset_type === 'BTC' 
                        ? formatBtc(Number(record.discrepancy))
                        : formatUsdc(Number(record.discrepancy))}
                      {Number(record.discrepancy_pct) !== 0 && (
                        <span className="text-xs ml-1">({Number(record.discrepancy_pct).toFixed(2)}%)</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {record.status === 'DISCREPANCY' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRecord(record);
                            setResolveDialogOpen(true);
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No reconciliation records yet. Click "New Reconciliation" to compare balances.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Discrepancy</DialogTitle>
            <DialogDescription>
              Mark this discrepancy as resolved after investigation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRecord && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p><strong>Asset:</strong> {selectedRecord.asset_type}</p>
                <p><strong>Discrepancy:</strong> {
                  selectedRecord.asset_type === 'BTC'
                    ? formatBtc(Number(selectedRecord.discrepancy))
                    : formatUsdc(Number(selectedRecord.discrepancy))
                }</p>
              </div>
            )}
            <div>
              <Label>Resolution Notes</Label>
              <Textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Explain how the discrepancy was resolved..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolve} 
              disabled={resolveReconciliation.isPending}
            >
              {resolveReconciliation.isPending ? 'Resolving...' : 'Mark Resolved'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminReconciliation;
