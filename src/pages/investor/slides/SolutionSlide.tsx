import { CreditCard, Store, Smartphone, Bitcoin } from "lucide-react";

export const SolutionSlide = () => (
  <div className="flex flex-col h-full py-8">
    <div className="text-center mb-12">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">The Solution</h2>
      <p className="text-xl text-muted-foreground">BitCard - Pre-paid Bitcoin Vouchers</p>
    </div>

    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="relative max-w-4xl w-full">
        {/* BitCard Visual */}
        <div className="mx-auto w-80 h-48 rounded-2xl bg-gradient-to-br from-btc via-btc/90 to-btc/70 shadow-2xl p-6 mb-12 transform hover:scale-105 transition-transform">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/80 text-sm">BitCard</p>
              <p className="text-white text-3xl font-bold mt-2">$100</p>
            </div>
            <Bitcoin className="w-12 h-12 text-white/90" />
          </div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center justify-between">
              <p className="text-white/70 text-xs">SCRATCH TO REVEAL CODE</p>
              <p className="text-white font-mono text-sm">••••••••</p>
            </div>
          </div>
        </div>

        {/* Key Points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-btc/10 flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-btc" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Sold at Retail</h3>
            <p className="text-muted-foreground text-sm">Available at convenience stores, bodegas, and gas stations</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-btc/10 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-btc" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Pay with Cash</h3>
            <p className="text-muted-foreground text-sm">No bank account or credit card required</p>
          </div>
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-btc/10 flex items-center justify-center mb-4">
              <Smartphone className="w-8 h-8 text-btc" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Redeem for BTC</h3>
            <p className="text-muted-foreground text-sm">Scan voucher in our app to receive Bitcoin instantly</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
