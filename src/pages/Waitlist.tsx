import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import LogoOrb from "@/components/LogoOrb";
import SwirlMark from "@/components/SwirlMark";
import TurnstileWidget from "@/components/TurnstileWidget";
import { CheckCircle2 } from "lucide-react";

// Only show social proof once the number is meaningful.
const SOCIAL_PROOF_THRESHOLD = 25;

const Waitlist = () => {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // Bumping this remounts the Turnstile widget — tokens are single-use, so a
  // failed submit needs a fresh challenge.
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<"new" | "already" | null>(null);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.functions
      .invoke("waitlist-count")
      .then(({ data }) => {
        if (data && typeof data.count === "number") setWaitlistCount(data.count);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot: real users never fill this hidden field. Pretend success so
    // bots don't learn they were caught.
    if (honeypot) {
      setSubmitted("new");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!turnstileToken) {
      toast.error("Please complete the verification first");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase.functions.invoke("waitlist-signup", {
      body: { email: email.trim(), turnstileToken },
    });
    setIsSubmitting(false);

    if (error || data?.error) {
      let message = data?.error || "Something went wrong — please try again";
      // Non-2xx responses surface as a FunctionsHttpError; the server's
      // message lives in the response body on error.context.
      if (error && "context" in error && error.context instanceof Response) {
        try {
          const details = await error.context.json();
          if (details?.error) message = details.error;
        } catch {
          // keep the generic message
        }
      }
      toast.error(message);
      // Tokens are consumed on verification — force a fresh challenge.
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
      return;
    }

    if (typeof data?.count === "number") setWaitlistCount(data.count);
    setSubmitted(data?.status === "already_registered" ? "already" : "new");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 flex items-center justify-between py-4">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground font-light border border-border/50 rounded-full px-3 py-1">
            Coming soon
          </span>
        </div>
      </nav>

      {/* Ambient ember light */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-breathe absolute -left-[12%] -top-[8%] h-[52vw] w-[52vw] rounded-full opacity-30 blur-3xl [background:radial-gradient(circle,hsl(340_35%_16%)_0%,transparent_65%)]" />
        <div className="animate-breathe absolute -bottom-[6%] -right-[10%] h-[44vw] w-[44vw] rounded-full opacity-30 blur-3xl [background:radial-gradient(circle,hsl(11_45%_14%)_0%,transparent_65%)] [animation-delay:-4s] [animation-duration:12s]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <SwirlMark className="mx-auto h-16 w-16 drop-shadow-[0_0_24px_rgba(242,121,95,0.25)]" />
            <h1 className="font-display text-4xl font-medium tracking-tight text-foreground">
              Memorize anything.
              <br />
              Beautifully.
            </h1>
            <p className="text-muted-foreground font-light tracking-wide text-sm max-w-sm mx-auto">
              Color-coded flashcards, interactive diagrams, and AI-generated
              study sets. Phormula is launching soon.
            </p>
          </div>

          <Card className="border-border bg-card/85 shadow-[var(--shadow-card)] backdrop-blur-xl">
            {submitted ? (
              <CardContent className="pt-8 pb-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 mx-auto text-foreground/80" strokeWidth={1.25} />
                <div className="space-y-2">
                  <h2 className="text-xl font-light tracking-wide text-foreground">
                    {submitted === "already" ? "You're already on the list!" : "You're on the list!"}
                  </h2>
                  <p className="text-muted-foreground font-light text-sm">
                    {submitted === "already"
                      ? "This email is already signed up — we'll be in touch at launch."
                      : "Check your inbox for a confirmation. We'll email you the moment early access opens."}
                  </p>
                </div>
              </CardContent>
            ) : (
              <>
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-foreground font-light tracking-wide text-xl">
                    Get early access
                  </CardTitle>
                  <CardDescription className="text-muted-foreground font-light">
                    Join the waitlist and be first in when we launch
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                      maxLength={255}
                      autoComplete="email"
                      className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground font-light"
                    />

                    {/* Honeypot — hidden from humans, tempting for bots */}
                    <input
                      type="text"
                      name="website"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="absolute -left-[9999px] top-0 h-0 w-0 opacity-0"
                    />

                    <TurnstileWidget
                      key={turnstileKey}
                      onToken={setTurnstileToken}
                      className="flex justify-center"
                    />

                    <Button
                      type="submit"
                      variant="brand"
                      className="w-full font-bold"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Joining..." : "Join the Waitlist"}
                    </Button>
                  </form>

                  <p className="text-center text-xs text-muted-foreground font-light mt-4">
                    Just your email — nothing else. Unsubscribe anytime.
                  </p>
                </CardContent>
              </>
            )}
          </Card>

          {waitlistCount !== null && waitlistCount >= SOCIAL_PROOF_THRESHOLD && (
            <p className="text-center text-sm text-muted-foreground font-light tracking-wide">
              Join <span className="text-foreground font-normal">{waitlistCount.toLocaleString()}+</span> students already waiting
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <LogoOrb size="sm" showWordmark={true} linkTo="/" />
            <p className="text-muted-foreground text-sm">© 2026 Phormula. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Waitlist;
