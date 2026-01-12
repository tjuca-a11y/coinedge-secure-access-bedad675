import React, { useState } from "react";
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
import { DollarSign, Loader2, AlertCircle, Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);

  const usdAmount = parseFloat(amount) || 0;
  const fee = usdAmount * 0.01; // 1% fee
  const totalUsdc = usdAmount - fee;

  const handleConnectPlaid = () => {
    // TODO: Integrate with Plaid Link
    toast.info("Plaid integration coming soon!");
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

    if (!isPlaidConnected) {
      toast.error("Please connect your bank account first");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Create buy order from bank
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
            {isPlaidConnected ? (
              <Card className="p-3 flex items-center gap-3 bg-muted/50">
                <Building2 className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Bank Account Connected</p>
                  <p className="text-xs text-muted-foreground">****1234</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleConnectPlaid}>
                  Change
                </Button>
              </Card>
            ) : (
              <Button
                variant="outline"
                onClick={handleConnectPlaid}
                className="w-full gap-2 h-auto py-4"
              >
                <Building2 className="h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Connect Bank Account</p>
                  <p className="text-xs text-muted-foreground">Via Plaid - secure bank linking</p>
                </div>
              </Button>
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
          {!isPlaidConnected && amount && usdAmount > 0 && (
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
              !isPlaidConnected
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
