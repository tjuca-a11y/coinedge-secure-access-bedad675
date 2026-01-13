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
import { ArrowRight, ArrowUpRight, Bitcoin, DollarSign, Loader2, AlertCircle, Wallet, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

type OrderType = "BUY_BTC" | "SELL_BTC";
type PaymentMethod = "usdc_wallet" | "plaid_bank";

export const BuySellBtcModal: React.FC<BuySellBtcModalProps> = ({
  open,
  onOpenChange,
  currentBtcPrice,
  btcBalance,
  usdcBalance,
}) => {
  const { user, profile, isKycApproved } = useAuth();
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("usdc_wallet");
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);

  // Calculate conversion
  const usdAmount = parseFloat(amount) || 0;
  const btcAmount = usdAmount / currentBtcPrice;
  const fee = usdAmount * 0.01; // 1% fee
  const totalCost = usdAmount + fee;

  // For sell: user enters USD they want to receive
  const btcToSell = usdAmount / currentBtcPrice;
  const sellFee = usdAmount * 0.01;
  const totalReceive = usdAmount - sellFee;

  // Reset amount when tab changes
  useEffect(() => {
    setAmount("");
    setPaymentMethod("usdc_wallet");
  }, [activeTab]);

  const handleConnectPlaid = () => {
    // TODO: Integrate with Plaid Link
    toast.info("Plaid integration coming soon! For now, please use your USDC wallet.");
  };

  const handleSubmit = async () => {
    if (!user || !profile) {
      toast.error("Please sign in to continue");
      return;
    }

    if (!isKycApproved) {
      toast.error("Please complete KYC verification to trade");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const orderType: OrderType = activeTab === "buy" ? "BUY_BTC" : "SELL_BTC";
    const btcAmt = activeTab === "buy" ? btcAmount : btcToSell;
    const usdcAmt = activeTab === "buy" ? totalCost : usdAmount;
    const feeAmt = activeTab === "buy" ? fee : sellFee;

    // Validation
    if (activeTab === "buy" && paymentMethod === "usdc_wallet" && totalCost > usdcBalance) {
      toast.error("Insufficient USDC balance");
      return;
    }

    if (activeTab === "buy" && paymentMethod === "plaid_bank" && !isPlaidConnected) {
      toast.error("Please connect your bank account first");
      return;
    }

    if (activeTab === "sell" && btcToSell > btcBalance) {
      toast.error("Insufficient BTC balance");
      return;
    }

    // Get destination address
    const destinationAddress = activeTab === "buy" ? profile.btc_address : profile.usdc_address;
    if (!destinationAddress) {
      toast.error(`Please set up your ${activeTab === "buy" ? "BTC" : "USDC"} wallet address first`);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("customer_swap_orders").insert({
        customer_id: user.id,
        order_type: orderType,
        btc_amount: btcAmt,
        usdc_amount: usdcAmt,
        btc_price_at_order: currentBtcPrice,
        fee_usdc: feeAmt,
        destination_address: destinationAddress,
        status: "PENDING",
      });

      if (error) throw error;

      toast.success(
        activeTab === "buy"
          ? `Order placed to buy ${btcAmt.toFixed(8)} BTC`
          : `Order placed to sell ${btcToSell.toFixed(8)} BTC`
      );
      
      setAmount("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating swap order:", error);
      toast.error(error.message || "Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setQuickAmount = (pct: number) => {
    if (activeTab === "buy") {
      const maxSpend = usdcBalance / 1.01; // Account for 1% fee
      setAmount((maxSpend * pct).toFixed(2));
    } else {
      const maxReceive = btcBalance * currentBtcPrice * 0.99; // After 1% fee
      setAmount((maxReceive * pct).toFixed(2));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                className="w-full gap-2"
              >
                <Building2 className="h-4 w-4" />
                Connect Bank Account
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
                  onChange={(e) => setAmount(e.target.value)}
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

            {paymentMethod === "plaid_bank" && !isPlaidConnected && amount && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                Connect your bank account to continue
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                !amount || 
                (paymentMethod === "usdc_wallet" && totalCost > usdcBalance) ||
                (paymentMethod === "plaid_bank" && !isPlaidConnected)
              }
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Buy ${btcAmount.toFixed(8)} BTC`
              )}
            </Button>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4 mt-4">
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
                  onChange={(e) => setAmount(e.target.value)}
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
                <span className="text-muted-foreground">Fee (1%)</span>
                <span>-${sellFee.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>You'll receive</span>
                <span>${totalReceive.toFixed(2)} USDC</span>
              </div>
            </Card>

            {btcToSell > btcBalance && amount && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                Insufficient BTC balance
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !amount || btcToSell > btcBalance}
              className="w-full"
              variant="destructive"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Sell ${btcToSell.toFixed(8)} BTC`
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground text-center">
          Trades are executed against CoinEdge inventory. Orders are processed within minutes.
        </p>
      </DialogContent>
    </Dialog>
  );
};
