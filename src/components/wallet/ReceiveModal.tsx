import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bitcoin, DollarSign, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface ReceiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  btcAddress?: string | null;
  usdcAddress?: string | null;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  open,
  onOpenChange,
  btcAddress,
  usdcAddress,
}) => {
  const [copiedBtc, setCopiedBtc] = useState(false);
  const [copiedUsdc, setCopiedUsdc] = useState(false);

  const copyToClipboard = (address: string, type: "btc" | "usdc") => {
    navigator.clipboard.writeText(address);
    toast.success(`${type.toUpperCase()} address copied to clipboard`);
    
    if (type === "btc") {
      setCopiedBtc(true);
      setTimeout(() => setCopiedBtc(false), 2000);
    } else {
      setCopiedUsdc(true);
      setTimeout(() => setCopiedUsdc(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receive Crypto</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="btc" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="btc" className="gap-2">
              <Bitcoin className="h-4 w-4" />
              Bitcoin
            </TabsTrigger>
            <TabsTrigger value="usdc" className="gap-2">
              <DollarSign className="h-4 w-4" />
              USDC
            </TabsTrigger>
          </TabsList>

          <TabsContent value="btc" className="space-y-4 mt-4">
            {btcAddress ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={btcAddress} 
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="w-full p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1 text-center">BTC Address</p>
                  <code className="text-xs block text-center break-all">{btcAddress}</code>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => copyToClipboard(btcAddress, "btc")}
                >
                  {copiedBtc ? (
                    <>
                      <Check className="h-4 w-4 text-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Address
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Only send Bitcoin (BTC) to this address. Sending any other asset may result in permanent loss.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No BTC address available. Please complete KYC verification.
              </p>
            )}
          </TabsContent>

          <TabsContent value="usdc" className="space-y-4 mt-4">
            {usdcAddress ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={usdcAddress} 
                    size={180}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="w-full p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1 text-center">USDC Address (Ethereum)</p>
                  <code className="text-xs block text-center break-all">{usdcAddress}</code>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => copyToClipboard(usdcAddress, "usdc")}
                >
                  {copiedUsdc ? (
                    <>
                      <Check className="h-4 w-4 text-success" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Address
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Only send USDC on Ethereum (ERC-20) to this address. Sending any other asset or network may result in permanent loss.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No USDC address available. Please complete KYC verification.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
