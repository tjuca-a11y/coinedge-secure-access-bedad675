import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  CreditCard, 
  DollarSign, 
  Wallet,
  Clock,
  Users,
  Package,
  Calendar,
  Loader2
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminMerchantDetail } from '@/hooks/useAdminMerchantDetail';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active': return 'default';
    case 'approved': return 'secondary';
    case 'lead': return 'outline';
    case 'invited': return 'outline';
    case 'onboarding_started': return 'outline';
    case 'paused': return 'destructive';
    default: return 'outline';
  }
};

const getCategoryLabel = (category: string | null) => {
  const categories: Record<string, string> = {
    convenience_store: 'Convenience Store',
    gas_station: 'Gas Station',
    grocery: 'Grocery Store',
    restaurant: 'Restaurant',
    retail: 'Retail Store',
    pharmacy: 'Pharmacy',
    liquor_store: 'Liquor Store',
    other: 'Other',
  };
  return category ? categories[category] || category : 'Not specified';
};

export default function AdminMerchantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useAdminMerchantDetail(id || '');

  if (isLoading) {
    return (
      <AdminLayout title="Merchant Details" subtitle="Loading...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="Merchant Details" subtitle="Error loading merchant">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-muted-foreground">Failed to load merchant details</p>
          <Button variant="outline" onClick={() => navigate('/admin/merchants')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Merchants
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const { merchant, activations, timeline, users, wallet, cardOrders, invites, stats } = data;

  return (
    <AdminLayout title={merchant.business_name} subtitle={`Merchant ID: ${merchant.merchant_id}`}>
      {/* Back button */}
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/admin/merchants')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Merchants
      </Button>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Activated</p>
              <p className="text-2xl font-bold">${stats.totalActivatedUsd.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <CreditCard className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Activations</p>
              <p className="text-2xl font-bold">{stats.totalActivations}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
              <Wallet className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="text-2xl font-bold">${stats.walletBalance.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Team Members</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Information */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>Complete merchant profile and details</CardDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(merchant.status)}>
              {merchant.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Business Name</p>
                <p className="text-lg">{merchant.business_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p>{getCategoryLabel(merchant.category)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Point of Contact</p>
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {merchant.point_of_contact}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {merchant.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {merchant.phone}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>
                    {merchant.street && <>{merchant.street}<br /></>}
                    {merchant.city && `${merchant.city}, `}
                    {merchant.state} {merchant.zip}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sales Representative</p>
                {merchant.sales_reps ? (
                  <div className="rounded-md border p-3">
                    <p className="font-medium">{merchant.sales_reps.full_name}</p>
                    <p className="text-sm text-muted-foreground">{merchant.sales_reps.email}</p>
                    <p className="text-sm text-muted-foreground">{merchant.sales_reps.phone}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No sales rep assigned</p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(merchant.created_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Activity */}
      <Tabs defaultValue="activations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activations">
            Activation History ({activations.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline ({timeline.length})
          </TabsTrigger>
          <TabsTrigger value="users">
            Team ({users.length})
          </TabsTrigger>
          <TabsTrigger value="orders">
            Card Orders ({cardOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Activation History Tab */}
        <TabsContent value="activations">
          <Card>
            <CardHeader>
              <CardTitle>Activation History</CardTitle>
              <CardDescription>All BitCard activations by this merchant</CardDescription>
            </CardHeader>
            <CardContent>
              {activations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Card ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Activated By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activations.map((activation) => {
                      const bitcard = activation.bitcards as { bitcard_id: string; status: string } | null;
                      const user = activation.merchant_users as { full_name: string; email: string } | null;
                      return (
                        <TableRow key={activation.id}>
                          <TableCell className="font-mono text-sm">
                            {bitcard?.bitcard_id || 'Unknown'}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${Number(activation.usd_value).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{activation.activation_method}</Badge>
                          </TableCell>
                          <TableCell>{user?.full_name || 'Unknown'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(activation.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No activations yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Chronological history of merchant events</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex gap-4 border-l-2 border-muted pl-4 py-2">
                      <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {event.event_type}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm">{event.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No timeline events</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Merchant users and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'MERCHANT_ADMIN' ? 'default' : 'secondary'}>
                            {user.role === 'MERCHANT_ADMIN' ? 'Admin' : 'Cashier'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.last_login_at 
                            ? format(new Date(user.last_login_at), 'MMM d, yyyy HH:mm')
                            : 'Never'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No team members</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Card Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Card Orders</CardTitle>
              <CardDescription>Physical card order history</CardDescription>
            </CardHeader>
            <CardContent>
              {cardOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cardOrders.map((order) => {
                      const product = order.card_products as { name: string; pack_size: number } | null;
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {product?.name || 'Unknown Product'}
                          </TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.status}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {order.tracking_number || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No card orders</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
