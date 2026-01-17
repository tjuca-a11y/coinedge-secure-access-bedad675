import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bitcoin, TrendingUp, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useSwapOrders, SwapOrder } from "@/hooks/useSwapOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface BtcDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  btcBalance: number;
  btcPrice: number;
  totalPortfolioValue: number;
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

const TransactionRow: React.FC<{ order: SwapOrder }> = ({ order }) => {
  const isBuy = order.order_type === "BUY_BTC";
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-btc/10 rounded-full">
          <Bitcoin className="h-4 w-4 text-btc" />
        </div>
        <div>
          <p className="font-medium text-sm">
            {isBuy ? "Bought BTC" : "Sold BTC"}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(order.created_at), "MMM d, yyyy")}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-medium text-sm ${isBuy ? "text-success" : "text-foreground"}`}>
          {isBuy ? "+" : "-"}${order.usdc_amount.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground">
          {isBuy ? "+" : "-"}{order.btc_amount.toFixed(5)} BTC
        </p>
      </div>
    </div>
  );
};

export const BtcDetailModal: React.FC<BtcDetailModalProps> = ({
  open,
  onOpenChange,
  btcBalance,
  btcPrice,
  totalPortfolioValue,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto p-0">
        {/* Tabs Header */}
        <div className="sticky top-0 z-10 bg-background pt-6 px-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "balance" | "insights")}>
            <TabsList className="w-full justify-start h-auto bg-transparent p-0 border-b rounded-none">
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

        <div className="p-6 pt-4">
          {activeTab === "balance" && (
            <>
              {/* Balance Section */}
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-btc rounded-full">
                  <Bitcoin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${btcValue.toFixed(2)}</p>
                  <p className="text-muted-foreground">{btcBalance.toFixed(8)} BTC</p>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-3 mb-6 pb-6 border-b">
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
                <h2 className="text-lg font-bold mb-3">Transactions</h2>
                
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 py-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-14 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !orders || orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bitcoin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No transactions yet</p>
                    <p className="text-sm">Your BTC transactions will appear here</p>
                  </div>
                ) : (
                  Object.entries(groupedOrders).map(([month, monthOrders]) => (
                    <div key={month} className="mb-4">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{month}</h3>
                      <div>
                        {monthOrders.map((order) => (
                          <TransactionRow key={order.id} order={order} />
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
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Insights coming soon</p>
              <p className="text-sm">Analytics and performance metrics will appear here</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
