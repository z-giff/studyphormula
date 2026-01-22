import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen, User, MoreHorizontal, Trash2, Folder, ArrowRightLeft } from "lucide-react";
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
interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  color: string;
  file_id?: string | null;
  created_at: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateFileDialogOpen, setIsCreateFileDialogOpen] = useState(false);
  const [deleteSetId, setDeleteSetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [moveSetId, setMoveSetId] = useState<string | null>(null);
  const [moveSelectedFileId, setMoveSelectedFileId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  useEffect(() => {
    if (user) {
      void Promise.all([fetchSets(), fetchFiles()]);
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
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Files</h2>
            </div>

            <Button onClick={() => setIsCreateFileDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create File
            </Button>
          </div>

          {files.length === 0 ? (
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border-black/10 dark:border-white/10">
              <CardContent className="py-8">
                <p className="text-sm text-muted-foreground">
                  No files yet — create one to organize related flashcard sets.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <Card
                  key={file.id}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-black/10 dark:border-white/10"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{file.name}</span>
                    </CardTitle>
                    <CardDescription>
                      {(fileSetCounts.get(file.id) ?? 0).toString()} set(s)
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Sets */}
        <section>
          <h2 className="sr-only">Sets</h2>
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
          {sets.map(set => <div key={set.id} className="relative">
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