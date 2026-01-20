import { Code2, Database, Shield, Wallet, CreditCard, Smartphone } from "lucide-react";

const techCategories = [
  {
    title: "Frontend",
    icon: Code2,
    items: [
      { name: "React", description: "Modern UI framework" },
      { name: "TypeScript", description: "Type-safe development" },
      { name: "Tailwind CSS", description: "Utility-first styling" },
      { name: "Vite", description: "Fast build tooling" }
    ]
  },
  {
    title: "Backend & Data",
    icon: Database,
    items: [
      { name: "Lovable Cloud", description: "Scalable backend" },
      { name: "PostgreSQL", description: "Relational database" },
      { name: "Edge Functions", description: "Serverless compute" },
      { name: "Real-time Sync", description: "Live data updates" }
    ]
  },
  {
    title: "Integrations",
    icon: CreditCard,
    items: [
      { name: "Dynamic Labs", description: "Wallet infrastructure" },
      { name: "Plaid", description: "Banking & identity" },
      { name: "Fireblocks", description: "Custody & transfers" },
      { name: "Bitcoin Network", description: "On-chain settlements" }
    ]
  }
];

export const TechStackSlide = () => (
  <div className="flex flex-col h-full py-8">
    <div className="text-center mb-10">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Technology Stack</h2>
      <p className="text-xl text-muted-foreground">Built for scale, security, and reliability</p>
    </div>

    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
      {techCategories.map((category, index) => (
        <div 
          key={index}
          className="bg-card/50 border border-border/50 rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-btc/10">
              <category.icon className="w-5 h-5 text-btc" />
            </div>
            <h3 className="text-xl font-semibold">{category.title}</h3>
          </div>
          <div className="space-y-4">
            {category.items.map((item, itemIndex) => (
              <div key={itemIndex} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-btc" />
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Security Highlights */}
    <div className="mt-8 max-w-4xl mx-auto w-full">
      <div className="bg-gradient-to-r from-btc/10 to-btc/5 border border-btc/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-btc" />
          <h4 className="font-semibold">Security First</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
          <div>• Row-Level Security</div>
          <div>• Encrypted at Rest</div>
          <div>• KYC/AML Compliant</div>
          <div>• Multi-sig Treasury</div>
        </div>
      </div>
    </div>
  </div>
);
