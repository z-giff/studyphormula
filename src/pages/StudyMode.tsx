import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Shuffle, RotateCcw, Bookmark } from "lucide-react";
import LogoOrb from "@/components/LogoOrb";
import phormulaLogo from "@/assets/phormula-text-logo.png";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getContrastColor } from "@/lib/utils";
import { InteractiveFlashcardStudy } from "@/components/InteractiveFlashcardStudy";
import { FlowchartCanvasDisplay } from "@/components/FlowchartCanvasDisplay";
import { DrawingCanvasDisplay } from "@/components/DrawingCanvasDisplay";

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  image_url: string | null;
  color: string | null;
  flashcard_type?: string;
  interactive_data?: any;
}

interface FlashcardSet {
  id: string;
  title: string;
  color: string;
}

const StudyMode = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const isBookmarkMode = id === "bookmarks";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      if (isBookmarkMode) {
        fetchBookmarkedData();
      } else {
        fetchData();
        void markSetAccessed();
      }
    }
  }, [user, id, isBookmarkMode]);

  const markSetAccessed = async () => {
    if (isBookmarkMode) return;
    try {
      const payload: any = {};
      payload.last_accessed_at = new Date().toISOString();
      await (supabase as any)
        .from("flashcard_sets")
        .update(payload)
        .eq("id", id);
    } catch {
      // no-op
    }
  };

  const fetchBookmarkedData = async () => {
    try {
      const { data, error } = await supabase
        .from("flashcards")
        .select("*, flashcard_sets!inner(user_id)")
        .eq("is_bookmarked", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setSet({
        id: "bookmarks",
        title: "Bookmarks",
        color: "#eab308",
      });
      setFlashcards((data || []).map(card => ({
        ...card,
        interactive_data: card.interactive_data as any,
      })));
    } catch (error: any) {
      toast.error(error.message || "Failed to load bookmarked flashcards");
      navigate("/set/bookmarks");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [setResult, cardsResult] = await Promise.all([
        supabase.from("flashcard_sets").select("*").eq("id", id).single(),
        supabase.from("flashcards").select("*").eq("set_id", id).order("position", { ascending: true }),
      ]);

      if (setResult.error) throw setResult.error;
      if (cardsResult.error) throw cardsResult.error;

      setSet(setResult.data);
      setFlashcards((cardsResult.data || []).map(card => ({
        ...card,
        interactive_data: card.interactive_data as any,
      })));
    } catch (error: any) {
      toast.error(error.message || "Failed to load study session");
      navigate(`/set/${id}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    toast.success("Cards shuffled!");
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    if (isBookmarkMode) {
      fetchBookmarkedData();
    } else {
      fetchData();
    }
  };

  const backToSetLink = isBookmarkMode ? "/set/bookmarks" : `/set/${id}`;

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

  if (!set || flashcards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">No flashcards to study</p>
          <Link to={backToSetLink}>
            <Button>Back to Set</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const cardColor = currentCard.color || set.color;
  const textColor = getContrastColor(cardColor);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <ThemeToggle />
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link to={backToSetLink}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Set
              </Button>
            </Link>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isBookmarkMode ? (
                  <Bookmark className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: set.color }}
                  />
                )}
                <h1 className="text-3xl font-bold">{set.title}</h1>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShuffle}>
                  <Shuffle className="h-4 w-4 mr-2" />
                  Shuffle
                </Button>
                <Button variant="outline" size="sm" onClick={handleRestart}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-muted-foreground">
                Card {currentIndex + 1} of {flashcards.length}
              </p>
              <div className="w-full max-w-xs bg-muted rounded-full h-2 ml-4">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
                    backgroundColor: set.color,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mb-8">
            {currentCard.flashcard_type === "interactive" && currentCard.interactive_data?.textBoxes ? (
              <Card className="p-8" style={{ backgroundColor: cardColor }}>
                <InteractiveFlashcardStudy
                  imageUrl={currentCard.image_url || ""}
                  textBoxes={currentCard.interactive_data.textBoxes}
                  cardColor={cardColor}
                />
              </Card>
            ) : currentCard.flashcard_type === "flowchart" && currentCard.interactive_data ? (
              <Card
                className="relative h-[500px] cursor-pointer border-0 overflow-hidden flex flex-col"
                style={{
                  backgroundColor: cardColor,
                  color: textColor,
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  transition: "transform 0.6s ease",
                  transformStyle: "preserve-3d",
                }}
                onClick={handleFlip}
              >
                <div
                  className="p-12 w-full flex-1 flex flex-col min-h-0"
                  style={{
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {!isFlipped ? (
                    <div className="text-center space-y-6 flex-1 flex flex-col items-center justify-center">
                      <h2 className="text-4xl font-bold break-words">{currentCard.term}</h2>
                      <p className="text-sm opacity-70 mt-8">Click to reveal flowchart</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                      <p className="text-sm uppercase tracking-wide opacity-80 mb-4 text-center">Flowchart</p>
                      <div className="flex-1 min-h-0">
                        <FlowchartCanvasDisplay
                          flowchartData={currentCard.interactive_data}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : currentCard.flashcard_type === "drawing" && currentCard.interactive_data ? (
              <Card
                className="relative h-[500px] cursor-pointer border-0 overflow-hidden flex flex-col"
                style={{
                  backgroundColor: cardColor,
                  color: textColor,
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  transition: "transform 0.6s ease",
                  transformStyle: "preserve-3d",
                }}
                onClick={handleFlip}
              >
                <div
                  className="p-12 w-full flex-1 flex flex-col min-h-0"
                  style={{
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {!isFlipped ? (
                    <div className="text-center space-y-6 flex-1 flex flex-col items-center justify-center">
                      <h2 className="text-4xl font-bold break-words">{currentCard.term}</h2>
                      <p className="text-sm opacity-70 mt-8">Click to reveal drawing</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                      <p className="text-sm uppercase tracking-wide opacity-80 mb-4 text-center">Drawing</p>
                      <div className="w-full flex-1 flex items-center justify-center min-h-0">
                        <DrawingCanvasDisplay
                          drawingData={currentCard.interactive_data}
                          className="rounded-lg shadow-sm max-w-full max-h-full mx-auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card
                className="relative min-h-[500px] cursor-pointer border-0 overflow-hidden flex items-stretch"
                style={{
                  backgroundColor: cardColor,
                  color: textColor,
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  transition: "transform 0.6s ease",
                  transformStyle: "preserve-3d",
                }}
                onClick={handleFlip}
              >
                <div
                  className="p-12 w-full max-w-3xl mx-auto text-center space-y-6 flex flex-col items-center justify-center flex-1"
                  style={{
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transformStyle: "preserve-3d",
                  }}
                >
                  {isFlipped && (
                    <p className="text-sm uppercase tracking-wide opacity-80">
                      Definition
                    </p>
                  )}

                  {!isFlipped ? (
                    <>
                      <h2 className="text-4xl font-bold break-words">{currentCard.term}</h2>
                      <p className="text-sm opacity-70 mt-8">Click to reveal answer</p>
                    </>
                  ) : (
                    <>
                      {currentCard.image_url && (
                        <img
                          src={currentCard.image_url}
                          alt={currentCard.term}
                          className="max-h-64 mx-auto rounded-lg object-contain mb-6"
                        />
                      )}
                      <p className="text-2xl leading-relaxed whitespace-pre-wrap break-words">
                        {currentCard.definition}
                      </p>
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>
            <Button
              size="lg"
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
            >
              Next
            </Button>
          </div>

          {currentIndex === flashcards.length - 1 && (
            <div className="mt-8 text-center p-6 bg-primary/10 rounded-lg">
              <p className="text-lg font-semibold mb-2">You've reached the end!</p>
              <p className="text-muted-foreground">
                Great job studying! Review again or shuffle for a new order.
              </p>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export default StudyMode;
