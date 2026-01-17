import React, { useState } from "react";
import { ArrowLeft, Bitcoin, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Send as SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSwapOrders, SwapOrder } from "@/hooks/useSwapOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface BtcDetailViewProps {
  btcBalance: number;
  btcPrice: number;
  totalPortfolioValue: number;
  onBack: () => void;
  onBuy: () => void;
  onSell: () => void;
}

// Group transactions by month
const groupByMonth = (orders: SwapOrder[]) => {
  const groups: Record<string, SwapOrder[]> = {};
  orders.forEach((order) => {
    const monthKey = format(new Date(order.created_at), "MMMM yyyy");
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(order);
  });
  return groups;
};

const TransactionRow: React.FC<{ order: SwapOrder; btcPrice: number }> = ({ order, btcPrice }) => {
  const isBuy = order.order_type === "BUY_BTC";
  const usdValue = order.btc_amount * btcPrice;
  
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-btc/10 rounded-full">
          <Bitcoin className="h-5 w-5 text-btc" />
        </div>
        <div>
          <p className="font-medium">
            {isBuy ? "Bought BTC" : order.order_type === "SELL_BTC" ? "Sold BTC" : "Sent BTC"}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.created_at), "MMM d, yyyy")}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-medium ${isBuy ? "text-success" : "text-foreground"}`}>
          {isBuy ? "+" : "-"}${order.usdc_amount.toFixed(2)}
        </p>
        <p className="text-sm text-muted-foreground">
          {isBuy ? "+" : "-"}{order.btc_amount.toFixed(5)} BTC
        </p>
      </div>
    </div>
  );
};

export const BtcDetailView: React.FC<BtcDetailViewProps> = ({
  btcBalance,
  btcPrice,
  totalPortfolioValue,
  onBack,
  onBuy,
  onSell,
}) => {
  const [activeTab, setActiveTab] = useState<"balance" | "insights">("balance");
  const { data: orders, isLoading } = useSwapOrders();
  
  const btcValue = btcBalance * btcPrice;
  const portfolioPercentage = totalPortfolioValue > 0 ? (btcValue / totalPortfolioValue) * 100 : 0;
  
  // Mock stats - in production these would come from actual data
  const todaysReturn = "--";
  const unrealizedReturn = { value: 0, percentage: 0 };
  const averageCost = 0;

  const groupedOrders = orders ? groupByMonth(orders) : {};

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">BTC</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "balance" | "insights")}>
          <TabsList className="w-full justify-start px-4 h-auto bg-transparent border-b-0">
            <TabsTrigger 
              value="balance" 
              className="relative px-0 mr-6 pb-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none data-[state=active]:text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 data-[state=active]:after:bg-primary"
            >
              Balance
            </TabsTrigger>
            <TabsTrigger 
              value="insights"
              className="relative px-0 pb-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none data-[state=active]:text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 data-[state=active]:after:bg-primary"
            >
              Insights
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="p-4">
        {activeTab === "balance" && (
          <>
            {/* Balance Section */}
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-btc rounded-full">
                <Bitcoin className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">${btcValue.toFixed(2)}</p>
                <p className="text-muted-foreground">{btcBalance.toFixed(8)} BTC</p>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-4 mb-6 pb-6 border-b">
              <div className="flex items-center justify-between">
                <span className="font-medium">Today's return</span>
                <span className="text-muted-foreground">{todaysReturn}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Unrealized return</span>
                <span className={unrealizedReturn.value >= 0 ? "text-success" : "text-destructive"}>
                  ${unrealizedReturn.value.toFixed(2)} ({unrealizedReturn.percentage.toFixed(2)}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Average cost</span>
                <span>${averageCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">% of portfolio</span>
                <span>{portfolioPercentage.toFixed(2)}%</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <Button onClick={onBuy} className="flex-1 gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Buy
              </Button>
              <Button onClick={onSell} variant="outline" className="flex-1 gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Sell
              </Button>
            </div>

            {/* Transactions */}
            <div>
              <h2 className="text-xl font-bold mb-4">Transactions</h2>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-16 mb-2" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !orders || orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bitcoin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Your BTC transactions will appear here</p>
                </div>
              ) : (
                Object.entries(groupedOrders).map(([month, monthOrders]) => (
                  <div key={month} className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">{month}</h3>
                    <div>
                      {monthOrders.map((order) => (
                        <TransactionRow key={order.id} order={order} btcPrice={btcPrice} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === "insights" && (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Insights coming soon</p>
            <p className="text-sm">Analytics and performance metrics will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};
