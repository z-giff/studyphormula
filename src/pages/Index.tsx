import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Palette, ImageIcon, BookmarkIcon, Shuffle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import phormulaLogo from "@/assets/phormula-logo.png";
import phormulaBackground from "@/assets/phormula-background.png";

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
  return <div className="min-h-screen relative" style={{ backgroundColor: '#e9e9e9' }}>
      
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        
        <nav className="relative container mx-auto px-4 flex items-center justify-end py-[34px]">
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" className="text-black hover:bg-black/10">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-black text-white hover:bg-black/90">Get Started</Button>
            </Link>
          </div>
        </nav>

        <div className="relative container mx-auto px-4 md:py-20 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              {/* Centered Very Large Logo */}
              <div className="flex justify-center relative">
                <img src={phormulaBackground} alt="" className="absolute h-64 md:h-96 lg:h-[500px] opacity-30 -scale-x-100 animate-[pulse_4s_ease-in-out_infinite]" />
                <img src={phormulaLogo} alt="Phormula" className="h-64 md:h-96 lg:h-[500px] relative z-10" />
              </div>
              <h1 className="text-3xl md:text-5xl font-normal text-black -mt-8 md:-mt-12">
                Simplify Memorization.
              </h1>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto bg-black text-white hover:bg-black/90">
                    Start Learning
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-[190px]">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-bold mb-4 text-black">Everything You Need to Study Better</h2>
            <p className="text-xl text-black/80">
              Built specifically for students tackling complex subjects like anatomy, physiology, and public health.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => <div key={index} className="bg-black/10 backdrop-blur-md rounded-xl p-6 shadow-lg hover:shadow-xl hover:bg-black/15 transition-all border border-black/20">
                <div className="bg-black/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-black">{feature.title}</h3>
                <p className="text-black/70">{feature.description}</p>
              </div>)}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="relative container mx-auto px-4">
          <div className="rounded-2xl p-12 text-center backdrop-blur-sm bg-black/10">
            <h2 className="text-4xl font-bold mb-4 text-black">Ready to Transform Your Study Habits?</h2>
            <p className="text-xl mb-8 text-black/80">
              Join thousands of students already studying smarter with FlashLearn
            </p>
            <Link to="/auth">
              <Button size="lg" className="text-lg bg-black text-white hover:bg-black/90">
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-black/20 py-12">
        <div className="container mx-auto px-4 text-center text-black/70">
          <p>© 2025 FlashLearn. All rights reserved.</p>
        </div>
      </footer>
    </div>;
};
export default Index;