import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Download, Gift, ArrowUpRight, Bitcoin, DollarSign, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefresh";

// Mock price data
const priceData = [
  { date: "Jan 4", btc: 91000 },
  { date: "Jan 5", btc: 92500 },
  { date: "Jan 6", btc: 90800 },
  { date: "Jan 7", btc: 93200 },
  { date: "Jan 8", btc: 92100 },
  { date: "Jan 9", btc: 94500 },
  { date: "Jan 10", btc: 93327 },
];

const Wallet: React.FC = () => {
  const { profile, isKycApproved } = useAuth();
  const navigate = useNavigate();
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const handleRefresh = useCallback(async () => {
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLastRefresh(Date.now());
    toast.success("Wallet refreshed");
  }, []);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  const copyAddress = (address: string | null | undefined, asset: string) => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success(`${asset} address copied to clipboard`);
    }
  };

  return (
    <DashboardLayout title="Wallet" subtitle="Manage your Bitcoin and USDC balances">
      <div ref={containerRef} className="h-full overflow-auto -m-3 md:-m-6 p-3 md:p-6">
        <PullToRefreshIndicator 
          pullDistance={pullDistance} 
          isRefreshing={isRefreshing} 
        />

        {/* Bitcoin Price Chart - Now at top */}
        <Card className="mb-4 md:mb-6">
          <CardHeader className="pb-2 md:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base md:text-lg">Bitcoin Price</CardTitle>
                <p className="text-2xl md:text-3xl font-bold mt-1 md:mt-2">$93,327.91</p>
                <p className="text-xs md:text-sm text-success flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" />
                  +2.05% today
                </p>
              </div>
              <div className="flex gap-1 md:gap-2 overflow-x-auto pb-1">
                {["1D", "1W", "1M", "1Y", "All"].map((period) => (
                  <Button
                    key={period}
                    variant={period === "1W" ? "default" : "outline"}
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
                <LineChart data={priceData}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} />
                  <YAxis hide domain={["dataMin - 1000", "dataMax + 1000"]} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "BTC"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="btc" 
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
          <Button disabled={!isKycApproved} className="gap-2 flex-1 sm:flex-none text-sm">
            <Send className="h-4 w-4" />
            Send
          </Button>
          <Button variant="outline" disabled={!isKycApproved} className="gap-2 flex-1 sm:flex-none text-sm">
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
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-btc/10 rounded-full">
                  <Bitcoin className="h-6 w-6 text-btc" />
                </div>
                <div>
                  <CardTitle className="text-lg">Bitcoin</CardTitle>
                  <p className="text-sm text-muted-foreground">BTC</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isKycApproved ? (
                <>
                  <p className="text-2xl md:text-3xl font-bold mb-1">0.00000000 BTC</p>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">≈ $0.00</p>
                  {profile?.btc_address && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs flex-1 truncate">{profile.btc_address}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => copyAddress(profile.btc_address, "BTC")}
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

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-usdc/10 rounded-full">
                  <DollarSign className="h-6 w-6 text-usdc" />
                </div>
                <div>
                  <CardTitle className="text-lg">USD Coin</CardTitle>
                  <p className="text-sm text-muted-foreground">USDC</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isKycApproved ? (
                <>
                  <p className="text-2xl md:text-3xl font-bold mb-1">0.00 USDC</p>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">≈ $0.00</p>
                  {profile?.usdc_address && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs flex-1 truncate">{profile.usdc_address}</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => copyAddress(profile.usdc_address, "USDC")}
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
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
