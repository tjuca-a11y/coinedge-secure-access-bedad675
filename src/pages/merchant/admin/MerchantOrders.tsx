import React from 'react';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-yellow-500/10 text-yellow-500',
  PAID: 'bg-blue-500/10 text-blue-500',
  PROCESSING: 'bg-purple-500/10 text-purple-500',
  SHIPPED: 'bg-cyan-500/10 text-cyan-500',
  DELIVERED: 'bg-green-500/10 text-green-500',
  CANCELED: 'bg-red-500/10 text-red-500',
};

const MerchantOrders: React.FC = () => {
  const { merchant } = useMerchantAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['card-orders', merchant?.id],
    queryFn: async () => {
      if (!merchant?.id) return [];
      const { data, error } = await supabase
        .from('card_orders')
        .select(`
          *,
          card_products (
            name,
            pack_size
          )
        `)
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!merchant?.id,
  });

  return (
    <MerchantLayout title="Orders" subtitle="View your card orders">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">
                      {(order.card_products as { name: string } | null)?.name ?? 'Unknown Product'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {order.quantity}
                    </p>
                  </div>
                </div>
                <Badge className={statusColors[order.status] ?? 'bg-muted'}>
                  {order.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Shipping To</p>
                    <p className="font-medium">{order.shipping_name}</p>
                    <p>{order.shipping_address_line1}</p>
                    {order.shipping_address_line2 && <p>{order.shipping_address_line2}</p>}
                    <p>
                      {order.shipping_city}, {order.shipping_state} {order.shipping_zip}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Order Details</p>
                    <p>
                      Ordered: {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </p>
                    {order.tracking_number && (
                      <p>
                        Tracking: <span className="font-medium">{order.tracking_number}</span>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Orders Yet</h3>
            <p className="text-muted-foreground">
              Your card orders will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </MerchantLayout>
  );
};

export default MerchantOrders;
