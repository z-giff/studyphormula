import { useEffect, useState, useRef } from "react";
import { Palette, ImageIcon, Workflow, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import phormulaTextLogo from "@/assets/phormula-text-logo.png";
import GlowSphere from "./GlowSphere";

// Unified soft off-white card surface — same across all screens for cohesion
const CARD_COLOR = "hsl(0, 0%, 100%)";
const features = [{
  icon: Palette,
  title: "Colour-Coded Organization",
  description: "Organize flashcards by colour to group related content and reinforce memory through visual association.",
  color: "hsl(346, 77%, 60%)"
}, {
  icon: ImageIcon,
  title: "Visual Learning",
  description: "Add images, diagrams, and annotations for complex topics.",
  color: "hsl(35, 92%, 55%)"
}, {
  icon: Workflow,
  title: "Process-Based",
  description: "Build diagrams and flowcharts within definitions so complex processes are learned structurally.",
  color: "hsl(160, 60%, 42%)"
}, {
  icon: Sparkles,
  title: "Smart Study",
  description: "Intelligent tools like auto-read diagrams and interactive fill-in-the-blank testing reinforce knowledge.",
  color: "hsl(255, 70%, 62%)"
}];
type FlashcardScreenProps = {
  isVisible: boolean;
  isExiting: boolean;
  children: React.ReactNode;
  cardColor: string;
};
const FlashcardScreen = ({
  isVisible,
  isExiting,
  children,
  cardColor
}: FlashcardScreenProps) => {
  return <div className={`absolute inset-4 sm:inset-8 md:inset-12 lg:inset-16 rounded-[28px] transition-all duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isVisible && !isExiting ? "opacity-100 translate-x-0 rotate-0 scale-100" : isExiting ? "opacity-0 -translate-x-[110%] -rotate-3 scale-[0.97]" : "opacity-0 translate-x-[110%] rotate-3 scale-[0.97]"}`} style={{
    perspective: "1000px",
    backgroundColor: cardColor,
    border: "1px solid hsl(220, 13%, 93%)",
    boxShadow: "0 1px 2px hsl(220 15% 20% / 0.04), 0 12px 40px -12px hsl(220 15% 20% / 0.08)"
  }}>
      {/* Card content */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">{children}</div>
    </div>;
};
const FlashcardSequence = () => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [exitingScreen, setExitingScreen] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setPulsePhase(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Removed auto-advance - user controls navigation via scroll

  // Scroll handling for manual navigation with snap behavior
  useEffect(() => {
    let isSnapping = false;
    let snapTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastScrollTime = Date.now();
    const snapToScreen = (targetScreen: number) => {
      if (!containerRef.current || isSnapping) return;
      isSnapping = true;
      const viewportHeight = window.innerHeight;
      const containerTop = containerRef.current.offsetTop;
      const targetScrollY = containerTop + targetScreen * viewportHeight;
      window.scrollTo({
        top: targetScrollY,
        behavior: "smooth"
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
    window.addEventListener("scroll", handleScroll, {
      passive: true
    });
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
  return <div ref={containerRef} className="relative" style={{
    height: "300vh"
  }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-background">
        {/* Calm ambient wash — subtle lavender + cool grey, no vibrant bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full opacity-50 blur-3xl animate-float" style={{
            background: "radial-gradient(circle, hsl(260, 60%, 90%) 0%, transparent 70%)"
          }} />
          <div className="absolute -bottom-40 -right-40 w-[36rem] h-[36rem] rounded-full opacity-40 blur-3xl animate-float" style={{
            background: "radial-gradient(circle, hsl(220, 40%, 92%) 0%, transparent 70%)",
            animationDelay: "4s"
          }} />
        </div>

        {/* Screen 0: Hero / Intro */}
        <FlashcardScreen isVisible={currentScreen === 0} isExiting={exitingScreen === 0} cardColor={CARD_COLOR}>
          <div className="flex flex-col items-center justify-center text-center px-4 relative">
            {/* Glow sphere behind title */}
            <GlowSphere />
            
            {/* Wordmark */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-[-0.04em] relative z-10 text-foreground">
              Phormula
            </h1>

            {/* Slogan */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-light tracking-[0.2em] uppercase mt-6 relative z-10">
              simplify memorization.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3 mt-10 relative z-10">
              <Link to="/auth">
                <Button variant="ghost" className="text-foreground/70 hover:text-foreground hover:bg-foreground/5 font-light tracking-wide text-sm rounded-full px-5">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full font-light tracking-wide text-sm px-6">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </FlashcardScreen>

        {/* Screen 1: Features Overview */}
        <FlashcardScreen isVisible={currentScreen === 1} isExiting={exitingScreen === 1} cardColor={CARD_COLOR}>
          <div className="flex flex-col items-center justify-center text-center px-6 sm:px-12 max-w-5xl mx-auto">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">Features</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-[-0.02em] mb-12 sm:mb-16 text-foreground max-w-2xl">
              Everything you need to study smarter.
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 w-full">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="group text-left [--feat:theme(colors.foreground)]"
                    style={{ ["--feat" as any]: feature.color }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-all duration-500 ease-out group-hover:scale-[1.08] bg-[color-mix(in_hsl,var(--feat)_8%,transparent)] ring-1 ring-[color-mix(in_hsl,var(--feat)_10%,transparent)] group-hover:bg-[color-mix(in_hsl,var(--feat)_14%,transparent)] group-hover:ring-[color-mix(in_hsl,var(--feat)_18%,transparent)] group-hover:shadow-[0_8px_24px_-8px_color-mix(in_hsl,var(--feat)_45%,transparent)]"
                    >
                      <Icon
                        className="w-[18px] h-[18px] transition-all duration-500 ease-out opacity-80 group-hover:opacity-100 text-[var(--feat)]"
                        strokeWidth={1.75}
                      />
                    </div>
                    <h3 className="text-[15px] font-medium mb-2 text-foreground tracking-tight">{feature.title}</h3>
                    <p className="text-muted-foreground text-[13px] leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </FlashcardScreen>

        {/* Screen 2: About */}
        <FlashcardScreen isVisible={currentScreen === 2} isExiting={exitingScreen === 2} cardColor={CARD_COLOR}>
          <div className="flex flex-col items-center justify-start text-center px-6 sm:px-10 md:px-16 py-12 sm:py-16 max-w-2xl mx-auto h-full overflow-y-auto">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">About</p>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-foreground">A note from the founder</h2>

            <div className="text-left space-y-6 text-[15px] text-foreground/75 leading-[1.8] mt-10">
              <p>
                Phormula was born from a personal journey rooted in challenge, adaptation, and discovery. As a student transitioning from a highly creative undergraduate program into a demanding STEM pathway, I quickly realized that traditional study methods were no longer sufficient. The shift came with significant academic pressure, particularly the challenge of mastering large volumes of information while striving for excellence.
              </p>
              
              <p>
                Through this experience, I discovered something transformative about my own learning process: memorization became significantly more effective when information was paired with colour, structure, and visual design. Concepts that once felt overwhelming became clearer, more engaging, and easier to retain when presented visually. What began as a personal study strategy soon revealed a broader truth—many students, especially visual learners, are underserved by conventional memorization tools.
              </p>
              
              <p className="text-foreground font-medium">
                Phormula was created to bridge that gap.
              </p>
              
              <p>
                Built at the intersection of science, design, and education, Phormula empowers learners to study smarter by leveraging visual reinforcement, thoughtful organization, and intuitive design. Our mission is to make memorization more accessible, less intimidating, and genuinely effective—especially for those who learn best by seeing, not just reading.
              </p>
              
              <p className="mt-8 text-foreground not-italic">
                Built with purpose,<br />
                Zoha S<br />
                <span className="text-muted-foreground font-light">Founder, Phormula</span>
              </p>
            </div>
          </div>
        </FlashcardScreen>

        {/* Navigation dots */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-40">
          {[0, 1, 2].map(index => <button key={index} onClick={() => goToScreen(index)} className={`h-1.5 rounded-full transition-all duration-500 ${currentScreen === index ? "w-6 bg-foreground/70" : "w-1.5 bg-foreground/20 hover:bg-foreground/40"}`} aria-label={`Go to screen ${index + 1}`} />)}
        </div>
      </div>
    </div>;
};
export default FlashcardSequence;