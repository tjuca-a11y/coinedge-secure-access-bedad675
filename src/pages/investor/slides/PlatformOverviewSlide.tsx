import { Wallet, Store, Users, Shield } from "lucide-react";

const portals = [
  {
    icon: Wallet,
    title: "Customer Wallet",
    color: "from-btc to-btc/70",
    features: [
      "Mobile-first Bitcoin wallet",
      "Voucher redemption via QR scan",
      "KYC-compliant onboarding",
      "BTC/USDC swap functionality"
    ]
  },
  {
    icon: Store,
    title: "Merchant POS",
    color: "from-emerald-500 to-emerald-600",
    features: [
      "Simple card activation",
      "Real-time balance tracking",
      "Commission visibility",
      "Order history & reports"
    ]
  },
  {
    icon: Users,
    title: "Sales Rep Portal",
    color: "from-blue-500 to-blue-600",
    features: [
      "Merchant recruitment tools",
      "Territory management",
      "Commission tracking",
      "Performance analytics"
    ]
  },
  {
    icon: Shield,
    title: "Admin Dashboard",
    color: "from-purple-500 to-purple-600",
    features: [
      "Full operational control",
      "Treasury management",
      "Inventory tracking",
      "System health monitoring"
    ]
  }
];

export const PlatformOverviewSlide = () => (
  <div className="flex flex-col h-full py-8">
    <div className="text-center mb-10">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Platform Overview</h2>
      <p className="text-xl text-muted-foreground">Four integrated portals powering the ecosystem</p>
    </div>

    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto w-full">
      {portals.map((portal, index) => (
        <div 
          key={index}
          className="bg-card/50 border border-border/50 rounded-xl p-6 hover:bg-card/80 transition-colors"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${portal.color}`}>
              <portal.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold">{portal.title}</h3>
          </div>
          <ul className="space-y-2">
            {portal.features.map((feature, fIndex) => (
              <li key={fIndex} className="flex items-center gap-2 text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-btc" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);
