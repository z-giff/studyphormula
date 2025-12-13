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
import phormulaLogo from "@/assets/phormula-logo.png";
import phormulaBackground from "@/assets/phormula-background.png";

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
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#e9e9e9' }}>
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Animated Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img 
          src={phormulaBackground} 
          alt="" 
          className="absolute h-[600px] md:h-[800px] opacity-20 -scale-x-100 animate-[pulse_4s_ease-in-out_infinite]" 
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="text-center">
            <Link to="/" className="inline-block">
              <img 
                src={phormulaLogo} 
                alt="Phormula" 
                className="h-32 md:h-40 mx-auto animate-[pulse_4s_ease-in-out_infinite]" 
              />
            </Link>
            <p className="text-black/70 mt-2">Master any subject with visual flashcards</p>
          </div>

          <Card className="bg-white/80 backdrop-blur-md border-black/10 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-black">Welcome</CardTitle>
              <CardDescription className="text-black/60">Sign in to your account or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-black/10">
                  <TabsTrigger value="login" className="data-[state=active]:bg-black data-[state=active]:text-white">Login</TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-black data-[state=active]:text-white">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-black">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-white/50 border-black/20 text-black placeholder:text-black/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-black">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-white/50 border-black/20 text-black placeholder:text-black/40"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-black text-white hover:bg-black/90" disabled={isLoading}>
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-black">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-white/50 border-black/20 text-black placeholder:text-black/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-black">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-white/50 border-black/20 text-black placeholder:text-black/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-black">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-white/50 border-black/20 text-black placeholder:text-black/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="text-black">Confirm Password</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        disabled={isLoading}
                        required
                        className="bg-white/50 border-black/20 text-black placeholder:text-black/40"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-black text-white hover:bg-black/90" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-black/60">
            <Link to="/" className="hover:text-black transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
