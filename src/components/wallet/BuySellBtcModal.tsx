import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, ArrowUpRight, Bitcoin, DollarSign, Loader2, AlertCircle, Wallet, Building2, Shield, Pen, Clock, Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { useCoinEdgeTransfer } from "@/hooks/useCoinEdgeTransfer";
import { usePlaidLink } from "@/hooks/usePlaidLink";
import { useUserBankAccounts, useCreateCashoutOrder, useRemoveBankAccount } from "@/hooks/useTreasury";
import { KycBanner } from "@/components/kyc/KycBanner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

// Mock price data for BTC chart
const btcPriceData = [
  { date: "Jan 4", btc: 91000 },
  { date: "Jan 5", btc: 92500 },
  { date: "Jan 6", btc: 90800 },
  { date: "Jan 7", btc: 93200 },
  { date: "Jan 8", btc: 92100 },
  { date: "Jan 9", btc: 94500 },
  { date: "Jan 10", btc: 93327 },
];

interface BuySellBtcModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBtcPrice: number;
  btcBalance: number;
  usdcBalance: number;
}

type PaymentMethod = "usdc_wallet" | "plaid_bank";
type SellDestination = "usdc_wallet" | "bank_account";

export const BuySellBtcModal: React.FC<BuySellBtcModalProps> = ({
  open,
  onOpenChange,
  currentBtcPrice,
  btcBalance,
  usdcBalance,
}) => {
  const { user, isKycApproved: supabaseKycApproved } = useAuth();
  const { isConnected, btcWallet, signMessage, isWalletInitializing, isAuthenticated: isDynamicAuthenticated, syncedProfile } = useDynamicWallet();
  const { getQuote, executeTransfer, isLoading, quote, clearQuote } = useCoinEdgeTransfer();
  
  // Plaid bank linking hook - track when Plaid modal is open to hide this dialog
  const { openPlaidLink, isLoading: isPlaidLoading, isPlaidOpen } = usePlaidLink(() => {
    setIsPlaidConnected(true);
    toast.success("Bank account connected!");
  });
  
  // Check auth and KYC from either source
  const isAuthenticated = !!user || isDynamicAuthenticated;
  const isKycApproved = isDynamicAuthenticated 
    ? syncedProfile?.kycStatus === 'approved' 
    : supabaseKycApproved;
  
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("usdc_wallet");
  const [sellDestination, setSellDestination] = useState<SellDestination>("usdc_wallet");
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);
  const [showQuote, setShowQuote] = useState(false);

  // Bank accounts for sell-to-bank flow - pass Dynamic user ID if available
  const { data: bankAccounts, isLoading: loadingAccounts, refetch: refetchAccounts } = useUserBankAccounts(syncedProfile?.userId);
  const createCashout = useCreateCashoutOrder();
  const removeAccount = useRemoveBankAccount();
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);

  // Auto-select primary bank account
  useEffect(() => {
    if (bankAccounts && bankAccounts.length > 0 && !selectedBankAccountId) {
      const primary = bankAccounts.find((a) => a.is_primary) || bankAccounts[0];
      setSelectedBankAccountId(primary.id);
    }
  }, [bankAccounts, selectedBankAccountId]);

  // Calculate conversion
  const usdAmount = parseFloat(amount) || 0;
  const btcAmount = usdAmount / currentBtcPrice;
  const fee = usdAmount * 0.01; // 1% fee
  const totalCost = usdAmount + fee;

  // For sell: user enters USD they want to receive
  const btcToSell = usdAmount / currentBtcPrice;
  // Different fees for different destinations
  const sellFeeUsdc = usdAmount * 0.01; // 1% fee for USDC
  const sellFeeBank = Math.max(1, usdAmount * 0.005); // 0.5% min $1 for bank
  const sellFee = sellDestination === "usdc_wallet" ? sellFeeUsdc : sellFeeBank;
  const totalReceive = usdAmount - sellFee;

  // Reset amount when tab changes
  useEffect(() => {
    setAmount("");
    setPaymentMethod("usdc_wallet");
    setSellDestination("usdc_wallet");
    setShowQuote(false);
    clearQuote();
  }, [activeTab, clearQuote]);

  const handleConnectPlaid = () => {
    openPlaidLink();
  };

  const handleConnectPlaidForSell = () => {
    openPlaidLink();
    refetchAccounts();
  };

  const handleRemoveBankAccount = async (accountId: string) => {
    if (confirm("Remove this bank account?")) {
      await removeAccount.mutateAsync(accountId);
      if (selectedBankAccountId === accountId) {
        setSelectedBankAccountId(null);
      }
    }
  };

  const handleGetQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // For bank destination, skip quote and use direct cashout
    if (activeTab === "sell" && sellDestination === "bank_account") {
      setShowQuote(true);
      return;
    }

    const quoteResult = await getQuote({
      type: activeTab === "buy" ? "BUY_BTC" : "SELL_BTC",
      amount: usdAmount,
      asset: activeTab === "buy" ? "USDC" : "BTC",
    });

    if (quoteResult) {
      setShowQuote(true);
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to continue");
      return;
    }

    if (!isKycApproved) {
      toast.error("Please complete KYC verification to trade");
      return;
    }

    // For Dynamic users, wallet might still be initializing - check only if NOT authenticated via Dynamic
    // Dynamic users have embedded wallets managed by backend, so btcWallet may be null
    if (!isDynamicAuthenticated && !btcWallet && isWalletInitializing) {
      toast.error("Wallet is still initializing, please wait...");
      return;
    }

    if (activeTab === "sell" && btcToSell > btcBalance) {
      toast.error("Insufficient BTC balance");
      return;
    }

    // Handle sell-to-bank flow differently
    if (activeTab === "sell" && sellDestination === "bank_account") {
      if (!selectedBankAccountId) {
        toast.error("Please select a bank account");
        return;
      }

      try {
        await createCashout.mutateAsync({
          bank_account_id: selectedBankAccountId,
          source_asset: "BTC",
          source_amount: btcToSell,
          usd_amount: usdAmount,
        });
        setAmount("");
        setShowQuote(false);
        onOpenChange(false);
        toast.success("Sell order submitted! Funds will arrive in 1-3 business days.");
      } catch (error) {
        // Error handled by mutation
      }
      return;
    }

    // Normal USDC sell flow
    if (!quote) {
      toast.error("Please get a quote first");
      return;
    }

    // Validation
    if (activeTab === "buy" && paymentMethod === "usdc_wallet" && totalCost > usdcBalance) {
      toast.error("Insufficient USDC balance");
      return;
    }

    const result = await executeTransfer({
      quoteId: quote.quoteId,
      type: activeTab === "buy" ? "BUY_BTC" : "SELL_BTC",
      // Pass quote data for accurate order recording
      usdcAmount: quote.inputAmount,
      btcAmount: quote.outputAmount,
      btcPrice: quote.rate,
      feeUsdc: quote.fee,
    });

    if (result.success) {
      setAmount("");
      setShowQuote(false);
      onOpenChange(false);
    }
  };

  const setQuickAmount = (pct: number) => {
    if (activeTab === "buy") {
      const maxSpend = usdcBalance / 1.01; // Account for 1% fee
      setAmount((maxSpend * pct).toFixed(2));
    } else {
      const feeMultiplier = sellDestination === "usdc_wallet" ? 0.99 : 0.995;
      const maxReceive = btcBalance * currentBtcPrice * feeMultiplier;
      setAmount((maxReceive * pct).toFixed(2));
    }
    setShowQuote(false);
  };

  // Hide this dialog when Plaid modal is open to prevent z-index conflicts
  const effectiveOpen = open && !isPlaidOpen;

  return (
    <Dialog open={effectiveOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-btc/10 rounded-full">
              <Bitcoin className="h-5 w-5 text-btc" />
            </div>
            Buy or Sell Bitcoin
          </DialogTitle>
        </DialogHeader>

        {/* Bitcoin Price Chart */}
        <Card className="mb-4 bg-muted/30">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-muted-foreground">Bitcoin Price</p>
                <p className="text-xl font-bold">${currentBtcPrice.toLocaleString()}</p>
                <p className="text-xs text-success flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  +2.05% today
                </p>
              </div>
            </div>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={btcPriceData}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
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
                    stroke="hsl(var(--btc))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* KYC Banner if not approved */}
        {!isKycApproved && <KycBanner />}

        {/* Wallet initializing notice */}
        {isKycApproved && isWalletInitializing && (
          <Card className="p-3 border-primary/50 bg-primary/5 mb-4">
            <div className="flex items-center gap-2 text-primary text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up your wallet...
            </div>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "buy" | "sell")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="gap-2">
              <ArrowRight className="h-4 w-4 rotate-[-45deg]" />
              Buy BTC
            </TabsTrigger>
            <TabsTrigger value="sell" className="gap-2">
              <ArrowRight className="h-4 w-4 rotate-[135deg]" />
              Sell BTC
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4 mt-4">
            {/* Payment Method Selection */}
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="usdc_wallet"
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === "usdc_wallet"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="usdc_wallet" id="usdc_wallet" className="sr-only" />
                  <Wallet className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">USDC Wallet</span>
                  <span className="text-xs text-muted-foreground">${usdcBalance.toFixed(2)}</span>
                </Label>
                <Label
                  htmlFor="plaid_bank"
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === "plaid_bank"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="plaid_bank" id="plaid_bank" className="sr-only" />
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Bank Account</span>
                  <span className="text-xs text-muted-foreground">
                    {isPlaidConnected ? "Connected" : "Via Plaid"}
                  </span>
                </Label>
              </RadioGroup>
            </div>

            {/* Plaid Connect Button */}
            {paymentMethod === "plaid_bank" && !isPlaidConnected && (
              <Button
                variant="outline"
                onClick={handleConnectPlaid}
                disabled={isPlaidLoading}
                className="w-full gap-2"
              >
                {isPlaidLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4" />
                    Connect Bank Account
                  </>
                )}
              </Button>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Amount (USD)</Label>
                {paymentMethod === "usdc_wallet" && (
                  <span className="text-xs text-muted-foreground">
                    Available: ${usdcBalance.toFixed(2)} USDC
                  </span>
                )}
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setShowQuote(false);
                  }}
                  className="pl-9"
                />
              </div>
              {paymentMethod === "usdc_wallet" && (
                <div className="flex gap-2">
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <Button
                      key={pct}
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickAmount(pct)}
                      className="flex-1 text-xs"
                    >
                      {pct === 1 ? "Max" : `${pct * 100}%`}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Card className="p-4 space-y-3 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You'll receive</span>
                <span className="font-medium flex items-center gap-1">
                  <Bitcoin className="h-4 w-4 text-btc" />
                  {btcAmount.toFixed(8)} BTC
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span>${currentBtcPrice.toLocaleString()}/BTC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee (1%)</span>
                <span>${fee.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total Cost</span>
                <span>${totalCost.toFixed(2)} USDC</span>
              </div>
            </Card>

            {paymentMethod === "usdc_wallet" && totalCost > usdcBalance && amount && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                Insufficient USDC balance
              </div>
            )}

            {/* Self-custody notice */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
              <Shield className="h-3 w-3" />
              BTC will be sent to your self-custody wallet
            </div>

            <Button
              onClick={showQuote ? handleSubmit : handleGetQuote}
              disabled={
                isLoading || 
                !amount || 
                isWalletInitializing ||
                (paymentMethod === "usdc_wallet" && totalCost > usdcBalance) ||
                (paymentMethod === "plaid_bank" && !isPlaidConnected)
              }
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : showQuote ? (
                `Buy ${btcAmount.toFixed(8)} BTC`
              ) : (
                "Get Quote"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4 mt-4">
            {/* Sell Destination Selection */}
            <div className="space-y-3">
              <Label>Receive as</Label>
              <RadioGroup
                value={sellDestination}
                onValueChange={(v) => {
                  setSellDestination(v as SellDestination);
                  setShowQuote(false);
                }}
                className="grid grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="sell_usdc_wallet"
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    sellDestination === "usdc_wallet"
                      ? "border-usdc bg-usdc/5"
                      : "border-border hover:border-usdc/50"
                  }`}
                >
                  <RadioGroupItem value="usdc_wallet" id="sell_usdc_wallet" className="sr-only" />
                  <Wallet className="h-5 w-5 text-usdc" />
                  <span className="text-sm font-medium">USDC Wallet</span>
                  <span className="text-xs text-muted-foreground">Instant</span>
                </Label>
                <Label
                  htmlFor="sell_bank_account"
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    sellDestination === "bank_account"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="bank_account" id="sell_bank_account" className="sr-only" />
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Bank Account</span>
                  <span className="text-xs text-muted-foreground">1-3 days</span>
                </Label>
              </RadioGroup>
            </div>

            {/* Bank Account Selection for sell-to-bank */}
            {sellDestination === "bank_account" && (
              <div className="space-y-3">
                <Label>Destination Bank Account</Label>
                {loadingAccounts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : bankAccounts && bankAccounts.length > 0 ? (
                  <div className="space-y-2">
                    {bankAccounts.map((account) => (
                      <Card
                        key={account.id}
                        className={`p-3 flex items-center gap-3 cursor-pointer transition-all ${
                          selectedBankAccountId === account.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedBankAccountId(account.id)}
                      >
                        <Building2 className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{account.bank_name}</p>
                          <p className="text-xs text-muted-foreground">
                            ****{account.account_mask} • {account.account_type}
                          </p>
                        </div>
                        {account.is_verified && (
                          <Check className="h-4 w-4 text-success" />
                        )}
                        {selectedBankAccountId === account.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBankAccount(account.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </Card>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnectPlaidForSell}
                      disabled={isPlaidLoading}
                      className="w-full gap-2"
                    >
                      {isPlaidLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add Another Account
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleConnectPlaidForSell}
                    disabled={isPlaidLoading}
                    className="w-full gap-2 h-auto py-4"
                  >
                    {isPlaidLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">Connect Bank Account</p>
                      <p className="text-xs text-muted-foreground">Via Plaid - secure bank linking</p>
                    </div>
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Amount to receive (USD)</Label>
                <span className="text-xs text-muted-foreground">
                  Available: {btcBalance.toFixed(8)} BTC
                </span>
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setShowQuote(false);
                  }}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <Button
                    key={pct}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickAmount(pct)}
                    className="flex-1 text-xs"
                  >
                    {pct === 1 ? "Max" : `${pct * 100}%`}
                  </Button>
                ))}
              </div>
            </div>

            <Card className="p-4 space-y-3 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You'll sell</span>
                <span className="font-medium flex items-center gap-1">
                  <Bitcoin className="h-4 w-4 text-btc" />
                  {btcToSell.toFixed(8)} BTC
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span>${currentBtcPrice.toLocaleString()}/BTC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Fee ({sellDestination === "usdc_wallet" ? "1%" : "0.5%"})
                </span>
                <span>-${sellFee.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>You'll receive</span>
                <span>
                  ${totalReceive.toFixed(2)} {sellDestination === "usdc_wallet" ? "USDC" : "USD"}
                </span>
              </div>
              {sellDestination === "bank_account" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Arrives in 1-3 business days</span>
                </div>
              )}
            </Card>

            {btcToSell > btcBalance && amount && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                Insufficient BTC balance
              </div>
            )}

            {sellDestination === "bank_account" && !selectedBankAccountId && bankAccounts && bankAccounts.length > 0 && amount && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                Please select a bank account
              </div>
            )}

            {/* Signing notice for sells */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
              <Pen className="h-3 w-3" />
              You'll sign a message to authorize this transfer
            </div>

            <Button
              onClick={showQuote ? handleSubmit : handleGetQuote}
              disabled={
                (isLoading || createCashout.isPending) || 
                !amount || 
                isWalletInitializing || 
                btcToSell > btcBalance ||
                (sellDestination === "bank_account" && !selectedBankAccountId)
              }
              className="w-full"
              variant="destructive"
            >
              {(isLoading || createCashout.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : showQuote ? (
                sellDestination === "usdc_wallet" 
                  ? `Sell ${btcToSell.toFixed(8)} BTC` 
                  : `Sell for $${totalReceive.toFixed(2)} to Bank`
              ) : (
                "Get Quote"
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground text-center">
          Trades are executed wallet-to-wallet. CoinEdge is the counterparty. Orders are processed within minutes.
        </p>
      </DialogContent>
    </Dialog>
  );
};
