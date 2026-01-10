import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, Delete, X, ArrowLeft, UserPlus, Link2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { toast } from "sonner";

type RequestStep = "closed" | "description" | "recipient";

const PayRequest: React.FC = () => {
  const { isKycApproved } = useAuth();
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState("USD");
  
  // Request flow state
  const [requestStep, setRequestStep] = useState<RequestStep>("closed");
  const [requestDescription, setRequestDescription] = useState("");

  const handleNumberPress = (num: string) => {
    if (!isKycApproved) {
      toast.error("Complete KYC to use this feature");
      return;
    }
    
    if (num === "." && amount.includes(".")) return;
    if (amount === "0" && num !== ".") {
      setAmount(num);
    } else {
      if (amount.includes(".")) {
        const decimals = amount.split(".")[1];
        if (decimals && decimals.length >= 2) return;
      }
      setAmount(amount + num);
    }
  };

  const handleDelete = () => {
    if (amount.length <= 1) {
      setAmount("0");
    } else {
      setAmount(amount.slice(0, -1));
    }
  };

  const handlePay = () => {
    if (!isKycApproved) {
      toast.error("Complete KYC to send funds");
      return;
    }
    if (amount === "0" || amount === "") {
      toast.error("Enter an amount");
      return;
    }
    toast.success(`Ready to pay $${amount} ${currency}`);
  };

  const handleRequest = () => {
    if (!isKycApproved) {
      toast.error("Complete KYC to request funds");
      return;
    }
    if (amount === "0" || amount === "") {
      toast.error("Enter an amount");
      return;
    }
    setRequestStep("description");
  };

  const handleContinueToRecipient = () => {
    setRequestStep("recipient");
  };

  const handleAddRecipient = () => {
    toast.success(`Request created for $${amount} for ${requestDescription || "payment"}`);
    resetRequestFlow();
  };

  const handleShareLink = () => {
    toast.success("Payment link copied to clipboard!");
    resetRequestFlow();
  };

  const resetRequestFlow = () => {
    setRequestStep("closed");
    setRequestDescription("");
    setAmount("0");
  };

  const handleBack = () => {
    if (requestStep === "recipient") {
      setRequestStep("description");
    } else {
      setRequestStep("closed");
    }
  };

  const formatAmount = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "$0";
    if (value.includes(".")) {
      return `$${value}`;
    }
    return `$${num.toLocaleString()}`;
  };

  return (
    <DashboardLayout title="" subtitle="" hideHeader>
      <div className="flex flex-col items-center justify-between min-h-[calc(100vh-180px)] md:min-h-[calc(100vh-120px)] py-4 md:py-8">
        {/* Amount Display */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground tracking-tight">
            {formatAmount(amount)}
          </h1>
          
          {/* Currency Selector */}
          <Select value={currency} onValueChange={setCurrency} disabled={!isKycApproved}>
            <SelectTrigger className="w-auto gap-1 bg-muted/50 border-0 rounded-full px-4 py-2 h-auto">
              <SelectValue />
              <ChevronDown className="h-3 w-3 opacity-50" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="BTC">BTC</SelectItem>
              <SelectItem value="USDC">USDC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Numeric Keypad */}
        <div className="w-full max-w-xs mx-auto space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberPress(num)}
                disabled={!isKycApproved}
                className="h-14 md:h-16 text-2xl md:text-3xl font-medium text-foreground hover:bg-muted/50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleDelete}
              disabled={!isKycApproved}
              className="h-14 md:h-16 flex items-center justify-center text-foreground hover:bg-muted/50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Delete className="h-6 w-6" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleRequest}
              disabled={!isKycApproved}
              variant="secondary"
              className="flex-1 h-12 md:h-14 text-base md:text-lg font-medium rounded-full bg-muted hover:bg-muted/80"
            >
              Request
            </Button>
            <Button
              onClick={handlePay}
              disabled={!isKycApproved}
              className="flex-1 h-12 md:h-14 text-base md:text-lg font-medium rounded-full bg-muted hover:bg-muted/80 text-foreground"
            >
              Pay
            </Button>
          </div>

          {!isKycApproved && (
            <p className="text-center text-sm text-muted-foreground">
              Complete KYC verification to send and request payments
            </p>
          )}
        </div>
      </div>

      {/* Request Description Drawer */}
      <Drawer open={requestStep === "description"} onOpenChange={(open) => !open && setRequestStep("closed")}>
        <DrawerContent className="bg-card border-t border-border">
          <div className="p-6 space-y-6">
            <button 
              onClick={() => setRequestStep("closed")}
              className="absolute top-4 left-4 p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>

            <div className="pt-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Request {formatAmount(amount)} <span className="text-muted-foreground font-normal">for</span>
              </h2>
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-center gap-4">
                <Input
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  placeholder="Rent, Pizza, Coffee..."
                  className="flex-1 bg-transparent border-0 text-lg text-foreground placeholder:text-muted-foreground focus-visible:ring-0 p-0"
                  autoFocus
                />
                <Button
                  onClick={handleContinueToRecipient}
                  variant="secondary"
                  className="rounded-full px-6 bg-muted hover:bg-muted/80"
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Request Recipient Drawer */}
      <Drawer open={requestStep === "recipient"} onOpenChange={(open) => !open && setRequestStep("closed")}>
        <DrawerContent className="bg-card border-t border-border">
          <div className="p-6 space-y-6">
            <button 
              onClick={handleBack}
              className="absolute top-4 left-4 p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>

            <div className="pt-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Request {formatAmount(amount)} <span className="text-muted-foreground font-normal">for</span>
              </h2>
              <p className="text-2xl md:text-3xl font-bold text-foreground">
                {requestDescription || "payment"}
              </p>
            </div>

            <div className="space-y-3 pt-6">
              <Button
                onClick={handleAddRecipient}
                className="w-full h-14 text-base font-medium rounded-full bg-muted hover:bg-muted/80 text-foreground"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Add recipient
              </Button>
              <Button
                onClick={handleShareLink}
                variant="outline"
                className="w-full h-14 text-base font-medium rounded-full border-2 bg-background hover:bg-muted/50"
              >
                <Link2 className="h-5 w-5 mr-2" />
                Share link
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </DashboardLayout>
  );
};

export default PayRequest;
