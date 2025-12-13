import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plus, ArrowLeft, Play, Palette } from "lucide-react";
import { toast } from "sonner";
import { CreateFlashcardDialog } from "@/components/CreateFlashcardDialog";
import { EditFlashcardDialog } from "@/components/EditFlashcardDialog";
import { ImportFlashcardsDialog } from "@/components/ImportFlashcardsDialog";
import { CopyFlashcardDialog } from "@/components/CopyFlashcardDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StackedFlashcardDeck } from "@/components/StackedFlashcardDeck";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import phormulaLogo from "@/assets/phormula-logo.png";

const PRESET_COLORS = [
  "#000000", // Black
  "#a6a6a6", // Grey
  "#ffffff", // White
  "#e2a9f1", // Lavender
  "#38b6ff", // Sky Blue
  "#ea3d57", // Coral Red
  "#6db2a0", // Sage Green
  "#ffde59", // Sunshine Yellow
];

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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<Flashcard | null>(null);
  const [copyingFlashcard, setCopyingFlashcard] = useState<{ id: string; setId: string } | null>(null);

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

  const handleToggleBookmark = async (flashcardId: string, currentBookmarkStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("flashcards")
        .update({ is_bookmarked: !currentBookmarkStatus })
        .eq("id", flashcardId);

      if (error) throw error;

      toast.success(currentBookmarkStatus ? "Bookmark removed" : "Flashcard bookmarked");
      fetchFlashcards();
    } catch (error: any) {
      toast.error(error.message || "Failed to update bookmark");
    }
  };

  const handleUpdateSetColor = async (newColor: string) => {
    try {
      const { error } = await supabase
        .from("flashcard_sets")
        .update({ color: newColor })
        .eq("id", id);

      if (error) throw error;

      setSet((prev) => prev ? { ...prev, color: newColor } : prev);
      toast.success("Set color updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update color");
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
          <Link to="/dashboard" className="flex items-center">
            <img 
              src={phormulaLogo} 
              alt="Phormula" 
              className="h-8 sm:h-10 w-auto animate-[pulse_4s_ease-in-out_infinite]"
            />
          </Link>
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
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform border"
                      style={{ 
                        backgroundColor: set.color,
                        borderColor: set.color === "#ffffff" ? "#d1d5db" : "transparent",
                      }}
                      title="Change set color"
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3">
                    <div className="flex flex-wrap gap-2 max-w-[200px]">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                          style={{
                            backgroundColor: color,
                            borderColor: set.color === color ? "#000" : color === "#ffffff" ? "#d1d5db" : "transparent",
                          }}
                          onClick={() => handleUpdateSetColor(color)}
                        />
                      ))}
                      <label
                        className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/50 transition-all hover:scale-110 hover:border-muted-foreground cursor-pointer flex items-center justify-center"
                        style={{
                          backgroundColor: set.color && !PRESET_COLORS.includes(set.color) ? set.color : "transparent",
                          borderStyle: set.color && !PRESET_COLORS.includes(set.color) ? "solid" : "dashed",
                          borderColor: set.color && !PRESET_COLORS.includes(set.color) ? "#000" : undefined,
                        }}
                      >
                        <Plus className="h-4 w-4 text-muted-foreground" style={{ display: set.color && !PRESET_COLORS.includes(set.color) ? "none" : "block" }} />
                        <input
                          type="color"
                          className="sr-only"
                          value={set.color || "#000000"}
                          onChange={(e) => handleUpdateSetColor(e.target.value)}
                        />
                      </label>
                    </div>
                  </PopoverContent>
                </Popover>
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

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Flashcard
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            Import Flashcards
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
          <StackedFlashcardDeck
            flashcards={flashcards}
            setColor={set.color}
            onEdit={(card) => {
              console.log("Edit clicked, card:", card);
              setEditingFlashcard(card);
            }}
            onDelete={handleDeleteFlashcard}
            onToggleBookmark={handleToggleBookmark}
            onCopy={(flashcardId) => setCopyingFlashcard({ id: flashcardId, setId: id! })}
          />
        )}
      </main>

      <CreateFlashcardDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        setId={id!}
        onSuccess={fetchFlashcards}
      />

      <ImportFlashcardsDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
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

      {copyingFlashcard && (
        <CopyFlashcardDialog
          open={!!copyingFlashcard}
          onOpenChange={(open) => !open && setCopyingFlashcard(null)}
          flashcardId={copyingFlashcard.id}
          currentSetId={copyingFlashcard.setId}
        />
      )}
    </div>
  );
};

export default FlashcardSetPage;
