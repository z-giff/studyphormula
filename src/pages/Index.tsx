import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SwirlMark from "@/components/SwirlMark";
import StoryStage from "@/components/home/StoryStage";

/**
 * Homepage — one continuous, scroll-driven story (scenes 0–8) resting on a
 * quiet footer (scene 9). The auth destinations are unchanged, so the
 * sign-in / sign-up experiences keep their own design and behaviour.
 */
const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    // NOTE: no `overflow-x: hidden` here — it computes to `overflow: hidden auto`,
    // which makes this a scroll container and breaks the story stage's
    // `position: sticky`. Horizontal overflow is contained by the stage itself.
    <div className="bg-background">
      <StoryStage />

      {/* S9 · Footer — the resting point of the story */}
      <footer className="border-t border-border/70 bg-secondary/30">
        <div className="mx-auto w-full max-w-5xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2.5 sm:items-start">
              <div className="flex items-center gap-2.5">
                <SwirlMark className="h-6 w-6" />
                <span className="font-display text-lg font-medium tracking-tight text-foreground">
                  Phormula
                </span>
              </div>
              <p className="font-display text-sm italic text-muted-foreground">
                Reformulating your study methods.
              </p>
            </div>

            <nav className="flex items-center gap-7 text-sm" aria-label="Footer">
              <Link
                to="/auth?mode=signup"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Start studying
              </Link>
              <Link
                to="/auth?mode=signin"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            </nav>
          </div>

          <p className="mt-9 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground sm:text-left">
            © 2026 Phormula. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
