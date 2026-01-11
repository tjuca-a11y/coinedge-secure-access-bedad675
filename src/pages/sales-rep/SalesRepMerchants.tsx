import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SalesRepLayout } from '@/components/sales-rep/SalesRepLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSalesRepMerchants } from '@/hooks/useSalesRepData';
import { Search, Eye, Store, TrendingUp, Plus } from 'lucide-react';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const SalesRepMerchants: React.FC = () => {
  const { data: merchants, isLoading } = useSalesRepMerchants();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredMerchants = merchants?.filter((m) => {
    const matchesSearch =
      m.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.merchant_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
      case 'lead':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'lead', label: 'Lead' },
    { value: 'invited', label: 'Invited' },
    { value: 'onboarding_started', label: 'Onboarding' },
    { value: 'kyc_pending', label: 'KYC Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
  ];

  return (
    <SalesRepLayout title="My Merchants" subtitle="Manage your assigned merchant accounts">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Merchants
          </CardTitle>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => navigate('/rep/add-merchant')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Merchant
            </Button>
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
                  <TableHead>Merchant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Today</TableHead>
                  <TableHead className="text-right">7 Days</TableHead>
                  <TableHead className="text-right">30 Days</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMerchants.map((merchant) => (
                  <TableRow
                    key={merchant.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/rep/merchants/${merchant.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{merchant.business_name}</p>
                        <p className="text-xs text-muted-foreground">{merchant.point_of_contact}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(merchant.status)}>
                        {merchant.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {merchant.city && merchant.state
                        ? `${merchant.city}, ${merchant.state}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">$0</div>
                      <div className="text-xs text-muted-foreground">0 cards</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">$0</div>
                      <div className="text-xs text-muted-foreground">0 cards</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">$0</div>
                      <div className="text-xs text-muted-foreground">0 cards</div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <Store className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'No merchants match your filters'
                  : 'No merchants yet'}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {!searchTerm && statusFilter === 'all' && (
                  <>Start by adding your first merchant lead.</>
                )}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button className="mt-4" onClick={() => navigate('/rep/add-merchant')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Merchant
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </SalesRepLayout>
  );
};

export default SalesRepMerchants;
