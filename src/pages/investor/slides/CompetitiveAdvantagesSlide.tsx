import { Check, X } from "lucide-react";

const comparisons = [
  {
    feature: "No Inventory Risk",
    coinedge: true,
    traditional: false,
    description: "Pre-funded model means merchants never hold unsold inventory"
  },
  {
    feature: "Instant Activation",
    coinedge: true,
    traditional: false,
    description: "No card shipping delays - activate from digital balance immediately"
  },
  {
    feature: "Multi-Tier Commissions",
    coinedge: true,
    traditional: false,
    description: "Sales reps and merchants both earn ongoing commissions"
  },
  {
    feature: "KYC-Compliant",
    coinedge: true,
    traditional: true,
    description: "Full regulatory compliance through Plaid identity verification"
  },
  {
    feature: "Cash Acceptance",
    coinedge: true,
    traditional: false,
    description: "Designed for cash transactions at retail locations"
  },
  {
    feature: "Real-Time Pricing",
    coinedge: true,
    traditional: false,
    description: "BTC price locked at redemption, not purchase"
  }
];

export const CompetitiveAdvantagesSlide = () => (
  <div className="flex flex-col h-full py-8">
    <div className="text-center mb-10">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Competitive Advantages</h2>
      <p className="text-xl text-muted-foreground">Why CoinEdge wins</p>
    </div>

    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-4xl w-full">
        <div className="bg-card/50 border border-border/50 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 font-semibold text-sm">
            <div className="col-span-6">Feature</div>
            <div className="col-span-3 text-center">CoinEdge</div>
            <div className="col-span-3 text-center">Traditional</div>
          </div>
          
          {comparisons.map((item, index) => (
            <div 
              key={index}
              className="grid grid-cols-12 gap-4 p-4 border-t border-border/50 items-center hover:bg-muted/20 transition-colors"
            >
              <div className="col-span-6">
                <p className="font-medium">{item.feature}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              </div>
              <div className="col-span-3 flex justify-center">
                {item.coinedge ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <X className="w-5 h-5 text-destructive" />
                  </div>
                )}
              </div>
              <div className="col-span-3 flex justify-center">
                {item.traditional ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <X className="w-5 h-5 text-destructive" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
