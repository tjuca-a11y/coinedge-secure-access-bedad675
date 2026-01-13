import React, { useState } from 'react';
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Shield, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { SignUpForm } from './SignUpForm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';

interface DynamicSignUpFormProps {
  showEmailFallback?: boolean;
}

export const DynamicSignUpForm: React.FC<DynamicSignUpFormProps> = ({ 
  showEmailFallback = true 
}) => {
  const { setShowAuthFlow } = useDynamicContext();
  const [showEmailSignUp, setShowEmailSignUp] = useState(false);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Create Your Wallet</CardTitle>
        <CardDescription>
          Get your self-custodial Bitcoin & USDC wallet in seconds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
            <Shield className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-xs font-medium">Self-Custodial</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
            <Zap className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-xs font-medium">Instant Setup</span>
          </div>
        </div>

        {/* Dynamic Wallet Connect */}
        <div className="space-y-4">
          <DynamicWidget
            innerButtonComponent={
              <Button className="w-full h-12 text-base" size="lg">
                <Wallet className="mr-2 h-5 w-5" />
                Create Wallet
              </Button>
            }
          />
          
          {/* Self-custody messaging */}
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">
                Your keys, your crypto
              </p>
              <p className="text-xs text-muted-foreground">
                We never have access to your private keys. You maintain full control over your assets.
              </p>
            </div>
          </div>
        </div>

        {/* Email signup fallback */}
        {showEmailFallback && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  or sign up with email
                </span>
              </div>
            </div>

            <Collapsible open={showEmailSignUp} onOpenChange={setShowEmailSignUp}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  {showEmailSignUp ? (
                    <>
                      Hide email signup
                      <ChevronUp className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Sign up with email
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <SignUpForm />
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have a wallet?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};
