import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SalesRepLayout } from '@/components/sales-rep/SalesRepLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSalesRepMerchantDetail } from '@/hooks/useSalesRepData';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  Clock,
  Send,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useSalesRepAuth } from '@/contexts/SalesRepAuthContext';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const SalesRepMerchantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useSalesRepMerchantDetail(id || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { salesRep } = useSalesRepAuth();

  const handleSendInvite = async () => {
    if (!data?.merchant || !salesRep) return;

    try {
      const inviteToken = crypto.randomUUID();
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from('merchant_invites').insert({
        invite_id: `inv-${Date.now().toString(36)}`,
        merchant_id: data.merchant.id,
        rep_id: salesRep.id,
        invite_token: inviteToken,
        invite_code: inviteCode,
        status: 'sent',
        sent_to_email: data.merchant.email,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      // Update merchant status to invited
      await supabase
        .from('merchants')
        .update({ status: 'invited' })
        .eq('id', data.merchant.id);

      // Add timeline event
      await supabase.from('merchant_timeline').insert({
        merchant_id: data.merchant.id,
        event_type: 'invite_sent',
        description: `Onboarding invite sent to ${data.merchant.email}`,
        created_by: salesRep.user_id,
      });

      toast({
        title: 'Invite Sent',
        description: `Onboarding invite sent to ${data.merchant.email}`,
      });

      queryClient.invalidateQueries({ queryKey: ['sales-rep-merchant-detail', id] });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
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

  if (isLoading) {
    return (
      <SalesRepLayout title="Merchant Detail">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </SalesRepLayout>
    );
  }

  if (error || !data) {
    return (
      <SalesRepLayout title="Merchant Detail">
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load merchant details.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/rep/merchants')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Merchants
          </Button>
        </div>
      </SalesRepLayout>
    );
  }

  const { merchant, bitcards, commissions, timeline, invites } = data;

  const totalCommission = commissions.reduce((sum, c) => sum + Number(c.rep_commission_usd), 0);
  const totalActivatedUsd = bitcards
    .filter((b) => b.status === 'active')
    .reduce((sum, b) => sum + Number(b.usd_value), 0);

  return (
    <SalesRepLayout title={merchant.business_name} subtitle={merchant.merchant_id}>
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/rep/merchants')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Merchants
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Merchant Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Info
              </CardTitle>
              <Badge variant={getStatusBadgeVariant(merchant.status)}>
                {merchant.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Point of Contact</p>
              <p className="font-medium">{merchant.point_of_contact}</p>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{merchant.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{merchant.phone}</span>
            </div>
            {merchant.street && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p>{merchant.street}</p>
                  <p>
                    {merchant.city}, {merchant.state} {merchant.zip}
                  </p>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Actions</p>
              {merchant.status === 'lead' && (
                <Button className="w-full" onClick={handleSendInvite}>
                  <Send className="mr-2 h-4 w-4" />
                  Send Onboarding Invite
                </Button>
              )}
              {invites.length > 0 && (
                <div className="mt-3 rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Latest Invite</p>
                  <p className="text-sm font-mono">{invites[0].invite_code}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {invites[0].status} • Expires:{' '}
                    {format(new Date(invites[0].expires_at), 'MMM d, yyyy')}
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 w-full" onClick={handleSendInvite}>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Resend Invite
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats & Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border p-4 text-center">
                <CreditCard className="mx-auto h-6 w-6 text-primary mb-2" />
                <p className="text-2xl font-bold">{bitcards.filter((b) => b.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">Cards Activated</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <DollarSign className="mx-auto h-6 w-6 text-primary mb-2" />
                <p className="text-2xl font-bold">{formatCurrency(totalActivatedUsd)}</p>
                <p className="text-xs text-muted-foreground">Activated USD</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <DollarSign className="mx-auto h-6 w-6 text-success mb-2" />
                <p className="text-2xl font-bold text-success">{formatCurrency(totalCommission)}</p>
                <p className="text-xs text-muted-foreground">Your Commission</p>
              </div>
            </div>

            <Tabs defaultValue="bitcards">
              <TabsList>
                <TabsTrigger value="bitcards">BitCards ({bitcards.length})</TabsTrigger>
                <TabsTrigger value="commissions">Commissions ({commissions.length})</TabsTrigger>
                <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="bitcards">
                {bitcards.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>BitCard ID</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Activated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bitcards.slice(0, 10).map((card) => (
                        <TableRow key={card.id}>
                          <TableCell className="font-mono text-sm">{card.bitcard_id}</TableCell>
                          <TableCell>{formatCurrency(Number(card.usd_value))}</TableCell>
                          <TableCell>
                            <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
                              {card.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {card.activated_at
                              ? format(new Date(card.activated_at), 'MMM d, yyyy HH:mm')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No BitCards yet</p>
                )}
              </TabsContent>

              <TabsContent value="commissions">
                {commissions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Card Value</TableHead>
                        <TableHead>Your Commission</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.slice(0, 10).map((comm) => (
                        <TableRow key={comm.id}>
                          <TableCell>
                            {format(new Date(comm.activated_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{formatCurrency(Number(comm.card_value_usd))}</TableCell>
                          <TableCell className="font-medium text-success">
                            {formatCurrency(Number(comm.rep_commission_usd))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{comm.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No commissions yet</p>
                )}
              </TabsContent>

              <TabsContent value="timeline">
                {timeline.length > 0 ? (
                  <div className="space-y-3">
                    {timeline.map((event) => (
                      <div key={event.id} className="flex gap-3 border-l-2 border-muted pl-4 py-2">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">{event.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No timeline events</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </SalesRepLayout>
  );
};

export default SalesRepMerchantDetail;
