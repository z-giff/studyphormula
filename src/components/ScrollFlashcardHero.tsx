import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const RAINBOW_COLORS = [
  { bg: "hsl(0, 85%, 65%)", name: "red" },
  { bg: "hsl(30, 90%, 60%)", name: "orange" },
  { bg: "hsl(50, 95%, 60%)", name: "yellow" },
  { bg: "hsl(145, 60%, 50%)", name: "green" },
  { bg: "hsl(200, 100%, 61%)", name: "blue" },
  { bg: "hsl(260, 70%, 60%)", name: "indigo" },
  { bg: "hsl(280, 75%, 65%)", name: "violet" },
];

const ScrollFlashcardHero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const scrollableHeight = containerRef.current.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollableHeight));
      
      setScrollProgress(progress);
      
      // Calculate which card should be shown based on scroll progress
      const cardIndex = Math.floor(progress * RAINBOW_COLORS.length);
      const clampedIndex = Math.min(cardIndex, RAINBOW_COLORS.length - 1);
      
      if (clampedIndex !== currentIndex) {
        setIsFlipping(true);
        setTimeout(() => {
          setCurrentIndex(clampedIndex);
          setIsFlipping(false);
        }, 150);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentIndex]);

  // Calculate partial flip progress within each card segment
  const segmentProgress = (scrollProgress * RAINBOW_COLORS.length) % 1;
  const flipRotation = prefersReducedMotion ? 0 : Math.min(segmentProgress * 15, 10);

  return (
    <div 
      ref={containerRef} 
      className="relative"
      style={{ height: "400vh" }}
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background gradient that changes with cards */}
        <div 
          className="absolute inset-0 transition-all duration-700 ease-out opacity-20"
          style={{
            background: `radial-gradient(ellipse at center, ${RAINBOW_COLORS[currentIndex].bg} 0%, transparent 70%)`
          }}
        />
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center px-4">
          {/* Card stack container */}
          <div className="relative w-[320px] sm:w-[400px] md:w-[480px] h-[200px] sm:h-[240px] md:h-[280px] perspective-[1000px]">
            {/* Background stacked cards */}
            {RAINBOW_COLORS.slice(currentIndex + 1, currentIndex + 4).reverse().map((color, i) => {
              const offset = (3 - i) * 4;
              return (
                <div
                  key={`stack-${color.name}-${i}`}
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    backgroundColor: color.bg,
                    transform: `translateY(${offset}px) translateX(${offset}px) scale(${1 - (3 - i) * 0.02})`,
                    boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.15)",
                    zIndex: i,
                  }}
                />
              );
            })}
            
            {/* Current card */}
            <div
              className={`absolute inset-0 rounded-2xl flex items-center justify-center transition-transform ${
                prefersReducedMotion ? "" : "duration-200 ease-out"
              }`}
              style={{
                backgroundColor: RAINBOW_COLORS[currentIndex].bg,
                transform: isFlipping 
                  ? `rotateX(-${flipRotation}deg) translateY(-20px)` 
                  : `rotateX(-${flipRotation}deg)`,
                boxShadow: "0 8px 40px -8px rgba(0, 0, 0, 0.25), 0 4px 12px -4px rgba(0, 0, 0, 0.1)",
                zIndex: 10,
                transformOrigin: "bottom center",
              }}
            >
              {/* Card content */}
              <p 
                className="text-2xl sm:text-3xl md:text-4xl text-white/95 font-handwriting select-none px-8 text-center"
                style={{
                  textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
                  letterSpacing: "0.02em",
                }}
              >
                simplify memorization.
              </p>
            </div>
            
            {/* Hand illustration */}
            <div 
              className={`absolute -right-12 sm:-right-16 md:-right-20 bottom-0 w-32 sm:w-40 md:w-48 h-48 sm:h-56 md:h-64 pointer-events-none transition-transform ${
                prefersReducedMotion ? "" : "duration-300 ease-out"
              }`}
              style={{
                transform: isFlipping 
                  ? "rotate(-15deg) translateY(-10px)" 
                  : `rotate(-${5 + flipRotation}deg)`,
                transformOrigin: "bottom right",
              }}
            >
              {/* Simplified cartoon hand SVG */}
              <svg viewBox="0 0 120 180" className="w-full h-full drop-shadow-lg">
                {/* Arm/wrist */}
                <ellipse cx="70" cy="170" rx="25" ry="20" fill="#FFDAB9" />
                
                {/* Palm */}
                <ellipse cx="60" cy="120" rx="35" ry="45" fill="#FFE4C4" />
                
                {/* Thumb */}
                <ellipse 
                  cx="25" 
                  cy="110" 
                  rx="12" 
                  ry="25" 
                  fill="#FFDAB9"
                  transform="rotate(-20 25 110)"
                />
                <ellipse cx="20" cy="88" rx="8" ry="10" fill="#FFE4C4" />
                
                {/* Index finger - pointing/flipping */}
                <rect 
                  x="40" 
                  y="30" 
                  width="16" 
                  height="60" 
                  rx="8" 
                  fill="#FFE4C4"
                  className={`origin-bottom transition-transform ${prefersReducedMotion ? "" : "duration-200"}`}
                  style={{
                    transform: `rotate(${isFlipping ? -10 : 0}deg)`,
                    transformOrigin: "48px 90px"
                  }}
                />
                <ellipse cx="48" cy="28" rx="8" ry="10" fill="#FFDAB9" />
                
                {/* Middle finger */}
                <rect 
                  x="58" 
                  y="25" 
                  width="16" 
                  height="55" 
                  rx="8" 
                  fill="#FFE4C4"
                />
                <ellipse cx="66" cy="23" rx="8" ry="10" fill="#FFDAB9" />
                
                {/* Ring finger */}
                <rect 
                  x="76" 
                  y="32" 
                  width="14" 
                  height="50" 
                  rx="7" 
                  fill="#FFE4C4"
                />
                <ellipse cx="83" cy="30" rx="7" ry="9" fill="#FFDAB9" />
                
                {/* Pinky */}
                <rect 
                  x="92" 
                  y="45" 
                  width="12" 
                  height="40" 
                  rx="6" 
                  fill="#FFE4C4"
                />
                <ellipse cx="98" cy="43" rx="6" ry="8" fill="#FFDAB9" />
                
                {/* Knuckle shadows */}
                <ellipse cx="48" cy="75" rx="6" ry="3" fill="#DEB887" opacity="0.3" />
                <ellipse cx="66" cy="72" rx="6" ry="3" fill="#DEB887" opacity="0.3" />
                <ellipse cx="83" cy="76" rx="5" ry="3" fill="#DEB887" opacity="0.3" />
              </svg>
            </div>
          </div>
          
          {/* Scroll indicator dots */}
          <div className="flex gap-2 mt-8 sm:mt-12">
            {RAINBOW_COLORS.map((color, i) => (
              <div
                key={color.name}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: i === currentIndex ? color.bg : "hsl(var(--foreground) / 0.2)",
                  transform: i === currentIndex ? "scale(1.3)" : "scale(1)",
                }}
              />
            ))}
          </div>
          
          {/* CTA */}
          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row gap-4">
            <Link to="/auth">
              <Button 
                size="lg" 
                className="bg-foreground text-background hover:bg-foreground/90 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Start Studying
              </Button>
            </Link>
            <Link to="/auth">
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-foreground/20 hover:border-foreground/40 text-lg px-8 py-6 rounded-xl"
              >
                Create a Set
              </Button>
            </Link>
          </div>
          
          {/* Scroll hint */}
          <div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500"
            style={{ opacity: scrollProgress < 0.1 ? 1 : 0 }}
          >
            <span className="text-sm text-foreground/50">Scroll to explore</span>
            <div className="w-6 h-10 rounded-full border-2 border-foreground/30 flex items-start justify-center p-1">
              <div className="w-1.5 h-2.5 bg-foreground/40 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollFlashcardHero;
