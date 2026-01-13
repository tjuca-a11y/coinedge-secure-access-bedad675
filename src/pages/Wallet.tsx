import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Download, Gift, Bitcoin, DollarSign, Copy, ExternalLink, TrendingUp, TrendingDown, Minus, Building2 } from "lucide-react";
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

// Mock balances (in real app, fetch from backend)
const mockBtcBalance = 0;
const mockUsdcBalance = 0;

const Wallet: React.FC = () => {
  const { profile, isKycApproved } = useAuth();
  const navigate = useNavigate();
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [buySellModalOpen, setBuySellModalOpen] = useState(false);
  const [usdcActionsModalOpen, setUsdcActionsModalOpen] = useState(false);
  const [cashOutModalOpen, setCashOutModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);

  const handleRefresh = useCallback(async () => {
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLastRefresh(Date.now());
    toast.success("Wallet refreshed");
  }, []);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // Calculate performance metrics
  const performance = calculatePerformance(accountPerformanceData);
  const totalBalance = (mockBtcBalance * currentBtcPrice) + mockUsdcBalance;

  const copyAddress = (address: string | null | undefined, asset: string) => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success(`${asset} address copied to clipboard`);
    }
  };

  return (
    <DashboardLayout title="Wallet" subtitle="Manage your Bitcoin and USDC balances">
      <div ref={containerRef}>
        <PullToRefreshIndicator 
          pullDistance={pullDistance} 
          isRefreshing={isRefreshing} 
        />

        {/* Portfolio Value Card */}
        <Card className="mb-4 md:mb-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground mb-1">Portfolio Value</p>
            <p className="text-3xl md:text-4xl font-bold">${totalBalance.toFixed(2)}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">≈ {mockUsdcBalance.toFixed(2)} USDC + {mockBtcBalance.toFixed(8)} BTC</p>
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
                  <p className="text-2xl md:text-3xl font-bold mb-1">{mockBtcBalance.toFixed(8)} BTC</p>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">≈ ${(mockBtcBalance * currentBtcPrice).toFixed(2)}</p>
                  {profile?.btc_address && (
                    <div className="p-3 bg-muted rounded-lg" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs flex-1 truncate">{profile.btc_address}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(profile.btc_address, "BTC");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Complete KYC to view your BTC wallet</p>
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
                  <p className="text-2xl md:text-3xl font-bold mb-1">{mockUsdcBalance.toFixed(2)} USDC</p>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">≈ ${mockUsdcBalance.toFixed(2)}</p>
                  {profile?.usdc_address && (
                    <div className="p-3 bg-muted rounded-lg" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs flex-1 truncate">{profile.usdc_address}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAddress(profile.usdc_address, "USDC");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Complete KYC to view your USDC wallet</p>
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
        {isKycApproved && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <ExternalLink className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Self-Custody Wallet</p>
                  <p className="text-sm text-muted-foreground">
                    You control your private keys. CoinEdge cannot access or move your funds.
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
          btcBalance={mockBtcBalance}
          usdcBalance={mockUsdcBalance}
        />

        {/* USDC Actions Modal */}
        <UsdcActionsModal
          open={usdcActionsModalOpen}
          onOpenChange={setUsdcActionsModalOpen}
          usdcBalance={mockUsdcBalance}
        />

        {/* Cash Out Modal */}
        <CashOutModal
          open={cashOutModalOpen}
          onOpenChange={setCashOutModalOpen}
          btcBalance={mockBtcBalance}
          usdcBalance={mockUsdcBalance}
          currentBtcPrice={currentBtcPrice}
        />

        {/* Receive Modal */}
        <ReceiveModal
          open={receiveModalOpen}
          onOpenChange={setReceiveModalOpen}
          btcAddress={profile?.btc_address}
          usdcAddress={profile?.usdc_address}
        />
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
