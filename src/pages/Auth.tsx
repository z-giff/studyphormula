import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";

type AuthMode = "signin" | "signup" | null;

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

/* Decorative mini-deck for the ink panel */
const InkDeck = () => (
  <div aria-hidden className="relative w-44 h-32">
    {[
      { x: -18, y: 10, r: -9, bg: "hsl(36 40% 99% / 0.14)" },
      { x: 10, y: -4, r: 6, bg: "hsl(36 40% 99% / 0.22)" },
      { x: -4, y: 2, r: -2, bg: "var(--gradient-ember)" },
    ].map((c, i) => (
      <div
        key={i}
        className="absolute left-1/2 top-1/2 w-32 h-20 rounded-xl border border-white/10 shadow-lg"
        style={{
          background: c.bg,
          transform: `translate(-50%, -50%) translate(${c.x}px, ${c.y}px) rotate(${c.r}deg)`,
        }}
      />
    ))}
  </div>
);

const Auth = () => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // Post-auth redirect target (e.g. MCP OAuth flows) — must survive mode switches.
  const nextParam = searchParams.get("next") ?? undefined;
  const rawMode = searchParams.get("mode");
  const mode: AuthMode = rawMode === "signin" || rawMode === "signup" ? rawMode : null;

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const setMode = (m: Exclude<AuthMode, null>) => {
    setSearchParams(nextParam ? { mode: m, next: nextParam } : { mode: m });
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle(nextParam);
    setIsGoogleLoading(false);

    if (error) {
      toast.error(error.message || "Failed to sign in with Google");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginData.email || !loginData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password, nextParam);
    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Failed to sign in");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupData.fullName || !signupData.email || !signupData.password || !signupData.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (signupData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName, nextParam);
    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Failed to sign up");
    } else {
      toast.success("Account created successfully!");
    }
  };

  const inputClasses = "bg-background border-input";

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/75 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 flex items-center justify-between py-4">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <ThemeToggle />
        </div>
      </nav>

      <div className="min-h-screen grid lg:grid-cols-2 pt-[65px]">
        {/* Ink panel */}
        <div
          className="hidden lg:flex flex-col items-center justify-center gap-10 p-12 text-center"
          style={{ background: "var(--gradient-ink)" }}
        >
          <InkDeck />
          <div className="max-w-sm space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] font-medium" style={{ color: "hsl(var(--ember-glow))" }}>
              Ember &amp; Ink
            </p>
            <h2 className="text-4xl font-display" style={{ color: "hsl(33 30% 94%)" }}>
              Everything you need to remember, in one deck.
            </h2>
            <p className="text-sm" style={{ color: "hsl(30 12% 64%)" }}>
              Colour-coded flashcards, interactive diagrams, and AI-generated sets —
              your Phormula to studying.
            </p>
          </div>
        </div>

        {/* Action panel */}
        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            {mode === null ? (
              /* Chooser — no form until the visitor picks one */
              <div className="space-y-8 text-center">
                <div className="space-y-2">
                  <h1 className="text-4xl font-display text-foreground">Welcome</h1>
                  <p className="text-muted-foreground text-sm">
                    Master any subject with visual flashcards
                  </p>
                </div>
                <div className="space-y-3">
                  <Button
                    size="lg"
                    className="w-full shadow-[var(--shadow-ember)]"
                    onClick={() => setMode("signup")}
                  >
                    Sign Up
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full"
                    onClick={() => setMode("signin")}
                  >
                    Sign In
                  </Button>
                </div>
                <Link
                  to="/"
                  className="inline-block text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  ← Back to home
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2 text-center">
                  <h1 className="text-4xl font-display text-foreground">
                    {mode === "signin" ? "Welcome back" : "Create your account"}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {mode === "signin"
                      ? "Pick up right where you left off."
                      : "Start building your first deck in minutes."}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                >
                  <GoogleIcon />
                  {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wide">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                {mode === "signin" ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        disabled={isLoading}
                        required
                        className={inputClasses}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        disabled={isLoading}
                        required
                        className={inputClasses}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        disabled={isLoading}
                        required
                        className={inputClasses}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        disabled={isLoading}
                        required
                        className={inputClasses}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        disabled={isLoading}
                        required
                        className={inputClasses}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="text-sm">Confirm Password</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        disabled={isLoading}
                        required
                        className={inputClasses}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                )}

                <div className="text-center text-sm text-muted-foreground">
                  {mode === "signin" ? (
                    <>
                      New to Phormula?{" "}
                      <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                        onClick={() => setMode("signup")}
                      >
                        Sign Up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="text-primary hover:underline font-medium"
                        onClick={() => setMode("signin")}
                      >
                        Sign In
                      </button>
                    </>
                  )}
                </div>

                <div className="text-center">
                  <Link
                    to="/"
                    className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    ← Back to home
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
