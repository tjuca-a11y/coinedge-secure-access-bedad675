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
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefresh";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock BTC price data
const btcPriceData = [
  { date: "Oct", price: 89000 },
  { date: "Nov", price: 95000 },
  { date: "Dec", price: 91000 },
  { date: "Jan", price: 93327 },
];

// Mock current values
const currentBtcPrice = 93327.91;
const mockCashBalance = 6847.32;
const mockUsdcBalance = 2450.00;
const mockBtcBalance = 0.464;
const mockBtcValue = mockBtcBalance * currentBtcPrice;

// Mock transaction data grouped by month
const mockTransactions = [
  {
    id: "1",
    title: "BTC Gift Card Redeemed",
    description: "0.0005 BTC added to wallet",
    date: "Today at 2:45 PM",
    amount: "+0.0005 BTC",
    amountColor: "text-success",
    icon: Gift,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    id: "2",
    title: "Loan Initiated",
    description: "Bitcoin-backed loan · 0.5 BTC collateral",
    date: "Nov 15 at 10:30 AM",
    amount: "+$20,000",
    amountColor: "text-foreground",
    icon: Wallet,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "3",
    title: "BTC Transfer Completed",
    description: "Sent to external wallet",
    date: "Nov 12 at 4:15 PM",
    amount: "-0.015 BTC",
    amountColor: "text-foreground",
    icon: ArrowUpRight,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  {
    id: "4",
    title: "Collateral Deposited",
    description: "Secured via Fireblocks",
    date: "Nov 10 at 9:22 AM",
    amount: "+0.5 BTC",
    amountColor: "text-success",
    icon: ArrowDownLeft,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    id: "5",
    title: "Interest Payment Processed",
    description: "Monthly loan interest deducted",
    date: "Nov 5 at 12:00 PM",
    amount: "-$83.33",
    amountColor: "text-foreground",
    icon: DollarSign,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
];

type TransactionType = "all" | "received" | "sent" | "loans" | "interest";
type SortOption = "newest" | "oldest" | "highest" | "lowest";

const Activity: React.FC = () => {
  const { isKycApproved } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [typeFilter, setTypeFilter] = useState<TransactionType>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLastRefresh(Date.now());
    toast.success("Activity refreshed");
  }, []);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  // Filter transactions based on search and type filter
  const filteredTransactions = mockTransactions.filter((tx) => {
    const matchesSearch = 
      tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (typeFilter === "all") return matchesSearch;
    if (typeFilter === "received") return matchesSearch && tx.amount.startsWith("+");
    if (typeFilter === "sent") return matchesSearch && tx.amount.startsWith("-") && !tx.title.includes("Interest");
    if (typeFilter === "loans") return matchesSearch && tx.title.includes("Loan");
    if (typeFilter === "interest") return matchesSearch && tx.title.includes("Interest");
    return matchesSearch;
  });

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === "newest" || sortBy === "oldest") {
      // For demo, we'll just reverse the array for oldest
      return sortBy === "oldest" ? 1 : -1;
    }
    // Parse amounts for sorting by value
    const parseAmount = (amt: string) => {
      const num = parseFloat(amt.replace(/[^0-9.-]/g, ""));
      return isNaN(num) ? 0 : Math.abs(num);
    };
    const amtA = parseAmount(a.amount);
    const amtB = parseAmount(b.amount);
    return sortBy === "highest" ? amtB - amtA : amtA - amtB;
  });

  const handleDownload = (format: "csv" | "pdf") => {
    toast.success(`Downloading transactions as ${format.toUpperCase()}...`);
    // In a real app, this would trigger an actual download
  };

  const getFilterLabel = () => {
    switch (typeFilter) {
      case "received": return "Received";
      case "sent": return "Sent";
      case "loans": return "Loans";
      case "interest": return "Interest";
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

  return (
    <DashboardLayout title="Activity" subtitle="View your transaction history">
      <div ref={containerRef}>
        <PullToRefreshIndicator 
          pullDistance={pullDistance} 
          isRefreshing={isRefreshing} 
        />

        {/* Balance Cards */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
          <Card>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-1 text-muted-foreground text-xs md:text-sm mb-1">
                <DollarSign className="h-3 w-3" />
                Cash
              </div>
              <p className="text-lg md:text-2xl font-bold">${mockCashBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
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
              placeholder="Search by name, description, amount, or $cashtag"
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
                <DropdownMenuCheckboxItem 
                  checked={typeFilter === "received"}
                  onCheckedChange={() => setTypeFilter("received")}
                >
                  Received
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={typeFilter === "sent"}
                  onCheckedChange={() => setTypeFilter("sent")}
                >
                  Sent
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={typeFilter === "loans"}
                  onCheckedChange={() => setTypeFilter("loans")}
                >
                  Loans
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem 
                  checked={typeFilter === "interest"}
                  onCheckedChange={() => setTypeFilter("interest")}
                >
                  Interest payments
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

        {/* Month Header */}
        <p className="text-sm font-semibold mb-3 px-1">November 2025</p>

        {/* Transaction List */}
        <div className="space-y-1">
          {!isKycApproved ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Complete KYC to view your transaction history
              </CardContent>
            </Card>
          ) : filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No transactions found
              </CardContent>
            </Card>
          ) : (
            sortedTransactions.map((tx) => {
              const IconComponent = tx.icon;
              return (
                <Card key={tx.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-3 md:p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.iconBg}`}>
                      <IconComponent className={`h-4 w-4 ${tx.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{tx.title}</p>
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
    </DashboardLayout>
  );
};

export default Activity;
