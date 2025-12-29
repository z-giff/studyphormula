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
  cardColor: string;
};

const FlashcardScreen = ({ isVisible, isExiting, children, cardColor }: FlashcardScreenProps) => {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center p-4 sm:p-8 md:p-12 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isVisible && !isExiting
          ? "opacity-100 translate-x-0 rotate-0 scale-100"
          : isExiting
          ? "opacity-0 -translate-x-[120%] -rotate-12 scale-90"
          : "opacity-0 translate-x-[120%] rotate-12 scale-90"
      }`}
      style={{ perspective: "1000px" }}
    >
      {/* The flashcard itself */}
      <div 
        className="relative w-full h-full max-w-6xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden"
        style={{ 
          backgroundColor: cardColor,
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset,
            0 -4px 0 0 rgba(0, 0, 0, 0.1) inset
          `
        }}
      >
        {/* Card texture overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Card content */}
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {children}
        </div>
        
        {/* Subtle corner fold effect */}
        <div 
          className="absolute top-0 right-0 w-16 h-16 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.05) 50%)`,
          }}
        />
      </div>
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
          cardColor={RAINBOW_COLORS[0]}
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
                className="h-16 sm:h-20 md:h-24 mb-6 drop-shadow-lg"
              />
            </div>
            
            {/* Slogan */}
            <p className="text-xl sm:text-2xl md:text-3xl text-white/90 font-handwriting tracking-wide drop-shadow-md">
              simplify memorization.
            </p>
          </div>
        </FlashcardScreen>

        {/* Screen 1: Features Overview */}
        <FlashcardScreen 
          isVisible={currentScreen === 1} 
          isExiting={exitingScreen === 1}
          cardColor={RAINBOW_COLORS[4]}
        >
          <div className="flex flex-col items-center justify-center text-center px-4 sm:px-8 max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-12 text-white drop-shadow-md">
              Everything You Need to Study Smarter.
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group bg-white/20 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/30 hover:bg-white/30 transition-all duration-300 hover:shadow-lg"
                >
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4 bg-white/30"
                  >
                    <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-white/80 text-xs sm:text-sm">
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
          cardColor={RAINBOW_COLORS[3]}
        >
          <div className="flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-md">
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
