import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Palette, ImageIcon, BookmarkIcon, Shuffle, Sparkles, Brain, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import phormulaLogo from "@/assets/phormula-logo.png";
import ScrollFlashcardHero from "@/components/ScrollFlashcardHero";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Palette,
      title: "Rainbow Organization",
      description: "Color-code your decks for visual memory and instant recognition."
    },
    {
      icon: ImageIcon,
      title: "Visual Learning",
      description: "Add images, diagrams, and annotations for complex topics."
    },
    {
      icon: BookmarkIcon,
      title: "Smart Sections",
      description: "Organize large decks into focused study segments."
    },
    {
      icon: Shuffle,
      title: "Study Modes",
      description: "Flip, shuffle, and repeat for effective learning."
    },
  ];

  const benefits = [
    {
      icon: Sparkles,
      title: "Beautiful by Default",
      description: "Every card you create looks stunning without any effort."
    },
    {
      icon: Brain,
      title: "Memory-Optimized",
      description: "Designed around proven memorization techniques."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Create and study cards in seconds, not minutes."
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-4 flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={phormulaLogo} alt="Phormula" className="h-10 w-10" />
            <span className="font-heading font-bold text-xl text-foreground">Phormula</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" className="text-foreground/80 hover:text-foreground hover:bg-foreground/5">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Scroll-Triggered Hero */}
      <ScrollFlashcardHero />

      {/* Features Section */}
      <section className="relative py-24 md:py-32 bg-gradient-to-b from-background to-background/95">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Everything You Need to Study Smarter
            </h2>
            <p className="text-lg text-muted-foreground">
              Built for students tackling anatomy, physiology, languages, and beyond.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-border hover:bg-card transition-all duration-300 hover:shadow-lg"
              >
                <div className="bg-foreground/5 group-hover:bg-foreground/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors">
                  <feature.icon className="h-6 w-6 text-foreground/70" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-foreground/5 mb-6">
                    <benefit.icon className="h-8 w-8 text-foreground/70" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="relative">
              {/* Rainbow gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-deck-red via-deck-yellow via-deck-green via-deck-blue to-deck-purple opacity-10 blur-3xl rounded-full" />
              
              <div className="relative bg-card/80 backdrop-blur-sm rounded-3xl p-12 border border-border/50">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                  Ready to Simplify Memorization?
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                  Join thousands of students already studying smarter with beautiful, color-coded flashcards.
                </p>
                <Link to="/auth">
                  <Button 
                    size="lg" 
                    className="text-lg bg-foreground text-background hover:bg-foreground/90 px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={phormulaLogo} alt="Phormula" className="h-8 w-8" />
              <span className="font-heading font-semibold text-foreground">Phormula</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2025 Phormula. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
