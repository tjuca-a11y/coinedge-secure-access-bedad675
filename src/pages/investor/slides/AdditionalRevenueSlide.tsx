import { DollarSign, Wallet, TrendingUp, Clock } from "lucide-react";
import { SETUP_FEE, MIN_INITIAL_FUNDING, MIN_CASH_CREDIT } from "@/hooks/useFeeCalculation";

const revenueStreams = [
  {
    icon: DollarSign,
    title: "Merchant Setup Fee",
    value: `$${SETUP_FEE}`,
    description: "One-time fee per merchant onboarding, credited to recruiting sales rep"
  },
  {
    icon: Wallet,
    title: "Minimum Initial Funding",
    value: `$${MIN_INITIAL_FUNDING}`,
    description: `Required minimum to start ($${SETUP_FEE} setup + $${MIN_CASH_CREDIT} cash credit)`
  },
  {
    icon: Clock,
    title: "Float on Merchant Balances",
    value: "Interest",
    description: "Revenue from holding merchant pre-funded balances before activation"
  },
  {
    icon: TrendingUp,
    title: "Volume-Based Growth",
    value: "Scalable",
    description: "Revenue scales directly with transaction volume and merchant network size"
  }
];

export const AdditionalRevenueSlide = () => (
  <div className="flex flex-col h-full py-8">
    <div className="text-center mb-10">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Additional Revenue Streams</h2>
      <p className="text-xl text-muted-foreground">Multiple monetization opportunities</p>
    </div>

    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
      {revenueStreams.map((stream, index) => (
        <div 
          key={index}
          className="bg-card/50 border border-border/50 rounded-xl p-6 hover:bg-card/80 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-btc/10">
              <stream.icon className="w-6 h-6 text-btc" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{stream.title}</h3>
                <span className="text-btc font-bold">{stream.value}</span>
              </div>
              <p className="text-muted-foreground text-sm">{stream.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Unit Economics Example */}
    <div className="mt-8 max-w-3xl mx-auto w-full">
      <div className="bg-gradient-to-r from-btc/10 to-btc/5 border border-btc/20 rounded-xl p-6">
        <h3 className="font-semibold mb-4 text-center">Unit Economics Example</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-btc">$100</p>
            <p className="text-sm text-muted-foreground">Card Value</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">$7.75</p>
            <p className="text-sm text-muted-foreground">CoinEdge Revenue</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-500">7.75%</p>
            <p className="text-sm text-muted-foreground">Margin</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
