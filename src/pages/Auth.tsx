import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";
import GlowSphere from "@/components/GlowSphere";

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

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
    const { error } = await signIn(loginData.email, loginData.password);
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
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);
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
