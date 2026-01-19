import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSalesReps } from '@/hooks/useAdminStats';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreHorizontal, UserCheck, UserX, Key, Eye, Store, DollarSign, TrendingUp, Calendar, Phone, Mail, User, Copy, Check, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface SalesRep {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  dob: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
  user_id: string;
}

const AdminSalesReps: React.FC = () => {
  const { data: salesReps, isLoading } = useSalesReps();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null);
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    status: 'cleared' as 'draft' | 'cleared',
  });

  // Fetch rep profile data when viewing
  const { data: repProfileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['sales-rep-profile', selectedRep?.id],
    queryFn: async () => {
      if (!selectedRep?.id) return null;

      // Fetch assigned merchants
      const { data: merchants, error: merchantsError } = await supabase
        .from('merchants')
        .select('id, business_name, status, created_at')
        .eq('rep_id', selectedRep.id);

      if (merchantsError) throw merchantsError;

      // Fetch commission data
      const { data: commissions, error: commissionsError } = await supabase
        .from('commission_ledger')
        .select('rep_commission_usd, card_value_usd, status, activated_at')
        .eq('rep_id', selectedRep.id);

      if (commissionsError) throw commissionsError;

      // Calculate totals
      const totalCommission = commissions?.reduce((sum, c) => sum + (c.rep_commission_usd || 0), 0) || 0;
      const totalVolume = commissions?.reduce((sum, c) => sum + (c.card_value_usd || 0), 0) || 0;
      const activeMerchants = merchants?.filter(m => m.status === 'active').length || 0;
      const signupBonuses = (merchants?.length || 0) * 50; // $50 per merchant signup

      return {
        merchants: merchants || [],
        commissions: commissions || [],
        stats: {
          totalMerchants: merchants?.length || 0,
          activeMerchants,
          totalCommission,
          totalVolume,
          signupBonuses,
          redemptionCommission: totalCommission,
          totalEarnings: signupBonuses + totalCommission,
        },
      };
    },
    enabled: !!selectedRep?.id && isViewProfileOpen,
  });

  const handleViewProfile = (rep: SalesRep) => {
    setSelectedRep(rep);
    setIsViewProfileOpen(true);
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleOpenResetPassword = (rep: SalesRep) => {
    setSelectedRep(rep);
    setTempPassword(generateTempPassword());
    setIsResetPasswordOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedRep || !tempPassword) return;

    setIsResettingPassword(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-sales-rep-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            rep_id: selectedRep.id,
            new_password: tempPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      toast({
        title: 'Password Reset',
        description: `Password has been reset for ${selectedRep.full_name}. They will be required to change it on next login.`,
      });

      setIsResetPasswordOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-sales-reps'] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const handleCreateRep = async () => {
    if (!formData.full_name || !formData.email || !formData.phone || !formData.dob || !formData.password) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      // Call the edge function to create the sales rep
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-sales-rep`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            dob: formData.dob,
            password: formData.password,
            status: formData.status,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create sales rep');
      }

      toast({
        title: 'Sales Rep Created',
        description: `${formData.full_name} has been created successfully.`,
      });

      setIsCreateOpen(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        dob: '',
        password: '',
        status: 'cleared',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-sales-reps'] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateRepStatus = async (repId: string, newStatus: 'draft' | 'cleared' | 'active' | 'disabled') => {
    try {
      const { error } = await supabase
        .from('sales_reps')
        .update({ status: newStatus })
        .eq('id', repId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        event_id: `evt-${Date.now()}`,
        actor_type: 'admin',
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        action: `update_rep_status_${newStatus}`,
        metadata: { rep_id: repId },
      });

      toast({
        title: 'Status Updated',
        description: `Sales rep status changed to ${newStatus}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['admin-sales-reps'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'disabled':
        return 'destructive';
      case 'cleared':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <AdminLayout title="Sales Reps" subtitle="Manage sales representative accounts">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales Representatives</CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Sales Rep
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Sales Rep</DialogTitle>
                <DialogDescription>
                  Create a new sales rep account after internal verification is complete.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Business Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@coinedge.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Temporary Password *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter or generate password"
                    />
                    <Button type="button" variant="outline" onClick={generatePassword}>
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Rep will be required to reset on first login.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Initial Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'draft' | 'cleared') =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="cleared">Cleared</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRep} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Sales Rep'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : salesReps && salesReps.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesReps.map((rep) => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-medium">{rep.full_name}</TableCell>
                    <TableCell>{rep.email}</TableCell>
                    <TableCell>{rep.phone}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(rep.status)}>
                        {rep.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(rep.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {rep.last_login_at
                        ? format(new Date(rep.last_login_at), 'MMM d, yyyy HH:mm')
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background">
                          <DropdownMenuItem onClick={() => handleViewProfile(rep as SalesRep)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          {rep.status !== 'active' && (
                            <DropdownMenuItem onClick={() => updateRepStatus(rep.id, 'active')}>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {rep.status !== 'disabled' && (
                            <DropdownMenuItem onClick={() => updateRepStatus(rep.id, 'disabled')}>
                              <UserX className="mr-2 h-4 w-4" />
                              Disable
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleOpenResetPassword(rep as SalesRep)}>
                            <Key className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No sales reps found. Create your first sales rep to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Profile Dialog */}
      <Dialog open={isViewProfileOpen} onOpenChange={setIsViewProfileOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Sales Rep Profile
            </DialogTitle>
            <DialogDescription>
              View detailed information and performance metrics
            </DialogDescription>
          </DialogHeader>

          {selectedRep && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Full Name</Label>
                    <p className="font-medium">{selectedRep.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div>
                      <Badge variant={getStatusBadgeVariant(selectedRep.status)}>
                        {selectedRep.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground text-xs">Email</Label>
                      <p className="font-medium">{selectedRep.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground text-xs">Phone</Label>
                      <p className="font-medium">{selectedRep.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground text-xs">Date of Birth</Label>
                      <p className="font-medium">
                        {selectedRep.dob ? format(new Date(selectedRep.dob), 'MMM d, yyyy') : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Member Since</Label>
                    <p className="font-medium">
                      {format(new Date(selectedRep.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Commission Model */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Commission Model
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-background p-3 border">
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="h-4 w-4 text-success" />
                      <span className="text-sm text-muted-foreground">Merchant Signup Bonus</span>
                    </div>
                    <p className="text-2xl font-bold text-success">$50</p>
                    <p className="text-xs text-muted-foreground">Per new merchant</p>
                  </div>
                  <div className="rounded-lg bg-background p-3 border">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Redemption Commission</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">2%</p>
                    <p className="text-xs text-muted-foreground">Of BitCard redemptions</p>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              {isProfileLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : repProfileData ? (
                <>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Performance Summary
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{repProfileData.stats.totalMerchants}</p>
                        <p className="text-xs text-muted-foreground">Total Merchants</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-success">{repProfileData.stats.activeMerchants}</p>
                        <p className="text-xs text-muted-foreground">Active Merchants</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold">{repProfileData.commissions.length}</p>
                        <p className="text-xs text-muted-foreground">Total Redemptions</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-700 dark:text-green-300">
                      <DollarSign className="h-4 w-4" />
                      Earnings Breakdown
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Signup Bonuses ({repProfileData.stats.totalMerchants} × $50)</span>
                        <span className="font-semibold">
                          ${repProfileData.stats.signupBonuses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Redemption Commissions (2%)</span>
                        <span className="font-semibold">
                          ${repProfileData.stats.redemptionCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-green-700 dark:text-green-300">Total Earnings</span>
                        <span className="text-xl font-bold text-green-700 dark:text-green-300">
                          ${repProfileData.stats.totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Merchants */}
                  {repProfileData.merchants.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        Assigned Merchants ({repProfileData.merchants.length})
                      </h3>
                      <div className="max-h-48 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Business Name</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Joined</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {repProfileData.merchants.map((merchant) => (
                              <TableRow key={merchant.id}>
                                <TableCell className="font-medium">{merchant.business_name}</TableCell>
                                <TableCell>
                                  <Badge variant={merchant.status === 'active' ? 'default' : 'secondary'}>
                                    {merchant.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {format(new Date(merchant.created_at), 'MMM d, yyyy')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewProfileOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Generate a new temporary password for {selectedRep?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
              <p className="text-sm text-warning-foreground">
                The sales rep will be required to change this password on their next login.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Sales Rep</Label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedRep?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRep?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>New Temporary Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="pr-10 font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      toast({
                        title: 'Copied',
                        description: 'Password copied to clipboard',
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setTempPassword(generateTempPassword())}
                  title="Generate new password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click to copy or generate a new password
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResetPassword} 
              disabled={isResettingPassword || !tempPassword}
            >
              {isResettingPassword ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSalesReps;
