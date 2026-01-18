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
import { DollarSign, CheckCircle, Loader2, AlertCircle, Wallet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSquarePayment } from '@/hooks/useSquarePayment';
import { formatCurrency } from '@/hooks/useFeeCalculation';

const SETUP_FEE = 50;
const MIN_INITIAL_CASH_CREDIT = 100;

const MerchantAddBalance: React.FC = () => {
  const { merchant, merchantUser, refreshMerchantData, wallet } = useMerchantAuth();
  const [customAmount, setCustomAmount] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [addedAmount, setAddedAmount] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isInitialFunding = !merchant?.is_initially_funded;
  const cashCreditAmount = customAmount ? parseFloat(customAmount) : 0;
  const totalPayment = isInitialFunding ? cashCreditAmount + SETUP_FEE : cashCreditAmount;

  const squarePayment = useSquarePayment({
    onSuccess: async () => {
      await processBalanceAddition();
    },
    onError: (error) => {
      toast({ title: 'Payment Failed', description: error, variant: 'destructive' });
    },
  });

  const processBalanceAddition = async () => {
    if (!merchant?.id || !merchantUser?.id) return;

    try {
      if (isInitialFunding) {
        // Initial funding - add cash credit and mark as funded
        await supabase.from('merchant_wallet_ledger').insert({
          merchant_id: merchant.id,
          type: 'INITIAL_FUNDING',
          amount_usd: cashCreditAmount,
          reference: `initial-funding-${Date.now()}`,
          created_by_merchant_user_id: merchantUser.id,
        });

        // Update merchant as initially funded
        await supabase
          .from('merchants')
          .update({
            is_initially_funded: true,
            initial_funding_date: new Date().toISOString(),
          })
          .eq('id', merchant.id);

        // Update cash credit balance directly
        await supabase
          .from('merchant_wallets')
          .update({
            cash_credit_balance: (wallet?.cash_credit_balance ?? 0) + cashCreditAmount,
          })
          .eq('merchant_id', merchant.id);

        // Credit sales rep bonus from setup fee
        if (merchant.rep_id) {
          await supabase.from('commission_ledger').insert({
            commission_id: `bonus-${Date.now()}`,
            rep_id: merchant.rep_id,
            merchant_id: merchant.id,
            card_value_usd: 0,
            activation_fee_usd: 0,
            rep_commission_usd: SETUP_FEE,
            coinedge_revenue_usd: 0,
            status: 'accrued',
          });
        }

        setAddedAmount(cashCreditAmount);
      } else {
        // Regular top-up - add to cash credit
        await supabase.from('merchant_wallet_ledger').insert({
          merchant_id: merchant.id,
          type: 'TOPUP',
          amount_usd: cashCreditAmount,
          reference: `topup-${Date.now()}`,
          created_by_merchant_user_id: merchantUser.id,
        });

        // Update cash credit balance
        await supabase
          .from('merchant_wallets')
          .update({
            cash_credit_balance: (wallet?.cash_credit_balance ?? 0) + cashCreditAmount,
          })
          .eq('merchant_id', merchant.id);

        setAddedAmount(cashCreditAmount);
      }

      setPaymentSuccess(true);
      await refreshMerchantData();
      queryClient.invalidateQueries({ queryKey: ['merchant-ledger'] });
      toast({
        title: 'Payment Successful!',
        description: `${formatCurrency(cashCreditAmount)} cash credit added`,
      });
    } catch (error) {
      console.error('Balance addition error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Mock payment for now - will use Square when integrated
  const addBalanceMutation = useMutation({
    mutationFn: async () => {
      if (!merchant?.id || !merchantUser?.id) throw new Error('Not authenticated');

      // Create square payment record (mock)
      const { error: paymentError } = await supabase
        .from('square_payments')
        .insert({
          merchant_id: merchant.id,
          amount_usd: totalPayment,
          status: 'PAID',
          square_payment_id: `mock-${Date.now()}`,
          created_by_merchant_user_id: merchantUser.id,
        });

      if (paymentError) throw paymentError;

      await processBalanceAddition();
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
    if (cashCreditAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }
    if (isInitialFunding && cashCreditAmount < MIN_INITIAL_CASH_CREDIT) {
      toast({
        title: 'Minimum Required',
        description: `Minimum initial cash credit is ${formatCurrency(MIN_INITIAL_CASH_CREDIT)}`,
        variant: 'destructive',
      });
      return;
    }
    addBalanceMutation.mutate();
  };

  const handleReset = () => {
    setPaymentSuccess(false);
    setCustomAmount('');
    setAddedAmount(0);
    squarePayment.reset();
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
              {formatCurrency(addedAmount)} has been added to your cash credit
            </p>
            <p className="mt-4 text-lg font-semibold">
              Cash Credit: {formatCurrency(wallet?.cash_credit_balance ?? 0)}
            </p>
            <Button onClick={handleReset} className="mt-6">
              Add More Balance
            </Button>
          </CardContent>
        </Card>
      </MerchantLayout>
    );
  }

  // Initial Funding Required
  if (isInitialFunding) {
    return (
      <MerchantLayout title="Initial Setup" subtitle="Complete your merchant setup">
        <div className="mx-auto max-w-2xl">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Initial Funding Required</AlertTitle>
            <AlertDescription>
              Choose how much cash credit you want to start with. A one-time {formatCurrency(SETUP_FEE)} setup fee will be added.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Initial Funding</CardTitle>
              <CardDescription>
                This payment activates your account and provides cash credit for sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cash Credit Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="initialAmount">Starting Cash Credit</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="initialAmount"
                    type="number"
                    placeholder={`Minimum ${formatCurrency(MIN_INITIAL_CASH_CREDIT)}`}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-10 text-lg h-14"
                    min={MIN_INITIAL_CASH_CREDIT}
                    step="0.01"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Minimum: {formatCurrency(MIN_INITIAL_CASH_CREDIT)}
                </p>
              </div>

              {/* Breakdown */}
              {cashCreditAmount > 0 && (
                <div className="rounded-lg bg-muted p-4 space-y-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      <span>Your Cash Credit</span>
                    </div>
                    <span>{formatCurrency(cashCreditAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>One-Time Setup Fee</span>
                    <span>{formatCurrency(SETUP_FEE)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-medium">Total Payment</span>
                    <span className="font-bold text-lg">{formatCurrency(totalPayment)}</span>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  What you get:
                </h4>
                <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                  <li>• Your chosen cash credit for cash sales</li>
                  <li>• 5% commission on cash sales</li>
                  <li>• 2% commission on card sales</li>
                  <li>• Access to POS terminal</li>
                </ul>
              </div>

              {/* Pay Button */}
              <Button
                onClick={handleSubmit}
                disabled={cashCreditAmount < MIN_INITIAL_CASH_CREDIT || addBalanceMutation.isPending}
                className="w-full"
                size="lg"
              >
                {addBalanceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Pay {formatCurrency(totalPayment)} to Activate</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout title="Add Balance" subtitle="Top up your cash credit">
      <div className="mx-auto max-w-2xl">
        <Card className="mb-4 bg-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-medium">Current Cash Credit</span>
            </div>
            <span className="text-lg font-bold">{formatCurrency(wallet?.cash_credit_balance ?? 0)}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Cash Credit</CardTitle>
            <CardDescription>
              Add any amount to your cash credit. Used for cash sales, earning you 5% commission per sale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="customAmount">Amount to Add</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="customAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-10 text-lg h-14"
                  min="1"
                  step="0.01"
                />
              </div>
            </div>

            {/* Summary */}
            {cashCreditAmount > 0 && (
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount to Add</span>
                  <span className="text-2xl font-bold">{formatCurrency(cashCreditAmount)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  New Cash Credit: {formatCurrency((wallet?.cash_credit_balance ?? 0) + cashCreditAmount)}
                </p>
              </div>
            )}

            {/* Pay Button */}
            <Button
              onClick={handleSubmit}
              disabled={cashCreditAmount <= 0 || addBalanceMutation.isPending}
              className="w-full"
              size="lg"
            >
              {addBalanceMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Add {formatCurrency(cashCreditAmount)} to Cash Credit</>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Note: Square payment integration coming soon. Currently using mock payments for testing.
            </p>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
};

export default MerchantAddBalance;
