import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Plus, ArrowLeft, Play, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CreateFlashcardDialog } from "@/components/CreateFlashcardDialog";
import { EditFlashcardDialog } from "@/components/EditFlashcardDialog";

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  image_url: string | null;
  position: number;
  section_id: string | null;
}

interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  color: string;
}

const FlashcardSetPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchSetData();
      fetchFlashcards();
    }
  }, [user, id]);

  const fetchSetData = async () => {
    try {
      const { data, error } = await supabase
        .from("flashcard_sets")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setSet(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch flashcard set");
      navigate("/dashboard");
    }
  };

  const fetchFlashcards = async () => {
    try {
      const { data, error } = await supabase
        .from("flashcards")
        .select("*")
        .eq("set_id", id)
        .order("position", { ascending: true });

      if (error) throw error;
      setFlashcards(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch flashcards");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFlashcard = async (flashcardId: string) => {
    if (!confirm("Are you sure you want to delete this flashcard?")) return;

    try {
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", flashcardId);

      if (error) throw error;

      toast.success("Flashcard deleted successfully");
      fetchFlashcards();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete flashcard");
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

  if (!set) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-2xl font-bold text-primary">
            <GraduationCap className="h-8 w-8" />
            <span>FlashLearn</span>
          </Link>
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
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: set.color }}
                />
                <h1 className="text-4xl font-bold">{set.title}</h1>
              </div>
              {set.description && (
                <p className="text-muted-foreground text-lg">{set.description}</p>
              )}
            </div>

            {flashcards.length > 0 && (
              <Link to={`/study/${id}`}>
                <Button size="lg">
                  <Play className="h-5 w-5 mr-2" />
                  Study Mode
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="mb-6">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Flashcard
          </Button>
        </div>

        {flashcards.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-muted/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">No flashcards yet</h3>
            <p className="text-muted-foreground mb-6">Add your first flashcard to start studying</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Flashcard
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flashcards.map((flashcard) => (
              <Card key={flashcard.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {flashcard.image_url && (
                    <img
                      src={flashcard.image_url}
                      alt={flashcard.term}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="text-lg font-semibold mb-2">{flashcard.term}</h3>
                  <p className="text-muted-foreground line-clamp-3 mb-4">
                    {flashcard.definition}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingFlashcard(flashcard)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFlashcard(flashcard.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateFlashcardDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        setId={id!}
        onSuccess={fetchFlashcards}
      />

      {editingFlashcard && (
        <EditFlashcardDialog
          open={!!editingFlashcard}
          onOpenChange={(open) => !open && setEditingFlashcard(null)}
          flashcard={editingFlashcard}
          onSuccess={fetchFlashcards}
        />
      )}
    </div>
  );
};

export default FlashcardSetPage;
