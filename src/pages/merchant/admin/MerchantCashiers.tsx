import React, { useState } from 'react';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, User, UserX, KeyRound } from 'lucide-react';
import { format } from 'date-fns';

const MerchantCashiers: React.FC = () => {
  const { merchant, merchantUser } = useMerchantAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCashier, setNewCashier] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cashiers, isLoading } = useQuery({
    queryKey: ['merchant-users', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) return [];
      const { data, error } = await supabase
        .from('merchant_users')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!merchant?.id,
  });

  const createCashierMutation = useMutation({
    mutationFn: async (cashierData: typeof newCashier) => {
      if (!merchant?.id || !merchantUser?.id) throw new Error('Not authenticated');

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cashierData.email,
        password: cashierData.password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create merchant user
      const { error: merchantUserError } = await supabase.from('merchant_users').insert({
        merchant_id: merchant.id,
        user_id: authData.user.id,
        role: 'CASHIER',
        full_name: cashierData.full_name,
        email: cashierData.email,
        phone: cashierData.phone || null,
        must_reset_password: true,
      });

      if (merchantUserError) throw merchantUserError;

      // Log audit event
      await supabase.from('merchant_audit_logs').insert({
        merchant_id: merchant.id,
        actor_merchant_user_id: merchantUser.id,
        action: 'CASHIER_CREATED',
        metadata_json: { cashier_email: cashierData.email },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-users'] });
      setIsCreateOpen(false);
      setNewCashier({ full_name: '', email: '', phone: '', password: '' });
      toast({
        title: 'Cashier Created',
        description: 'The new cashier account has been created',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create cashier',
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, currentStatus }: { userId: string; currentStatus: string }) => {
      if (!merchant?.id || !merchantUser?.id) throw new Error('Not authenticated');

      const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      const { error } = await supabase
        .from('merchant_users')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;

      // Log audit event
      await supabase.from('merchant_audit_logs').insert({
        merchant_id: merchant.id,
        actor_merchant_user_id: merchantUser.id,
        action: newStatus === 'ACTIVE' ? 'CASHIER_ENABLED' : 'CASHIER_DISABLED',
        metadata_json: { cashier_id: userId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-users'] });
      toast({
        title: 'Status Updated',
        description: 'Cashier status has been updated',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashier.full_name || !newCashier.email || !newCashier.password) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    if (newCashier.password.length < 8) {
      toast({
        title: 'Invalid Password',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }
    createCashierMutation.mutate(newCashier);
  };

  return (
    <MerchantLayout title="Cashiers" subtitle="Manage your team members">
      <div className="mb-6 flex justify-between">
        <div />
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Cashier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Cashier</DialogTitle>
              <DialogDescription>
                Add a new cashier to your team. They will receive temporary credentials.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={newCashier.full_name}
                  onChange={(e) => setNewCashier({ ...newCashier, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCashier.email}
                  onChange={(e) => setNewCashier({ ...newCashier, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newCashier.phone}
                  onChange={(e) => setNewCashier({ ...newCashier, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password *</Label>
                <Input
                  id="password"
                  type="text"
                  value={newCashier.password}
                  onChange={(e) => setNewCashier({ ...newCashier, password: e.target.value })}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Cashier will be required to change this on first login
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCashierMutation.isPending}>
                  {createCashierMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Cashier'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : cashiers && cashiers.length > 0 ? (
        <div className="grid gap-4">
          {cashiers.map((cashier) => (
            <Card key={cashier.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{cashier.full_name}</h3>
                      <Badge variant={cashier.role === 'MERCHANT_ADMIN' ? 'default' : 'secondary'}>
                        {cashier.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          cashier.status === 'ACTIVE'
                            ? 'border-green-500 text-green-500'
                            : 'border-red-500 text-red-500'
                        }
                      >
                        {cashier.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{cashier.email}</p>
                    {cashier.last_login_at && (
                      <p className="text-xs text-muted-foreground">
                        Last login: {format(new Date(cashier.last_login_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
                {cashier.role === 'CASHIER' && cashier.id !== merchantUser?.id && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          userId: cashier.id,
                          currentStatus: cashier.status,
                        })
                      }
                      disabled={toggleStatusMutation.isPending}
                    >
                      {cashier.status === 'ACTIVE' ? (
                        <>
                          <UserX className="mr-2 h-4 w-4" />
                          Disable
                        </>
                      ) : (
                        <>
                          <User className="mr-2 h-4 w-4" />
                          Enable
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Cashiers Yet</h3>
            <p className="text-muted-foreground">Add your first cashier to get started</p>
          </CardContent>
        </Card>
      )}
    </MerchantLayout>
  );
};

export default MerchantCashiers;
