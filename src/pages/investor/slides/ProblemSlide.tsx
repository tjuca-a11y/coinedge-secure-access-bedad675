import { Ban, Building2, DollarSign, ShieldX } from "lucide-react";

const problems = [
  {
    icon: Building2,
    title: "Unbanked Populations",
    description: "1.4 billion adults globally lack access to traditional banking and investment services"
  },
  {
    icon: ShieldX,
    title: "Complex Onboarding",
    description: "Crypto exchanges require extensive verification, bank accounts, and technical knowledge"
  },
  {
    icon: DollarSign,
    title: "Cash-to-Crypto Gap",
    description: "No simple way to convert cash directly to Bitcoin at retail locations"
  },
  {
    icon: Ban,
    title: "Trust Barriers",
    description: "Many potential users distrust online-only platforms and prefer in-person transactions"
  }
];

export const ProblemSlide = () => (
  <div className="flex flex-col h-full py-8">
    <div className="text-center mb-12">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">The Problem</h2>
      <p className="text-xl text-muted-foreground">Billions are excluded from the digital economy</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 max-w-5xl mx-auto w-full">
      {problems.map((problem, index) => (
        <div 
          key={index}
          className="bg-card/50 border border-border/50 rounded-xl p-6 flex items-start gap-4 hover:bg-card/80 transition-colors"
        >
          <div className="p-3 rounded-lg bg-destructive/10">
            <problem.icon className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">{problem.title}</h3>
            <p className="text-muted-foreground">{problem.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);
