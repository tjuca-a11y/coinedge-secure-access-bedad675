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
import { useMerchants, useSalesReps } from '@/hooks/useAdminStats';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, MoreHorizontal, UserPlus, CheckCircle, Eye, Search } from 'lucide-react';
import { format } from 'date-fns';

const AdminMerchants: React.FC = () => {
  const { data: merchants, isLoading } = useMerchants();
  const { data: salesReps } = useSalesReps();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    business_name: '',
    point_of_contact: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    rep_id: '',
  });

  const handleCreateMerchant = async () => {
    if (!formData.business_name || !formData.point_of_contact || !formData.phone || !formData.email) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      const merchantId = `merch-${Date.now().toString(36)}`;

      const { error } = await supabase.from('merchants').insert({
        merchant_id: merchantId,
        business_name: formData.business_name,
        point_of_contact: formData.point_of_contact,
        phone: formData.phone,
        email: formData.email,
        street: formData.street || null,
        city: formData.city || null,
        state: formData.state || null,
        zip: formData.zip || null,
        rep_id: formData.rep_id || null,
        status: 'lead',
      });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        event_id: `evt-${Date.now()}`,
        actor_type: 'admin',
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'create_merchant',
        metadata: { merchant_id: merchantId, business_name: formData.business_name },
      });

      toast({
        title: 'Merchant Created',
        description: `${formData.business_name} has been created successfully.`,
      });

      setIsCreateOpen(false);
      setFormData({
        business_name: '',
        point_of_contact: '',
        phone: '',
        email: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        rep_id: '',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateMerchantStatus = async (merchantId: string, newStatus: 'lead' | 'invited' | 'onboarding_started' | 'kyc_pending' | 'approved' | 'active' | 'paused') => {
    try {
      const { error } = await supabase
        .from('merchants')
        .update({ status: newStatus })
        .eq('id', merchantId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        event_id: `evt-${Date.now()}`,
        actor_type: 'admin',
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        action: `update_merchant_status`,
        metadata: { merchant_id: merchantId, new_status: newStatus },
      });

      toast({
        title: 'Status Updated',
        description: `Merchant status changed to ${newStatus}.`,
      });

      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
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
      case 'approved':
        return 'default';
      case 'paused':
        return 'destructive';
      case 'kyc_pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const filteredMerchants = merchants?.filter(
    (m) =>
      m.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.merchant_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="Merchants" subtitle="Manage merchant accounts and onboarding">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Merchants</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search merchants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Merchant
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add New Merchant</DialogTitle>
                  <DialogDescription>Create a new merchant record.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="business_name">Business Name *</Label>
                    <Input
                      id="business_name"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="point_of_contact">Point of Contact *</Label>
                      <Input
                        id="point_of_contact"
                        value={formData.point_of_contact}
                        onChange={(e) =>
                          setFormData({ ...formData, point_of_contact: e.target.value })
                        }
                        placeholder="John Smith"
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
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@acme.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="123 Main St"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="zip">ZIP</Label>
                      <Input
                        id="zip"
                        value={formData.zip}
                        onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rep_id">Assign to Sales Rep</Label>
                    <Select
                      value={formData.rep_id}
                      onValueChange={(value) => setFormData({ ...formData, rep_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a sales rep" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesReps
                          ?.filter((r) => r.status === 'active')
                          .map((rep) => (
                            <SelectItem key={rep.id} value={rep.id}>
                              {rep.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateMerchant} disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Merchant'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredMerchants && filteredMerchants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Rep</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMerchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{merchant.business_name}</p>
                        <p className="text-xs text-muted-foreground">{merchant.merchant_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{merchant.point_of_contact}</p>
                        <p className="text-xs text-muted-foreground">{merchant.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(merchant.status)}>
                        {merchant.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {merchant.sales_reps?.full_name || (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {merchant.city && merchant.state
                        ? `${merchant.city}, ${merchant.state}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(merchant.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Reassign Rep
                          </DropdownMenuItem>
                          {merchant.status === 'kyc_pending' && (
                            <DropdownMenuItem
                              onClick={() => updateMerchantStatus(merchant.id, 'approved')}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve KYC
                            </DropdownMenuItem>
                          )}
                          {merchant.status === 'approved' && (
                            <DropdownMenuItem
                              onClick={() => updateMerchantStatus(merchant.id, 'active')}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {searchTerm ? 'No merchants match your search.' : 'No merchants found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminMerchants;
