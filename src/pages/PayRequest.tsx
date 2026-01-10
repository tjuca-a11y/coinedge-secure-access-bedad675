import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Download, QrCode, Scan, Bitcoin, DollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const PayRequest: React.FC = () => {
  const { isKycApproved, profile } = useAuth();
  const [sendAsset, setSendAsset] = useState("USDC");
  const [sendAmount, setSendAmount] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [requestAsset, setRequestAsset] = useState("USDC");
  const [requestAmount, setRequestAmount] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKycApproved) {
      toast.error("Complete KYC to send funds");
      return;
    }
    toast.success(`Sending ${sendAmount} ${sendAsset} to ${sendRecipient}`);
    setSendAmount("");
    setSendRecipient("");
  };

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isKycApproved) {
      toast.error("Complete KYC to request funds");
      return;
    }
    toast.success(`Payment request created for ${requestAmount} ${requestAsset}`);
    setRequestAmount("");
  };

  return (
    <DashboardLayout title="Pay & Request" subtitle="Send and request crypto payments">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className={`cursor-pointer transition-colors ${isKycApproved ? "bg-primary text-primary-foreground hover:bg-primary/90" : "opacity-50"}`}>
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <Send className="h-6 w-6" />
            <span className="font-medium text-sm">Send Money</span>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-colors ${isKycApproved ? "hover:bg-muted/50" : "opacity-50"}`}>
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <Download className="h-6 w-6" />
            <span className="font-medium text-sm">Request Money</span>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-colors ${isKycApproved ? "hover:bg-muted/50" : "opacity-50"}`}>
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <Scan className="h-6 w-6" />
            <span className="font-medium text-sm">Scan QR</span>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer transition-colors ${isKycApproved ? "hover:bg-muted/50" : "opacity-50"}`}>
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
            <QrCode className="h-6 w-6" />
            <span className="font-medium text-sm">My QR Code</span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            Send
          </TabsTrigger>
          <TabsTrigger value="request" className="gap-2">
            <Download className="h-4 w-4" />
            Request
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Send Crypto</CardTitle>
              <CardDescription>
                Send BTC or USDC to any wallet address or CoinEdge user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSend} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sendAsset">Asset</Label>
                    <Select value={sendAsset} onValueChange={setSendAsset} disabled={!isKycApproved}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC">
                          <div className="flex items-center gap-2">
                            <Bitcoin className="h-4 w-4 text-btc" />
                            Bitcoin (BTC)
                          </div>
                        </SelectItem>
                        <SelectItem value="USDC">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-usdc" />
                            USD Coin (USDC)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sendAmount">Amount</Label>
                    <Input
                      id="sendAmount"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      disabled={!isKycApproved}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sendRecipient">Recipient Address or Email</Label>
                  <Input
                    id="sendRecipient"
                    placeholder="Enter wallet address or email"
                    value={sendRecipient}
                    onChange={(e) => setSendRecipient(e.target.value)}
                    disabled={!isKycApproved}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!isKycApproved}>
                  {isKycApproved ? "Send" : "Complete KYC to Send"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="request">
          <Card>
            <CardHeader>
              <CardTitle>Request Payment</CardTitle>
              <CardDescription>
                Create a payment request and share it with anyone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requestAsset">Asset</Label>
                    <Select value={requestAsset} onValueChange={setRequestAsset} disabled={!isKycApproved}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BTC">
                          <div className="flex items-center gap-2">
                            <Bitcoin className="h-4 w-4 text-btc" />
                            Bitcoin (BTC)
                          </div>
                        </SelectItem>
                        <SelectItem value="USDC">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-usdc" />
                            USD Coin (USDC)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requestAmount">Amount</Label>
                    <Input
                      id="requestAmount"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      disabled={!isKycApproved}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={!isKycApproved}>
                  {isKycApproved ? "Create Request" : "Complete KYC to Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My QR Code */}
          {isKycApproved && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Your Receive Addresses</CardTitle>
                <CardDescription>
                  Share these addresses to receive payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Bitcoin className="h-5 w-5 text-btc" />
                    <span className="font-medium">BTC Address</span>
                  </div>
                  <code className="text-sm break-all">{profile?.btc_address || "Not available"}</code>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-usdc" />
                    <span className="font-medium">USDC Address</span>
                  </div>
                  <code className="text-sm break-all">{profile?.usdc_address || "Not available"}</code>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default PayRequest;
