import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, LogOut, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { CreateSetDialog } from "@/components/CreateSetDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import phormulaLogo from "@/assets/phormula-logo.png";
import phormulaBackground from "@/assets/phormula-background.png";

interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  color: string;
  created_at: string;
  _count?: { flashcards: number };
}

const Dashboard = () => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSets();
    }
  }, [user]);

  const fetchSets = async () => {
    try {
      const { data, error } = await supabase
        .from("flashcard_sets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch flashcard counts for each set
      const setsWithCounts = await Promise.all(
        (data || []).map(async (set) => {
          const { count } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("set_id", set.id);

          return {
            ...set,
            _count: { flashcards: count || 0 },
          };
        })
      );

      setSets(setsWithCounts);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch flashcard sets");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#e8eef4] dark:bg-[#2d3748] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e8eef4] dark:bg-[#2d3748] relative overflow-hidden">

      <nav className="relative z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-black/10 dark:border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <img 
              src={phormulaLogo} 
              alt="Phormula" 
              className="h-8 sm:h-10 w-auto animate-[pulse_4s_ease-in-out_infinite]"
            />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={handleSignOut} className="hover:bg-black/10 dark:hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">My Flashcard Sets</h1>
          <p className="text-muted-foreground">Create and manage your study materials</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Set Card */}
          <Card
            className="border-2 border-dashed border-black/20 dark:border-white/20 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-md"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <CardContent className="flex flex-col items-center justify-center h-48 text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Create New Set</h3>
              <p className="text-sm text-muted-foreground">Start a new flashcard collection</p>
            </CardContent>
          </Card>

          {/* Existing Sets */}
          {sets.map((set) => (
            <Link key={set.id} to={`/set/${set.id}`}>
              <Card
                className="h-48 cursor-pointer hover:shadow-lg transition-all overflow-hidden group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-black/10 dark:border-white/10"
                style={{
                  borderTop: `6px solid ${set.color}`,
                  background: `linear-gradient(to bottom, ${set.color}15, rgba(255,255,255,0.8))`,
                }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground">
                    <span className="truncate">{set.title}</span>
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 shadow-md"
                      style={{ backgroundColor: set.color }}
                    />
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {set.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{set._count?.flashcards || 0} cards</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {sets.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2 text-foreground">No flashcard sets yet</h3>
            <p className="text-muted-foreground mb-6">Create your first set to start studying</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Set
            </Button>
          </div>
        )}
      </main>

      <CreateSetDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={fetchSets}
      />
    </div>
  );
};

export default Dashboard;

