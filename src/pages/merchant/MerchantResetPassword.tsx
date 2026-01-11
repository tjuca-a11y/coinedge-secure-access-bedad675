import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMerchantAuth } from '@/contexts/MerchantAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

const MerchantResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { merchantUser, refreshMerchantData, isMerchantAdmin } = useMerchantAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Update password in Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({
      password: password,
    });

    if (authError) {
      toast({
        title: 'Error',
        description: 'Failed to update password',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Update must_reset_password flag
    if (merchantUser) {
      const { error: updateError } = await supabase
        .from('merchant_users')
        .update({ must_reset_password: false })
        .eq('id', merchantUser.id);

      if (updateError) {
        console.error('Error updating merchant user:', updateError);
      }
    }

    await refreshMerchantData();

    toast({
      title: 'Password Updated',
      description: 'Your password has been changed successfully',
    });

    // Redirect based on role
    if (isMerchantAdmin) {
      navigate('/merchant/admin/dashboard');
    } else {
      navigate('/merchant/cashier');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>Please set a new password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Set New Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MerchantResetPassword;
