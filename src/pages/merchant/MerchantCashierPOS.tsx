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
import { Scan, DollarSign, CheckCircle, Loader2, Camera, Wallet, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFeeCalculation, formatCurrency, FEE_RATES } from '@/hooks/useFeeCalculation';

const MerchantCashierPOS: React.FC = () => {
  const { merchant, merchantUser, wallet, refreshMerchantData } = useMerchantAuth();
  const [amount, setAmount] = useState('');
  const [bitcardId, setBitcardId] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const baseAmount = parseFloat(amount) || 0;
  const cashBalance = wallet?.cash_credit_balance ?? 0;
  const fees = useFeeCalculation(baseAmount);
  const canActivate = baseAmount > 0 && baseAmount <= cashBalance && bitcardId;

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

  const handleActivate = async () => {
    if (!merchant?.id || !merchantUser?.id) {
      toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
      return;
    }

    if (baseAmount <= 0) {
      toast({ title: 'Error', description: 'Invalid amount', variant: 'destructive' });
      return;
    }

    if (cashBalance < baseAmount) {
      toast({ title: 'Error', description: 'Insufficient cash credit', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

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

      // Create activation event
      const { data: event, error: eventError } = await supabase
        .from('bitcard_activation_events')
        .insert({
          merchant_id: merchant.id,
          bitcard_id: card.id,
          usd_value: baseAmount,
          activated_by_merchant_user_id: merchantUser.id,
          payment_method: 'CASH', // All activations use merchant credit now
          customer_amount_paid: baseAmount, // Customer pays exact face value
          merchant_commission_usd: fees.merchantCommission, // 4% earned at redemption
          redemption_fee_rate: FEE_RATES.MERCHANT + FEE_RATES.SALES_REP + FEE_RATES.COINEDGE,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Update bitcard status
      await supabase
        .from('bitcards')
        .update({
          usd_value: baseAmount,
          status: 'active',
          activated_at: new Date().toISOString(),
          activated_by_merchant_user_id: merchantUser.id,
        })
        .eq('id', card.id);

      // Deduct from merchant's cash credit
      await supabase.from('merchant_wallet_ledger').insert({
        merchant_id: merchant.id,
        type: 'ACTIVATION_DEBIT',
        amount_usd: -baseAmount,
        reference: event.id,
        created_by_merchant_user_id: merchantUser.id,
      });

      // Update cash credit balance
      await supabase
        .from('merchant_wallets')
        .update({
          cash_credit_balance: cashBalance - baseAmount,
        })
        .eq('merchant_id', merchant.id);

      setActivationSuccess(true);
      await refreshMerchantData();
      queryClient.invalidateQueries({ queryKey: ['merchant-ledger'] });
      toast({ 
        title: 'Card Activated!', 
        description: `$${baseAmount} card activated. You'll earn ${formatCurrency(fees.merchantCommission)} (4%) when customer redeems.` 
      });
    } catch (error) {
      console.error('Activation error:', error);
      toast({ 
        title: 'Activation Failed', 
        description: error instanceof Error ? error.message : 'Unknown error', 
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setActivationSuccess(false);
    setAmount('');
    setBitcardId('');
    setIsProcessing(false);
  };

  // Success screen
  if (activationSuccess) {
    return (
      <MerchantLayout title="POS Terminal">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="h-20 w-20 text-green-500 mb-6" />
            <h2 className="text-3xl font-bold mb-4">Card Activated!</h2>
            <p className="text-muted-foreground text-center mb-2">
              {bitcardId} activated for {formatCurrency(baseAmount)}
            </p>
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4 text-center">
              <p className="text-sm text-green-700 dark:text-green-300">
                You'll earn <strong>{formatCurrency(fees.merchantCommission)}</strong> (4%) when this card is redeemed
              </p>
            </div>
            <Button onClick={handleReset} size="lg" className="mt-8 w-full">
              New Sale
            </Button>
          </CardContent>
        </Card>
      </MerchantLayout>
    );
  }

  // Processing
  if (isProcessing) {
    return (
      <MerchantLayout title="POS Terminal">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
            <h2 className="text-2xl font-bold">Processing...</h2>
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
            <CardTitle className="text-base">Card Value (USD)</CardTitle>
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

        {/* Summary */}
        {baseAmount > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Customer Pays</span>
                <span className="text-xl font-bold">{formatCurrency(baseAmount)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p>At redemption, you'll earn <strong className="text-green-600">{formatCurrency(fees.merchantCommission)}</strong> (4%)</p>
                    <p className="text-xs mt-1">Customer receives ~{formatCurrency(fees.netBtcValue)} in BTC value</p>
                  </div>
                </div>
              </div>
              {baseAmount > cashBalance && (
                <div className="text-sm text-destructive">
                  Insufficient cash credit. Add more balance to continue.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Activate Button */}
        <Button
          onClick={handleActivate}
          disabled={!canActivate || isProcessing}
          size="lg"
          className="h-16 w-full text-xl"
        >
          Activate Card
        </Button>
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
