import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Folder, Plus } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";
import { StackedFlashcardDeck } from "@/components/StackedFlashcardDeck";
import { cn } from "@/lib/utils";
import {
  addedItemPath,
  addedMessage,
  addSharedToDashboard,
  describeSharedCounts,
  errorMessage,
  type SharedItemDetail,
} from "@/lib/sharing";

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  image_url: string | null;
  position: number;
  section_id: string | null;
  color: string | null;
  flashcard_type?: string;
  interactive_data?: unknown;
}

/**
 * A set or file someone shared with you, read-only: flip through the cards,
 * then add it to your dashboard to edit or study it.
 */
const SharedItemPage = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<SharedItemDetail | null>(null);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate(`/auth?mode=signin&next=/shared/${shareId}`);
  }, [user, loading, navigate, shareId]);

  useEffect(() => {
    if (user && shareId) void fetchItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, shareId]);

  const fetchItem = async () => {
    try {
      const { data, error } = await supabase.rpc("get_shared_flashcards", { p_share_id: shareId! });
      if (error) throw error;
      if (!data) {
        toast.error("This share is no longer available");
        navigate("/shared");
        return;
      }
      const detail = data as unknown as SharedItemDetail;
      setItem(detail);
      setActiveSetId(detail.sets[0]?.id ?? null);
    } catch (error) {
      toast.error(errorMessage(error, "Failed to load shared flashcards"));
      navigate("/shared");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!shareId || !activeSetId) return;
    // Switching sets quickly must not let an older response win
    let cancelled = false;
    setIsLoadingCards(true);
    supabase
      .rpc("get_shared_flashcard_cards", { p_share_id: shareId, p_set_id: activeSetId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error(errorMessage(error, "Failed to load cards"));
        setFlashcards((data ?? []) as Flashcard[]);
        setIsLoadingCards(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareId, activeSetId]);

  const handleAdd = async () => {
    if (!item) return;
    setIsAdding(true);
    try {
      const added = await addSharedToDashboard(item.id);
      setItem((prev) => (prev ? { ...prev, added_item_id: added.item_id } : prev));
      toast.success(addedMessage(item), {
        action: { label: "Open", onClick: () => navigate(addedItemPath(added.item_type, added.item_id)) },
      });
    } catch (error) {
      toast.error(errorMessage(error, "Failed to add to your dashboard"));
    } finally {
      setIsAdding(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const isFile = item.item_type === "file";
  const activeSet = item.sets.find((s) => s.id === activeSetId) ?? null;

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
          <Link to="/shared">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Shared flashcards
            </Button>
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground mb-1">Shared by {item.sender_name}</p>
              <div className="flex items-center gap-3">
                {isFile && <Folder className="h-7 w-7 shrink-0 text-muted-foreground" />}
                <h1 className="font-display text-4xl font-medium tracking-tight break-words">{item.title}</h1>
              </div>
              <p className="text-muted-foreground mt-2">{describeSharedCounts(item)}</p>
            </div>

            {item.added_item_id ? (
              <Button asChild size="lg" variant="secondary" className="rounded-xl">
                <Link to={addedItemPath(item.item_type, item.added_item_id)}>
                  <Check className="h-4 w-4 mr-2" />
                  On your dashboard · Open
                </Link>
              </Button>
            ) : (
              <Button size="lg" variant="brand" className="rounded-xl font-bold" onClick={handleAdd} disabled={isAdding}>
                <Plus className="h-4 w-4 mr-2" />
                {isAdding ? "Adding..." : "Add to dashboard"}
              </Button>
            )}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            You're viewing the latest version of what was shared with you. Add a copy to your dashboard to edit it
            or use the study modes.
          </p>
        </div>

        {isFile && item.sets.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Sets in this file">
            {item.sets.map((set) => (
              <button
                key={set.id}
                type="button"
                role="tab"
                aria-selected={set.id === activeSetId}
                onClick={() => setActiveSetId(set.id)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  set.id === activeSetId
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {set.title}
                <span className="ml-1.5 text-xs text-muted-foreground">{set.card_count}</span>
              </button>
            ))}
          </div>
        )}

        {item.sets.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">There are no sets in this file yet.</p>
        ) : isLoadingCards ? (
          <div className="py-16 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : flashcards.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">This set has no cards yet.</p>
        ) : (
          <StackedFlashcardDeck
            key={activeSetId}
            flashcards={flashcards}
            setColor={activeSet?.color ?? "#3B82F6"}
            readOnly
          />
        )}
      </main>
    </div>
  );
};

export default SharedItemPage;
