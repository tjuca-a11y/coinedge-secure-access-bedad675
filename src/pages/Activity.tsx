import React, { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  Gift, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  DollarSign,
  Bitcoin,
  TrendingDown,
  AlertCircle,
  Check,
  FileText,
  FileSpreadsheet,
  X,
  Copy,
  ExternalLink,
  ShoppingCart,
  Clock,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefresh";
import { useSwapOrders, SwapOrder } from "@/hooks/useSwapOrders";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mock BTC price data
const btcPriceData = [
  { date: "Oct", price: 89000 },
  { date: "Nov", price: 95000 },
  { date: "Dec", price: 91000 },
  { date: "Jan", price: 93327 },
];

// Mock current values
const currentBtcPrice = 93327.91;
const mockUsdcBalance = 2450.00;
const mockBtcBalance = 0.464;
const mockBtcValue = mockBtcBalance * currentBtcPrice;

interface Transaction {
  id: string;
  order_id?: string;
  title: string;
  description: string;
  date: string;
  amount: string;
  amountColor: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  type: "buy_btc" | "sell_btc" | "buy_usdc" | "sell_usdc" | "received" | "sent" | "loan" | "interest" | "gift";
  status: "completed" | "pending" | "processing" | "failed" | "cancelled";
  txHash?: string;
  fee?: string;
  fromAddress?: string;
  toAddress?: string;
  usdValue?: string;
  btcAmount?: number;
  usdcAmount?: number;
  btcPrice?: number;
  destinationAddress?: string;
  failedReason?: string;
}

type TransactionType = "all" | "received" | "sent" | "loans" | "interest" | "buy_btc" | "sell_btc" | "buy_usdc" | "sell_usdc";
type SortOption = "newest" | "oldest" | "highest" | "lowest";

const mapSwapOrderToTransaction = (order: SwapOrder): Transaction => {
  const isBuy = order.order_type === "BUY_BTC";
  
  return {
    id: order.id,
    order_id: order.order_id,
    title: isBuy ? "Bought Bitcoin" : "Sold Bitcoin",
    description: isBuy 
      ? `Purchased ${order.btc_amount.toFixed(8)} BTC with USDC`
      : `Sold ${order.btc_amount.toFixed(8)} BTC for USDC`,
    date: format(new Date(order.created_at), "MMM d 'at' h:mm a"),
    amount: isBuy ? `+${order.btc_amount.toFixed(8)} BTC` : `-${order.btc_amount.toFixed(8)} BTC`,
    amountColor: isBuy ? "text-success" : "text-foreground",
    icon: isBuy ? ShoppingCart : ArrowUpRight,
    iconBg: isBuy ? "bg-green-100" : "bg-orange-100",
    iconColor: isBuy ? "text-green-600" : "text-orange-600",
    type: isBuy ? "buy_btc" : "sell_btc",
    status: order.status.toLowerCase() as Transaction["status"],
    txHash: order.tx_hash || undefined,
    fee: `$${order.fee_usdc.toFixed(2)}`,
    usdValue: `$${order.usdc_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    btcAmount: order.btc_amount,
    usdcAmount: order.usdc_amount,
    btcPrice: order.btc_price_at_order,
    destinationAddress: order.destination_address || undefined,
    failedReason: order.failed_reason || undefined,
  };
};

const Activity: React.FC = () => {
  const { isKycApproved } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const { data: swapOrders = [], isLoading, refetch } = useSwapOrders();

  // Map swap orders to transactions
  const transactions: Transaction[] = swapOrders.map(mapSwapOrderToTransaction);

  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success("Activity refreshed");
  }, [refetch]);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // Filter transactions based on search and type filter
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    if (typeFilter === "all") return matchesSearch;
    if (typeFilter === "buy_btc") return matchesSearch && tx.type === "buy_btc";
    if (typeFilter === "sell_btc") return matchesSearch && tx.type === "sell_btc";
    return matchesSearch;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === "newest") {
      return -1; // Already sorted by newest from query
    }
    if (sortBy === "oldest") {
      return 1;
    }
    const amtA = Math.abs(a.btcAmount || 0);
    const amtB = Math.abs(b.btcAmount || 0);
    return sortBy === "highest" ? amtB - amtA : amtA - amtB;
  });

  const handleDownload = (formatType: "csv" | "pdf") => {
    if (formatType === "csv" && transactions.length > 0) {
      const headers = ['Order ID', 'Type', 'Status', 'BTC Amount', 'USDC Amount', 'Fee', 'Date'];
      const rows = transactions.map((tx) => [
        tx.order_id || tx.id,
        tx.type,
        tx.status,
        tx.btcAmount?.toFixed(8) || '',
        tx.usdcAmount?.toFixed(2) || '',
        tx.fee || '',
        tx.date,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.success("Transactions downloaded as CSV");
    } else {
      toast.success(`Downloading transactions as ${formatType.toUpperCase()}...`);
    }
  };

  const handleTransactionClick = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setIsReceiptOpen(true);
  };

  const handleCopyTxHash = () => {
    if (selectedTransaction?.txHash) {
      navigator.clipboard.writeText(selectedTransaction.txHash);
      toast.success("Transaction hash copied");
    }
  };

  const handleCopyOrderId = () => {
    if (selectedTransaction?.order_id) {
      navigator.clipboard.writeText(selectedTransaction.order_id);
      toast.success("Order ID copied");
    }
  };

  const getFilterLabel = () => {
    switch (typeFilter) {
      case "buy_btc": return "Buy BTC";
      case "sell_btc": return "Sell BTC";
      default: return "Filter";
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case "oldest": return "Oldest first";
      case "highest": return "Highest amount";
      case "lowest": return "Lowest amount";
      default: return "Sort";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
            <Check className="h-3 w-3" />
            Completed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Processing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
            <X className="h-3 w-3" />
            Failed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Activity" subtitle="View your transaction history">
      <div ref={containerRef}>
        <PullToRefreshIndicator 
          pullDistance={pullDistance} 
          isRefreshing={isRefreshing} 
        />

        {/* Balance Cards - USDC and Bitcoin only */}
        <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-1 text-muted-foreground text-xs md:text-sm mb-1">
                <div className="h-2 w-2 rounded-full bg-usdc" />
                USDC
              </div>
              <p className="text-lg md:text-2xl font-bold">${mockUsdcBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Stablecoin</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-1 text-muted-foreground text-xs md:text-sm mb-1">
                <Bitcoin className="h-3 w-3 text-btc" />
                Bitcoin
              </div>
              <p className="text-lg md:text-2xl font-bold">${mockBtcValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-success flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                +2.05% today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bitcoin Price Chart */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">Bitcoin Price</p>
              <p className="text-2xl md:text-3xl font-bold">${currentBtcPrice.toLocaleString()} USD</p>
              <p className="text-sm text-destructive flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Down $913.76 (0.97%)
              </p>
            </div>
            <div className="h-[120px] md:h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={btcPriceData}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis hide domain={["dataMin - 2000", "dataMax + 2000"]} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Price"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {["1D", "1W", "1M", "1Y", "All"].map((period) => (
                <Button
                  key={period}
                  variant={period === "1M" ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  {period}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alert Banner */}
        <Card className="mb-4 md:mb-6 bg-amber-50 border-amber-200">
          <CardContent className="p-3 md:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-amber-900">New device login</p>
                <p className="text-xs text-amber-700">Verification needed</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100">
              Review
            </Button>
          </CardContent>
        </Card>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={!isKycApproved}
            />
          </div>
          <div className="flex gap-2">
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={typeFilter !== "all" ? "default" : "outline"} 
                  size="sm" 
                  className="gap-2" 
                  disabled={!isKycApproved}
                >
                  <Filter className="h-4 w-4" />
                  {getFilterLabel()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem 
                  checked={typeFilter === "all"}
                  onCheckedChange={() => setTypeFilter("all")}
                >
                  All transactions
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Bitcoin</DropdownMenuLabel>
                <DropdownMenuCheckboxItem 
                  checked={typeFilter === "buy_btc"}
                  onCheckedChange={() => setTypeFilter("buy_btc")}
                >
                  Buy BTC
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={typeFilter === "sell_btc"}
                  onCheckedChange={() => setTypeFilter("sell_btc")}
                >
                  Sell BTC
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={sortBy !== "newest" ? "default" : "outline"} 
                  size="sm" 
                  className="gap-2" 
                  disabled={!isKycApproved}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {getSortLabel()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem 
                  checked={sortBy === "newest"}
                  onCheckedChange={() => setSortBy("newest")}
                >
                  Newest first
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={sortBy === "oldest"}
                  onCheckedChange={() => setSortBy("oldest")}
                >
                  Oldest first
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={sortBy === "highest"}
                  onCheckedChange={() => setSortBy("highest")}
                >
                  Highest amount
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={sortBy === "lowest"}
                  onCheckedChange={() => setSortBy("lowest")}
                >
                  Lowest amount
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Download Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" disabled={!isKycApproved}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Export transactions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownload("csv")} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Download as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("pdf")} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Download as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Transaction List Header */}
        <div className="flex justify-between items-center mb-3 px-1">
          <p className="text-sm font-medium text-muted-foreground">Transaction</p>
          <p className="text-sm font-medium text-muted-foreground">Amount</p>
        </div>

        {/* Transaction List */}
        <div className="space-y-1">
          {!isKycApproved ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Complete KYC to view your transaction history
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="py-8 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : sortedTransactions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm mt-2">Your buy and sell orders will appear here</p>
              </CardContent>
            </Card>
          ) : (
            sortedTransactions.map((tx) => {
              const IconComponent = tx.icon;
              return (
                <Card 
                  key={tx.id} 
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleTransactionClick(tx)}
                >
                  <CardContent className="p-3 md:p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.iconBg}`}>
                      <IconComponent className={`h-4 w-4 ${tx.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{tx.title}</p>
                        {tx.status !== "completed" && getStatusBadge(tx.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.date}</p>
                    </div>
                    <p className={`font-medium text-sm shrink-0 ${tx.amountColor}`}>
                      {tx.amount}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Transaction Receipt Modal */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Transaction Receipt
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              {/* Transaction Icon and Title */}
              <div className="flex flex-col items-center text-center py-4">
                <div className={`p-4 rounded-full ${selectedTransaction.iconBg} mb-3`}>
                  <selectedTransaction.icon className={`h-8 w-8 ${selectedTransaction.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold">{selectedTransaction.title}</h3>
                <p className="text-muted-foreground text-sm">{selectedTransaction.description}</p>
                <div className="mt-2">
                  {getStatusBadge(selectedTransaction.status)}
                </div>
              </div>

              {/* Amount */}
              <div className="text-center py-4 border-y">
                <p className={`text-3xl font-bold ${selectedTransaction.amountColor}`}>
                  {selectedTransaction.amount}
                </p>
                {selectedTransaction.usdValue && (
                  <p className="text-muted-foreground text-sm mt-1">
                    ≈ {selectedTransaction.usdValue}
                  </p>
                )}
              </div>

              {/* Transaction Details */}
              <div className="space-y-3">
                {selectedTransaction.order_id && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Order ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono text-xs">{selectedTransaction.order_id}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyOrderId}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{selectedTransaction.date}</span>
                </div>

                {selectedTransaction.btcPrice && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">BTC Price</span>
                    <span className="font-medium">${selectedTransaction.btcPrice.toLocaleString()}</span>
                  </div>
                )}
                
                {selectedTransaction.fee && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fee</span>
                    <span className="font-medium">{selectedTransaction.fee}</span>
                  </div>
                )}

                {selectedTransaction.destinationAddress && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Destination</span>
                    <span className="font-medium font-mono text-xs truncate max-w-[180px]">
                      {selectedTransaction.destinationAddress}
                    </span>
                  </div>
                )}

                {selectedTransaction.txHash && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium font-mono text-xs truncate max-w-[120px]">{selectedTransaction.txHash}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyTxHash}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedTransaction.failedReason && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">Failed Reason</p>
                    <p className="text-sm text-muted-foreground">{selectedTransaction.failedReason}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setIsReceiptOpen(false)}>
                  Close
                </Button>
                {selectedTransaction.txHash && (
                  <Button variant="default" className="flex-1 gap-2" asChild>
                    <a href={`https://mempool.space/tx/${selectedTransaction.txHash}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      View on Explorer
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Activity;
