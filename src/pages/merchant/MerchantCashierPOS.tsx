import React, { useState, useRef, useEffect } from 'react';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { Scan, DollarSign, KeyRound, CheckCircle, Loader2, XCircle, Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MerchantCashierPOS: React.FC = () => {
  const { merchant, merchantUser, wallet, refreshMerchantData } = useMerchantAuth();
  const [amount, setAmount] = useState('');
  const [bitcardId, setBitcardId] = useState('');
  const [pin, setPin] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop();
      }
    };
  }, []);

  const extractBitcardId = (payload: string): string | null => {
    // Plain format: bitcard-1234
    if (payload.startsWith('bitcard-')) return payload;
    // URL format: contains card=bitcard-1234
    const urlMatch = payload.match(/card=(bitcard-[a-zA-Z0-9-]+)/);
    if (urlMatch) return urlMatch[1];
    // JSON format: {"bitcard_id":"bitcard-1234"}
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

  const activateMutation = useMutation({
    mutationFn: async () => {
      if (!merchant?.id || !merchantUser?.id) throw new Error('Not authenticated');
      const amountNum = parseFloat(amount);
      if (amountNum <= 0) throw new Error('Invalid amount');
      if ((wallet?.balance_usd ?? 0) < amountNum) throw new Error('Insufficient balance');

      // Get bitcard
      const { data: card, error: cardError } = await supabase
        .from('bitcards')
        .select('*')
        .eq('bitcard_id', bitcardId)
        .eq('merchant_id', merchant.id)
        .maybeSingle();

      if (cardError || !card) throw new Error('Card not found');
      if (card.status !== 'issued') throw new Error('Card already activated or invalid');
      if (card.usd_value !== null) throw new Error('Card already has a value');

      // Verify PIN (simplified - in production use bcrypt comparison)
      if (card.pin_hash !== pin) throw new Error('Invalid PIN');

      // Log PIN attempt
      await supabase.from('bitcard_pin_attempts').insert({
        merchant_id: merchant.id,
        bitcard_id: card.id,
        success: true,
        attempted_by_merchant_user_id: merchantUser.id,
      });

      // Create activation event
      const { data: event, error: eventError } = await supabase
        .from('bitcard_activation_events')
        .insert({
          merchant_id: merchant.id,
          bitcard_id: card.id,
          usd_value: amountNum,
          activated_by_merchant_user_id: merchantUser.id,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // Update bitcard
      await supabase
        .from('bitcards')
        .update({
          usd_value: amountNum,
          status: 'active',
          activated_at: new Date().toISOString(),
          activated_by_merchant_user_id: merchantUser.id,
        })
        .eq('id', card.id);

      // Create ledger entry (trigger updates wallet)
      await supabase.from('merchant_wallet_ledger').insert({
        merchant_id: merchant.id,
        type: 'ACTIVATION_DEBIT',
        amount_usd: -amountNum,
        reference: event.id,
        created_by_merchant_user_id: merchantUser.id,
      });

      return { amountNum };
    },
    onSuccess: async ({ amountNum }) => {
      setActivationSuccess(true);
      await refreshMerchantData();
      queryClient.invalidateQueries({ queryKey: ['merchant-ledger'] });
      toast({ title: 'Card Activated!', description: `$${amountNum.toFixed(2)} loaded` });
    },
    onError: (error: Error) => {
      // Log failed attempt
      if (merchant?.id && merchantUser?.id) {
        supabase.from('bitcard_pin_attempts').insert({
          merchant_id: merchant.id,
          bitcard_id: null,
          success: false,
          attempted_by_merchant_user_id: merchantUser.id,
        });
      }
      toast({ title: 'Activation Failed', description: 'Invalid card or PIN', variant: 'destructive' });
    },
  });

  const handleReset = () => {
    setActivationSuccess(false);
    setAmount('');
    setBitcardId('');
    setPin('');
  };

  if (activationSuccess) {
    return (
      <MerchantLayout title="POS Terminal">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="h-20 w-20 text-green-500" />
            <h2 className="mt-4 text-3xl font-bold">Activated!</h2>
            <p className="mt-2 text-xl">${parseFloat(amount).toFixed(2)} loaded</p>
            <Button onClick={handleReset} size="lg" className="mt-8 w-full">
              Activate Another Card
            </Button>
          </CardContent>
        </Card>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout title="POS Terminal" subtitle={`Balance: $${wallet?.balance_usd?.toFixed(2) ?? '0.00'}`}>
      <div className="mx-auto max-w-md space-y-6">
        {/* Amount Input */}
        <Card>
          <CardContent className="p-6">
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
            <p className="mt-2 text-center text-sm text-muted-foreground">Enter card value</p>
          </CardContent>
        </Card>

        {/* QR Scanner */}
        <Card>
          <CardContent className="p-6">
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

        {/* PIN Input */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <KeyRound className="h-6 w-6 text-primary" />
              <Input
                type="password"
                placeholder="Enter scratch PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Activate Button */}
        <Button
          onClick={() => activateMutation.mutate()}
          disabled={!amount || !bitcardId || !pin || activateMutation.isPending}
          size="lg"
          className="h-16 w-full text-xl"
        >
          {activateMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Activate Card'}
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
