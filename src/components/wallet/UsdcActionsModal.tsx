import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus, ArrowDownToLine } from "lucide-react";
import { BuyUsdcModal } from "./BuyUsdcModal";
import { SellUsdcModal } from "./SellUsdcModal";

interface UsdcActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usdcBalance: number;
}

export const UsdcActionsModal: React.FC<UsdcActionsModalProps> = ({
  open,
  onOpenChange,
  usdcBalance,
}) => {
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);

  const handleBuyClick = () => {
    onOpenChange(false);
    setBuyModalOpen(true);
  };

  const handleSellClick = () => {
    onOpenChange(false);
    setSellModalOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-usdc/10 rounded-full">
                <DollarSign className="h-5 w-5 text-usdc" />
              </div>
              USDC Actions
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              variant="outline"
              onClick={handleBuyClick}
              className="h-auto py-6 flex-col gap-2"
            >
              <div className="p-3 bg-success/10 rounded-full">
                <Plus className="h-6 w-6 text-success" />
              </div>
              <span className="font-medium">Buy USDC</span>
              <span className="text-xs text-muted-foreground">From bank account</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleSellClick}
              className="h-auto py-6 flex-col gap-2"
            >
              <div className="p-3 bg-primary/10 rounded-full">
                <ArrowDownToLine className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium">Withdraw</span>
              <span className="text-xs text-muted-foreground">To bank account</span>
            </Button>
          </div>

          <div className="mt-4 p-3 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-xl font-bold">{usdcBalance.toFixed(2)} USDC</p>
          </div>
        </DialogContent>
      </Dialog>

      <BuyUsdcModal open={buyModalOpen} onOpenChange={setBuyModalOpen} />
      <SellUsdcModal
        open={sellModalOpen}
        onOpenChange={setSellModalOpen}
        usdcBalance={usdcBalance}
      />
    </>
  );
};
