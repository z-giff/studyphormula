import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, MousePointerClick, Workflow, PenLine } from "lucide-react";
import { InteractiveFlashcardEditor } from "./InteractiveFlashcardEditor";
import { FlowchartCanvasEditor } from "./FlowchartCanvasEditor";
import { DrawingCanvasEditor } from "./DrawingCanvasEditor";
import { ImageUploader } from "./ImageUploader";


interface CreateFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  onSuccess: () => void;
}

export const CreateFlashcardDialog = ({ open, onOpenChange, setId, onSuccess }: CreateFlashcardDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [flashcardType, setFlashcardType] = useState<"standard" | "interactive" | "flowchart" | "drawing">("standard");
  const [formData, setFormData] = useState({
    term: "",
    definition: "",
    imageUrl: "",
  });
  const [interactiveData, setInteractiveData] = useState<{
    imageUrl: string;
    term: string;
    textBoxes: Array<{ id: string; x: number; y: number; width: number; height: number; answer: string }>;
  }>({
    imageUrl: "",
    term: "",
    textBoxes: [],
  });
  const [flowchartData, setFlowchartData] = useState({ nodes: [], edges: [] });
  const [drawingData, setDrawingData] = useState({ strokes: [], width: 0, height: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (flashcardType === "standard") {
      if (!formData.term.trim() || !formData.definition.trim()) {
        toast.error("Please fill in both term and definition");
        return;
      }
    } else if (flashcardType === "interactive") {
      if (!interactiveData.term.trim()) {
        toast.error("Please provide a term/question for the flashcard");
        return;
      }
      if (!interactiveData.imageUrl.trim()) {
        toast.error("Please provide an image");
        return;
      }
      if (interactiveData.textBoxes.length === 0) {
        toast.error("Please add at least one text box");
        return;
      }
      if (interactiveData.textBoxes.some(box => !box.answer.trim())) {
        toast.error("Please fill in all text box answers");
        return;
      }
    } else if (flashcardType === "flowchart") {
      if (!formData.term.trim()) {
        toast.error("Please provide a question/term");
        return;
      }
      if (!flowchartData.nodes || flowchartData.nodes.length === 0) {
        toast.error("Please create a flowchart diagram");
        return;
      }
    } else if (flashcardType === "drawing") {
      if (!formData.term.trim()) {
        toast.error("Please provide a question/term");
        return;
      }
      if (!drawingData.strokes || drawingData.strokes.length === 0) {
        toast.error("Please create a drawing");
        return;
      }
    }

    setIsLoading(true);

    try {
      // Get the current max position
      const { data: existingCards } = await supabase
        .from("flashcards")
        .select("position")
        .eq("set_id", setId)
        .order("position", { ascending: false })
        .limit(1);

      const maxPosition = existingCards && existingCards.length > 0 ? existingCards[0].position : -1;

      let insertData: any = {
        set_id: setId,
        position: maxPosition + 1,
        flashcard_type: flashcardType,
      };

      if (flashcardType === "standard") {
        insertData = {
          ...insertData,
          term: formData.term.trim(),
          definition: formData.definition.trim(),
          image_url: formData.imageUrl.trim() || null,
        };
      } else if (flashcardType === "interactive") {
        insertData = {
          ...insertData,
          term: interactiveData.term.trim(),
          definition: "Fill in the blanks",
          image_url: interactiveData.imageUrl.trim(),
          interactive_data: { textBoxes: interactiveData.textBoxes },
        };
      } else if (flashcardType === "flowchart") {
        insertData = {
          ...insertData,
          term: formData.term.trim(),
          definition: "Flowchart diagram",
          interactive_data: flowchartData,
        };
      } else if (flashcardType === "drawing") {
        insertData = {
          ...insertData,
          term: formData.term.trim(),
          definition: "Drawing",
          interactive_data: drawingData,
        };
      }

      const { error } = await supabase.from("flashcards").insert(insertData);

      if (error) throw error;

      toast.success("Flashcard created successfully!");
      setFormData({ term: "", definition: "", imageUrl: "" });
      setInteractiveData({ imageUrl: "", term: "", textBoxes: [] });
      setFlowchartData({ nodes: [], edges: [] });
      setDrawingData({ strokes: [], width: 0, height: 0 });
      setFlashcardType("standard");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create flashcard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        <DialogHeader className="px-8 pt-8 pb-5">
          <DialogTitle className="text-xl font-semibold tracking-tight">New flashcard</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Pick a format and fill in the details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-8 pb-6 space-y-7">
            <Tabs value={flashcardType} onValueChange={(v) => setFlashcardType(v as "standard" | "interactive" | "flowchart" | "drawing")}>
              {/* Flashcard types: circular, icon-only controls */}
              <TabsList className="flex w-full justify-center gap-4 h-auto bg-transparent p-0">
                {([
                  { value: "standard", label: "Standard", Icon: Layers },
                  { value: "interactive", label: "Interactive", Icon: MousePointerClick },
                  { value: "flowchart", label: "Flowchart", Icon: Workflow },
                  { value: "drawing", label: "Drawing", Icon: PenLine },
                ] as const).map(({ value, label, Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    aria-label={label}
                    title={label}
                    className="w-12 h-12 rounded-full p-0 border border-border bg-secondary text-muted-foreground transition-all hover:text-foreground hover:scale-105 data-[state=active]:border-transparent data-[state=active]:text-primary-foreground data-[state=active]:shadow-[var(--shadow-ember)] data-[state=active]:[background:var(--gradient-ember)]"
                  >
                    <Icon className="h-5 w-5" />
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="standard" className="space-y-5 mt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="term" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Term</Label>
                  <Input
                    id="term"
                    placeholder="What is the mitochondria?"
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    disabled={isLoading}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="definition" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Definition</Label>
                  <Textarea
                    id="definition"
                    placeholder="The powerhouse of the cell…"
                    value={formData.definition}
                    onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                    disabled={isLoading}
                    rows={4}
                    required
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Image <span className="normal-case font-normal text-muted-foreground/70">— optional</span></Label>
                  <ImageUploader
                    imageUrl={formData.imageUrl}
                    onImageChange={(imageUrl) => setFormData({ ...formData, imageUrl })}
                    disabled={isLoading}
                    required={false}
                    label=""
                  />
                </div>
              </TabsContent>

              <TabsContent value="interactive" className="space-y-5 mt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="interactive-term" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Term</Label>
                  <Input
                    id="interactive-term"
                    placeholder="Label the parts of the cell"
                    value={interactiveData.term}
                    onChange={(e) => setInteractiveData({ ...interactiveData, term: e.target.value })}
                    disabled={isLoading}
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Image</Label>
                  <ImageUploader
                    imageUrl={interactiveData.imageUrl}
                    onImageChange={(imageUrl) => setInteractiveData({ ...interactiveData, imageUrl })}
                    disabled={isLoading}
                    label=""
                  />
                </div>

                {interactiveData.imageUrl && (
                  <InteractiveFlashcardEditor
                    imageUrl={interactiveData.imageUrl}
                    textBoxes={interactiveData.textBoxes}
                    onChange={(textBoxes) => setInteractiveData({ ...interactiveData, textBoxes })}
                    onImageChange={(imageUrl) => setInteractiveData({ ...interactiveData, imageUrl })}
                  />
                )}
              </TabsContent>

              <TabsContent value="flowchart" className="space-y-5 mt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="flowchart-term" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Topic</Label>
                  <Input
                    id="flowchart-term"
                    placeholder="Photosynthesis process"
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    disabled={isLoading}
                    required
                    className="h-11"
                  />
                </div>

                <FlowchartCanvasEditor
                  flowchartData={flowchartData}
                  onChange={setFlowchartData}
                />
              </TabsContent>

              <TabsContent value="drawing" className="space-y-5 mt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="drawing-term" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Topic</Label>
                  <Input
                    id="drawing-term"
                    placeholder="Draw the cell membrane structure"
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    disabled={isLoading}
                    required
                    className="h-11"
                  />
                </div>

                <DrawingCanvasEditor
                  drawingData={drawingData}
                  onChange={setDrawingData}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex gap-2 justify-end px-8 py-4 border-t border-border/60 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[120px]">
              {isLoading ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
