import React, { useState } from 'react';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Lock, Loader2, CheckCircle, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

const MerchantSettings: React.FC = () => {
  const { merchant } = useMerchantAuth();
  const { toast } = useToast();
  
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [pinError, setPinError] = useState('');

  const handleChangePIN = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    // Validation
    if (!currentPin || !newPin || !confirmPin) {
      setPinError('All fields are required');
      return;
    }

    if (newPin.length < 4) {
      setPinError('New PIN must be at least 4 digits');
      return;
    }

    if (newPin.length > 6) {
      setPinError('PIN cannot exceed 6 digits');
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setPinError('PIN must contain only numbers');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('New PINs do not match');
      return;
    }

    if (!merchant?.id) {
      setPinError('Merchant not found');
      return;
    }

    setIsUpdating(true);

    try {
      const { data, error } = await supabase.rpc('update_admin_pin', {
        p_merchant_id: merchant.id,
        p_current_pin: currentPin,
        p_new_pin: newPin
      });

      if (error) {
        console.error('PIN update error:', error);
        setPinError('Failed to update PIN');
        return;
      }

      if (data === true) {
        toast({
          title: 'PIN Updated',
          description: 'Your admin PIN has been changed successfully',
        });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setPinError('Current PIN is incorrect');
      }
    } catch (err) {
      console.error('PIN update failed:', err);
      setPinError('Failed to update PIN');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <MerchantLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Merchant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Merchant Information
              </CardTitle>
              <CardDescription>Your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Business Name</Label>
                <p className="font-medium">{merchant?.business_name || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Merchant ID</Label>
                <p className="font-mono text-sm">{merchant?.merchant_id || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <p className="capitalize">{merchant?.status || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Change Admin PIN */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Admin PIN
              </CardTitle>
              <CardDescription>
                Update your admin panel access PIN
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePIN} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPin">Current PIN</Label>
                  <Input
                    id="currentPin"
                    type="password"
                    placeholder="Enter current PIN"
                    value={currentPin}
                    onChange={(e) => {
                      setCurrentPin(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    maxLength={6}
                    className="text-center tracking-widest"
                    disabled={isUpdating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPin">New PIN</Label>
                  <Input
                    id="newPin"
                    type="password"
                    placeholder="Enter new PIN (4-6 digits)"
                    value={newPin}
                    onChange={(e) => {
                      setNewPin(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    maxLength={6}
                    className="text-center tracking-widest"
                    disabled={isUpdating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPin">Confirm New PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    placeholder="Confirm new PIN"
                    value={confirmPin}
                    onChange={(e) => {
                      setConfirmPin(e.target.value.replace(/\D/g, ''));
                      setPinError('');
                    }}
                    maxLength={6}
                    className={cn(
                      "text-center tracking-widest",
                      confirmPin && newPin && confirmPin === newPin && "border-green-500"
                    )}
                    disabled={isUpdating}
                  />
                  {confirmPin && newPin && confirmPin === newPin && (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      PINs match
                    </div>
                  )}
                </div>

                {pinError && (
                  <p className="text-sm text-destructive">{pinError}</p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isUpdating || !currentPin || !newPin || !confirmPin}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update PIN'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default MerchantSettings;
