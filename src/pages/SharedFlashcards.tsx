import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BookOpen, Check, Eye, Folder, Inbox, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  addedItemPath,
  addedMessage,
  addSharedToDashboard,
  describeSharedCounts,
  errorMessage,
  type SharedItem,
} from "@/lib/sharing";

const SharedFlashcards = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<SharedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SharedItem | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?mode=signin&next=/shared");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) void fetchShared();
  }, [user]);

  const fetchShared = async () => {
    try {
      const { data, error } = await supabase.rpc("list_shared_flashcards");
      if (error) throw error;
      const rows = (data ?? []) as SharedItem[];
      setItems(rows);
      // Opening this page is what clears the red dot on the dashboard. The rows
      // already loaded keep their seen_at, so this visit still shows them as new.
      if (rows.some((item) => !item.seen_at)) {
        void supabase.rpc("mark_shared_flashcards_seen");
      }
    } catch (error) {
      toast.error(errorMessage(error, "Failed to load shared flashcards"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (item: SharedItem) => {
    setBusyId(item.id);
    try {
      const added = await addSharedToDashboard(item.id);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, added_item_id: added.item_id } : i)));
      toast.success(addedMessage(item), {
        action: { label: "Open", onClick: () => navigate(addedItemPath(added.item_type, added.item_id)) },
      });
    } catch (error) {
      toast.error(errorMessage(error, "Failed to add to your dashboard"));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    const item = removeTarget;
    setBusyId(item.id);
    try {
      const { error } = await supabase.rpc("dismiss_shared_flashcards", { p_share_id: item.id });
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Removed from Shared flashcards");
    } catch (error) {
      toast.error(errorMessage(error, "Failed to remove"));
    } finally {
      setBusyId(null);
      setRemoveTarget(null);
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

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <ThemeToggle />
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Shared flashcards</h1>
          <p className="text-muted-foreground mt-2">
            Sets and files other people have shared with you. Flip through them, or add them to your dashboard to
            make them your own.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
              <Inbox className="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight mb-1.5 text-foreground">Nothing shared with you yet</h2>
            <p className="text-sm text-muted-foreground">
              When someone shares a set or file with you, it shows up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const isFile = item.item_type === "file";
              const Icon = isFile ? Folder : BookOpen;
              const isBusy = busyId === item.id;
              return (
                <li key={item.id}>
                  <Card className="p-4 sm:p-5 bg-card border-border shadow-[var(--shadow-card)]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
                              {item.title}
                            </h2>
                            {!item.seen_at && (
                              <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-500">
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {isFile ? "File" : "Set"} · {describeSharedCounts(item)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            From {item.sender_name} ·{" "}
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/shared/${item.id}`}>
                            <Eye className="h-4 w-4 mr-1.5" />
                            View
                          </Link>
                        </Button>
                        {item.added_item_id ? (
                          <Button asChild variant="secondary" size="sm">
                            <Link to={addedItemPath(item.item_type, item.added_item_id)}>
                              <Check className="h-4 w-4 mr-1.5" />
                              Added · Open
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="brand" size="sm" onClick={() => handleAdd(item)} disabled={isBusy}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            {isBusy ? "Adding..." : "Add to dashboard"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-muted-foreground hover:text-foreground"
                          onClick={() => setRemoveTarget(item)}
                          disabled={isBusy}
                          aria-label={`Remove ${item.title} from Shared flashcards`}
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Shared flashcards?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.added_item_id
                ? "The copy on your dashboard stays where it is."
                : `You won't be able to view or add it unless ${removeTarget?.sender_name ?? "they"} shares it again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busyId}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={!!busyId}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SharedFlashcards;
