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

      // Fetch flashcard counts and first flashcard color for each set
      const setsWithCounts = await Promise.all((data || []).map(async set => {
        const {
          count
        } = await supabase.from("flashcards").select("*", {
          count: "exact",
          head: true
        }).eq("set_id", set.id);

        // Get the first flashcard's color
        const {
          data: firstFlashcard
        } = await supabase.from("flashcards").select("color").eq("set_id", set.id).order("position", {
          ascending: true
        }).limit(1).maybeSingle();
        return {
          ...set,
          _count: {
            flashcards: count || 0
          },
          displayColor: firstFlashcard?.color || set.color
        };
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
    return <div className="min-h-screen bg-[#e8eef4] dark:bg-[#2d3748] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-[#e8eef4] dark:bg-[#2d3748] relative overflow-hidden">

      <nav className="relative z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-black/10 dark:border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <LogoOrb size="md" showWordmark={true} linkTo="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ProfileSheet>
              <Button variant="ghost" className="hover:bg-black/10 dark:hover:bg-white/10">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </ProfileSheet>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Your Phormula to Studying</h1>
          <p className="text-muted-foreground">Create and manage your study materials</p>
        </div>

        {/* Files */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Folder className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Files</h2>
          </div>

          <div className="flex flex-wrap gap-6">
            {/* Create File circle button */}
            <button
              type="button"
              onClick={() => setIsCreateFileDialogOpen(true)}
              className="flex flex-col items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            >
              <div className="relative w-20 h-16 flex items-center justify-center transition-transform group-hover:scale-105">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/40 group-hover:border-primary flex items-center justify-center transition-colors bg-background/50">
                  <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <span className="mt-2 text-sm text-muted-foreground group-hover:text-foreground text-center transition-colors">
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
                      "relative w-20 h-16 transition-transform group-hover:scale-105 " +
                      (dragOverFileId === file.id ? "scale-110" : "")
                    }
                  >
                    {/* Folder icon shape */}
                    <svg
                      viewBox="0 0 80 64"
                      className={
                        "w-full h-full transition-colors " +
                        (dragOverFileId === file.id
                          ? "text-primary"
                          : "text-muted-foreground/60 group-hover:text-muted-foreground")
                      }
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {/* Folder tab */}
                      <path d="M4 16 L4 8 Q4 4 8 4 L28 4 L34 12 L72 12 Q76 12 76 16 L76 56 Q76 60 72 60 L8 60 Q4 60 4 56 Z" />
                    </svg>
                  </div>
                  <span className="mt-2 text-sm text-foreground text-center max-w-24 truncate">
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
          <section className="mb-10">
            <Link to="/set/bookmarks" className="block">
              <div 
                className="relative overflow-hidden rounded-2xl h-20 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-yellow-500/10 dark:from-yellow-500/20 dark:via-amber-500/25 dark:to-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 group"
              >
                {/* Decorative background elements */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute -right-8 -top-8 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl" />
                  <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-amber-400/20 rounded-full blur-xl" />
                </div>
                
                <div className="relative h-full flex items-center justify-between px-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-colors">
                      <Bookmark className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Bookmarks</h3>
                      <p className="text-sm text-muted-foreground">Your saved flashcards for quick review</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span className="font-medium">{bookmarkedCount} {bookmarkedCount === 1 ? 'card' : 'cards'}</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors">
                      <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Sets */}
        <section>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Sets</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort</span>
              <Select value={sortMode === "used" ? "" : sortMode} onValueChange={(v) => setSortMode(v as any)}>
                <SelectTrigger className="w-[220px]">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Set Card */}
          <Card className="border-2 border-dashed border-black/20 dark:border-white/20 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-md" onClick={() => setIsCreateDialogOpen(true)}>
            <CardContent className="flex flex-col items-center justify-center h-48 text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Create New Set</h3>
              <p className="text-sm text-muted-foreground">Start a new flashcard collection</p>
            </CardContent>
          </Card>

          {/* Existing Sets */}
          {sortedSets.map(set => <div
              key={set.id}
              className="relative"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", set.id);
                e.dataTransfer.effectAllowed = "move";
              }}
            >
              <Link to={`/set/${set.id}`}>
                <Card className="h-48 cursor-pointer hover:shadow-lg transition-all overflow-hidden group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-black/10 dark:border-white/10" style={{
              borderTop: `6px solid ${set.displayColor}`,
              background: `linear-gradient(to bottom, ${set.displayColor}15, rgba(255,255,255,0.8))`
            }}>
                  <CardHeader className="pr-12">
                    <CardTitle className="text-foreground">
                      <span className="truncate">{set.title}</span>
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
              
              {/* More Options Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 hover:bg-black/10 dark:hover:bg-white/10 z-10" onClick={e => e.preventDefault()}>
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
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2 text-foreground">No flashcard sets yet</h3>
            <p className="text-muted-foreground mb-6">Create your first set to start studying</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Set
            </Button>
          </div>}
      </main>

      <CreateSetDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSuccess={fetchSets} />
      <CreateFileDialog open={isCreateFileDialogOpen} onOpenChange={setIsCreateFileDialogOpen} onSuccess={fetchFiles} />

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