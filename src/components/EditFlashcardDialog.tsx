import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { InteractiveFlashcardEditor } from "@/components/InteractiveFlashcardEditor";
import { FlowchartCanvasEditor } from "@/components/FlowchartCanvasEditor";

const PRESET_COLORS = [
  "#e2a9f1", // Lavender Pink
  "#38b6ff", // Sky Blue
  "#6db2a0", // Sage Teal
  "#ffde59", // Sunny Yellow
  "#ea3d57", // Coral Red
];

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  image_url: string | null;
  color?: string | null;
  flashcard_type?: string;
  interactive_data?: any;
}

interface EditFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: Flashcard;
  onSuccess: () => void;
}

export const EditFlashcardDialog = ({ open, onOpenChange, flashcard, onSuccess }: EditFlashcardDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [flashcardType, setFlashcardType] = useState<"standard" | "interactive" | "flowchart">(
    flashcard.flashcard_type === "interactive" ? "interactive" : 
    flashcard.flashcard_type === "flowchart" ? "flowchart" : 
    "standard"
  );
  const [formData, setFormData] = useState({
    term: flashcard.term,
    definition: flashcard.definition,
    imageUrl: flashcard.image_url || "",
    color: flashcard.color || null,
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

  useEffect(() => {
    setFlashcardType(
      flashcard.flashcard_type === "interactive" ? "interactive" : 
      flashcard.flashcard_type === "flowchart" ? "flowchart" : 
      "standard"
    );
    setFormData({
      term: flashcard.term,
      definition: flashcard.definition,
      imageUrl: flashcard.image_url || "",
      color: flashcard.color || null,
    });
    setInteractiveData({
      textBoxes: flashcard.interactive_data?.textBoxes || [],
    });
    setFlowchartData(
      flashcard.flashcard_type === "flowchart" && flashcard.interactive_data
        ? flashcard.interactive_data
        : { nodes: [], edges: [] }
    );
  }, [flashcard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (flashcardType === "standard") {
      if (!formData.term.trim() || !formData.definition.trim()) {
        toast.error("Please fill in both term and definition");
        return;
      }
    } else if (flashcardType === "interactive") {
      if (!formData.imageUrl.trim()) {
        toast.error("Please provide an image URL for interactive flashcards");
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
    }

    setIsLoading(true);

    try {
      const updateData: any = {
        flashcard_type: flashcardType,
        color: formData.color,
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
          <Tabs value={flashcardType} onValueChange={(v) => setFlashcardType(v as "standard" | "interactive" | "flowchart")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="standard">Standard</TabsTrigger>
              <TabsTrigger value="interactive">Interactive</TabsTrigger>
              <TabsTrigger value="flowchart">Flowchart</TabsTrigger>
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
                  placeholder="The powerhouse of the cell..."
                  value={formData.definition}
                  onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                  disabled={isLoading}
                  rows={4}
                  required={flashcardType === "standard"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-imageUrl">Image URL (Optional)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      id="edit-imageUrl"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="button" variant="outline" disabled>
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="interactive" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="interactive-imageUrl">Image URL *</Label>
                <Input
                  id="interactive-imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  disabled={isLoading}
                  required={flashcardType === "interactive"}
                />
              </div>

              {formData.imageUrl && (
                <InteractiveFlashcardEditor
                  imageUrl={formData.imageUrl}
                  textBoxes={interactiveData.textBoxes}
                  onChange={(textBoxes) => setInteractiveData({ textBoxes })}
                  onImageChange={(imageUrl) => setFormData({ ...formData, imageUrl })}
                />
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

              <FlowchartCanvasEditor
                flowchartData={flowchartData}
                onChange={setFlowchartData}
              />
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Flashcard Color (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-10 h-10 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: formData.color === color ? "#000" : "transparent",
                    boxShadow: formData.color === color ? `0 0 0 2px ${color}` : "none",
                  }}
                  onClick={() => setFormData({ ...formData, color: formData.color === color ? null : color })}
                  disabled={isLoading}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Choose a custom color for this flashcard, or leave unselected to use the deck color
            </p>
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
