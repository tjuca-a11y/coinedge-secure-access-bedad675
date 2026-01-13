import React, { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, Delete, X, ArrowLeft, Link2, ScanLine, Search, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { z } from "zod";

type RequestStep = "closed" | "description" | "recipient" | "confirm" | "scanner";
type SendStep = "closed" | "recipient" | "confirm" | "scanner";

interface Contact {
  id: string;
  name: string;
  email?: string;
  address?: string;
  initials: string;
  color: string;
}

// Mock recent contacts
const recentContacts: Contact[] = [
  { id: "1", name: "Alex Johnson", email: "alex@email.com", initials: "AJ", color: "bg-blue-500" },
  { id: "2", name: "Sarah Miller", email: "sarah@email.com", initials: "SM", color: "bg-purple-500" },
  { id: "3", name: "Mike Chen", email: "mike@email.com", initials: "MC", color: "bg-green-500" },
  { id: "4", name: "Emma Wilson", address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", initials: "EW", color: "bg-orange-500" },
];

// Mock balances (in real app, fetch from backend)
const mockBtcBalance = 0.05;
const mockUsdcBalance = 500;
const currentBtcPrice = 93327.91;

// Network fee estimates
const NETWORK_FEES = {
  BTC: 0.00005, // ~$5 at current prices
  USDC: 2.50, // ~$2.50 on Ethereum
};

// Address validation schemas
const btcAddressSchema = z.string().regex(
  /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  "Invalid Bitcoin address"
);

const ethAddressSchema = z.string().regex(
  /^0x[a-fA-F0-9]{40}$/,
  "Invalid Ethereum address"
);

const emailSchema = z.string().email("Invalid email address");

// Helper to detect address type
const detectAddressType = (input: string): "btc" | "eth" | "email" | "unknown" => {
  if (emailSchema.safeParse(input).success) return "email";
  if (btcAddressSchema.safeParse(input).success) return "btc";
  if (ethAddressSchema.safeParse(input).success) return "eth";
  return "unknown";
};

const SendRequest: React.FC = () => {
  const { isKycApproved } = useAuth();
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState<"USDC" | "BTC">("USDC");
  
  // Request flow state
  const [requestStep, setRequestStep] = useState<RequestStep>("closed");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestRecipient, setRequestRecipient] = useState("");
  const [selectedRequestContact, setSelectedRequestContact] = useState<Contact | null>(null);
  const [requestSearchQuery, setRequestSearchQuery] = useState("");

  // Send flow state
  const [sendStep, setSendStep] = useState<SendStep>("closed");
  const [sendRecipient, setSendRecipient] = useState("");
  const [selectedSendContact, setSelectedSendContact] = useState<Contact | null>(null);
  const [sendSearchQuery, setSendSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    type: "btc" | "eth" | "email" | "unknown";
    message?: string;
  } | null>(null);

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

  // Calculate available balance based on currency
  const availableBalance = useMemo(() => {
    return currency === "BTC" ? mockBtcBalance : mockUsdcBalance;
  }, [currency]);

  // Calculate USD value of amount
  const amountUsd = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    return currency === "BTC" ? numAmount * currentBtcPrice : numAmount;
  }, [amount, currency]);

  // Network fee in selected currency
  const networkFee = useMemo(() => {
    return NETWORK_FEES[currency];
  }, [currency]);

  // Total amount including fee
  const totalAmount = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    return numAmount + networkFee;
  }, [amount, networkFee]);

  // Check if user has sufficient balance
  const hasSufficientBalance = useMemo(() => {
    return totalAmount <= availableBalance;
  }, [totalAmount, availableBalance]);

  // Validate address when it changes
  const validateAddress = (input: string) => {
    if (!input.trim()) {
      setAddressValidation(null);
      return;
    }

    const type = detectAddressType(input);
    
    if (type === "email") {
      setAddressValidation({ isValid: true, type, message: "Valid email address" });
    } else if (type === "btc") {
      if (currency !== "BTC") {
        setAddressValidation({ 
          isValid: false, 
          type, 
          message: "This is a BTC address. Switch to BTC to send." 
        });
      } else {
        setAddressValidation({ isValid: true, type, message: "Valid Bitcoin address" });
      }
    } else if (type === "eth") {
      if (currency !== "USDC") {
        setAddressValidation({ 
          isValid: false, 
          type, 
          message: "This is an Ethereum address. Switch to USDC to send." 
        });
      } else {
        setAddressValidation({ isValid: true, type, message: "Valid Ethereum address" });
        setAddressValidation({ isValid: true, type, message: "Valid Solana address" });
      }
    } else if (input.length > 10) {
      setAddressValidation({ 
        isValid: false, 
        type: "unknown", 
        message: "Invalid address format" 
      });
    } else {
      setAddressValidation(null);
    }
  };

  const handleSend = () => {
    if (!isKycApproved) {
      toast.error("Complete KYC to send funds");
      return;
    }
    if (amount === "0" || amount === "") {
      toast.error("Enter an amount");
      return;
    }
    const numAmount = parseFloat(amount);
    if (numAmount + networkFee > availableBalance) {
      toast.error(`Insufficient ${currency} balance (including network fee)`);
      return;
    }
    setSendStep("recipient");
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

  // Request handlers
  const handleSelectRequestContact = (contact: Contact) => {
    setSelectedRequestContact(contact);
    setRequestStep("confirm");
  };

  const handleManualRequestRecipient = () => {
    if (!requestRecipient.trim()) {
      toast.error("Enter a recipient address or email");
      return;
    }
    setSelectedRequestContact({ 
      id: "manual", 
      name: requestRecipient, 
      initials: requestRecipient.slice(0, 2).toUpperCase(), 
      color: "bg-muted" 
    });
    setRequestStep("confirm");
  };

  const handleConfirmRequest = () => {
    const recipientName = selectedRequestContact?.name || requestRecipient;
    toast.success(`Request sent to ${recipientName} for ${formatAmount(amount)}`);
    resetRequestFlow();
  };

  const handleShareLink = () => {
    toast.success("Payment link copied to clipboard!");
    resetRequestFlow();
  };

  const handleOpenRequestScanner = () => {
    setRequestStep("scanner");
  };

  const handleRequestScanComplete = (address: string) => {
    setRequestRecipient(address);
    setSelectedRequestContact({ 
      id: "scanned", 
      name: address, 
      initials: "QR", 
      color: "bg-primary" 
    });
    setRequestStep("confirm");
  };

  const resetRequestFlow = () => {
    setRequestStep("closed");
    setRequestDescription("");
    setRequestRecipient("");
    setSelectedRequestContact(null);
    setRequestSearchQuery("");
    setAmount("0");
  };

  const handleRequestBack = () => {
    if (requestStep === "confirm" || requestStep === "scanner") {
      setRequestStep("recipient");
      setSelectedRequestContact(null);
    } else if (requestStep === "recipient") {
      setRequestStep("description");
    } else {
      setRequestStep("closed");
    }
  };

  // Send handlers
  const handleSelectSendContact = (contact: Contact) => {
    setSelectedSendContact(contact);
    setAddressValidation({ isValid: true, type: "email", message: "Sending to contact" });
    setSendStep("confirm");
  };

  const handleManualSendRecipient = () => {
    if (!sendRecipient.trim()) {
      toast.error("Enter a recipient address or email");
      return;
    }
    
    // Validate the address
    const type = detectAddressType(sendRecipient);
    
    if (type === "unknown") {
      toast.error("Please enter a valid wallet address or email");
      return;
    }
    
    if (type === "btc" && currency !== "BTC") {
      toast.error("This is a BTC address. Please switch to BTC to send.");
      return;
    }
    
    if (type === "eth" && currency !== "USDC") {
      toast.error("This is an Ethereum address. Please switch to USDC to send.");
      return;
    }

    setSelectedSendContact({ 
      id: "manual", 
      name: type === "email" ? sendRecipient : `${sendRecipient.slice(0, 8)}...${sendRecipient.slice(-6)}`,
      address: type !== "email" ? sendRecipient : undefined,
      email: type === "email" ? sendRecipient : undefined,
      initials: type === "email" ? sendRecipient.slice(0, 2).toUpperCase() : currency.slice(0, 2),
      color: type === "btc" ? "bg-btc" : type === "eth" ? "bg-usdc" : "bg-muted"
    });
    setSendStep("confirm");
  };

  const handleConfirmSend = async () => {
    const recipientName = selectedSendContact?.name || sendRecipient;
    const recipientAddress = selectedSendContact?.address || selectedSendContact?.email || sendRecipient;
    
    setIsSending(true);
    
    try {
      // Simulate network delay for transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, this would call the backend to initiate the transfer
      // await supabase.functions.invoke('send-crypto', {
      //   body: {
      //     currency,
      //     amount: parseFloat(amount),
      //     recipientAddress,
      //     networkFee
      //   }
      // });
      
      toast.success(
        `Successfully sent ${amount} ${currency} to ${recipientName}`,
        {
          description: `Network fee: ${networkFee} ${currency}`,
        }
      );
      resetSendFlow();
    } catch (error) {
      toast.error("Failed to send. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenSendScanner = () => {
    setSendStep("scanner");
  };

  const handleSendScanComplete = (address: string) => {
    const type = detectAddressType(address);
    setSendRecipient(address);
    validateAddress(address);
    setSelectedSendContact({ 
      id: "scanned", 
      name: `${address.slice(0, 8)}...${address.slice(-6)}`,
      address,
      initials: "QR", 
      color: type === "btc" ? "bg-btc" : "bg-usdc"
    });
    setSendStep("confirm");
  };

  const resetSendFlow = () => {
    setSendStep("closed");
    setSendRecipient("");
    setSelectedSendContact(null);
    setSendSearchQuery("");
    setAddressValidation(null);
    setAmount("0");
  };

  const handleSendBack = () => {
    if (sendStep === "confirm" || sendStep === "scanner") {
      setSendStep("recipient");
      setSelectedSendContact(null);
    } else {
      setSendStep("closed");
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

  const filteredSendContacts = recentContacts.filter(contact => 
    contact.name.toLowerCase().includes(sendSearchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(sendSearchQuery.toLowerCase()) ||
    contact.address?.toLowerCase().includes(sendSearchQuery.toLowerCase())
  );

  const filteredRequestContacts = recentContacts.filter(contact => 
    contact.name.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
    contact.email?.toLowerCase().includes(requestSearchQuery.toLowerCase()) ||
    contact.address?.toLowerCase().includes(requestSearchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="" subtitle="" hideHeader>
      <div className="flex flex-col items-center justify-between min-h-[calc(100vh-180px)] md:min-h-[calc(100vh-120px)] py-4 md:py-8">
        {/* Amount Display */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground tracking-tight">
            {formatAmount(amount)}
          </h1>
          
          {/* Currency Selector */}
          <Select value={currency} onValueChange={(value) => setCurrency(value as "BTC" | "USDC")} disabled={!isKycApproved}>
            <SelectTrigger className="w-auto gap-1 bg-muted/50 border-0 rounded-full px-4 py-2 h-auto">
              <SelectValue />
              <ChevronDown className="h-3 w-3 opacity-50" />
            </SelectTrigger>
            <SelectContent>
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
              onClick={handleSend}
              disabled={!isKycApproved}
              className="flex-1 h-12 md:h-14 text-base md:text-lg font-medium rounded-full bg-muted hover:bg-muted/80 text-foreground"
            >
              Send
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

      {/* Request Recipient Selection Drawer */}
      <Drawer open={requestStep === "recipient"} onOpenChange={(open) => !open && setRequestStep("closed")}>
        <DrawerContent className="bg-card border-t border-border max-h-[85vh]">
          <div className="p-6 space-y-6 overflow-y-auto">
            <button 
              onClick={handleRequestBack}
              className="absolute top-4 left-4 p-2 hover:bg-muted rounded-full transition-colors z-10"
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

            {/* Search / Enter Address */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={requestRecipient}
                  onChange={(e) => {
                    setRequestRecipient(e.target.value);
                    setRequestSearchQuery(e.target.value);
                  }}
                  placeholder="Email, phone, or wallet address"
                  className="pl-10 h-12 rounded-xl bg-muted/50 border-0"
                />
              </div>

              {requestRecipient && (
                <Button
                  onClick={handleManualRequestRecipient}
                  variant="secondary"
                  className="w-full h-12 rounded-full"
                >
                  Request from "{requestRecipient}"
                </Button>
              )}

              {/* Scan QR Button */}
              <Button
                onClick={handleOpenRequestScanner}
                variant="outline"
                className="w-full h-12 rounded-full border-2"
              >
                <ScanLine className="h-5 w-5 mr-2" />
                Scan QR Code
              </Button>

              {/* Share Link Button */}
              <Button
                onClick={handleShareLink}
                variant="outline"
                className="w-full h-12 rounded-full border-2"
              >
                <Link2 className="h-5 w-5 mr-2" />
                Share link
              </Button>
            </div>

            {/* Recent Contacts */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Recent
              </h3>
              <div className="space-y-2">
                {filteredRequestContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectRequestContact(contact)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className={`h-12 w-12 ${contact.color}`}>
                      <AvatarFallback className="text-white font-medium">
                        {contact.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{contact.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.email || contact.address}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Request Confirm Drawer */}
      <Drawer open={requestStep === "confirm"} onOpenChange={(open) => !open && setRequestStep("closed")}>
        <DrawerContent className="bg-card border-t border-border">
          <div className="p-6 space-y-6">
            <button 
              onClick={handleRequestBack}
              className="absolute top-4 left-4 p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>

            <div className="pt-4 text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Request {formatAmount(amount)}
              </h2>
              <p className="text-lg text-muted-foreground">
                for {requestDescription || "payment"}
              </p>
              
              {selectedRequestContact && (
                <div className="flex flex-col items-center gap-3 pt-2">
                  <Avatar className={`h-16 w-16 ${selectedRequestContact.color}`}>
                    <AvatarFallback className="text-white text-xl font-medium">
                      {selectedRequestContact.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground text-lg">{selectedRequestContact.name}</p>
                    {selectedRequestContact.email && (
                      <p className="text-sm text-muted-foreground">{selectedRequestContact.email}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={handleConfirmRequest}
                className="w-full h-14 text-base font-medium rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Send Request
              </Button>
              <Button
                onClick={handleRequestBack}
                variant="ghost"
                className="w-full h-12 text-base font-medium rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Request QR Scanner Drawer */}
      <Drawer open={requestStep === "scanner"} onOpenChange={(open) => !open && setRequestStep("closed")}>
        <DrawerContent className="bg-card border-t border-border">
          <div className="p-6 space-y-6">
            <button 
              onClick={handleRequestBack}
              className="absolute top-4 left-4 p-2 hover:bg-muted rounded-full transition-colors z-10"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>

            <div className="pt-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Scan QR Code
              </h2>
              <p className="text-muted-foreground mt-1">Point your camera at a wallet QR code</p>
            </div>

            {/* Scanner Viewfinder */}
            <div className="relative aspect-square max-w-xs mx-auto bg-muted/20 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  <div className="absolute left-2 right-2 h-0.5 bg-primary animate-pulse top-1/2" />
                </div>
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <ScanLine className="h-24 w-24 text-muted-foreground/30" />
              </div>
            </div>

            <Button
              onClick={() => handleRequestScanComplete("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")}
              variant="secondary"
              className="w-full h-12 rounded-full"
            >
              Simulate Scan (Demo)
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Camera access required for scanning
            </p>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Send Recipient Selection Drawer */}
      <Drawer open={sendStep === "recipient"} onOpenChange={(open) => !open && setSendStep("closed")}>
        <DrawerContent className="bg-card border-t border-border max-h-[85vh]">
          <div className="p-6 space-y-6 overflow-y-auto">
            <button 
              onClick={() => setSendStep("closed")}
              className="absolute top-4 left-4 p-2 hover:bg-muted rounded-full transition-colors z-10"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>

            <div className="pt-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Send {amount} {currency}
              </h2>
              <p className="text-muted-foreground mt-1">
                ≈ ${amountUsd.toFixed(2)} USD • Balance: {availableBalance} {currency}
              </p>
            </div>

            {/* Search / Enter Address */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={sendRecipient}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSendRecipient(value);
                    setSendSearchQuery(value);
                    validateAddress(value);
                  }}
                  placeholder={currency === "BTC" ? "BTC address or email" : "Solana address or email"}
                  className={`pl-10 pr-10 h-12 rounded-xl bg-muted/50 border-2 transition-colors ${
                    addressValidation?.isValid === false 
                      ? "border-destructive" 
                      : addressValidation?.isValid === true 
                        ? "border-success" 
                        : "border-transparent"
                  }`}
                />
                {addressValidation && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {addressValidation.isValid ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                )}
              </div>

              {/* Address validation message */}
              {addressValidation && (
                <p className={`text-sm ${addressValidation.isValid ? "text-success" : "text-destructive"}`}>
                  {addressValidation.message}
                </p>
              )}

              {sendRecipient && (
                <Button
                  onClick={handleManualSendRecipient}
                  variant="secondary"
                  className="w-full h-12 rounded-full"
                  disabled={addressValidation?.isValid === false}
                >
                  Send to {sendRecipient.length > 20 ? `${sendRecipient.slice(0, 8)}...${sendRecipient.slice(-6)}` : sendRecipient}
                </Button>
              )}

              {/* Scan QR Button */}
              <Button
                onClick={handleOpenSendScanner}
                variant="outline"
                className="w-full h-12 rounded-full border-2"
              >
                <ScanLine className="h-5 w-5 mr-2" />
                Scan QR Code
              </Button>
            </div>

            {/* Recent Contacts */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Recent
              </h3>
              <div className="space-y-2">
                {filteredSendContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectSendContact(contact)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className={`h-12 w-12 ${contact.color}`}>
                      <AvatarFallback className="text-white font-medium">
                        {contact.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{contact.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.email || contact.address}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Send Confirm Drawer */}
      <Drawer open={sendStep === "confirm"} onOpenChange={(open) => !open && !isSending && setSendStep("closed")}>
        <DrawerContent className="bg-card border-t border-border">
          <div className="p-6 space-y-6">
            <button 
              onClick={handleSendBack}
              disabled={isSending}
              className="absolute top-4 left-4 p-2 hover:bg-muted rounded-full transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>

            <div className="pt-4 text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Confirm Send
              </h2>
              
              {selectedSendContact && (
                <div className="flex flex-col items-center gap-3">
                  <Avatar className={`h-16 w-16 ${selectedSendContact.color}`}>
                    <AvatarFallback className="text-white text-xl font-medium">
                      {selectedSendContact.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground text-lg">{selectedSendContact.name}</p>
                    {selectedSendContact.email && (
                      <p className="text-sm text-muted-foreground">{selectedSendContact.email}</p>
                    )}
                    {selectedSendContact.address && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {selectedSendContact.address.slice(0, 12)}...{selectedSendContact.address.slice(-8)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Transaction Summary */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{amount} {currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-medium">{networkFee} {currency}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <div className="text-right">
                    <p className="font-bold text-lg">{totalAmount.toFixed(currency === "BTC" ? 8 : 2)} {currency}</p>
                    <p className="text-sm text-muted-foreground">
                      ≈ ${(currency === "BTC" ? totalAmount * currentBtcPrice : totalAmount).toFixed(2)} USD
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance Warning */}
            {!hasSufficientBalance && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-xl text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                  Insufficient balance. You need {totalAmount.toFixed(currency === "BTC" ? 8 : 2)} {currency} but only have {availableBalance} {currency}.
                </p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <Button
                onClick={handleConfirmSend}
                disabled={isSending || !hasSufficientBalance}
                className="w-full h-14 text-base font-medium rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  `Send ${amount} ${currency}`
                )}
              </Button>
              <Button
                onClick={handleSendBack}
                disabled={isSending}
                variant="ghost"
                className="w-full h-12 text-base font-medium rounded-full"
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Transactions are final and cannot be reversed. Please verify the recipient address.
            </p>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Send QR Scanner Drawer */}
      <Drawer open={sendStep === "scanner"} onOpenChange={(open) => !open && setSendStep("closed")}>
        <DrawerContent className="bg-card border-t border-border">
          <div className="p-6 space-y-6">
            <button 
              onClick={handleSendBack}
              className="absolute top-4 left-4 p-2 hover:bg-muted rounded-full transition-colors z-10"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>

            <div className="pt-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Scan QR Code
              </h2>
              <p className="text-muted-foreground mt-1">Point your camera at a wallet QR code</p>
            </div>

            {/* Scanner Viewfinder */}
            <div className="relative aspect-square max-w-xs mx-auto bg-muted/20 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  <div className="absolute left-2 right-2 h-0.5 bg-primary animate-pulse top-1/2" />
                </div>
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <ScanLine className="h-24 w-24 text-muted-foreground/30" />
              </div>
            </div>

            <Button
              onClick={() => handleSendScanComplete("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")}
              variant="secondary"
              className="w-full h-12 rounded-full"
            >
              Simulate Scan (Demo)
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Camera access required for scanning
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </DashboardLayout>
  );
};

export default SendRequest;
