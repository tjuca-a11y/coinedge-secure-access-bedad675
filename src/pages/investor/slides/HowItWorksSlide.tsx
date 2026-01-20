import { ArrowRight, User, Store, Smartphone, Bitcoin } from "lucide-react";

const steps = [
  {
    icon: User,
    step: "1",
    title: "Customer Visits Store",
    description: "Customer walks into a partner merchant location and pays cash for a BitCard"
  },
  {
    icon: Store,
    step: "2",
    title: "Merchant Activates",
    description: "Merchant scans or enters card PIN to activate it from their pre-funded balance"
  },
  {
    icon: Smartphone,
    step: "3",
    title: "Customer Redeems",
    description: "Customer opens CoinEdge app, completes KYC (one-time), and scans voucher"
  },
  {
    icon: Bitcoin,
    step: "4",
    title: "Bitcoin Delivered",
    description: "Bitcoin is instantly delivered to the customer's wallet (minus redemption fee)"
  }
];

export const HowItWorksSlide = () => (
  <div className="flex flex-col h-full py-8">
    <div className="text-center mb-12">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">How It Works</h2>
      <p className="text-xl text-muted-foreground">A simple 4-step process</p>
    </div>

    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col md:flex-row items-center gap-4 md:gap-2 max-w-6xl">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center text-center p-4 min-w-[200px]">
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-btc to-btc/70 flex items-center justify-center shadow-lg">
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-btc flex items-center justify-center">
                  <span className="text-sm font-bold text-btc">{step.step}</span>
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm max-w-[180px]">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="w-8 h-8 text-muted-foreground/50 hidden md:block flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);
