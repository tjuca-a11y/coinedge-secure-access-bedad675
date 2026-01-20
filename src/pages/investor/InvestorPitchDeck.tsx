import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Printer, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Import all slides
import { TitleSlide } from "./slides/TitleSlide";
import { ProblemSlide } from "./slides/ProblemSlide";
import { SolutionSlide } from "./slides/SolutionSlide";
import { HowItWorksSlide } from "./slides/HowItWorksSlide";
import { PlatformOverviewSlide } from "./slides/PlatformOverviewSlide";
import { RevenueModelSlide } from "./slides/RevenueModelSlide";
import { AdditionalRevenueSlide } from "./slides/AdditionalRevenueSlide";
import { GoToMarketSlide } from "./slides/GoToMarketSlide";
import { MetricsSlide } from "./slides/MetricsSlide";
import { CompetitiveAdvantagesSlide } from "./slides/CompetitiveAdvantagesSlide";
import { TechStackSlide } from "./slides/TechStackSlide";
import { ContactSlide } from "./slides/ContactSlide";

const slides = [
  { id: "title", component: TitleSlide, title: "CoinEdge" },
  { id: "problem", component: ProblemSlide, title: "The Problem" },
  { id: "solution", component: SolutionSlide, title: "The Solution" },
  { id: "how-it-works", component: HowItWorksSlide, title: "How It Works" },
  { id: "platform", component: PlatformOverviewSlide, title: "Platform Overview" },
  { id: "revenue", component: RevenueModelSlide, title: "Revenue Model" },
  { id: "additional-revenue", component: AdditionalRevenueSlide, title: "Additional Revenue" },
  { id: "go-to-market", component: GoToMarketSlide, title: "Go-to-Market" },
  { id: "metrics", component: MetricsSlide, title: "Key Metrics" },
  { id: "competitive", component: CompetitiveAdvantagesSlide, title: "Competitive Advantages" },
  { id: "tech", component: TechStackSlide, title: "Technology" },
  { id: "contact", component: ContactSlide, title: "Contact" },
];

const InvestorPitchDeck = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, isFullscreen]);

  const handlePrint = () => {
    window.print();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const progress = ((currentSlide + 1) / slides.length) * 100;
  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 no-print">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Top Controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 no-print">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="bg-background/80 backdrop-blur-sm"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Slide Counter */}
      <div className="fixed top-4 left-4 z-50 no-print">
        <span className="text-sm text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
          {currentSlide + 1} / {slides.length}
        </span>
      </div>

      {/* Main Slide Area */}
      <main className="flex-1 flex items-center justify-center p-8 pt-16">
        <div className="w-full max-w-7xl h-[calc(100vh-8rem)] relative overflow-hidden">
          <div
            className="w-full h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            <div className="flex h-full" style={{ width: `${slides.length * 100}%` }}>
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="h-full px-4"
                  style={{ width: `${100 / slides.length}%` }}
                >
                  <div className={cn(
                    "h-full transition-opacity duration-300",
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  )}>
                    <slide.component />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Navigation */}
      <div className="fixed bottom-8 left-0 right-0 flex items-center justify-center gap-4 z-50 no-print">
        <Button
          variant="outline"
          size="icon"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="bg-background/80 backdrop-blur-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Slide Dots */}
        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentSlide
                  ? "bg-btc w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              title={slide.title}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="bg-background/80 backdrop-blur-sm"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          main {
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default InvestorPitchDeck;
