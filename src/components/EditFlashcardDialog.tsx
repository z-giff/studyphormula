import { useState, useEffect, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pipette } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";

const InteractiveFlashcardEditor = lazy(() => import("@/components/InteractiveFlashcardEditor").then(m => ({ default: m.InteractiveFlashcardEditor })));
const FlowchartCanvasEditor = lazy(() => import("@/components/FlowchartCanvasEditor").then(m => ({ default: m.FlowchartCanvasEditor })));
const DrawingCanvasEditor = lazy(() => import("@/components/DrawingCanvasEditor").then(m => ({ default: m.DrawingCanvasEditor })));

const EditorFallback = () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

const FLASHCARD_COLORS = [
  "#000000",
  "#a6a6a6",
  "#ffffff",
  "#e2a9f1",
  "#38b6ff",
  "#ea3d57",
  "#6db2a0",
  "#ffde59",
];

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  image_url: string | null;
  color?: string | null;
  flashcard_type?: string;
  interactive_data?: any;
  set_id?: string;
}

interface EditFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: Flashcard;
  onSuccess: () => void;
}

export const EditFlashcardDialog = ({ open, onOpenChange, flashcard, onSuccess }: EditFlashcardDialogProps) => {
  const { id: setIdFromParams } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSetColor, setSelectedSetColor] = useState("#38b6ff");
  const [flashcardType, setFlashcardType] = useState<"standard" | "interactive" | "flowchart" | "drawing">(
    flashcard.flashcard_type === "interactive" ? "interactive" : 
    flashcard.flashcard_type === "flowchart" ? "flowchart" : 
    flashcard.flashcard_type === "drawing" ? "drawing" :
    "standard"
  );
  const [formData, setFormData] = useState({
    term: flashcard.term,
    definition: flashcard.definition,
    imageUrl: flashcard.image_url || "",
  });
  const [interactiveData, setInteractiveData] = useState<{
    textBoxes: Array<{ id: string; x: number; y: number; width: number; height: number; answer: string; fontSize?: number; fontWeight?: string; fontColor?: string }>;
  }>({
    textBoxes: flashcard.interactive_data?.textBoxes || [],
  });
  const [flowchartData, setFlowchartData] = useState(
    flashcard.flashcard_type === "flowchart" && flashcard.interactive_data
      ? flashcard.interactive_data
      : { nodes: [], edges: [] }
  );
  const [drawingData, setDrawingData] = useState(
    flashcard.flashcard_type === "drawing" && flashcard.interactive_data
      ? flashcard.interactive_data
      : { strokes: [], width: 0, height: 0 }
  );

  // Fetch the current set color when dialog opens
  useEffect(() => {
    const fetchSetColor = async () => {
      const setId = flashcard.set_id || setIdFromParams;
      if (setId && open) {
        const { data } = await supabase
          .from("flashcard_sets")
          .select("color")
          .eq("id", setId)
          .single();
        if (data?.color) {
          setSelectedSetColor(data.color);
        }
      }
    };
    fetchSetColor();
  }, [flashcard.set_id, setIdFromParams, open]);

  useEffect(() => {
    setFlashcardType(
      flashcard.flashcard_type === "interactive" ? "interactive" : 
      flashcard.flashcard_type === "flowchart" ? "flowchart" : 
      flashcard.flashcard_type === "drawing" ? "drawing" :
      "standard"
    );
    setFormData({
      term: flashcard.term,
      definition: flashcard.definition,
      imageUrl: flashcard.image_url || "",
    });
    setInteractiveData({
      textBoxes: flashcard.interactive_data?.textBoxes || [],
    });
    setFlowchartData(
      flashcard.flashcard_type === "flowchart" && flashcard.interactive_data
        ? flashcard.interactive_data
      : { nodes: [], edges: [] }
    );
    setDrawingData(
      flashcard.flashcard_type === "drawing" && flashcard.interactive_data
        ? flashcard.interactive_data
        : { strokes: [], width: 0, height: 0 }
    );
  }, [flashcard]);

  const handleEyeDropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        setSelectedSetColor(result.sRGBHex);
        // Immediately update the set color
        await handleUpdateSetColor(result.sRGBHex);
      } catch (e) {
        // User cancelled
      }
    } else {
      toast.error("Eyedropper not supported in this browser");
    }
  };

  const handleUpdateSetColor = async (newColor: string) => {
    const setId = flashcard.set_id || setIdFromParams;
    if (!setId) return;
    
    try {
      const { error } = await supabase
        .from("flashcard_sets")
        .update({ color: newColor })
        .eq("id", setId);

      if (error) throw error;
      setSelectedSetColor(newColor);
      toast.success("Set color updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update set color");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (flashcardType === "standard") {
      if (!formData.term.trim() || !formData.definition.trim()) {
        toast.error("Please fill in both term and definition");
        return;
      }
    } else if (flashcardType === "interactive") {
      if (!formData.term.trim()) {
        toast.error("Please provide a term/question for the flashcard");
        return;
      }
      if (!formData.imageUrl.trim()) {
        toast.error("Please provide an image for interactive flashcards");
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
      const updateData: any = {
        flashcard_type: flashcardType,
      };

      if (flashcardType === "standard") {
        updateData.term = formData.term.trim();
        updateData.definition = formData.definition.trim();
        updateData.image_url = formData.imageUrl.trim() || null;
        updateData.interactive_data = null;
      } else if (flashcardType === "interactive") {
        updateData.term = formData.term.trim() || "Interactive Flashcard";
        updateData.definition = "Fill in the blanks";
        updateData.image_url = formData.imageUrl.trim();
        updateData.interactive_data = interactiveData;
      } else if (flashcardType === "flowchart") {
        updateData.term = formData.term.trim();
        updateData.definition = "Flowchart diagram";
        updateData.image_url = null;
        updateData.interactive_data = flowchartData;
      } else if (flashcardType === "drawing") {
        updateData.term = formData.term.trim();
        updateData.definition = "Drawing";
        updateData.image_url = null;
        updateData.interactive_data = drawingData;
      }

      const { error } = await supabase
        .from("flashcards")
        .update(updateData)
        .eq("id", flashcard.id);

      if (error) throw error;

      toast.success("Flashcard updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to update flashcard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Flashcard</DialogTitle>
          <DialogDescription>
            Update your flashcard content and settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={flashcardType} onValueChange={(v) => setFlashcardType(v as "standard" | "interactive" | "flowchart" | "drawing")}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="standard">Standard</TabsTrigger>
              <TabsTrigger value="interactive">Interactive</TabsTrigger>
              <TabsTrigger value="flowchart">Flowchart</TabsTrigger>
              <TabsTrigger value="drawing">Drawing</TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-term">Term / Question *</Label>
                <Input
                  id="edit-term"
                  placeholder="e.g., What is the mitochondria?"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  disabled={isLoading}
                  required={flashcardType === "standard"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-definition">Definition / Answer *</Label>
                <Textarea
                  id="edit-definition"
                  placeholder="e.g., The powerhouse of the cell..."
                  value={formData.definition}
                  onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                  disabled={isLoading}
                  rows={4}
                  required={flashcardType === "standard"}
                />
              </div>

              <ImageUploader
                imageUrl={formData.imageUrl}
                onImageChange={(imageUrl) => setFormData({ ...formData, imageUrl })}
                disabled={isLoading}
                required={false}
                label="Image"
              />
            </TabsContent>

            <TabsContent value="interactive" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="interactive-edit-term">Term / Question *</Label>
                <Input
                  id="interactive-edit-term"
                  placeholder="e.g., Label the parts of the cell"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  disabled={isLoading}
                  required={flashcardType === "interactive"}
                />
                <p className="text-xs text-muted-foreground">
                  This will be shown as the flashcard title
                </p>
              </div>

              <ImageUploader
                imageUrl={formData.imageUrl}
                onImageChange={(imageUrl) => setFormData({ ...formData, imageUrl })}
                disabled={isLoading}
              />

              {formData.imageUrl && (
                <Suspense fallback={<EditorFallback />}>
                  <InteractiveFlashcardEditor
                    imageUrl={formData.imageUrl}
                    textBoxes={interactiveData.textBoxes}
                    onChange={(textBoxes) => setInteractiveData({ textBoxes })}
                    onImageChange={(imageUrl) => setFormData({ ...formData, imageUrl })}
                  />
                </Suspense>
              )}
            </TabsContent>

            <TabsContent value="flowchart" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="flowchart-edit-term">Question / Topic *</Label>
                <Input
                  id="flowchart-edit-term"
                  placeholder="e.g., Photosynthesis Process"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  disabled={isLoading}
                  required={flashcardType === "flowchart"}
                />
              </div>

              <Suspense fallback={<EditorFallback />}>
                <FlowchartCanvasEditor
                  flowchartData={flowchartData}
                  onChange={setFlowchartData}
                />
              </Suspense>
            </TabsContent>

            <TabsContent value="drawing" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="drawing-edit-term">Question / Topic *</Label>
                <Input
                  id="drawing-edit-term"
                  placeholder="e.g., Draw the cell membrane structure"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  disabled={isLoading}
                  required={flashcardType === "drawing"}
                />
              </div>

              <Suspense fallback={<EditorFallback />}>
                <DrawingCanvasEditor
                  drawingData={drawingData}
                  onChange={setDrawingData}
                />
              </Suspense>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Flashcard Set Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {FLASHCARD_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleUpdateSetColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedSetColor === color 
                      ? "ring-2 ring-offset-2 ring-primary scale-110" 
                      : "hover:scale-105"
                  } ${color === "#ffffff" ? "border-gray-300" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <button
                type="button"
                onClick={handleEyeDropper}
                className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center hover:bg-muted transition-colors"
                title="Pick color from screen"
              >
                <Pipette className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
