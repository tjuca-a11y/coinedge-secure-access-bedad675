import { Bitcoin, Mail, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ContactSlide = () => (
  <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
    <div className="flex items-center gap-3">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-btc to-btc/70 shadow-2xl">
        <Bitcoin className="w-16 h-16 text-white" />
      </div>
    </div>

    <div className="space-y-4 max-w-2xl">
      <h2 className="text-4xl md:text-5xl font-bold text-foreground">Join the Revolution</h2>
      <p className="text-xl text-muted-foreground">
        Be part of bringing Bitcoin to the masses through a proven, scalable distribution model.
      </p>
    </div>

    {/* Investment Highlights */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
      <div className="bg-card/50 border border-border/50 rounded-xl p-6 text-center">
        <p className="text-3xl font-bold text-btc mb-2">7.75%</p>
        <p className="text-sm text-muted-foreground">Net Revenue per Transaction</p>
      </div>
      <div className="bg-card/50 border border-border/50 rounded-xl p-6 text-center">
        <p className="text-3xl font-bold text-btc mb-2">$1B+</p>
        <p className="text-sm text-muted-foreground">TAM in US Market</p>
      </div>
      <div className="bg-card/50 border border-border/50 rounded-xl p-6 text-center">
        <p className="text-3xl font-bold text-btc mb-2">Asset-Light</p>
        <p className="text-sm text-muted-foreground">Pre-funded Model</p>
      </div>
    </div>

    {/* Contact */}
    <div className="space-y-4">
      <p className="text-lg text-muted-foreground">Ready to learn more?</p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Button size="lg" className="bg-btc hover:bg-btc/90 text-white">
          <Mail className="w-5 h-5 mr-2" />
          Contact Us
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
        <Button size="lg" variant="outline">
          <Globe className="w-5 h-5 mr-2" />
          Visit Website
        </Button>
      </div>
    </div>

    <p className="text-sm text-muted-foreground/60 absolute bottom-8">
      CoinEdge • Confidential • {new Date().getFullYear()}
    </p>
  </div>
);
