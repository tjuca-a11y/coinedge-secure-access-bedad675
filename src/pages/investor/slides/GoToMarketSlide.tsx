import { MapPin, Users, Target, Zap } from "lucide-react";

const merchantTypes = [
  "Convenience Stores",
  "Bodegas",
  "Gas Stations",
  "Smoke Shops",
  "Check Cashing",
  "Money Transfer",
];

const targetMarkets = [
  { title: "Unbanked Communities", description: "Populations without traditional banking access" },
  { title: "Immigrant Populations", description: "Remittance-heavy demographics seeking alternatives" },
  { title: "Crypto-Curious", description: "First-time buyers who prefer cash transactions" },
  { title: "Privacy-Focused", description: "Users preferring in-person over online exchanges" },
];

export const GoToMarketSlide = () => (
  <div className="flex flex-col h-full py-8">
    <div className="text-center mb-10">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Go-to-Market Strategy</h2>
      <p className="text-xl text-muted-foreground">Field sales force driving merchant acquisition</p>
    </div>

    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
      {/* Sales Model */}
      <div className="space-y-6">
        <div className="bg-card/50 border border-border/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold">Field Sales Force</h3>
          </div>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-btc mt-1 flex-shrink-0" />
              <span>Commissioned sales reps in target territories</span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-btc mt-1 flex-shrink-0" />
              <span>2% ongoing commission incentivizes activation</span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-btc mt-1 flex-shrink-0" />
              <span>$50 setup fee credited on merchant signup</span>
            </li>
          </ul>
        </div>

        <div className="bg-card/50 border border-border/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <MapPin className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold">Target Merchant Types</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {merchantTypes.map((type, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Target Demographics */}
      <div className="bg-card/50 border border-border/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-btc/10">
            <Target className="w-5 h-5 text-btc" />
          </div>
          <h3 className="text-xl font-semibold">Target Customer Segments</h3>
        </div>
        <div className="space-y-4">
          {targetMarkets.map((market, index) => (
            <div 
              key={index}
              className="p-4 bg-muted/50 rounded-lg"
            >
              <h4 className="font-semibold mb-1">{market.title}</h4>
              <p className="text-sm text-muted-foreground">{market.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
