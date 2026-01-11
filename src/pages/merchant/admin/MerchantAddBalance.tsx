import React, { useState } from 'react';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, CheckCircle, Loader2 } from 'lucide-react';

const presetAmounts = [50, 100, 250, 500, 1000];

const MerchantAddBalance: React.FC = () => {
  const { merchant, merchantUser, refreshMerchantData, wallet } = useMerchantAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const amount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : 0);

  const addBalanceMutation = useMutation({
    mutationFn: async (amountUsd: number) => {
      if (!merchant?.id || !merchantUser?.id) throw new Error('Not authenticated');

      // Create square payment record (mock - status PAID immediately for testing)
      const { data: payment, error: paymentError } = await supabase
        .from('square_payments')
        .insert({
          merchant_id: merchant.id,
          amount_usd: amountUsd,
          status: 'PAID',
          square_payment_id: `mock-${Date.now()}`,
          created_by_merchant_user_id: merchantUser.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create ledger entry (trigger will update wallet balance)
      const { error: ledgerError } = await supabase
        .from('merchant_wallet_ledger')
        .insert({
          merchant_id: merchant.id,
          type: 'TOPUP',
          amount_usd: amountUsd,
          reference: payment.id,
          created_by_merchant_user_id: merchantUser.id,
        });

      if (ledgerError) throw ledgerError;

      return payment;
    },
    onSuccess: async () => {
      setPaymentSuccess(true);
      await refreshMerchantData();
      queryClient.invalidateQueries({ queryKey: ['merchant-ledger'] });
      toast({
        title: 'Balance Added',
        description: `$${amount.toFixed(2)} has been added to your account`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
      console.error('Payment error:', error);
    },
  });

  const handleSubmit = () => {
    if (amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }
    addBalanceMutation.mutate(amount);
  };

  const handleReset = () => {
    setPaymentSuccess(false);
    setSelectedAmount(null);
    setCustomAmount('');
  };

  if (paymentSuccess) {
    return (
      <MerchantLayout title="Add Balance" subtitle="Top up your merchant account">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">Payment Successful!</h2>
            <p className="mt-2 text-muted-foreground">
              ${amount.toFixed(2)} has been added to your balance
            </p>
            <p className="mt-4 text-lg font-semibold">
              New Balance: ${wallet?.balance_usd?.toFixed(2) ?? '0.00'}
            </p>
            <Button onClick={handleReset} className="mt-6">
              Add More Balance
            </Button>
          </CardContent>
        </Card>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout title="Add Balance" subtitle="Top up your merchant account">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Select Amount</CardTitle>
            <CardDescription>
              Current Balance: ${wallet?.balance_usd?.toFixed(2) ?? '0.00'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset Amounts */}
            <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
              {presetAmounts.map((preset) => (
                <Button
                  key={preset}
                  variant={selectedAmount === preset ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedAmount(preset);
                    setCustomAmount('');
                  }}
                  className="h-16 text-lg font-semibold"
                >
                  ${preset}
                </Button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <Label htmlFor="customAmount">Or enter custom amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="customAmount"
                  type="number"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  className="pl-10 text-lg"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Summary */}
            {amount > 0 && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount to Add</span>
                  <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Pay Button */}
            <Button
              onClick={handleSubmit}
              disabled={amount <= 0 || addBalanceMutation.isPending}
              className="w-full"
              size="lg"
            >
              {addBalanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay with Square (Mock)</>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Note: This is a mock payment for testing. Square integration coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
};

export default MerchantAddBalance;
