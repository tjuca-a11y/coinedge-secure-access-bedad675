import { ArrowLeft, Wallet, Copy, ExternalLink, Bitcoin, CircleDollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CryptoWalletsSettings = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const wallets = [
    {
      icon: Bitcoin,
      name: "Bitcoin (BTC)",
      address: profile?.btc_address,
      network: "Bitcoin Network",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: CircleDollarSign,
      name: "USDC",
      address: profile?.usdc_address,
      network: "Solana Network",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Crypto Wallets</h1>
            <p className="text-sm text-muted-foreground">Manage your wallet addresses</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Your Wallets
            </CardTitle>
            <CardDescription>
              These are your deposit addresses for receiving crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {wallets.map((wallet) => (
              <div
                key={wallet.name}
                className="p-4 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${wallet.bgColor}`}>
                    <wallet.icon className={`h-5 w-5 ${wallet.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{wallet.name}</h3>
                      <span className="text-xs text-muted-foreground">{wallet.network}</span>
                    </div>
                    {wallet.address ? (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-background px-2 py-1 rounded border border-border truncate flex-1">
                            {wallet.address}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => copyToClipboard(wallet.address!, wallet.name)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">
                        No address generated yet
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>External Wallets</CardTitle>
            <CardDescription>
              Connect external wallets for withdrawals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Coming Soon</p>
              <p className="text-sm mt-1">
                You'll be able to add external wallet addresses for withdrawals
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Learn More</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-between" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Help article coming soon"); }}>
                <span>How crypto deposits work</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="ghost" className="w-full justify-between" asChild>
              <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Help article coming soon"); }}>
                <span>Supported networks & tokens</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CryptoWalletsSettings;
