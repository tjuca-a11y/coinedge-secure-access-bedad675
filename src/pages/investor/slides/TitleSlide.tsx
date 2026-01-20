import { Bitcoin, Sparkles } from "lucide-react";

export const TitleSlide = () => (
  <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
    <div className="flex items-center gap-3">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-btc to-btc/70 shadow-2xl">
        <Bitcoin className="w-16 h-16 text-white" />
      </div>
    </div>
    
    <div className="space-y-4">
      <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
        CoinEdge
      </h1>
      <p className="text-2xl md:text-3xl text-muted-foreground font-light">
        Making Bitcoin Accessible to Everyone
      </p>
    </div>

    <div className="flex items-center gap-2 text-muted-foreground">
      <Sparkles className="w-5 h-5 text-btc" />
      <span className="text-lg">Investor Presentation</span>
      <Sparkles className="w-5 h-5 text-btc" />
    </div>

    <p className="text-sm text-muted-foreground/60 absolute bottom-8">
      Confidential • {new Date().getFullYear()}
    </p>
  </div>
);
