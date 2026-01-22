import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import LogoOrb from "@/components/LogoOrb";
import { ArrowLeft, BookOpen, Folder } from "lucide-react";

interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  color: string;
  created_at: string;
  last_accessed_at?: string | null;
  _count?: {
    flashcards: number;
  };
  displayColor: string;
}

export default function FilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fileName, setFileName] = useState<string>("");
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user && id) void fetchFileAndSets();
  }, [user, id]);

  const fetchFileAndSets = async () => {
    try {
      setIsLoading(true);

      const [{ data: file, error: fileError }, { data: rawSets, error: setsError }] = await Promise.all([
        supabase.from("flashcard_files").select("id,name").eq("id", id).maybeSingle(),
        supabase.from("flashcard_sets").select("*").eq("file_id", id).order("created_at", { ascending: false }),
      ]);

      if (fileError) throw fileError;
      if (!file) {
        toast.error("File not found");
        navigate("/dashboard");
        return;
      }
      if (setsError) throw setsError;

      setFileName(file.name);

      const hydrated = await Promise.all(
        (rawSets || []).map(async (set) => {
          const { count } = await supabase
            .from("flashcards")
            .select("*", { count: "exact", head: true })
            .eq("set_id", set.id);

          const { data: firstFlashcard } = await supabase
            .from("flashcards")
            .select("color")
            .eq("set_id", set.id)
            .order("position", { ascending: true })
            .limit(1)
            .maybeSingle();

          return {
            ...set,
            _count: { flashcards: count || 0 },
            displayColor: firstFlashcard?.color || set.color,
          } as FlashcardSet;
        }),
      );

      setSets(hydrated);
    } catch (error: any) {
      toast.error(error.message || "Failed to load file");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const sortedSets = useMemo(() => {
    // Default behavior in file view: most recently used
    return [...sets].sort((a, b) => {
      const aT = new Date(a.last_accessed_at || a.created_at).getTime();
      const bT = new Date(b.last_accessed_at || b.created_at).getTime();
      return bT - aT;
    });
  }, [sets]);

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

          <div className="flex items-center gap-3">
            <Folder className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-3xl font-bold text-foreground">{fileName}</h1>
          </div>
          <p className="text-muted-foreground mt-2">All sets in this file</p>
        </div>

        {sortedSets.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-muted-foreground">No sets in this file yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedSets.map((set) => (
              <Link key={set.id} to={`/set/${set.id}`}>
                <Card
                  className="h-48 cursor-pointer hover:shadow-lg transition-all overflow-hidden group relative"
                  style={{
                    borderTop: `6px solid ${set.displayColor}`,
                    background: `linear-gradient(to bottom, ${set.displayColor}15, rgba(255,255,255,0.8))`,
                  }}
                >
                  <CardHeader className="pr-12">
                    <CardTitle className="text-foreground">
                      <span className="truncate">{set.title}</span>
                    </CardTitle>
                    <CardDescription className="line-clamp-2">{set.description || "No description"}</CardDescription>
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
        )}
      </main>
    </div>
  );
}
