import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { KycBanner } from '@/components/kyc/KycBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Bitcoin, DollarSign, Send, Download, Gift, ArrowUpDown } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, profile, signOut, isKycApproved } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">CoinEdge</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <KycBanner />

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Wallet</h2>
          <p className="text-muted-foreground">
            {isKycApproved 
              ? 'Manage your Bitcoin and USDC balances' 
              : 'Complete KYC to access your self-custody wallet'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button disabled={!isKycApproved} className="gap-2">
            <Send className="w-4 h-4" />
            Send
          </Button>
          <Button variant="outline" disabled={!isKycApproved} className="gap-2">
            <Download className="w-4 h-4" />
            Receive
          </Button>
          <Button variant="outline" disabled={!isKycApproved} className="gap-2">
            <ArrowUpDown className="w-4 h-4" />
            Pay & Request
          </Button>
          <Button disabled={!isKycApproved} className="gap-2 bg-purple-600 hover:bg-purple-700">
            <Gift className="w-4 h-4" />
            Redeem
          </Button>
        </div>

        {/* Asset Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <Bitcoin className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Bitcoin (BTC)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isKycApproved && profile?.btc_address ? (
                <>
                  <p className="text-2xl font-bold">0.00000000 BTC</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Address: <span className="font-mono text-xs">{profile.btc_address.substring(0, 20)}...</span>
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Complete KYC to view your BTC address</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">USD Coin (USDC)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isKycApproved && profile?.usdc_address ? (
                <>
                  <p className="text-2xl font-bold">$0.00 USDC</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Address: <span className="font-mono text-xs">{profile.usdc_address.substring(0, 20)}...</span>
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Complete KYC to view your USDC address</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Self-custody notice */}
        {isKycApproved && (
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              <strong>Self-custody wallet.</strong> You control your private keys. CoinEdge cannot access your funds.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
