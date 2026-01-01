import { useEffect, useState, useRef } from "react";
import { Palette, ImageIcon, BookmarkIcon, Shuffle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import phormulaTextLogo from "@/assets/phormula-text-logo.png";
import GlowSphere from "./GlowSphere";

// Card color palette - cream/white aesthetic
const CARD_COLORS = [
  "hsl(40, 33%, 96%)", // warm white/cream for hero
  "hsl(40, 33%, 96%)", // warm white for features
  "hsl(40, 33%, 96%)", // warm white for about
];

const features = [
  {
    icon: Palette,
    title: "Rainbow Organization",
    description: "Color-code your decks for visual memory and instant recognition.",
  },
  {
    icon: ImageIcon,
    title: "Visual Learning",
    description: "Add images, diagrams, and annotations for complex topics.",
  },
  {
    icon: BookmarkIcon,
    title: "Smart Sections",
    description: "Organize large decks into focused study segments.",
  },
  {
    icon: Shuffle,
    title: "Study Modes",
    description: "Flip, shuffle, and repeat for effective learning.",
  },
];

type FlashcardScreenProps = {
  isVisible: boolean;
  isExiting: boolean;
  children: React.ReactNode;
  cardColor: string;
};

const FlashcardScreen = ({ isVisible, isExiting, children, cardColor }: FlashcardScreenProps) => {
  return (
    <div
      className={`absolute inset-4 sm:inset-6 md:inset-8 lg:inset-12 rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isVisible && !isExiting
          ? "opacity-100 translate-x-0 rotate-0 scale-100"
          : isExiting
            ? "opacity-0 -translate-x-[120%] -rotate-6 scale-95"
            : "opacity-0 translate-x-[120%] rotate-6 scale-95"
      }`}
      style={{
        perspective: "1000px",
        backgroundColor: cardColor,
        border: "1px solid hsl(220, 13%, 75%)",
        boxShadow: `
          0 4px 20px -4px rgba(0, 0, 0, 0.08),
          0 8px 40px -8px rgba(0, 0, 0, 0.05)
        `,
      }}
    >
      {/* Card content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">{children}</div>
    </div>
  );
};

const FlashcardSequence = () => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [exitingScreen, setExitingScreen] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoAdvanced = useRef(false);

  // Reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Subtle pulse animation for logo
  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setPulsePhase((p) => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Auto-advance from screen 0 to 1 after 6 seconds
  useEffect(() => {
    if (currentScreen === 0 && !hasAutoAdvanced.current) {
      autoAdvanceRef.current = setTimeout(() => {
        goToScreen(1);
        hasAutoAdvanced.current = true;
      }, 6000);
    }
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [currentScreen]);

  // Scroll handling for manual navigation with snap behavior
  useEffect(() => {
    let isSnapping = false;
    let snapTimeout: NodeJS.Timeout | null = null;
    let lastScrollTime = Date.now();

    const snapToScreen = (targetScreen: number) => {
      if (!containerRef.current || isSnapping) return;

      isSnapping = true;
      const viewportHeight = window.innerHeight;
      const containerTop = containerRef.current.offsetTop;
      const targetScrollY = containerTop + targetScreen * viewportHeight;

      window.scrollTo({
        top: targetScrollY,
        behavior: "smooth",
      });

      // Reset snapping flag after animation
      setTimeout(() => {
        isSnapping = false;
      }, 600);
    };

    const handleScroll = () => {
      if (!containerRef.current || isSnapping) return;

      const scrollY = window.scrollY;
      const containerTop = containerRef.current.offsetTop;
      const containerHeight = containerRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;

      // Calculate scroll progress within the flashcard sequence area
      const scrollInContainer = scrollY - containerTop;
      const maxScroll = containerHeight - viewportHeight;

      if (scrollInContainer < 0) return;

      const progress = Math.max(0, Math.min(1, scrollInContainer / maxScroll));

      // Determine target screen based on progress
      const targetScreen = progress < 0.33 ? 0 : progress < 0.66 ? 1 : 2;

      if (targetScreen !== currentScreen && exitingScreen === null) {
        if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
        hasAutoAdvanced.current = true;
        goToScreen(targetScreen);
      }

      // Debounced snap after scroll stops
      lastScrollTime = Date.now();
      if (snapTimeout) clearTimeout(snapTimeout);
      snapTimeout = setTimeout(() => {
        // Only snap if user stopped scrolling
        if (Date.now() - lastScrollTime >= 150) {
          snapToScreen(targetScreen);
        }
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (snapTimeout) clearTimeout(snapTimeout);
    };
  }, [currentScreen, exitingScreen]);

  const goToScreen = (targetScreen: number) => {
    if (targetScreen === currentScreen || exitingScreen !== null) return;

    setExitingScreen(currentScreen);
    setTimeout(() => {
      setCurrentScreen(targetScreen);
      setExitingScreen(null);
    }, 350);
  };

  const pulseScale = prefersReducedMotion ? 1 : 1 + Math.sin(pulsePhase * 0.1) * 0.02;

  return (
    <div ref={containerRef} className="relative" style={{ height: "300vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-background">
        {/* Gradient bubbles background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Top-left bubble - vibrant pink/coral */}
          <div
            className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-60 blur-3xl animate-float-1"
            style={{
              background: "radial-gradient(circle, hsl(340, 95%, 65%) 0%, transparent 70%)",
            }}
          />
          {/* Top-right bubble - vibrant blue */}
          <div
            className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-55 blur-3xl animate-float-2"
            style={{
              background: "radial-gradient(circle, hsl(210, 90%, 65%) 0%, transparent 70%)",
              animationDelay: "2s",
            }}
          />
          {/* Bottom-left bubble - vibrant green/teal */}
          <div
            className="absolute -bottom-40 -left-20 w-72 h-72 rounded-full opacity-50 blur-3xl animate-float-3"
            style={{
              background: "radial-gradient(circle, hsl(170, 85%, 55%) 0%, transparent 70%)",
              animationDelay: "4s",
            }}
          />
          {/* Bottom-right bubble - vibrant purple */}
          <div
            className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-55 blur-3xl animate-float-1"
            style={{
              background: "radial-gradient(circle, hsl(280, 85%, 65%) 0%, transparent 70%)",
              animationDelay: "1s",
            }}
          />
          {/* Center accent bubble - vibrant yellow/orange */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-35 blur-3xl animate-float-2"
            style={{
              background: "radial-gradient(circle, hsl(35, 95%, 60%) 0%, transparent 70%)",
              animationDelay: "3s",
            }}
          />
        </div>

        {/* Screen 0: Hero / Intro */}
        <FlashcardScreen isVisible={currentScreen === 0} isExiting={exitingScreen === 0} cardColor={CARD_COLORS[0]}>
          <div className="flex flex-col items-center justify-center text-center px-4 relative">
            {/* Glow sphere behind title */}
            <GlowSphere />
            
            {/* Logo with gradient */}
            <h1
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight relative z-10 text-foreground"
            >
              Phormula
            </h1>

            {/* Slogan */}
            <p className="text-xl sm:text-2xl md:text-3xl text-foreground/60 font-light tracking-widest mt-4 relative z-10">
              simplify memorization.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3 mt-8 relative z-10">
              <Link to="/auth">
                <Button variant="ghost" className="text-foreground/80 hover:text-foreground hover:bg-foreground/5 font-light tracking-wide text-sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-lg font-light tracking-wide text-sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </FlashcardScreen>

        {/* Screen 1: Features Overview */}
        <FlashcardScreen isVisible={currentScreen === 1} isExiting={exitingScreen === 1} cardColor={CARD_COLORS[1]}>
          <div className="flex flex-col items-center justify-center text-center px-4 sm:px-8 max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-12 text-foreground">
              Everything You Need to Study Smarter.
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group bg-foreground/5 rounded-2xl p-4 sm:p-6 border border-foreground/10 hover:bg-foreground/10 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 bg-foreground/10">
                    <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-foreground/70 text-xs sm:text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </FlashcardScreen>

        {/* Screen 2: About (placeholder) */}
        <FlashcardScreen isVisible={currentScreen === 2} isExiting={exitingScreen === 2} cardColor={CARD_COLORS[2]}>
          <div className="flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">About</h2>
          </div>
        </FlashcardScreen>

        {/* Navigation dots */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-40">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              onClick={() => goToScreen(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                currentScreen === index ? "bg-foreground scale-125" : "bg-foreground/30 hover:bg-foreground/50"
              }`}
              aria-label={`Go to screen ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FlashcardSequence;
