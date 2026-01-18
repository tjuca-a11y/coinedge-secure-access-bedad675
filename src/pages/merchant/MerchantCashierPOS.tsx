import React, { useState, useRef, useEffect } from 'react';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { Scan, DollarSign, CheckCircle, Loader2, Camera, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaymentMethodToggle } from '@/components/merchant/PaymentMethodToggle';
import { CommissionDisplay, CommissionSuccess } from '@/components/merchant/CommissionDisplay';
import { usePosFeeCalculation, formatCurrency, type PaymentMethod } from '@/hooks/useFeeCalculation';
import { useSquarePayment } from '@/hooks/useSquarePayment';

const MerchantCashierPOS: React.FC = () => {
  const { merchant, merchantUser, wallet, refreshMerchantData } = useMerchantAuth();
  const [amount, setAmount] = useState('');
  const [bitcardId, setBitcardId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [earnedCommission, setEarnedCommission] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const baseAmount = parseFloat(amount) || 0;
  const cashBalance = wallet?.cash_credit_balance ?? 0;
  
  const cardFees = usePosFeeCalculation(baseAmount, 'CARD');
  const cashFees = usePosFeeCalculation(baseAmount, 'CASH');
  const currentFees = paymentMethod === 'CASH' ? cashFees : cardFees;

  const squarePayment = useSquarePayment({
    onSuccess: () => {
      // Payment completed, finalize activation
      finalizeActivation();
    },
    onError: (error) => {
      toast({ title: 'Payment Failed', description: error, variant: 'destructive' });
    },
  });

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop();
      }
    };
  }, []);

  const extractBitcardId = (payload: string): string | null => {
    if (payload.startsWith('bitcard-')) return payload;
    const urlMatch = payload.match(/card=(bitcard-[a-zA-Z0-9-]+)/);
    if (urlMatch) return urlMatch[1];
    try {
      const json = JSON.parse(payload);
      if (json.bitcard_id) return json.bitcard_id;
    } catch {}
    return null;
  };

  const startScanner = async () => {
    setScannerOpen(true);
    setTimeout(async () => {
      try {
        scannerRef.current = new Html5Qrcode('qr-reader');
        await scannerRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const cardId = extractBitcardId(decodedText);
            if (cardId) {
              setBitcardId(cardId);
              stopScanner();
              toast({ title: 'Card Scanned', description: cardId });
            }
          },
          () => {}
        );
      } catch (err) {
        console.error('Scanner error:', err);
        toast({ title: 'Scanner Error', description: 'Could not start camera', variant: 'destructive' });
        setScannerOpen(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setScannerOpen(false);
  };

  const finalizeActivation = async () => {
    if (!merchant?.id || !merchantUser?.id) return;
    
    const amountNum = parseFloat(amount);
    const commission = currentFees.merchantFee;
    
    try {
      // Get bitcard
      const { data: card, error: cardError } = await supabase
        .from('bitcards')
        .select('*')
        .eq('bitcard_id', bitcardId)
        .eq('merchant_id', merchant.id)
        .maybeSingle();

      if (cardError || !card) throw new Error('Card not found');
      if (card.status !== 'issued') throw new Error('Card already activated or invalid');

      // Create activation event with payment info
      const { data: event, error: eventError } = await supabase
        .from('bitcard_activation_events')
        .insert({
          merchant_id: merchant.id,
          bitcard_id: card.id,
          usd_value: amountNum,
          activated_by_merchant_user_id: merchantUser.id,
          payment_method: paymentMethod,
          customer_amount_paid: currentFees.customerPays,
          merchant_commission_usd: commission,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Update bitcard status
      await supabase
        .from('bitcards')
        .update({
          usd_value: amountNum,
          status: 'active',
          activated_at: new Date().toISOString(),
          activated_by_merchant_user_id: merchantUser.id,
        })
        .eq('id', card.id);

      // Create ledger entries based on payment method
      if (paymentMethod === 'CASH') {
        // Deduct base amount from cash credit
        await supabase.from('merchant_wallet_ledger').insert({
          merchant_id: merchant.id,
          type: 'CASH_SALE_DEBIT',
          amount_usd: -amountNum,
          reference: event.id,
          created_by_merchant_user_id: merchantUser.id,
        });
      }

      // Credit merchant commission
      const commissionType = paymentMethod === 'CASH' ? 'MERCHANT_COMMISSION_CASH' : 'MERCHANT_COMMISSION_CARD';
      await supabase.from('merchant_wallet_ledger').insert({
        merchant_id: merchant.id,
        type: commissionType,
        amount_usd: commission,
        reference: event.id,
        created_by_merchant_user_id: merchantUser.id,
      });

      setEarnedCommission(commission);
      setActivationSuccess(true);
      await refreshMerchantData();
      queryClient.invalidateQueries({ queryKey: ['merchant-ledger'] });
      toast({ title: 'Sale Complete!', description: `You earned ${formatCurrency(commission)}` });
    } catch (error) {
      console.error('Activation error:', error);
      toast({ 
        title: 'Activation Failed', 
        description: error instanceof Error ? error.message : 'Unknown error', 
        variant: 'destructive' 
      });
    }
  };

  const handleActivate = async () => {
    if (!merchant?.id || !merchantUser?.id) {
      toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast({ title: 'Error', description: 'Invalid amount', variant: 'destructive' });
      return;
    }

    if (paymentMethod === 'CASH') {
      if (cashBalance < amountNum) {
        toast({ title: 'Error', description: 'Insufficient cash credit', variant: 'destructive' });
        return;
      }
      // Direct activation for cash
      await finalizeActivation();
    } else {
      // Card payment - initiate Square
      await squarePayment.createPayment(amountNum, bitcardId);
    }
  };

  const handleReset = () => {
    setActivationSuccess(false);
    setAmount('');
    setBitcardId('');
    setPaymentMethod('CARD');
    setEarnedCommission(0);
    squarePayment.reset();
  };

  // Success screen
  if (activationSuccess) {
    return (
      <MerchantLayout title="POS Terminal">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="h-20 w-20 text-green-500 mb-6" />
            <h2 className="text-3xl font-bold mb-6">Sale Complete!</h2>
            <CommissionSuccess commission={earnedCommission} paymentMethod={paymentMethod} />
            <Button onClick={handleReset} size="lg" className="mt-8 w-full">
              New Sale
            </Button>
          </CardContent>
        </Card>
      </MerchantLayout>
    );
  }

  // Payment in progress
  if (squarePayment.status !== 'IDLE' && squarePayment.status !== 'FAILED') {
    return (
      <MerchantLayout title="POS Terminal">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
            <h2 className="text-2xl font-bold mb-2">
              {squarePayment.status === 'CREATING' && 'Starting payment...'}
              {squarePayment.status === 'PENDING' && 'Waiting for customer tap...'}
              {squarePayment.status === 'POLLING' && 'Waiting for customer tap...'}
            </h2>
            <p className="text-muted-foreground mb-4">
              Customer pays: {formatCurrency(squarePayment.customerPays || currentFees.customerPays)}
            </p>
            <Button variant="outline" onClick={() => { squarePayment.cancelPayment(); handleReset(); }}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout title="POS Terminal">
      <div className="mx-auto max-w-md space-y-4">
        {/* Cash Credit Balance */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-medium">Cash Credit</span>
            </div>
            <span className="text-lg font-bold">{formatCurrency(cashBalance)}</span>
          </CardContent>
        </Card>

        {/* Amount Input */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">BTC Amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-16 text-3xl font-bold"
                min="0"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 100, 250].map((preset) => (
                <Button
                  key={preset}
                  variant={amount === String(preset) ? 'default' : 'outline'}
                  size="lg"
                  className="h-12 text-lg font-semibold"
                  onClick={() => setAmount(String(preset))}
                >
                  ${preset}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card ID Input */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Scan className="h-6 w-6 text-primary" />
              <Input
                placeholder="Scan or enter card ID"
                value={bitcardId}
                onChange={(e) => setBitcardId(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={startScanner}>
                <Camera className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customer Pays */}
        {baseAmount > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                <span>BTC Voucher Value</span>
                <span>{formatCurrency(baseAmount)}</span>
              </div>
              {paymentMethod === 'CARD' && currentFees.squareProcessing > 0 && (
                <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                  <span>Square Processing (2.6% + 15¢)</span>
                  <span>{formatCurrency(currentFees.squareProcessing)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                <span>Customer Pays</span>
                <span>{formatCurrency(currentFees.customerPays)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commission Display */}
        {baseAmount > 0 && (
          <CommissionDisplay 
            commission={currentFees.merchantFee} 
            paymentMethod={paymentMethod} 
          />
        )}

        {/* Payment Method Selection */}
        {baseAmount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethodToggle
                value={paymentMethod}
                onChange={setPaymentMethod}
                cashBalance={cashBalance}
                baseAmount={baseAmount}
                cardCommission={cardFees.merchantFee}
                cashCommission={cashFees.merchantFee}
                disabled={squarePayment.status !== 'IDLE'}
              />
            </CardContent>
          </Card>
        )}

        {/* Complete Sale Button */}
        <Button
          onClick={handleActivate}
          disabled={!amount || !bitcardId || squarePayment.status !== 'IDLE'}
          size="lg"
          className="h-16 w-full text-xl"
        >
          {paymentMethod === 'CASH' ? 'Complete Cash Sale' : 'Start Card Payment'}
        </Button>

        {squarePayment.error && (
          <p className="text-center text-sm text-destructive">{squarePayment.error}</p>
        )}
      </div>

      {/* Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={(open) => !open && stopScanner()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <div id="qr-reader" className="w-full" />
          <Button variant="outline" onClick={stopScanner}>Cancel</Button>
        </DialogContent>
      </Dialog>
    </MerchantLayout>
  );
};

export default MerchantCashierPOS;
