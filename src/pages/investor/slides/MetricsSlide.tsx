import { Store, CreditCard, DollarSign, TrendingUp, Users, ArrowUp } from "lucide-react";

const metrics = [
  {
    icon: Store,
    label: "Merchants Onboarded",
    value: "250+",
    growth: "+45%",
    period: "MoM"
  },
  {
    icon: CreditCard,
    label: "BitCards Activated",
    value: "12,500",
    growth: "+62%",
    period: "MoM"
  },
  {
    icon: DollarSign,
    label: "Volume Processed",
    value: "$1.2M",
    growth: "+58%",
    period: "MoM"
  },
  {
    icon: TrendingUp,
    label: "CoinEdge Revenue",
    value: "$93K",
    growth: "+58%",
    period: "MoM"
  },
  {
    icon: Users,
    label: "Active Sales Reps",
    value: "45",
    growth: "+25%",
    period: "MoM"
  }
];

export const MetricsSlide = () => (
  <div className="flex flex-col h-full py-8">
    <div className="text-center mb-10">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Key Metrics</h2>
      <p className="text-xl text-muted-foreground">Demonstrating strong growth trajectory</p>
    </div>

    <div className="flex-1 flex items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
        {metrics.map((metric, index) => (
          <div 
            key={index}
            className={`bg-card/50 border border-border/50 rounded-xl p-6 hover:bg-card/80 transition-colors ${
              index === metrics.length - 1 && metrics.length % 3 === 1 ? 'lg:col-start-2' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-btc/10">
                <metric.icon className="w-5 h-5 text-btc" />
              </div>
              <div className="flex items-center gap-1 text-emerald-500 text-sm">
                <ArrowUp className="w-4 h-4" />
                <span>{metric.growth}</span>
                <span className="text-muted-foreground">{metric.period}</span>
              </div>
            </div>
            <p className="text-3xl font-bold mb-1">{metric.value}</p>
            <p className="text-sm text-muted-foreground">{metric.label}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-8 text-center">
      <p className="text-sm text-muted-foreground italic">
        *Projected metrics based on market analysis and growth model
      </p>
    </div>
  </div>
);
