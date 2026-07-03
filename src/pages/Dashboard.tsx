import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen, User, MoreHorizontal, Trash2, Folder, ArrowRightLeft, Bookmark, Pencil } from "lucide-react";
import { toast } from "sonner";
import { CreateSetDialog } from "@/components/CreateSetDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";
import { ProfileSheet } from "@/components/ProfileSheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import phormulaBackground from "@/assets/phormula-background.png";
import { CreateFileDialog } from "@/components/CreateFileDialog";
import { FlashcardFile, MoveSetToFileDialog } from "@/components/MoveSetToFileDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RenameSetDialog } from "@/components/RenameSetDialog";
 import { AutoFlashcardDialog } from "@/components/AutoFlashcardDialog";
 import { Sparkles } from "lucide-react";
interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  color: string;
  file_id?: string | null;
  created_at: string;
  last_accessed_at?: string | null;
  _count?: {
    flashcards: number;
  };
  displayColor: string;
}
const Dashboard = () => {
  const {
    user,
    signOut,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [files, setFiles] = useState<FlashcardFile[]>([]);
  const [bookmarkedCount, setBookmarkedCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateFileDialogOpen, setIsCreateFileDialogOpen] = useState(false);
  const [deleteSetId, setDeleteSetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [moveSetId, setMoveSetId] = useState<string | null>(null);
  const [moveSelectedFileId, setMoveSelectedFileId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [sortMode, setSortMode] = useState<"used" | "recent" | "least" | "alpha">("used");
  const [dragOverFileId, setDragOverFileId] = useState<string | null>(null);
  const [renameSetId, setRenameSetId] = useState<string | null>(null);
   const [isAutoFlashcardDialogOpen, setIsAutoFlashcardDialogOpen] = useState(false);
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  useEffect(() => {
    if (user) {
      void Promise.all([fetchSets(), fetchFiles(), fetchBookmarkedCount()]);
    }
  }, [user]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("flashcard_files")
        .select("id,name")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles((data || []) as FlashcardFile[]);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch files");
    }
  };

  const fetchBookmarkedCount = async () => {
    try {
      const { count, error } = await supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("is_bookmarked", true);

      if (error) throw error;
      setBookmarkedCount(count || 0);
    } catch (error: any) {
      console.error("Failed to fetch bookmarked count:", error);
    }
  };

  const fetchSets = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("flashcard_sets").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;

      // Batch-fetch counts and first-card colors in a single query (instead of 2N+1)
      const setIds = (data || []).map((s) => s.id);
      let countsBySet = new Map<string, number>();
      let firstColorBySet = new Map<string, string | null>();
      if (setIds.length > 0) {
        const { data: allCards } = await supabase
          .from("flashcards")
          .select("set_id, color, position")
          .in("set_id", setIds)
          .order("position", { ascending: true });
        for (const card of allCards || []) {
          countsBySet.set(card.set_id, (countsBySet.get(card.set_id) ?? 0) + 1);
          if (!firstColorBySet.has(card.set_id)) {
            firstColorBySet.set(card.set_id, card.color ?? null);
          }
        }
      }
      const setsWithCounts = (data || []).map((set) => ({
        ...set,
        _count: { flashcards: countsBySet.get(set.id) ?? 0 },
        displayColor: firstColorBySet.get(set.id) || set.color,
      }));
      setSets(setsWithCounts);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch flashcard sets");
    } finally {
      setIsLoading(false);
    }
  };

  const moveSetTarget = useMemo(() => {
    if (!moveSetId) return null;
    return sets.find((s) => s.id === moveSetId) ?? null;
  }, [moveSetId, sets]);

  const fileSetCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sets) {
      if (!s.file_id) continue;
      counts.set(s.file_id, (counts.get(s.file_id) ?? 0) + 1);
    }
    return counts;
  }, [sets]);

  const sortedSets = useMemo(() => {
    const arr = [...sets];
    switch (sortMode) {
      case "alpha":
        return arr.sort((a, b) => a.title.localeCompare(b.title));
      case "least":
        return arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "recent":
        return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "used":
      default:
        return arr.sort((a, b) => {
          const aT = new Date(a.last_accessed_at || a.created_at).getTime();
          const bT = new Date(b.last_accessed_at || b.created_at).getTime();
          return bT - aT;
        });
    }
  }, [sets, sortMode]);
  const handleSignOut = async () => {
    await signOut();
  };
  const handleDeleteSet = async () => {
    if (!deleteSetId) return;
    setIsDeleting(true);
    try {
      const {
        error
      } = await supabase.from("flashcard_sets").delete().eq("id", deleteSetId);
      if (error) throw error;
      setSets(prev => prev.filter(set => set.id !== deleteSetId));
      toast.success("Flashcard set deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete set");
    } finally {
      setIsDeleting(false);
      setDeleteSetId(null);
    }
  };

  const openMoveDialogForSet = (setId: string) => {
    const target = sets.find((s) => s.id === setId);
    setMoveSetId(setId);
    setMoveSelectedFileId(target?.file_id ?? null);
  };

  const handleMoveSetToFile = async () => {
    if (!moveSetId) return;
    setIsMoving(true);
    try {
      const { error } = await supabase
        .from("flashcard_sets")
        .update({ file_id: moveSelectedFileId })
        .eq("id", moveSetId);

      if (error) throw error;

      toast.success("Set moved");
      setMoveSetId(null);
      setMoveSelectedFileId(null);
      await fetchSets();
    } catch (error: any) {
      toast.error(error.message || "Failed to move set");
    } finally {
      setIsMoving(false);
    }
  };

  const handleDropSetOnFile = async (setId: string, fileId: string) => {
    try {
      const { error } = await supabase
        .from("flashcard_sets")
        .update({ file_id: fileId })
        .eq("id", setId);

      if (error) throw error;

      toast.success("Set moved");
      await fetchSets();
    } catch (error: any) {
      toast.error(error.message || "Failed to move set");
    }
  };

  if (loading || isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background relative">

      <nav className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 py-3.5 flex items-center justify-between">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ProfileSheet>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </ProfileSheet>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground">Your Phormula to Studying</h1>
          <p className="text-sm text-muted-foreground">Create and manage your study materials</p>
        </div>

        {/* Files */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <Folder className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <h2 className="text-base font-semibold tracking-tight text-foreground">Files</h2>
          </div>

          <div className="flex flex-wrap gap-7">
            {/* Create File circle button */}
            <button
              type="button"
              onClick={() => setIsCreateFileDialogOpen(true)}
              className="flex flex-col items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            >
              <div className="relative w-20 h-16 flex items-center justify-center transition-transform group-hover:scale-[1.03]">
                <div className="w-14 h-14 rounded-full border border-dashed border-border group-hover:border-primary flex items-center justify-center transition-colors bg-card">
                  <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.75} />
                </div>
              </div>
              <span className="mt-2 text-xs font-medium text-muted-foreground group-hover:text-foreground text-center transition-colors">
                New File
              </span>
            </button>

            {/* File icons */}
            {files.map((file) => (
              <div
                key={file.id}
                className="flex flex-col items-center"
                onDragEnter={() => setDragOverFileId(file.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverFileId(file.id);
                }}
                onDragLeave={() => {
                  setDragOverFileId((prev) => (prev === file.id ? null : prev));
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFileId(null);
                  const setId = e.dataTransfer.getData("text/plain");
                  if (!setId) return;
                  await handleDropSetOnFile(setId, file.id);
                }}
              >
                <Link to={`/file/${file.id}`} className="flex flex-col items-center group">
                  <div
                    className={
                      "relative w-20 h-16 transition-transform group-hover:scale-[1.03] " +
                      (dragOverFileId === file.id ? "scale-[1.08]" : "")
                    }
                  >
                    {/* Folder icon shape */}
                    <svg
                      viewBox="0 0 80 64"
                      className={
                        "w-full h-full transition-colors " +
                        (dragOverFileId === file.id
                          ? "text-primary"
                          : "text-muted-foreground/50 group-hover:text-foreground/70")
                      }
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {/* Folder tab */}
                      <path d="M4 16 L4 8 Q4 4 8 4 L28 4 L34 12 L72 12 Q76 12 76 16 L76 56 Q76 60 72 60 L8 60 Q4 60 4 56 Z" />
                    </svg>
                  </div>
                  <span className="mt-2 text-xs font-medium text-foreground text-center max-w-24 truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(fileSetCounts.get(file.id) ?? 0)} set(s)
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Bookmarks Banner */}
        {bookmarkedCount > 0 && (
          <section className="mb-12">
            <Link to="/set/bookmarks" className="block">
              <div className="group relative overflow-hidden rounded-xl h-20 cursor-pointer bg-card border border-border hover:border-foreground/20 hover:shadow-[var(--shadow-card-hover)] transition-all">
                <div className="relative h-full flex items-center justify-between px-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                      <Bookmark className="h-5 w-5 text-amber-500 fill-amber-500" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground tracking-tight">Bookmarks</h3>
                      <p className="text-xs text-muted-foreground">Your saved flashcards for quick review</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span className="font-medium">{bookmarkedCount} {bookmarkedCount === 1 ? 'card' : 'cards'}</span>
                    </div>
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Sets */}
        <section>
           {/* Action Buttons */}
           <div className="flex flex-wrap gap-3 mb-8">
             {/* Primary CTA — gradient accent */}
             <Button
               onClick={() => setIsCreateDialogOpen(true)}
               className="h-11 px-5 text-sm font-medium text-white shadow-sm hover:shadow-md transition-all hover:-translate-y-px"
               style={{ backgroundImage: "var(--gradient-primary)" }}
             >
               <Plus className="h-4 w-4 mr-2" strokeWidth={2} />
               Create New Set
             </Button>

             {/* Secondary — subtle */}
             <Button
               onClick={() => setIsAutoFlashcardDialogOpen(true)}
               variant="outline"
               className="h-11 px-5 text-sm font-medium bg-card border-border hover:bg-secondary hover:border-foreground/20 transition-all"
             >
               <Sparkles className="h-4 w-4 mr-2 text-primary" strokeWidth={1.75} />
               Auto-Flashcard
             </Button>
           </div>

          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-base font-semibold tracking-tight text-foreground">Sets</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort</span>
              <Select value={sortMode === "used" ? "" : sortMode} onValueChange={(v) => setSortMode(v as any)}>
                <SelectTrigger className="w-[200px] h-9 text-sm bg-card">
                  <SelectValue placeholder="Most recently used" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="recent">Most recent</SelectItem>
                  <SelectItem value="least">Least recent</SelectItem>
                  <SelectItem value="alpha">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Existing Sets */}
          {sortedSets.map(set => <div
              key={set.id}
              className="relative group"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", set.id);
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              <Link to={`/set/${set.id}`}>
                <Card
                  className="h-44 cursor-pointer overflow-hidden group relative bg-card border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all"
                  style={{ borderLeft: `3px solid ${set.displayColor}` }}
                >
                <CardHeader className="pr-12 pb-2">
                    <CardTitle className="text-foreground text-base font-semibold tracking-tight leading-snug line-clamp-2 break-words">
                      {set.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-xs font-light">
                      {set.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span>{set._count?.flashcards || 0} cards</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              
              {/* More Options Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary z-10 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity" onClick={e => e.preventDefault()}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={e => {
                      e.preventDefault();
                      setRenameSetId(set.id);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={e => {
                      e.preventDefault();
                      openMoveDialogForSet(set.id);
                    }}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Move to file
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={e => {
                e.preventDefault();
                setDeleteSetId(set.id);
              }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete set
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>)}
        </div>

        </section>

        {sets.length === 0 && <div className="text-center py-16">
            <div className="bg-secondary w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
              <BookOpen className="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-1.5 text-foreground">No flashcard sets yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Create your first set to start studying</p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-11 px-5 text-sm font-medium text-white"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Set
            </Button>
          </div>}
      </main>

      <CreateSetDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSuccess={fetchSets} />
      <CreateFileDialog open={isCreateFileDialogOpen} onOpenChange={setIsCreateFileDialogOpen} onSuccess={fetchFiles} />
       <AutoFlashcardDialog 
         open={isAutoFlashcardDialogOpen} 
         onOpenChange={setIsAutoFlashcardDialogOpen} 
         onSuccess={fetchSets} 
       />

      <RenameSetDialog
        open={!!renameSetId}
        onOpenChange={(open) => !open && setRenameSetId(null)}
        setId={renameSetId || ""}
        currentTitle={sets.find((s) => s.id === renameSetId)?.title || ""}
        onSuccess={fetchSets}
      />

      <MoveSetToFileDialog
        open={!!moveSetId}
        onOpenChange={(open) => {
          if (!open) {
            setMoveSetId(null);
            setMoveSelectedFileId(null);
          }
        }}
        setTitle={moveSetTarget?.title ?? "this set"}
        files={files}
        selectedFileId={moveSelectedFileId}
        onSelectedFileIdChange={setMoveSelectedFileId}
        isSaving={isMoving}
        onSave={handleMoveSetToFile}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSetId} onOpenChange={open => !open && setDeleteSetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this set?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSet} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default Dashboard;