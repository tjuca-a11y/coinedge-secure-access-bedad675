import React, { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, Download, Gift, Bitcoin, DollarSign, Copy, TrendingUp, TrendingDown, Minus, Building2, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefresh";
import { BuySellBtcModal } from "@/components/wallet/BuySellBtcModal";
import { UsdcActionsModal } from "@/components/wallet/UsdcActionsModal";
import { SwapOrderHistory } from "@/components/wallet/SwapOrderHistory";
import { CashOutModal } from "@/components/wallet/CashOutModal";
import { CashOutHistory } from "@/components/wallet/CashOutHistory";
import { ReceiveModal } from "@/components/wallet/ReceiveModal";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

// Mock account performance data with more realistic values for demo
const accountPerformanceData = [
  { date: "Jan 4", value: 0 },
  { date: "Jan 5", value: 0 },
  { date: "Jan 6", value: 0 },
  { date: "Jan 7", value: 0 },
  { date: "Jan 8", value: 0 },
  { date: "Jan 9", value: 0 },
  { date: "Jan 10", value: 0 },
];

// Performance calculations helper
const calculatePerformance = (data: typeof accountPerformanceData) => {
  if (data.length < 2) return { change: 0, percentage: 0, isPositive: true, isZero: true };
  const firstValue = data[0].value;
  const lastValue = data[data.length - 1].value;
  const change = lastValue - firstValue;
  const percentage = firstValue > 0 ? (change / firstValue) * 100 : 0;
  return {
    change,
    percentage,
    isPositive: change >= 0,
    isZero: change === 0 && firstValue === 0,
  };
};

// Mock current BTC price
const currentBtcPrice = 93327.91;

const Wallet: React.FC = () => {
  const { profile: supabaseProfile, isKycApproved: supabaseKycApproved } = useAuth();
  const { 
    isConnected, 
    btcWallet, 
    ethWallet, 
    btcBalance, 
    usdcBalance, 
    refreshBalances,
    isLoading: walletLoading,
    isWalletInitializing,
    syncedProfile,
    isAuthenticated: isDynamicAuthenticated
  } = useDynamicWallet();
  
  const navigate = useNavigate();
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [buySellModalOpen, setBuySellModalOpen] = useState(false);
  const [usdcActionsModalOpen, setUsdcActionsModalOpen] = useState(false);
  const [cashOutModalOpen, setCashOutModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  
  // For Dynamic users, fetch profile separately
  const [dynamicProfile, setDynamicProfile] = useState<Profile | null>(null);
  
  useEffect(() => {
    const fetchDynamicProfile = async () => {
      if (isDynamicAuthenticated && syncedProfile?.userId && !supabaseProfile) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', syncedProfile.userId)
          .maybeSingle();
        setDynamicProfile(data);
      }
    };
    fetchDynamicProfile();
  }, [isDynamicAuthenticated, syncedProfile?.userId, supabaseProfile]);
  
  // Use whichever profile is available
  const profile = supabaseProfile || dynamicProfile;
  const isKycApproved = supabaseKycApproved || dynamicProfile?.kyc_status === 'approved';
  

  const handleRefresh = useCallback(async () => {
    await refreshBalances();
    setLastRefresh(Date.now());
    toast.success("Wallet refreshed");
  }, [refreshBalances]);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // Calculate performance metrics
  const performance = calculatePerformance(accountPerformanceData);
  const totalBalance = (btcBalance * currentBtcPrice) + usdcBalance;

  const copyAddress = (address: string | null | undefined, asset: string) => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success(`${asset} address copied to clipboard`);
    }
  };

  // Use Dynamic wallet addresses if connected, fallback to profile
  const btcAddress = btcWallet?.address || profile?.btc_address;
  const usdcAddress = ethWallet?.address || profile?.usdc_address;

  // Show wallet initialization loading state
  if (isWalletInitializing) {
    return (
      <DashboardLayout title="Wallet" subtitle="Setting up your wallet...">
        <div className="flex items-center justify-center py-20">
          <Card className="w-full max-w-md">
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Loading your wallet...</h3>
                <p className="text-muted-foreground text-sm">
                  Preparing your secure self-custody wallet.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Wallet" subtitle="Manage your self-custody Bitcoin and USDC">
      <div ref={containerRef}>
        <PullToRefreshIndicator 
          pullDistance={pullDistance} 
          isRefreshing={isRefreshing} 
        />

        {/* Portfolio Value Card */}
        <Card className="mb-4 md:mb-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Portfolio Value</p>
                <p className="text-3xl md:text-4xl font-bold">${totalBalance.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-muted-foreground">≈ {usdcBalance.toFixed(2)} USDC + {btcBalance.toFixed(8)} BTC</p>
                </div>
              </div>
              {isConnected && (
                <Badge variant="outline" className="gap-1 text-green-600 border-green-600/50">
                  <Shield className="h-3 w-3" />
                  Self-Custody
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Portfolio History Balance Chart */}
        <Card className="mb-4 md:mb-6">
          <CardHeader className="pb-2 md:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base md:text-lg">Portfolio History Balance</CardTitle>
                <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">${totalBalance.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-1">
                  {performance.isZero ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Minus className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm">No change</span>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1 ${performance.isPositive ? 'text-success' : 'text-destructive'}`}>
                      {performance.isPositive ? (
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
                      ) : (
                        <TrendingDown className="h-3 w-3 md:h-4 md:w-4" />
                      )}
                      <span className="text-xs md:text-sm font-medium">
                        {performance.isPositive ? '+' : ''}{performance.percentage.toFixed(2)}%
                      </span>
                      <span className="text-xs md:text-sm text-muted-foreground">
                        ({performance.isPositive ? '+' : ''}${Math.abs(performance.change).toFixed(2)})
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">All time</span>
                </div>
              </div>
              <div className="flex gap-1 md:gap-2 overflow-x-auto pb-1">
                {["1D", "1W", "1M", "1Y", "All"].map((period) => (
                  <Button
                    key={period}
                    variant={period === "All" ? "default" : "outline"}
                    size="sm"
                    className="h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm shrink-0"
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 md:pt-2">
            <div className="h-[150px] md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accountPerformanceData}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Balance"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6">
          <Button 
            disabled={!isKycApproved} 
            className="gap-2 flex-1 sm:flex-none text-sm"
            onClick={() => navigate("/send")}
          >
            <Send className="h-4 w-4" />
            Send
          </Button>
          <Button 
            variant="outline" 
            disabled={!isKycApproved} 
            className="gap-2 flex-1 sm:flex-none text-sm"
            onClick={() => setReceiveModalOpen(true)}
          >
            <Download className="h-4 w-4" />
            Receive
          </Button>
          <Button 
            disabled={!isKycApproved} 
            className="gap-2 bg-accent hover:bg-accent/90 flex-1 sm:flex-none text-sm"
            onClick={() => navigate("/redeem")}
          >
            <Gift className="h-4 w-4" />
            Redeem
          </Button>
          <Button 
            variant="secondary"
            disabled={!isKycApproved} 
            className="gap-2 flex-1 sm:flex-none text-sm"
            onClick={() => setCashOutModalOpen(true)}
          >
            <Building2 className="h-4 w-4" />
            Cash Out
          </Button>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
          <Card 
            className={isKycApproved ? "cursor-pointer transition-all hover:border-btc/50 hover:shadow-md" : ""}
            onClick={() => isKycApproved && setBuySellModalOpen(true)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-btc/10 rounded-full">
                  <Bitcoin className="h-6 w-6 text-btc" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Bitcoin</CardTitle>
                  <p className="text-sm text-muted-foreground">BTC</p>
                </div>
                {isKycApproved && (
                  <span className="text-xs text-muted-foreground">Tap to manage</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isKycApproved ? (
                <>
                  <p className="text-2xl md:text-3xl font-bold mb-1">{btcBalance.toFixed(8)} BTC</p>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">≈ ${(btcBalance * currentBtcPrice).toFixed(2)}</p>
                  {btcAddress && (
                    <div className="p-3 bg-muted rounded-lg" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs text-muted-foreground mb-1">Your Self-Custody Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs flex-1 truncate">{btcAddress}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(btcAddress, "BTC");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground">Complete KYC to view your BTC wallet</p>
                  <Button onClick={() => navigate('/kyc')} size="sm" className="w-full">
                    Start KYC Verification
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card 
            className={isKycApproved ? "cursor-pointer transition-all hover:border-usdc/50 hover:shadow-md" : ""}
            onClick={() => isKycApproved && setUsdcActionsModalOpen(true)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-usdc/10 rounded-full">
                  <DollarSign className="h-6 w-6 text-usdc" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">USD Coin</CardTitle>
                  <p className="text-sm text-muted-foreground">USDC</p>
                </div>
                {isKycApproved && (
                  <span className="text-xs text-muted-foreground">Tap to manage</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isKycApproved ? (
                <>
                  <p className="text-2xl md:text-3xl font-bold mb-1">{usdcBalance.toFixed(2)} USDC</p>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">≈ ${usdcBalance.toFixed(2)}</p>
                  {usdcAddress && (
                    <div className="p-3 bg-muted rounded-lg" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs text-muted-foreground mb-1">Your Self-Custody Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs flex-1 truncate">{usdcAddress}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(usdcAddress, "USDC");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground">Complete KYC to view your USDC wallet</p>
                  <Button onClick={() => navigate('/kyc')} size="sm" className="w-full">
                    Start KYC Verification
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order History */}
        {isKycApproved && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 md:mb-6">
            <SwapOrderHistory />
            <CashOutHistory />
          </div>
        )}

        {/* Self-custody Notice */}
        {isKycApproved && isConnected && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Self-Custody Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    You control your private keys. CoinEdge is only a counterparty for trades — we cannot access or move your funds.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Buy/Sell BTC Modal */}
        <BuySellBtcModal
          open={buySellModalOpen}
          onOpenChange={setBuySellModalOpen}
          currentBtcPrice={currentBtcPrice}
          btcBalance={btcBalance}
          usdcBalance={usdcBalance}
        />

        {/* USDC Actions Modal */}
        <UsdcActionsModal
          open={usdcActionsModalOpen}
          onOpenChange={setUsdcActionsModalOpen}
          usdcBalance={usdcBalance}
        />

        {/* Cash Out Modal */}
        <CashOutModal
          open={cashOutModalOpen}
          onOpenChange={setCashOutModalOpen}
          btcBalance={btcBalance}
          usdcBalance={usdcBalance}
          currentBtcPrice={currentBtcPrice}
        />

        {/* Receive Modal */}
        <ReceiveModal
          open={receiveModalOpen}
          onOpenChange={setReceiveModalOpen}
          btcAddress={btcAddress}
          usdcAddress={usdcAddress}
        />
      </div>
    </DashboardLayout>
  );
};

export default Wallet;