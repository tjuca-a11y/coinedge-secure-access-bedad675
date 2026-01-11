import React, { useState } from 'react';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Package, Loader2, Plus, Minus, CheckCircle } from 'lucide-react';

const MerchantOrderCards: React.FC = () => {
  const { merchant, merchantUser } = useMerchantAuth();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['card-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_products')
        .select('*')
        .eq('active', true)
        .order('price_usd', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const selectedProductData = products?.find((p) => p.id === selectedProduct);
  const totalPrice = selectedProductData ? Number(selectedProductData.price_usd) * quantity : 0;

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (!merchant?.id || !merchantUser?.id || !selectedProduct) {
        throw new Error('Missing required data');
      }

      const { error } = await supabase.from('card_orders').insert({
        merchant_id: merchant.id,
        product_id: selectedProduct,
        quantity,
        shipping_name: shippingInfo.name,
        shipping_phone: shippingInfo.phone,
        shipping_address_line1: shippingInfo.address1,
        shipping_address_line2: shippingInfo.address2 || null,
        shipping_city: shippingInfo.city,
        shipping_state: shippingInfo.state,
        shipping_zip: shippingInfo.zip,
        created_by_merchant_user_id: merchantUser.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setOrderSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['card-orders'] });
      toast({
        title: 'Order Submitted',
        description: 'Your card order has been placed successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to submit order. Please try again.',
        variant: 'destructive',
      });
      console.error('Order error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !shippingInfo.name || !shippingInfo.address1) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    orderMutation.mutate();
  };

  const handleReset = () => {
    setOrderSuccess(false);
    setSelectedProduct(null);
    setQuantity(1);
    setShippingInfo({
      name: '',
      phone: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
    });
  };

  if (orderSuccess) {
    return (
      <MerchantLayout title="Order Cards" subtitle="Purchase physical BitCards">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">Order Submitted!</h2>
            <p className="mt-2 text-center text-muted-foreground">
              Your order for {quantity}x {selectedProductData?.name} has been placed.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              You'll receive tracking information once your order ships.
            </p>
            <Button onClick={handleReset} className="mt-6">
              Place Another Order
            </Button>
          </CardContent>
        </Card>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout title="Order Cards" subtitle="Purchase physical BitCards">
      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        {/* Product Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Product</CardTitle>
            <CardDescription>Choose a card pack to order</CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4">
                {products?.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProduct(product.id)}
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      selectedProduct === product.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="h-8 w-8 text-primary" />
                        <div>
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {product.pack_size} cards per pack
                          </p>
                          {product.notes && (
                            <p className="text-xs text-muted-foreground">{product.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">${Number(product.price_usd).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">per pack</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedProduct && (
              <div className="mt-4 flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-16 text-center text-xl font-semibold">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Information */}
        {selectedProduct && (
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
              <CardDescription>Where should we deliver your cards?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Recipient Name *</Label>
                  <Input
                    id="name"
                    value={shippingInfo.name}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address1">Address Line 1 *</Label>
                <Input
                  id="address1"
                  value={shippingInfo.address1}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, address1: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address2">Address Line 2</Label>
                <Input
                  id="address2"
                  value={shippingInfo.address2}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, address2: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={shippingInfo.state}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code *</Label>
                  <Input
                    id="zip"
                    value={shippingInfo.zip}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, zip: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Summary */}
        {selectedProduct && (
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {selectedProductData?.name} x {quantity}
                  </span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <Button
                type="submit"
                className="mt-4 w-full"
                size="lg"
                disabled={orderMutation.isPending}
              >
                {orderMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Order...
                  </>
                ) : (
                  'Submit Order'
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </form>
    </MerchantLayout>
  );
};

export default MerchantOrderCards;
