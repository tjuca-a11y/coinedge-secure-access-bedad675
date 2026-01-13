import React, { useState } from 'react';
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DynamicLoginFormProps {
  showEmailFallback?: boolean;
}

export const DynamicLoginForm: React.FC<DynamicLoginFormProps> = ({ 
  showEmailFallback = true 
}) => {
  const { setShowAuthFlow, user } = useDynamicContext();
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Welcome to CoinEdge</CardTitle>
        <CardDescription>
          Connect your wallet to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dynamic Wallet Connect */}
        <div className="space-y-4">
          <DynamicWidget
            innerButtonComponent={
              <Button className="w-full h-12 text-base" size="lg">
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </Button>
            }
          />
          
          {/* Self-custody messaging */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">You control your private keys.</span>
              {' '}Your wallet is self-custodial – only you have access to your funds.
            </p>
          </div>
        </div>

        {/* Email login fallback */}
        {showEmailFallback && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>

            <Collapsible open={showEmailLogin} onOpenChange={setShowEmailLogin}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  {showEmailLogin ? (
                    <>
                      Hide email login
                      <ChevronUp className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Sign in with email
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <LoginForm />
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  );
};
