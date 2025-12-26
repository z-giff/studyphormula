import { useEffect, useState, useRef } from "react";
import { Palette, ImageIcon, BookmarkIcon, Shuffle } from "lucide-react";
import phormulaTextLogo from "@/assets/phormula-text-logo.png";

const RAINBOW_COLORS = [
  "hsl(0, 85%, 65%)",    // red
  "hsl(30, 90%, 60%)",   // orange
  "hsl(50, 95%, 60%)",   // yellow
  "hsl(145, 60%, 50%)",  // green
  "hsl(200, 100%, 61%)", // blue
  "hsl(260, 70%, 60%)",  // indigo
  "hsl(280, 75%, 65%)",  // violet
];

const features = [
  {
    icon: Palette,
    title: "Rainbow Organization",
    description: "Color-code your decks for visual memory and instant recognition."
  },
  {
    icon: ImageIcon,
    title: "Visual Learning",
    description: "Add images, diagrams, and annotations for complex topics."
  },
  {
    icon: BookmarkIcon,
    title: "Smart Sections",
    description: "Organize large decks into focused study segments."
  },
  {
    icon: Shuffle,
    title: "Study Modes",
    description: "Flip, shuffle, and repeat for effective learning."
  },
];

type FlashcardScreenProps = {
  isVisible: boolean;
  isExiting: boolean;
  children: React.ReactNode;
  bgColor?: string;
};

const FlashcardScreen = ({ isVisible, isExiting, children, bgColor }: FlashcardScreenProps) => {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
        isVisible && !isExiting
          ? "opacity-100 translate-x-0"
          : isExiting
          ? "opacity-0 -translate-x-full scale-95"
          : "opacity-0 translate-x-full scale-95"
      }`}
      style={{ backgroundColor: bgColor }}
    >
      {children}
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

  // Scroll handling for manual navigation
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (!containerRef.current) return;
      
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
      
      lastScrollY = scrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
    <div 
      ref={containerRef}
      className="relative"
      style={{ height: "300vh" }}
    >
      <div className="sticky top-0 h-screen overflow-hidden bg-background">
        {/* Screen 0: Hero / Intro */}
        <FlashcardScreen 
          isVisible={currentScreen === 0} 
          isExiting={exitingScreen === 0}
        >
          <div className="flex flex-col items-center justify-center text-center px-4">
            {/* Logo with pulse */}
            <div
              className="transition-transform duration-300"
              style={{ transform: `scale(${pulseScale})` }}
            >
              <img 
                src={phormulaTextLogo} 
                alt="Phormula" 
                className="h-16 sm:h-20 md:h-24 mb-6"
              />
            </div>
            
            {/* Slogan */}
            <p className="text-xl sm:text-2xl md:text-3xl text-foreground/80 font-handwriting tracking-wide">
              simplify memorization.
            </p>

            {/* Decorative rainbow cards in background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {RAINBOW_COLORS.map((color, i) => (
                <div
                  key={i}
                  className="absolute w-32 h-20 sm:w-48 sm:h-28 rounded-xl opacity-10"
                  style={{
                    backgroundColor: color,
                    top: `${15 + (i % 3) * 25}%`,
                    left: `${5 + (i * 12)}%`,
                    transform: `rotate(${-15 + i * 5}deg)`,
                  }}
                />
              ))}
            </div>
          </div>
        </FlashcardScreen>

        {/* Screen 1: Features Overview */}
        <FlashcardScreen 
          isVisible={currentScreen === 1} 
          isExiting={exitingScreen === 1}
        >
          <div className="flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-12 text-foreground">
              Everything You Need to Study Smarter.
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-card/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-border/50 hover:border-border hover:bg-card transition-all duration-300 hover:shadow-lg"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 transition-colors"
                    style={{ backgroundColor: `${RAINBOW_COLORS[index]}20` }}
                  >
                    <feature.icon 
                      className="h-5 w-5 sm:h-6 sm:w-6" 
                      style={{ color: RAINBOW_COLORS[index] }}
                    />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FlashcardScreen>

        {/* Screen 2: About (placeholder) */}
        <FlashcardScreen 
          isVisible={currentScreen === 2} 
          isExiting={exitingScreen === 2}
        >
          <div className="flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
              About
            </h2>
          </div>
        </FlashcardScreen>

        {/* Navigation dots */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-40">
          {[0, 1, 2].map((index) => (
            <button
              key={index}
              onClick={() => goToScreen(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                currentScreen === index 
                  ? "bg-foreground scale-125" 
                  : "bg-foreground/30 hover:bg-foreground/50"
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
