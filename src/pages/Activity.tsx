import React, { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Download, ArrowUpRight, ArrowDownLeft, Search, Filter, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefresh";

// Mock transaction data
const mockTransactions = [
  {
    id: "1",
    counterparty: "Sarah Chen",
    email: "sarah@example.com",
    type: "Sent",
    asset: "USDC",
    amount: "-250.00",
    status: "Completed",
    time: "1/10/2026, 9:42:05 AM",
  },
  {
    id: "2",
    counterparty: "Mike Johnson",
    email: "mike@example.com",
    type: "Received",
    asset: "BTC",
    amount: "+0.00500000",
    status: "Completed",
    time: "1/10/2026, 8:42:05 AM",
  },
  {
    id: "3",
    counterparty: "Alex Rivera",
    email: "alex@example.com",
    type: "Sent",
    asset: "USDC",
    amount: "-500.00",
    status: "Pending",
    time: "1/10/2026, 10:12:05 AM",
  },
  {
    id: "4",
    counterparty: "Voucher Redemption",
    email: "system",
    type: "Received",
    asset: "BTC",
    amount: "+0.01000000",
    status: "Completed",
    time: "1/9/2026, 3:15:00 PM",
  },
];

const Activity: React.FC = () => {
  const { isKycApproved } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const handleRefresh = useCallback(async () => {
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLastRefresh(Date.now());
    toast.success("Activity refreshed");
  }, []);

  const { containerRef, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  const filteredTransactions = mockTransactions.filter((tx) => {
    const matchesSearch = tx.counterparty.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAsset = assetFilter === "all" || tx.asset === assetFilter;
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    return matchesSearch && matchesAsset && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge className="bg-success/10 text-success hover:bg-success/20">{status}</Badge>;
      case "Pending":
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">{status}</Badge>;
      case "Failed":
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout title="Activity" subtitle="View your transaction history">
      <div ref={containerRef} className="h-full overflow-auto -m-3 md:-m-6 p-3 md:p-6">
        <PullToRefreshIndicator 
          pullDistance={pullDistance} 
          isRefreshing={isRefreshing} 
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
          <Card className="bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors">
            <CardContent className="p-3 md:p-4 flex flex-col items-center justify-center gap-1 md:gap-2">
              <Send className="h-5 w-5 md:h-6 md:w-6" />
              <span className="font-medium text-xs md:text-base">Send Money</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-3 md:p-4 flex flex-col items-center justify-center gap-1 md:gap-2">
              <Download className="h-5 w-5 md:h-6 md:w-6" />
              <span className="font-medium text-xs md:text-base">Request Money</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-3 md:p-4 flex flex-col items-center justify-center gap-1 md:gap-2">
              <ArrowUpRight className="h-5 w-5 md:h-6 md:w-6" />
              <span className="font-medium text-xs md:text-base">Total Sent</span>
              <span className="text-base md:text-xl font-bold">{isKycApproved ? "0.015 BTC" : "--"}</span>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-3 md:p-4 flex flex-col items-center justify-center gap-1 md:gap-2">
              <ArrowDownLeft className="h-5 w-5 md:h-6 md:w-6" />
              <span className="font-medium text-xs md:text-base">Total Received</span>
              <span className="text-base md:text-xl font-bold">{isKycApproved ? "0.025 BTC" : "--"}</span>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="mb-4 md:mb-6">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="requests">Requests (0)</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-4 mb-4">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 md:h-10"
                  disabled={!isKycApproved}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={typeFilter} onValueChange={setTypeFilter} disabled={!isKycApproved}>
                  <SelectTrigger className="w-[130px] md:w-[150px] h-9 md:h-10 text-sm">
                    <SelectValue placeholder="All Transactions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={assetFilter} onValueChange={setAssetFilter} disabled={!isKycApproved}>
                  <SelectTrigger className="w-[100px] md:w-[120px] h-9 md:h-10 text-sm">
                    <SelectValue placeholder="All Assets" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assets</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" disabled={!isKycApproved} className="h-9 w-9 md:h-10 md:w-10">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Transactions - Mobile Cards / Desktop Table */}
            <Card className="overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Counterparty</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!isKycApproved ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Complete KYC to view your transaction history
                        </TableCell>
                      </TableRow>
                    ) : filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tx.counterparty}</p>
                              <p className="text-sm text-muted-foreground">{tx.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{tx.type}</TableCell>
                          <TableCell>{tx.asset}</TableCell>
                          <TableCell className={tx.amount.startsWith("+") ? "text-success" : "text-destructive"}>
                            {tx.amount} {tx.asset}
                          </TableCell>
                          <TableCell>{getStatusBadge(tx.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{tx.time}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border">
                {!isKycApproved ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Complete KYC to view your transaction history
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No transactions found
                  </div>
                ) : (
                  filteredTransactions.map((tx) => (
                    <div key={tx.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{tx.counterparty}</p>
                        <p className="text-xs text-muted-foreground">{tx.type} • {tx.asset}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-medium text-sm ${tx.amount.startsWith("+") ? "text-success" : "text-destructive"}`}>
                          {tx.amount}
                        </p>
                        {getStatusBadge(tx.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending requests
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Activity;
