import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink as usePlaidLinkSDK, PlaidLinkOnSuccess, PlaidLinkOptions } from 'react-plaid-link';
import { useAuth } from '@/contexts/AuthContext';
import { useKyc, KycFormData } from '@/hooks/useKyc';
import { usePlaidLink } from '@/hooks/usePlaidLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, XCircle, Shield, User, CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type KycStep = 'personal' | 'identity' | 'bank' | 'status';

export const KycFlow: React.FC = () => {
  const { profile, isKycApproved, kycStatus, signOut } = useAuth();
  const {
    loading,
    error,
    plaidLinkToken,
    identityVerificationId,
    cooldownInfo,
    submitPersonalInfo,
    createIdentityVerificationToken,
    handleVerificationComplete,
    simulateKycApproval,
    clearPlaidTokens,
    initiateRetry,
  } = useKyc();
  const { openPlaidLink: openBankLink, isLoading: isBankLinkLoading } = usePlaidLink();
  const navigate = useNavigate();

  const [step, setStep] = useState<KycStep>(() => {
    if (kycStatus === 'approved') return 'status';
    if (kycStatus === 'pending') return 'status';
    if (kycStatus === 'rejected') return 'status';
    return 'personal';
  });

  const [formData, setFormData] = useState<KycFormData>({
    full_name: profile?.full_name || '',
    date_of_birth: profile?.date_of_birth || '',
    address_line1: profile?.address_line1 || '',
    address_line2: profile?.address_line2 || '',
    city: profile?.city || '',
    state: profile?.state || '',
    postal_code: profile?.postal_code || '',
    country: profile?.country || 'US',
    phone: profile?.phone || '',
  });

  const [isPlaidIdentityOpen, setIsPlaidIdentityOpen] = useState(false);
  const [verificationStarted, setVerificationStarted] = useState(false);
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState<string>('');

  // Cooldown timer effect
  useEffect(() => {
    if (!cooldownInfo.isInCooldown) {
      setCooldownTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const remaining = cooldownInfo.retryAvailableAt!.getTime() - now.getTime();
      
      if (remaining <= 0) {
        setCooldownTimeLeft('');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (hours > 0) {
        setCooldownTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setCooldownTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setCooldownTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [cooldownInfo.isInCooldown, cooldownInfo.retryAvailableAt]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitPersonalInfo(formData);
    if (success) {
      // Start Plaid Identity verification
      const tokenCreated = await createIdentityVerificationToken();
      if (tokenCreated) {
        setStep('identity');
      } else if (error) {
        // If Plaid not configured, fall back to demo mode
        toast.info('Plaid not configured. Using demo verification mode.');
        setStep('identity');
      }
    } else if (error) {
      toast.error(error);
    }
  };

  // Handle retry KYC
  const handleRetryKyc = async () => {
    if (cooldownInfo.isInCooldown) {
      toast.error(`Please wait ${cooldownTimeLeft} before retrying`);
      return;
    }

    const success = await initiateRetry();
    if (success) {
      setVerificationStarted(false);
      setStep('personal');
      toast.success('You can now start a new verification attempt');
    } else if (error) {
      toast.error(error);
    }
  };

  // Handle Plaid Identity verification success
  const handlePlaidIdentitySuccess: PlaidLinkOnSuccess = useCallback(async (publicToken, metadata) => {
    console.log('Plaid Identity completed:', metadata);
    setIsPlaidIdentityOpen(false);
    
    // The identity_verification_id should be in the metadata
    const verificationId = identityVerificationId || metadata?.link_session_id;
    
    if (verificationId) {
      const result = await handleVerificationComplete(verificationId);
      
      if (result.success) {
        if (result.status === 'approved') {
          toast.success('Identity verified! Now link your bank account.');
          setStep('bank');
        } else if (result.status === 'rejected') {
          toast.error(result.rejection_reason || 'Verification failed');
          setStep('status');
        } else {
          toast.info('Verification pending review');
          setStep('status');
        }
      }
    }
    
    clearPlaidTokens();
  }, [identityVerificationId, handleVerificationComplete, clearPlaidTokens]);

  // Plaid Identity SDK config
  const plaidIdentityConfig: PlaidLinkOptions = {
    token: plaidLinkToken,
    onSuccess: handlePlaidIdentitySuccess,
    onExit: (err) => {
      if (err) {
        console.log('Plaid Identity exit error:', err);
        toast.error('Verification cancelled. Please try again.');
      }
      setIsPlaidIdentityOpen(false);
      clearPlaidTokens();
    },
  };

  const { open: openPlaidIdentity, ready: plaidIdentityReady } = usePlaidLinkSDK(plaidIdentityConfig);

  // Auto-open Plaid Identity when token is ready
  useEffect(() => {
    if (plaidLinkToken && plaidIdentityReady && step === 'identity' && !verificationStarted) {
      setVerificationStarted(true);
      setIsPlaidIdentityOpen(true);
      openPlaidIdentity();
    }
  }, [plaidLinkToken, plaidIdentityReady, step, verificationStarted, openPlaidIdentity]);

  const handleStartVerification = async () => {
    const tokenCreated = await createIdentityVerificationToken();
    if (!tokenCreated && error) {
      toast.info('Plaid not configured. Using demo mode.');
    }
  };

  // Handle demo mode identity submission
  const handleDemoIdentitySubmit = async () => {
    toast.info('Demo mode: Simulating identity verification...');
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('Demo: Identity verified! Now link your bank account.');
    setStep('bank');
  };

  // Handle bank linking
  const handleLinkBank = async () => {
    await openBankLink();
  };

  // Handle bank linking success
  const handleBankLinkComplete = () => {
    toast.success('Bank account linked successfully!');
    setStep('status');
  };

  // Skip bank linking for now
  const handleSkipBank = () => {
    toast.info('You can link a bank account later from Settings.');
    navigate('/');
  };

  // Demo: Simulate full approval
  const handleSimulateApproval = async () => {
    const success = await simulateKycApproval();
    if (success) {
      toast.success('KYC approved! Your wallet is ready.');
      navigate('/');
    } else if (error) {
      toast.error(error);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'personal', label: 'Personal Info', icon: User },
      { id: 'identity', label: 'Identity', icon: Shield },
      { id: 'bank', label: 'Bank Account', icon: CreditCard },
    ];

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((s, index) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isCompleted =
            (step === 'identity' && index === 0) ||
            (step === 'bank' && index < 2) ||
            (step === 'status' && kycStatus === 'approved');

          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted && !isActive ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs mt-1 text-muted-foreground">{s.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderPersonalStep = () => (
    <form onSubmit={handlePersonalSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Legal Name</Label>
          <Input
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={handleInputChange}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={formData.phone}
          onChange={handleInputChange}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line1">Address Line 1</Label>
        <Input
          id="address_line1"
          name="address_line1"
          value={formData.address_line1}
          onChange={handleInputChange}
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address_line2">Address Line 2 (Optional)</Label>
        <Input
          id="address_line2"
          name="address_line2"
          value={formData.address_line2}
          onChange={handleInputChange}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="state"
            value={formData.state}
            onChange={handleInputChange}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postal_code">ZIP Code</Label>
          <Input
            id="postal_code"
            name="postal_code"
            value={formData.postal_code}
            onChange={handleInputChange}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          Your information will be securely verified through Plaid Identity. This helps protect against fraud and ensures regulatory compliance.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Starting Verification...
          </>
        ) : (
          'Continue to Verification'
        )}
      </Button>
    </form>
  );

  const renderIdentityStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <Shield className="w-16 h-16 mx-auto text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Identity Verification</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Complete identity verification through our secure partner, Plaid.
            You'll be asked to provide a government ID and take a selfie.
          </p>
        </div>
      </div>

      {plaidLinkToken && plaidIdentityReady ? (
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Opening verification window...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Button
            onClick={handleStartVerification}
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              'Start Identity Verification'
            )}
          </Button>

          {/* Demo mode fallback */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Demo mode (Plaid not configured):
            </p>
            <Button
              onClick={handleDemoIdentitySubmit}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Simulate Verification
            </Button>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        onClick={() => setStep('personal')}
        className="w-full"
      >
        Back to Personal Info
      </Button>
    </div>
  );

  const renderBankStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <CreditCard className="w-16 h-16 mx-auto text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Link Your Bank Account</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Connect a bank account to enable cash outs and ACH transfers.
            Your banking credentials are never stored on our servers.
          </p>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Identity Verified</span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-500 mt-1">
          Your identity has been verified. Now connect a bank account to complete setup.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleLinkBank}
          className="w-full"
          disabled={isBankLinkLoading}
        >
          {isBankLinkLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            'Connect Bank Account'
          )}
        </Button>

        <Button
          onClick={handleSkipBank}
          variant="outline"
          className="w-full"
        >
          Skip for Now
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Secured by Plaid. We never see your login credentials.
      </p>
    </div>
  );

  const renderStatusStep = () => {
    if (isKycApproved) {
      return (
        <div className="text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Verification Complete</h2>
            <p className="text-muted-foreground mt-2">
              Your identity has been verified. Your self-custody wallet is ready.
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-300 text-sm">
              <strong>Self-custody wallet created.</strong> You control your private keys. CoinEdge cannot access or move your funds.
            </p>
          </div>
          <Button onClick={() => navigate('/')} className="w-full">
            Go to Wallet
          </Button>
        </div>
      );
    }

    if (kycStatus === 'pending') {
      return (
        <div className="text-center space-y-6">
          <Clock className="w-16 h-16 mx-auto text-amber-500" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Verification Pending</h2>
            <p className="text-muted-foreground mt-2">
              Your documents are being reviewed. This usually takes 1-2 business days.
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-amber-800 dark:text-amber-300 text-sm">
              We'll notify you by email once your verification is complete.
            </p>
          </div>
          {/* Demo button for testing */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">For demo purposes only:</p>
            <Button onClick={handleSimulateApproval} variant="outline" size="sm" disabled={loading}>
              {loading ? 'Processing...' : 'Simulate Approval'}
            </Button>
          </div>
        </div>
      );
    }

    if (kycStatus === 'rejected') {
      const isInCooldown = cooldownInfo.isInCooldown;
      
      return (
        <div className="text-center space-y-6">
          <XCircle className="w-16 h-16 mx-auto text-destructive" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Verification Failed</h2>
            <p className="text-muted-foreground mt-2">
              {profile?.kyc_rejection_reason || 'Your verification could not be completed.'}
            </p>
          </div>

          {/* Cooldown notice */}
          {isInCooldown && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Retry available in: {cooldownTimeLeft}</span>
              </div>
              <p className="text-amber-600 dark:text-amber-500 text-sm mt-2">
                For security purposes, there's a waiting period before you can attempt verification again.
              </p>
            </div>
          )}

          {/* Retry button */}
          <Button 
            variant="outline" 
            onClick={handleRetryKyc}
            disabled={isInCooldown || loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : isInCooldown ? (
              <>
                <Clock className="w-4 h-4" />
                Retry Locked
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Try Again
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            If you believe this is an error, please contact support for assistance.
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Identity Verification</CardTitle>
          <CardDescription>
            Complete identity verification to unlock your CoinEdge wallet and enable all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step !== 'status' && renderStepIndicator()}
          {step === 'personal' && renderPersonalStep()}
          {step === 'identity' && renderIdentityStep()}
          {step === 'bank' && renderBankStep()}
          {step === 'status' && renderStatusStep()}
        </CardContent>
      </Card>
    </div>
  );
};
