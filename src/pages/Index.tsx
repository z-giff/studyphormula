import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import SwirlMark from "@/components/SwirlMark";

/**
 * Homepage — a deliberately static, centred landing lockup.
 *
 * No animation, particles or background motion here: just the mark, the
 * wordmark, the tagline and the two calls to action, centred in the viewport
 * on the Ember & Ink ground. The auth destinations are unchanged, so the
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
    <main className="flex min-h-[100svh] flex-col items-center justify-center bg-background px-6 py-16 text-center">
      <SwirlMark className="h-24 w-24 drop-shadow-[0_0_28px_rgba(242,121,95,0.25)] sm:h-28 sm:w-28" />

      <h1 className="mt-5 font-display text-6xl font-medium tracking-tight text-foreground sm:text-7xl">
        Phormula
      </h1>

      <p className="mt-3 font-display text-lg italic text-muted-foreground sm:text-xl">
        Reformulating your study methods.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
        <Button asChild variant="brand" size="lg" className="rounded-xl px-7 font-bold">
          <Link to="/auth?mode=signup">Start studying</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="rounded-xl border-line-strong bg-transparent px-7 hover:bg-accent"
        >
          <Link to="/auth?mode=signin">Sign in</Link>
        </Button>
      </div>
    </main>
  );
};

export default Index;
