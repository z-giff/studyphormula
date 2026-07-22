import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StackedFlashcardDeck } from "@/components/StackedFlashcardDeck";
import LogoOrb from "@/components/LogoOrb";

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  image_url: string | null;
  position: number;
  section_id: string | null;
  color: string | null;
  flashcard_type?: string;
  interactive_data?: any;
  is_bookmarked?: boolean;
  set_id: string;
}

const BookmarksSet = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBookmarkedFlashcards();
    }
  }, [user]);

  const fetchBookmarkedFlashcards = async () => {
    try {
      // First get all bookmarked flashcard IDs
      const { data, error } = await supabase
        .from("flashcards")
        .select("*, flashcard_sets!inner(user_id)")
        .eq("is_bookmarked", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setFlashcards(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch bookmarked flashcards");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBookmark = async (flashcardId: string, currentBookmarkStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("flashcards")
        .update({ is_bookmarked: !currentBookmarkStatus })
        .eq("id", flashcardId);

      if (error) throw error;

      toast.success(currentBookmarkStatus ? "Bookmark removed" : "Flashcard bookmarked");
      fetchBookmarkedFlashcards();
    } catch (error: any) {
      toast.error(error.message || "Failed to update bookmark");
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <ThemeToggle />
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Bookmark className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                <h1 className="text-4xl font-bold">Bookmarks</h1>
              </div>
              <p className="text-muted-foreground text-lg">
                All your bookmarked flashcards from across all sets
              </p>
            </div>

            {flashcards.length > 0 && (
              <Link to="/study/bookmarks">
                <Button size="lg">
                  <Brain className="h-5 w-5 mr-2" />
                  Memorize
                </Button>
              </Link>
            )}
          </div>
        </div>

        {flashcards.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-muted/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bookmark className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">No bookmarked flashcards</h3>
            <p className="text-muted-foreground mb-6">
              Bookmark flashcards from your sets to see them here
            </p>
            <Link to="/dashboard">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <StackedFlashcardDeck
            flashcards={flashcards}
            setColor="#eab308"
            onEdit={() => {}}
            onDelete={() => {}}
            onToggleBookmark={handleToggleBookmark}
            onCopy={() => {}}
            isBookmarkSet={true}
          />
        )}
      </main>
    </div>
  );
};

export default BookmarksSet;
