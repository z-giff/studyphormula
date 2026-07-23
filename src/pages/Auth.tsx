import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogoOrb from "@/components/LogoOrb";

/** A few drifting cards on the narrative panel — the flock at rest. */
const DriftingCards = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    {[
      { left: "12%", top: "16%", d: "0s", t: 0.1 },
      { left: "68%", top: "10%", d: "-3s", t: 0.35 },
      { left: "30%", top: "38%", d: "-6s", t: 0.6 },
      { left: "76%", top: "52%", d: "-9s", t: 0.85 },
      { left: "18%", top: "68%", d: "-12s", t: 0.5 },
      { left: "55%", top: "80%", d: "-5s", t: 0.25 },
    ].map((c, i) => (
      <span
        key={i}
        className="animate-float absolute block h-[13px] w-[20px] rounded-[3px] opacity-50"
        style={{
          left: c.left,
          top: c.top,
          animationDelay: c.d,
          background: `hsl(${32 - c.t * 58} ${85 - c.t * 4}% ${64}%)`,
        }}
      />
    ))}
    <div className="animate-breathe absolute -bottom-[20%] -left-[15%] h-[70%] w-[80%] rounded-full opacity-40 blur-3xl [background:radial-gradient(circle,hsl(11_45%_16%)_0%,transparent_65%)]" />
  </div>
);

const Auth = () => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next") ?? undefined;
  // The layout the visitor sees is the one they chose: “Sign in” links carry
  // ?mode=signin, “Start studying” links carry ?mode=signup.
  const modeParam = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [tab, setTab] = useState<string>(modeParam);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    setTab(searchParams.get("mode") === "signup" ? "signup" : "login");
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle(nextParam);
    setIsGoogleLoading(false);

    if (error) {
      toast.error(error.message || "Failed to sign in with Google");
    }
  };

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

  const inputClass = "h-11 bg-secondary/60 border-border";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-3.5">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to home
          </Link>
        </div>
      </nav>

      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-stretch gap-0 px-4 pt-16 lg:grid-cols-[1fr_1.15fr] lg:gap-10">
        {/* Narrative panel — the desk lamp */}
        <div className="relative hidden overflow-hidden rounded-3xl border border-border/60 lg:my-10 lg:flex">
          <DriftingCards />
          <div className="relative z-10 flex flex-col justify-end p-10">
            <p className="font-display text-3xl italic leading-snug text-foreground/90">
              {tab === "signup" ? (
                <>Your first set takes<br />two minutes.</>
              ) : (
                <>Pick up where<br />you left off.</>
              )}
            </p>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              {tab === "signup"
                ? "Cards, diagrams, drawings — everything you make is waiting for you, organized."
                : "Your sets, files and bookmarks are exactly where you left them."}
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center py-10">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-2 text-center lg:text-left">
              <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">
                {tab === "signup" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Master any subject with visual flashcards
              </p>
            </div>

            <Card className="border-border bg-card shadow-[var(--shadow-card)]">
              <CardHeader className="pb-4">
                <CardTitle className="sr-only">
                  {tab === "signup" ? "Sign up" : "Sign in"}
                </CardTitle>
                <CardDescription className="sr-only">
                  Sign in to your account or create a new one
                </CardDescription>

                {/* Google Sign In Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full border-line-strong bg-secondary/40 font-semibold hover:bg-accent"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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
                  {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                </Button>

                <div className="relative pt-4">
                  <div className="absolute inset-0 flex items-center pt-4">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wider">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={tab} onValueChange={setTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-secondary/70">
                    <TabsTrigger
                      value="login"
                      className="text-sm font-semibold data-[state=active]:bg-accent data-[state=active]:text-foreground"
                    >
                      Sign in
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="text-sm font-semibold data-[state=active]:bg-accent data-[state=active]:text-foreground"
                    >
                      Sign up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="your@email.com"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          disabled={isLoading}
                          required
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          disabled={isLoading}
                          required
                          className={inputClass}
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="brand"
                        className="h-11 w-full rounded-lg font-bold"
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          value={signupData.fullName}
                          onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                          disabled={isLoading}
                          required
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          disabled={isLoading}
                          required
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          disabled={isLoading}
                          required
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirm Password</Label>
                        <Input
                          id="signup-confirm"
                          type="password"
                          placeholder="••••••••"
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                          disabled={isLoading}
                          required
                          className={inputClass}
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="brand"
                        className="h-11 w-full rounded-lg font-bold"
                        disabled={isLoading}
                      >
                        {isLoading ? "Creating account..." : "Create Account"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
