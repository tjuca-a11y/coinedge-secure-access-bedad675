import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Download, ArrowUpRight, ArrowDownLeft, Search, Filter, Eye } from "lucide-react";
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
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <Send className="h-6 w-6" />
            <span className="font-medium">Send Money</span>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <Download className="h-6 w-6" />
            <span className="font-medium">Request Money</span>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <ArrowUpRight className="h-6 w-6" />
            <span className="font-medium">Total Sent</span>
            <span className="text-xl font-bold">{isKycApproved ? "0.015 BTC" : "--"}</span>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <ArrowDownLeft className="h-6 w-6" />
            <span className="font-medium">Total Received</span>
            <span className="text-xl font-bold">{isKycApproved ? "0.025 BTC" : "--"}</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="activity" className="mb-6">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="requests">Requests (0)</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={!isKycApproved}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter} disabled={!isKycApproved}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Transactions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assetFilter} onValueChange={setAssetFilter} disabled={!isKycApproved}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="All Assets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="BTC">BTC</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" disabled={!isKycApproved}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Transactions Table */}
          <Card>
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
    </DashboardLayout>
  );
};

export default Activity;
