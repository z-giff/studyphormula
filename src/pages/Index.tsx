import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Palette, ImageIcon, BookmarkIcon, Shuffle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import heroImage from "@/assets/hero-image.jpg";
const Index = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);
  const features = [{
    icon: Palette,
    title: "Color-Coded Organization",
    description: "Assign unique colors to each deck for better visual memory and quick identification."
  }, {
    icon: ImageIcon,
    title: "Visual Learning Support",
    description: "Add images, diagrams, and annotations to your flashcards for complex topics."
  }, {
    icon: BookmarkIcon,
    title: "Section Bookmarks",
    description: "Divide large decks into organized sections for easier navigation and focused studying."
  }, {
    icon: Shuffle,
    title: "Smart Study Modes",
    description: "Flip, shuffle, and repeat your cards for effective learning sessions."
  }];
  return <div className="min-h-screen bg-gradient-to-r from-primary via-[hsl(10_90%_60%)] to-accent">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Futuristic Bubbles Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => <div key={i} className="absolute rounded-full opacity-40 animate-float" style={{
          width: `${Math.random() * 250 + 100}px`,
          height: `${Math.random() * 250 + 100}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `radial-gradient(circle, hsl(25 95% 60% / 0.6), hsl(330 81% 65% / 0.4))`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 10 + 15}s`,
          filter: 'blur(40px)',
          boxShadow: '0 0 60px hsl(25 95% 60% / 0.5)'
        }} />)}
        </div>
        
        <nav className="relative container mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
            <GraduationCap className="h-8 w-8" />
            <span>Phormula</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>

        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Master Complex Material with{" "}
                <span className="text-primary">Visual Flashcards</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                A powerful flashcard platform designed for STEM students. Add images, organize with colors, and study smarter.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start Learning Free
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 blur-3xl" />
              
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary via-[hsl(10_90%_60%)] to-accent">
        <div className="absolute inset-0 bg-background/95" />
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Study Better</h2>
            <p className="text-xl text-muted-foreground">
              Built specifically for students tackling complex subjects like anatomy, physiology, and public health.
            </p>
          </div>

          <div className="relative grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => <div key={index} className="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary via-[hsl(10_90%_60%)] to-accent">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => <div key={i} className="absolute rounded-full opacity-30 animate-float" style={{
          width: `${Math.random() * 200 + 80}px`,
          height: `${Math.random() * 200 + 80}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `radial-gradient(circle, hsl(25 95% 60% / 0.5), hsl(330 81% 65% / 0.3))`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${Math.random() * 10 + 15}s`,
          filter: 'blur(30px)'
        }} />)}
        </div>
        <div className="relative container mx-auto px-4">
          <div className="rounded-2xl p-12 text-center text-white backdrop-blur-sm bg-white/10">
            <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Study Habits?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of students already studying smarter with FlashLearn
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="text-lg">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t py-12 bg-gradient-to-r from-primary via-[hsl(10_90%_60%)] to-accent">
        <div className="absolute inset-0 bg-background/95" />
        <div className="relative container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 FlashLearn. All rights reserved.</p>
        </div>
      </footer>
    </div>;
};
export default Index;