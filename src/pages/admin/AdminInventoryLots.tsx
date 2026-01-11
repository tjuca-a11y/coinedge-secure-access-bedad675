import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Clock, Lock, Unlock } from 'lucide-react';
import {
  useInventoryLots,
  useCreateInventoryLot,
  useTreasuryWallet,
} from '@/hooks/useBtcInventory';
import { formatDistanceToNow, differenceInMinutes, format } from 'date-fns';

const formatBtc = (amount: number) => {
  return `₿ ${amount.toFixed(8)}`;
};

const AdminInventoryLots: React.FC = () => {
  const { data: lots, isLoading } = useInventoryLots();
  const { data: wallet } = useTreasuryWallet();
  const createLot = useCreateInventoryLot();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [lotForm, setLotForm] = useState({
    amount_btc_total: '',
    source: 'manual_topup' as 'manual_topup' | 'exchange_withdraw' | 'other',
    received_at: new Date().toISOString().slice(0, 16),
    reference_id: '',
    notes: '',
  });

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
      return { status: 'DEPLETED', color: 'secondary' as const, icon: null };
    }
    if (now >= eligibleAt) {
      return { status: 'ELIGIBLE', color: 'default' as const, icon: Unlock };
    }
    return { status: 'LOCKED', color: 'destructive' as const, icon: Lock };
  };

  const handleCreateLot = async () => {
    if (!wallet) return;
    
    await createLot.mutateAsync({
      treasury_wallet_id: wallet.id,
      amount_btc_total: parseFloat(lotForm.amount_btc_total),
      source: lotForm.source,
      received_at: new Date(lotForm.received_at).toISOString(),
      reference_id: lotForm.reference_id || undefined,
      notes: lotForm.notes || undefined,
    });
    
    setDialogOpen(false);
    setLotForm({
      amount_btc_total: '',
      source: 'manual_topup',
      received_at: new Date().toISOString().slice(0, 16),
      reference_id: '',
      notes: '',
    });
  };

  const sourceLabels = {
    manual_topup: 'Manual Top-up',
    exchange_withdraw: 'Exchange Withdraw',
    other: 'Other',
  };

  return (
    <AdminLayout title="Inventory Lots" subtitle="Manage BTC inventory lots">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>BTC Inventory Lots</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!wallet}>
                <Plus className="h-4 w-4 mr-1" />
                Create Lot
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Inventory Lot</DialogTitle>
                <DialogDescription>
                  Add BTC to treasury inventory. The lot will become eligible for use after 60 minutes.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>BTC Amount *</Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    min="0.00000001"
                    value={lotForm.amount_btc_total}
                    onChange={(e) => setLotForm({ ...lotForm, amount_btc_total: e.target.value })}
                    placeholder="0.00000000"
                  />
                </div>
                <div>
                  <Label>Source *</Label>
                  <Select
                    value={lotForm.source}
                    onValueChange={(value) => setLotForm({ ...lotForm, source: value as typeof lotForm.source })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_topup">Manual Top-up</SelectItem>
                      <SelectItem value="exchange_withdraw">Exchange Withdraw</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Received At *</Label>
                  <Input
                    type="datetime-local"
                    value={lotForm.received_at}
                    onChange={(e) => setLotForm({ ...lotForm, received_at: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Eligible at: {format(new Date(new Date(lotForm.received_at).getTime() + 60 * 60 * 1000), 'PPpp')}
                  </p>
                </div>
                <div>
                  <Label>Reference ID (Optional)</Label>
                  <Input
                    value={lotForm.reference_id}
                    onChange={(e) => setLotForm({ ...lotForm, reference_id: e.target.value })}
                    placeholder="e.g., tx hash, exchange order ID"
                  />
                </div>
                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={lotForm.notes}
                    onChange={(e) => setLotForm({ ...lotForm, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateLot}
                  disabled={!lotForm.amount_btc_total || createLot.isPending}
                >
                  {createLot.isPending ? 'Creating...' : 'Create Lot'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!wallet && (
            <div className="mb-4 p-4 bg-muted rounded-lg text-center">
              <p className="text-muted-foreground">
                Please configure a treasury wallet first before creating inventory lots.
              </p>
              <Button variant="link" asChild>
                <a href="/admin/inventory">Go to Inventory Dashboard</a>
              </Button>
            </div>
          )}
          
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : lots && lots.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot ID</TableHead>
                    <TableHead>Total BTC</TableHead>
                    <TableHead>Available BTC</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time Remaining</TableHead>
                    <TableHead>Received At</TableHead>
                    <TableHead>Eligible At</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((lot) => {
                    const { status, color, icon: StatusIcon } = getLotStatus(lot);
                    const timeRemaining = getTimeRemaining(lot.eligible_at);
                    
                    return (
                      <TableRow key={lot.id}>
                        <TableCell className="font-mono text-xs">
                          {lot.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatBtc(lot.amount_btc_total)}
                        </TableCell>
                        <TableCell>
                          {formatBtc(lot.amount_btc_available)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={color} className="flex items-center gap-1 w-fit">
                            {StatusIcon && <StatusIcon className="h-3 w-3" />}
                            {status}
                          </Badge>
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
                        <TableCell className="text-sm">
                          {format(new Date(lot.received_at), 'PP p')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(lot.eligible_at), 'PP p')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {sourceLabels[lot.source]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {lot.reference_id || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No inventory lots found. Click "Create Lot" to add BTC to inventory.
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminInventoryLots;
