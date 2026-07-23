import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import LogoOrb from "@/components/LogoOrb";
import SwirlMark from "@/components/SwirlMark";
import FlockStory from "@/components/home/FlockStory";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // The nav stays hidden through the hero and fades in once the story begins.
  useEffect(() => {
    const handleScroll = () => {
      setShowNav(window.scrollY > window.innerHeight * 1.1);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Persistent navigation — visible from Scene 2 onward */}
      <nav
        className={`fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-lg transition-all duration-300 ${
          showNav ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
        }`}
      >
        <div className="container mx-auto flex items-center justify-between px-4 py-3.5">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <div className="flex items-center gap-2.5">
            <Button asChild variant="ghost" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              <Link to="/auth?mode=signin">Sign in</Link>
            </Button>
            <Button asChild variant="brand" className="rounded-lg text-sm font-bold">
              <Link to="/auth?mode=signup">Start studying</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Scenes 0–8: one continuous scroll story */}
      <FlockStory />

      {/* Scene 9 — footer */}
      <footer className="border-t border-border bg-secondary/40 py-14">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-start">
            <div className="flex flex-col items-center gap-3 md:items-start">
              <LogoOrb size="md" showWordmark={true} linkTo="/" />
              <p className="font-display text-sm italic text-muted-foreground">
                Reformulating your study methods.
              </p>
            </div>
            <div className="flex items-center gap-8 text-sm">
              <Link to="/auth?mode=signin" className="text-muted-foreground transition-colors hover:text-foreground">
                Sign in
              </Link>
              <Link to="/auth?mode=signup" className="text-muted-foreground transition-colors hover:text-foreground">
                Create account
              </Link>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row">
            <p>© 2026 Phormula. All rights reserved.</p>
            <p className="flex items-center gap-2">
              <SwirlMark className="h-4 w-4" />
              Designed for studying after dark.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
