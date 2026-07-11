import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";
import GlowSphere from "@/components/GlowSphere";

const Auth = () => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next") ?? undefined;
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 flex items-center justify-between py-4">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <ThemeToggle />
        </div>
      </nav>

      {/* Background Glow Sphere */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <GlowSphere />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-light tracking-wide text-foreground">Welcome</h1>
            <p className="text-muted-foreground font-light tracking-wide text-sm">
              Master any subject with visual flashcards
            </p>
          </div>

          <Card className="bg-background/60 backdrop-blur-xl border-border/50 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-foreground font-light tracking-wide text-xl">Get Started</CardTitle>
              <CardDescription className="text-muted-foreground font-light">
                Sign in to your account or create a new one
              </CardDescription>
              
              {/* Google Sign In Button */}
              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-background/50 border-border/50 text-foreground hover:bg-foreground/10 font-light tracking-wide"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || isLoading}
                >
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
                  {isGoogleLoading ? "Connecting..." : "Continue with Google"}
                </Button>
              </div>
              
              <div className="relative pt-4">
                <div className="absolute inset-0 flex items-center pt-4">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background/60 px-2 text-muted-foreground font-light">Or continue with email</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                  <TabsTrigger 
                    value="login" 
                    className="font-light tracking-wide text-sm data-[state=active]:bg-foreground data-[state=active]:text-background"
                  >
                    Login
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="font-light tracking-wide text-sm data-[state=active]:bg-foreground data-[state=active]:text-background"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-foreground font-light tracking-wide text-sm">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground font-light"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-foreground font-light tracking-wide text-sm">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground font-light"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-foreground text-background hover:bg-foreground/90 font-light tracking-wide" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-foreground font-light tracking-wide text-sm">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground font-light"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-foreground font-light tracking-wide text-sm">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground font-light"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-foreground font-light tracking-wide text-sm">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground font-light"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="text-foreground font-light tracking-wide text-sm">Confirm Password</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground font-light"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-foreground text-background hover:bg-foreground/90 font-light tracking-wide" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link 
              to="/" 
              className="text-muted-foreground hover:text-foreground transition-colors font-light tracking-wide text-sm"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
