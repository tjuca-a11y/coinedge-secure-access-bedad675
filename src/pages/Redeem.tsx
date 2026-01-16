import { useState, useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { Gift, Bitcoin, DollarSign, CheckCircle, AlertCircle, Shield, Loader2, Camera, X, Keyboard, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { useCoinEdgeTransfer } from "@/hooks/useCoinEdgeTransfer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Html5Qrcode } from "html5-qrcode";

type RedeemStatus = "idle" | "validating" | "redeeming" | "success" | "error";

interface VoucherResult {
  asset: "BTC" | "USDC";
  amount: string;
  code: string;
  btcPrice?: number;
  txHash?: string;
}

const Redeem = () => {
  const { profile, isKycApproved } = useAuth();
  const { btcWallet, ethWallet, isConnected, isWalletInitializing } = useDynamicWallet();
  const { validateVoucher, getQuote, executeTransfer, isLoading } = useCoinEdgeTransfer();

  const [voucherCode, setVoucherCode] = useState("");
  const [status, setStatus] = useState<RedeemStatus>("idle");
  const [result, setResult] = useState<VoucherResult | null>(null);
  const [validatedVoucher, setValidatedVoucher] = useState<{ amount: number; asset: "BTC" | "USDC" } | null>(null);
  const [inputMode, setInputMode] = useState<"manual" | "scanner">("manual");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Redirect if KYC not approved
  if (!isKycApproved) {
    return <Navigate to="/kyc" replace />;
  }

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanner = async () => {
    if (!scannerContainerRef.current) return;

    try {
      setIsScanning(true);
      const scanner = new Html5Qrcode("qr-scanner");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          setVoucherCode(decodedText.toUpperCase());
          stopScanner();
          toast.success("QR code scanned!");
        },
        () => {} // Ignore scan errors
      );
    } catch (err) {
      console.error("Failed to start scanner:", err);
      toast.error("Could not access camera. Please enter code manually.");
      setIsScanning(false);
      setInputMode("manual");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
    setIsScanning(false);
    setInputMode("manual");
  };

  const handleValidate = async () => {
    if (!voucherCode.trim()) {
      toast.error("Please enter a voucher code");
      return;
    }

    if (!isConnected && !isWalletInitializing) {
      toast.error("Wallet is not connected. Please wait.");
      return;
    }

    setStatus("validating");
    setResult(null);
    setValidatedVoucher(null);

    const validation = await validateVoucher(voucherCode.trim());

    if (validation.valid && validation.amount && validation.asset) {
      setValidatedVoucher({ amount: validation.amount, asset: validation.asset });
      setStatus("idle");
      toast.success("Voucher validated! Review details and click Redeem.");
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
      type: "REDEEM",
      amount: validatedVoucher.amount,
      asset: validatedVoucher.asset,
    });

    if (!quote) {
      setStatus("error");
      return;
    }

    // Execute redemption - pass the voucher code!
    const transferResult = await executeTransfer({
      quoteId: quote.quoteId,
      type: "REDEEM",
      voucherCode: voucherCode.trim().toUpperCase(),
    });

    if (transferResult.success) {
      setStatus("success");
      setResult({
        asset: validatedVoucher.asset,
        amount: quote.outputAmount?.toFixed(8) || (validatedVoucher.amount / (quote.rate || 95000)).toFixed(8),
        code: voucherCode.toUpperCase(),
        btcPrice: quote.rate,
        txHash: transferResult.txHash,
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

  const getDestinationAddress = () => {
    if (!validatedVoucher) return null;
    return validatedVoucher.asset === "BTC"
      ? btcWallet?.address || profile?.btc_address
      : ethWallet?.address || profile?.usdc_address;
  };

  return (
    <DashboardLayout
      title="Redeem Gift Card"
      subtitle="Convert your gift card voucher to Bitcoin"
    >
      <div className="max-w-lg mx-auto space-y-6">
        {isWalletInitializing && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-warning text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting to your wallet...
          </div>
        )}

        <Card className="border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto p-3 rounded-full bg-accent/10 w-fit mb-2">
              <Gift className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-xl">Redeem Voucher</CardTitle>
            <CardDescription>
              Enter or scan your gift card code to claim BTC
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === "success" && result ? (
              <div className="space-y-6">
                <div className="text-center p-6 bg-success/5 rounded-lg border border-success/20">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Voucher Redeemed!</h3>
                  <p className="text-muted-foreground mb-4">
                    Your BTC {result.txHash ? "has been sent" : "will be sent"} to your wallet
                  </p>
                  <div className="flex items-center justify-center gap-3 p-4 bg-card rounded-lg">
                    <Bitcoin className="h-8 w-8 text-btc" />
                    <div className="text-left">
                      <p className="text-2xl font-bold text-btc">
                        +{result.amount} BTC
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ≈ ${validatedVoucher?.amount.toFixed(2)} USD
                      </p>
                    </div>
                  </div>
                  {result.btcPrice && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Rate: ${result.btcPrice.toLocaleString()}/BTC
                    </p>
                  )}
                </div>

                {result.txHash && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Transaction ID:</p>
                    <code className="text-xs break-all font-mono">{result.txHash}</code>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Receiving Address:</strong>
                  </p>
                  <code className="text-xs break-all">
                    {btcWallet?.address || profile?.btc_address}
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
                    There was an issue processing your voucher. Please check the code and try again.
                  </p>
                </div>
                <Button onClick={handleReset} variant="outline" className="w-full">
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Input Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={inputMode === "manual" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (isScanning) stopScanner();
                      setInputMode("manual");
                    }}
                  >
                    <Keyboard className="h-4 w-4 mr-2" />
                    Enter Code
                  </Button>
                  <Button
                    variant={inputMode === "scanner" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setInputMode("scanner");
                      if (!isScanning) startScanner();
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Scan QR
                  </Button>
                </div>

                {/* QR Scanner */}
                {inputMode === "scanner" && (
                  <div className="space-y-3">
                    <div
                      id="qr-scanner"
                      ref={scannerContainerRef}
                      className="w-full aspect-square bg-muted rounded-lg overflow-hidden"
                    />
                    {isScanning && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={stopScanner}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel Scanning
                      </Button>
                    )}
                  </div>
                )}

                {/* Manual Input */}
                {inputMode === "manual" && (
                  <div className="space-y-3">
                    <Input
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="Enter voucher code (e.g., DEMO-100-BTC)"
                      className="font-mono text-center text-lg tracking-wider"
                      disabled={status === "validating" || status === "redeeming"}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Try: DEMO-100-BTC, DEMO-50-BTC, or DEMO-25-BTC
                    </p>
                  </div>
                )}

                {/* Validated Voucher Preview */}
                {validatedVoucher && (
                  <div className="p-4 bg-success/5 border border-success/20 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Voucher Code:</span>
                      <span className="font-mono font-bold">{voucherCode.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Value:</span>
                      <span className="font-bold text-lg">${validatedVoucher.amount.toFixed(2)} USD</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Receive:</span>
                      <div className="flex items-center gap-2">
                        <Bitcoin className="h-5 w-5 text-btc" />
                        <span className="font-bold text-btc">Bitcoin (BTC)</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Sending to: <span className="font-mono">{getDestinationAddress()?.slice(0, 8)}...{getDestinationAddress()?.slice(-6)}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  {!validatedVoucher ? (
                    <Button
                      onClick={handleValidate}
                      disabled={!voucherCode.trim() || status === "validating" || isLoading}
                      className="w-full"
                    >
                      {status === "validating" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        "Validate Code"
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRedeem}
                      disabled={status === "redeeming" || isLoading}
                      className="w-full bg-accent hover:bg-accent/90"
                    >
                      {status === "redeeming" ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Redeeming...
                        </>
                      ) : (
                        <>
                          <Bitcoin className="h-4 w-4 mr-2" />
                          Redeem to Wallet
                        </>
                      )}
                    </Button>
                  )}

                  {validatedVoucher && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="w-full text-muted-foreground"
                    >
                      Use Different Code
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="bg-muted/50 border-muted">
          <CardContent className="pt-6 space-y-4">
            <h4 className="font-semibold">How it works</h4>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <p className="text-muted-foreground">
                  Enter or scan your gift card voucher code
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <p className="text-muted-foreground">
                  Validate the code to see the USD value
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <p className="text-muted-foreground">
                  Click Redeem to receive BTC at current market rate
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <p className="text-muted-foreground">
                  BTC is sent directly to your self-custody wallet
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Redeem;
