import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useKyc, KycFormData } from '@/hooks/useKyc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, XCircle, Upload, User, FileText, Shield } from 'lucide-react';
import { toast } from 'sonner';

type KycStep = 'personal' | 'identity' | 'review' | 'status';

export const KycFlow: React.FC = () => {
  const { profile, isKycApproved, kycStatus, signOut } = useAuth();
  const { loading, error, submitPersonalInfo, submitKycForReview, simulateKycApproval } = useKyc();
  const navigate = useNavigate();

  const [step, setStep] = useState<KycStep>(() => {
    if (kycStatus === 'approved' || kycStatus === 'pending' || kycStatus === 'rejected') {
      return 'status';
    }
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
    country: profile?.country || '',
    phone: profile?.phone || '',
  });

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
      setStep('identity');
    } else if (error) {
      toast.error(error);
    }
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would handle document uploads
    setStep('review');
  };

  const handleReviewSubmit = async () => {
    const success = await submitKycForReview();
    if (success) {
      toast.success('Your verification has been submitted for review.');
      setStep('status');
    } else if (error) {
      toast.error(error);
    }
  };

  // For demo purposes only - simulate KYC approval
  const handleSimulateApproval = async () => {
    const success = await simulateKycApproval();
    if (success) {
      toast.success('KYC approved! Your self-custody wallet has been created.');
      navigate('/');
    } else if (error) {
      toast.error(error);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'personal', label: 'Personal Info', icon: User },
      { id: 'identity', label: 'Identity', icon: FileText },
      { id: 'review', label: 'Review', icon: Shield },
    ];

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((s, index) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isCompleted = 
            (step === 'identity' && index === 0) ||
            (step === 'review' && index < 2) ||
            step === 'status';

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
          <Label htmlFor="state">State/Province</Label>
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
          <Label htmlFor="postal_code">Postal Code</Label>
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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : 'Continue'}
      </Button>
    </form>
  );

  const renderIdentityStep = () => (
    <form onSubmit={handleIdentitySubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Upload Government ID</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a clear photo of your passport, driver's license, or national ID
          </p>
          <Button type="button" variant="outline">
            Choose File
          </Button>
        </div>

        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Take a Selfie</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We'll match your selfie with your ID photo for verification
          </p>
          <Button type="button" variant="outline">
            Take Photo
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => setStep('personal')} className="flex-1">
          Back
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Processing...' : 'Continue'}
        </Button>
      </div>
    </form>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="text-muted-foreground">Name:</span> {formData.full_name}</p>
          <p><span className="text-muted-foreground">Date of Birth:</span> {formData.date_of_birth}</p>
          <p><span className="text-muted-foreground">Phone:</span> {formData.phone}</p>
          <p><span className="text-muted-foreground">Address:</span> {formData.address_line1}, {formData.city}, {formData.state} {formData.postal_code}, {formData.country}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identity Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Documents uploaded successfully</p>
        </CardContent>
      </Card>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          By submitting, you confirm that all information is accurate and agree to our identity verification process. 
          Your self-custody wallet will be created upon approval. <strong>You control your keys — CoinEdge cannot access your funds.</strong>
        </p>
      </div>

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => setStep('identity')} className="flex-1">
          Back
        </Button>
        <Button onClick={handleReviewSubmit} className="flex-1" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit for Review'}
        </Button>
      </div>
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
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
      return (
        <div className="text-center space-y-6">
          <XCircle className="w-16 h-16 mx-auto text-destructive" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Verification Failed</h2>
            <p className="text-muted-foreground mt-2">
              {profile?.kyc_rejection_reason || 'Your verification could not be completed. Please contact support.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => setStep('personal')}>
            Try Again
          </Button>
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
            Complete identity verification to unlock your CoinEdge wallet and redeem vouchers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step !== 'status' && renderStepIndicator()}
          {step === 'personal' && renderPersonalStep()}
          {step === 'identity' && renderIdentityStep()}
          {step === 'review' && renderReviewStep()}
          {step === 'status' && renderStatusStep()}
        </CardContent>
      </Card>
    </div>
  );
};
