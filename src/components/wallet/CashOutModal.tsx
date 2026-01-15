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
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DollarSign,
  Loader2,
  AlertCircle,
  Building2,
  Bitcoin,
  Plus,
  Check,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDynamicWallet } from "@/contexts/DynamicWalletContext";
import { useUserBankAccounts, useCreateCashoutOrder, useRemoveBankAccount } from "@/hooks/useTreasury";
import { usePlaidLink } from "@/hooks/usePlaidLink";
import { KycBanner } from "@/components/kyc/KycBanner";

interface CashOutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  btcBalance: number;
  usdcBalance: number;
  currentBtcPrice: number;
}

type SourceAsset = "BTC" | "USDC";

export const CashOutModal: React.FC<CashOutModalProps> = ({
  open,
  onOpenChange,
  btcBalance,
  usdcBalance,
  currentBtcPrice,
}) => {
  const { user, isKycApproved: supabaseKycApproved } = useAuth();
  const { isAuthenticated: isDynamicAuthenticated, syncedProfile } = useDynamicWallet();
  
  // Check auth and KYC from either source
  const isAuthenticated = !!user || isDynamicAuthenticated;
  const isKycApproved = isDynamicAuthenticated 
    ? syncedProfile?.kycStatus === 'approved' 
    : supabaseKycApproved;
  
  const [sourceAsset, setSourceAsset] = useState<SourceAsset>("USDC");
  const [amount, setAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Pass Dynamic user ID if available
  const { data: bankAccounts, isLoading: loadingAccounts, refetch: refetchAccounts } = useUserBankAccounts(syncedProfile?.userId);
  const createCashout = useCreateCashoutOrder();
  const removeAccount = useRemoveBankAccount();
  
  // Plaid Link integration
  const { openPlaidLink, isLoading: isLinkingBank, error: linkError } = usePlaidLink(() => {
    refetchAccounts();
  });

  // Auto-select primary account
  useEffect(() => {
    if (bankAccounts && bankAccounts.length > 0 && !selectedAccountId) {
      const primary = bankAccounts.find((a) => a.is_primary) || bankAccounts[0];
      setSelectedAccountId(primary.id);
    }
  }, [bankAccounts, selectedAccountId]);

  // Calculate amounts based on source asset
  const usdAmount = parseFloat(amount) || 0;
  const sourceAmount = sourceAsset === "USDC" ? usdAmount : usdAmount / currentBtcPrice;
  const fee = Math.max(1, usdAmount * 0.005); // 0.5% min $1
  const totalReceive = usdAmount - fee;

  // Balance check
  const maxBalance = sourceAsset === "USDC" ? usdcBalance : btcBalance * currentBtcPrice;
  const insufficientBalance = usdAmount > maxBalance;

  const handleConnectBank = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in first");
      return;
    }
    if (!isKycApproved) {
      toast.error("Please complete KYC verification first");
      return;
    }
    openPlaidLink();
  };

  const handleRemoveAccount = async (accountId: string) => {
    if (confirm("Remove this bank account?")) {
      await removeAccount.mutateAsync(accountId);
      if (selectedAccountId === accountId) {
        setSelectedAccountId(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in first");
      return;
    }

    if (!isKycApproved) {
      toast.error("Please complete KYC verification to cash out");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Please select a bank account");
      return;
    }

    if (!amount || usdAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (insufficientBalance) {
      toast.error(`Insufficient ${sourceAsset} balance`);
      return;
    }

    try {
      await createCashout.mutateAsync({
        bank_account_id: selectedAccountId,
        source_asset: sourceAsset,
        source_amount: sourceAmount,
        usd_amount: usdAmount,
      });

      setAmount("");
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const setQuickAmount = (pct: number) => {
    const max = maxBalance * 0.995; // Account for fee
    setAmount((max * pct).toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            Cash Out to Bank
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* KYC Banner if not approved */}
          {!isKycApproved && <KycBanner />}
          {/* Source Asset Selection */}
          <div className="space-y-3">
            <Label>Sell from</Label>
            <RadioGroup
              value={sourceAsset}
              onValueChange={(v) => {
                setSourceAsset(v as SourceAsset);
                setAmount("");
              }}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="usdc_source"
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  sourceAsset === "USDC"
                    ? "border-usdc bg-usdc/5"
                    : "border-border hover:border-usdc/50"
                }`}
              >
                <RadioGroupItem value="USDC" id="usdc_source" className="sr-only" />
                <DollarSign className="h-5 w-5 text-usdc" />
                <span className="text-sm font-medium">USDC</span>
                <span className="text-xs text-muted-foreground">
                  ${usdcBalance.toFixed(2)}
                </span>
              </Label>
              <Label
                htmlFor="btc_source"
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  sourceAsset === "BTC"
                    ? "border-btc bg-btc/5"
                    : "border-border hover:border-btc/50"
                }`}
              >
                <RadioGroupItem value="BTC" id="btc_source" className="sr-only" />
                <Bitcoin className="h-5 w-5 text-btc" />
                <span className="text-sm font-medium">Bitcoin</span>
                <span className="text-xs text-muted-foreground">
                  ≈${(btcBalance * currentBtcPrice).toFixed(2)}
                </span>
              </Label>
            </RadioGroup>
          </div>

          {/* Bank Account Selection */}
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
                      selectedAccountId === account.id
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedAccountId(account.id)}
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
                    {selectedAccountId === account.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAccount(account.id);
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
                  onClick={handleConnectBank}
                  disabled={isLinkingBank}
                  className="w-full gap-2"
                >
                  {isLinkingBank ? (
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
                onClick={handleConnectBank}
                disabled={isLinkingBank}
                className="w-full gap-2 h-auto py-4"
              >
                {isLinkingBank ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
                <div className="text-left">
                  <p className="font-medium">Connect Bank Account</p>
                  <p className="text-xs text-muted-foreground">
                    Via Plaid - secure bank linking
                  </p>
                </div>
              </Button>
            )}
            {linkError && (
              <p className="text-sm text-destructive">{linkError}</p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Amount (USD)</Label>
              <span className="text-xs text-muted-foreground">
                Max: ${maxBalance.toFixed(2)}
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

          {/* Summary */}
          <Card className="p-4 space-y-3 bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">You're selling</span>
              <span className="font-medium flex items-center gap-1">
                {sourceAsset === "BTC" ? (
                  <>
                    <Bitcoin className="h-4 w-4 text-btc" />
                    {sourceAmount.toFixed(8)} BTC
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 text-usdc" />
                    {usdAmount.toFixed(2)} USDC
                  </>
                )}
              </span>
            </div>
            {sourceAsset === "BTC" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span>${currentBtcPrice.toLocaleString()}/BTC</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fee (0.5%)</span>
              <span>-${fee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>You'll receive</span>
              <span>${totalReceive.toFixed(2)} USD</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Arrives in 1-3 business days</span>
            </div>
          </Card>

          {/* Validation Messages */}
          {insufficientBalance && amount && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              Insufficient {sourceAsset} balance
            </div>
          )}

          {!selectedAccountId && bankAccounts && bankAccounts.length > 0 && amount && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              Please select a bank account
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={
              createCashout.isPending ||
              !amount ||
              insufficientBalance ||
              !selectedAccountId ||
              usdAmount <= 0
            }
            className="w-full"
          >
            {createCashout.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Cash Out $${totalReceive.toFixed(2)} to Bank`
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Funds are transferred via ACH and typically arrive within 1-3 business days.
        </p>
      </DialogContent>
    </Dialog>
  );
};
