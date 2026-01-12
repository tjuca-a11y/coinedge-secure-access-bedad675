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
import { DollarSign, Loader2, AlertCircle, Building2, Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserBankAccounts, useRemoveBankAccount } from "@/hooks/useTreasury";
import { usePlaidLink } from "@/hooks/usePlaidLink";

interface BuyUsdcModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BuyUsdcModal: React.FC<BuyUsdcModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { data: bankAccounts, isLoading: loadingAccounts, refetch: refetchAccounts } = useUserBankAccounts();
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

  const usdAmount = parseFloat(amount) || 0;
  const fee = usdAmount * 0.01; // 1% fee
  const totalUsdc = usdAmount - fee;

  const handleConnectBank = () => {
    if (!user) {
      toast.error("Please sign in first");
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
    if (!user || !profile) {
      toast.error("Please sign in to continue");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Please connect a bank account first");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Create buy order from bank via plaid-transfer
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast.success(`Purchase of ${totalUsdc.toFixed(2)} USDC initiated from your bank`);
      setAmount("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating purchase:", error);
      toast.error(error.message || "Failed to create purchase");
    } finally {
      setIsSubmitting(false);
    }
  };

  const setQuickAmount = (value: number) => {
    setAmount(value.toFixed(2));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-usdc/10 rounded-full">
              <Plus className="h-5 w-5 text-usdc" />
            </div>
            Buy USDC from Bank
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Bank Connection */}
          <div className="space-y-3">
            <Label>Payment Source</Label>
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
                  <p className="text-xs text-muted-foreground">Via Plaid - secure bank linking</p>
                </div>
              </Button>
            )}
            {linkError && (
              <p className="text-sm text-destructive">{linkError}</p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>Amount (USD)</Label>
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
              {[50, 100, 250, 500].map((value) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickAmount(value)}
                  className="flex-1 text-xs"
                >
                  ${value}
                </Button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <Card className="p-4 space-y-3 bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Purchase Amount</span>
              <span className="font-medium">${usdAmount.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fee (1%)</span>
              <span>-${fee.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>You'll receive</span>
              <span>{totalUsdc.toFixed(2)} USDC</span>
            </div>
          </Card>

          {/* Validation Messages */}
          {!selectedAccountId && bankAccounts && bankAccounts.length > 0 && amount && usdAmount > 0 && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              Please select a bank account
            </div>
          )}

          {!bankAccounts?.length && amount && usdAmount > 0 && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              Connect your bank account to continue
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !amount ||
              usdAmount <= 0 ||
              !selectedAccountId
            }
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Buy ${totalUsdc.toFixed(2)} USDC`
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Purchases typically complete within 1-3 business days.
        </p>
      </DialogContent>
    </Dialog>
  );
};
