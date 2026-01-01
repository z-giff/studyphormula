import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";
import FlashcardSequence from "@/components/FlashcardSequence";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNav, setShowNav] = useState(false);
  
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Show navbar on scroll past first screen
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      // Show nav when scrolled past ~30% of first screen
      setShowNav(scrollY > viewportHeight * 0.3);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Navigation - Shows on scroll */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50 transition-all duration-300 ${
          showNav ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
        }`}
      >
        <div className="container mx-auto px-4 flex items-center justify-between py-4">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
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
      </nav>

      {/* Flashcard Sequence */}
      <FlashcardSequence />

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <LogoOrb size="sm" showWordmark={true} linkTo="/" />
            <p className="text-muted-foreground text-sm">
              © 2025 Phormula. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
