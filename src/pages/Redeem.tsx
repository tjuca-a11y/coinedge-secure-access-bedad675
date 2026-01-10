import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Gift, Bitcoin, DollarSign, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type RedeemStatus = "idle" | "validating" | "success" | "error";

interface VoucherResult {
  asset: "BTC" | "USDC";
  amount: string;
  code: string;
}

const Redeem: React.FC = () => {
  const { isKycApproved, profile } = useAuth();
  const [voucherCode, setVoucherCode] = useState("");
  const [status, setStatus] = useState<RedeemStatus>("idle");
  const [result, setResult] = useState<VoucherResult | null>(null);

  // Redirect if KYC not approved
  if (!isKycApproved) {
    return <Navigate to="/kyc" replace />;
  }

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!voucherCode.trim()) {
      toast.error("Please enter a voucher code");
      return;
    }

    setStatus("validating");
    setResult(null);

    // Simulate voucher validation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock validation - in production this would call an API
    const code = voucherCode.toUpperCase().trim();
    
    if (code.startsWith("BTC")) {
      setStatus("success");
      setResult({
        asset: "BTC",
        amount: "0.00100000",
        code,
      });
      toast.success("Voucher redeemed successfully!");
    } else if (code.startsWith("USDC")) {
      setStatus("success");
      setResult({
        asset: "USDC",
        amount: "50.00",
        code,
      });
      toast.success("Voucher redeemed successfully!");
    } else {
      setStatus("error");
      toast.error("Invalid voucher code");
    }
  };

  const handleReset = () => {
    setVoucherCode("");
    setStatus("idle");
    setResult(null);
  };

  return (
    <DashboardLayout title="Redeem Voucher" subtitle="Enter your voucher code to receive crypto">
      <div className="max-w-xl mx-auto">
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
                    Your {result.asset} has been added to your wallet
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
                        Added to your wallet
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Receiving Address:</strong>
                  </p>
                  <code className="text-xs break-all">
                    {result.asset === "BTC" ? profile?.btc_address : profile?.usdc_address}
                  </code>
                </div>
                <Button onClick={handleReset} variant="outline" className="w-full">
                  Redeem Another Voucher
                </Button>
              </div>
            ) : status === "error" ? (
              <div className="space-y-6">
                <div className="text-center p-6 bg-destructive/5 rounded-lg border border-destructive/20">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Invalid Voucher</h3>
                  <p className="text-muted-foreground">
                    The voucher code you entered is invalid or has already been redeemed.
                  </p>
                </div>
                <Button onClick={handleReset} className="w-full">
                  Try Again
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRedeem} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="voucherCode">Voucher Code</Label>
                  <Input
                    id="voucherCode"
                    placeholder="Enter your voucher code"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    disabled={status === "validating"}
                    className="text-center text-lg font-mono tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Demo codes: BTC-XXXXX for Bitcoin, USDC-XXXXX for USD Coin
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full gap-2" 
                  disabled={status === "validating" || !voucherCode.trim()}
                >
                  {status === "validating" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Gift className="h-4 w-4" />
                      Redeem Voucher
                    </>
                  )}
                </Button>

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
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Redeem;
