import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { useCoinEdgeTransfer } from "@/hooks/useCoinEdgeTransfer";
import { Gift, Bitcoin, DollarSign, CheckCircle, AlertCircle, Loader2, Shield, Wallet } from "lucide-react";
import { toast } from "sonner";

type RedeemStatus = "idle" | "validating" | "redeeming" | "success" | "error";

interface VoucherResult {
  asset: "BTC" | "USDC";
  amount: string;
  code: string;
}

const Redeem: React.FC = () => {
  const { isKycApproved, profile } = useAuth();
  const { isConnected, btcWallet, ethWallet, connectWallet } = useDynamicWallet();
  const { validateVoucher, executeTransfer, getQuote, isLoading } = useCoinEdgeTransfer();
  
  const [voucherCode, setVoucherCode] = useState("");
  const [status, setStatus] = useState<RedeemStatus>("idle");
  const [result, setResult] = useState<VoucherResult | null>(null);
  const [validatedVoucher, setValidatedVoucher] = useState<{ amount: number; asset: 'BTC' | 'USDC' } | null>(null);

  // Redirect if KYC not approved
  if (!isKycApproved) {
    return <Navigate to="/kyc" replace />;
  }

  const handleValidate = async () => {
    if (!voucherCode.trim()) {
      toast.error("Please enter a voucher code");
      return;
    }

    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setStatus("validating");
    setResult(null);
    setValidatedVoucher(null);

    const validation = await validateVoucher(voucherCode.trim());

    if (validation.valid && validation.amount && validation.asset) {
      setValidatedVoucher({ amount: validation.amount, asset: validation.asset });
      setStatus("idle");
      toast.success("Voucher validated! Click Redeem to claim.");
    } else {
      setStatus("error");
      toast.error(validation.error || "Invalid voucher code");
    }
  };

  const handleRedeem = async () => {
    if (!validatedVoucher) {
      toast.error("Please validate the voucher first");
      return;
    }

    setStatus("redeeming");

    // Get quote for redemption
    const quote = await getQuote({
      type: 'REDEEM',
      amount: validatedVoucher.amount,
      asset: validatedVoucher.asset,
    });

    if (!quote) {
      setStatus("error");
      return;
    }

    // Execute redemption
    const transferResult = await executeTransfer({
      quoteId: quote.quoteId,
      type: 'REDEEM',
    });

    if (transferResult.success) {
      setStatus("success");
      setResult({
        asset: validatedVoucher.asset,
        amount: validatedVoucher.asset === 'BTC' 
          ? (validatedVoucher.amount / 93327.91).toFixed(8) // Convert USD to BTC at mock price
          : validatedVoucher.amount.toFixed(2),
        code: voucherCode.toUpperCase(),
      });
    } else {
      setStatus("error");
    }
  };

  const handleReset = () => {
    setVoucherCode("");
    setStatus("idle");
    setResult(null);
    setValidatedVoucher(null);
  };

  // Get destination address based on validated asset
  const getDestinationAddress = () => {
    if (!validatedVoucher) return null;
    return validatedVoucher.asset === 'BTC' 
      ? (btcWallet?.address || profile?.btc_address)
      : (ethWallet?.address || profile?.usdc_address);
  };

  return (
    <DashboardLayout title="Redeem Voucher" subtitle="Enter your voucher code to receive crypto">
      <div className="max-w-xl mx-auto">
        {/* Wallet connection card */}
        {!isConnected && (
          <Card className="mb-4 border-amber-500/50 bg-amber-500/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-full">
                    <Wallet className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Connect Your Wallet</p>
                    <p className="text-sm text-muted-foreground">
                      Connect to receive funds to your self-custody wallet
                    </p>
                  </div>
                </div>
                <Button onClick={connectWallet}>Connect</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto p-4 bg-accent/10 rounded-full w-fit mb-4">
              <Gift className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-2xl">Redeem Your Voucher</CardTitle>
            <CardDescription>
              Enter the voucher code to receive BTC or USDC directly to your self-custody wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "success" && result ? (
              <div className="space-y-6">
                <div className="text-center p-6 bg-success/5 rounded-lg border border-success/20">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Voucher Redeemed!</h3>
                  <p className="text-muted-foreground mb-4">
                    Your {result.asset} has been sent to your wallet
                  </p>
                  <div className="flex items-center justify-center gap-3 p-4 bg-card rounded-lg">
                    {result.asset === "BTC" ? (
                      <Bitcoin className="h-8 w-8 text-btc" />
                    ) : (
                      <DollarSign className="h-8 w-8 text-usdc" />
                    )}
                    <div className="text-left">
                      <p className="text-2xl font-bold">
                        +{result.amount} {result.asset}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Sent to your self-custody wallet
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Receiving Address:</strong>
                  </p>
                  <code className="text-xs break-all">
                    {result.asset === "BTC" 
                      ? (btcWallet?.address || profile?.btc_address)
                      : (ethWallet?.address || profile?.usdc_address)}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 p-3 rounded">
                  <Shield className="h-4 w-4 text-primary" />
                  Funds are now in your self-custody wallet. Only you control them.
                </div>
                <Button onClick={handleReset} variant="outline" className="w-full">
                  Redeem Another Voucher
                </Button>
              </div>
            ) : status === "error" ? (
              <div className="space-y-6">
                <div className="text-center p-6 bg-destructive/5 rounded-lg border border-destructive/20">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Redemption Failed</h3>
                  <p className="text-muted-foreground">
                    The voucher code you entered is invalid or has already been redeemed.
                  </p>
                </div>
                <Button onClick={handleReset} className="w-full">
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="voucherCode">Voucher Code</Label>
                  <Input
                    id="voucherCode"
                    placeholder="Enter your voucher code"
                    value={voucherCode}
                    onChange={(e) => {
                      setVoucherCode(e.target.value.toUpperCase());
                      setValidatedVoucher(null);
                    }}
                    disabled={status === "validating" || status === "redeeming"}
                    className="text-center text-lg font-mono tracking-wider"
                  />
                </div>

                {/* Validated voucher info */}
                {validatedVoucher && (
                  <Card className="p-4 bg-success/5 border-success/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <div>
                        <p className="font-medium">Valid Voucher</p>
                        <p className="text-sm text-muted-foreground">
                          ${validatedVoucher.amount.toFixed(2)} USD in {validatedVoucher.asset}
                        </p>
                      </div>
                    </div>
                    {getDestinationAddress() && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">Will be sent to:</p>
                        <code className="text-xs break-all">{getDestinationAddress()}</code>
                      </div>
                    )}
                  </Card>
                )}

                <div className="flex gap-2">
                  {!validatedVoucher ? (
                    <Button 
                      onClick={handleValidate}
                      className="flex-1 gap-2" 
                      disabled={status === "validating" || !voucherCode.trim() || !isConnected || isLoading}
                    >
                      {status === "validating" || isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        "Validate Code"
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleRedeem}
                      className="flex-1 gap-2" 
                      disabled={status === "redeeming" || isLoading}
                    >
                      {status === "redeeming" || isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Redeeming...
                        </>
                      ) : (
                        <>
                          <Gift className="h-4 w-4" />
                          Redeem to Wallet
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">How it works</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-foreground">1.</span>
                      Enter your voucher code above
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-foreground">2.</span>
                      We verify the voucher and check the amount
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-foreground">3.</span>
                      BTC or USDC is sent directly to your self-custody wallet
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-foreground">4.</span>
                      You control the funds — CoinEdge cannot access them
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Redeem;
