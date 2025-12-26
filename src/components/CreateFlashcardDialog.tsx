import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InteractiveFlashcardEditor } from "./InteractiveFlashcardEditor";
import { FlowchartCanvasEditor } from "./FlowchartCanvasEditor";
import { ImageUploader } from "./ImageUploader";


interface CreateFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  onSuccess: () => void;
}

export const CreateFlashcardDialog = ({ open, onOpenChange, setId, onSuccess }: CreateFlashcardDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [flashcardType, setFlashcardType] = useState<"standard" | "interactive" | "flowchart">("standard");
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
      }

      const { error } = await supabase.from("flashcards").insert(insertData);

      if (error) throw error;

      toast.success("Flashcard created successfully!");
      setFormData({ term: "", definition: "", imageUrl: "" });
      setInteractiveData({ imageUrl: "", term: "", textBoxes: [] });
      setFlowchartData({ nodes: [], edges: [] });
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Flashcard</DialogTitle>
          <DialogDescription>
            Choose between a standard flashcard or an interactive fill-in-the-blanks flashcard.
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
                <Label htmlFor="term">Term / Question *</Label>
                <Input
                  id="term"
                  placeholder="e.g., What is the mitochondria?"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="definition">Definition / Answer *</Label>
                <Textarea
                  id="definition"
                  placeholder="The powerhouse of the cell..."
                  value={formData.definition}
                  onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                  disabled={isLoading}
                  rows={4}
                  required
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
                <Label htmlFor="interactive-term">Term / Question *</Label>
                <Input
                  id="interactive-term"
                  placeholder="e.g., Label the parts of the cell"
                  value={interactiveData.term}
                  onChange={(e) => setInteractiveData({ ...interactiveData, term: e.target.value })}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be shown as the flashcard title
                </p>
              </div>

              <ImageUploader
                imageUrl={interactiveData.imageUrl}
                onImageChange={(imageUrl) => setInteractiveData({ ...interactiveData, imageUrl })}
                disabled={isLoading}
              />

              {interactiveData.imageUrl && (
                <InteractiveFlashcardEditor
                  imageUrl={interactiveData.imageUrl}
                  textBoxes={interactiveData.textBoxes}
                  onChange={(textBoxes) => setInteractiveData({ ...interactiveData, textBoxes })}
                  onImageChange={(imageUrl) => setInteractiveData({ ...interactiveData, imageUrl })}
                />
              )}

            </TabsContent>

            <TabsContent value="flowchart" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="flowchart-term">Question / Topic *</Label>
                <Input
                  id="flowchart-term"
                  placeholder="e.g., Photosynthesis Process"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be shown on the question side of the flashcard
                </p>
              </div>

              <FlowchartCanvasEditor
                flowchartData={flowchartData}
                onChange={setFlowchartData}
              />

            </TabsContent>
          </Tabs>

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
              {isLoading ? "Creating..." : `Create ${flashcardType === "standard" ? "Flashcard" : flashcardType === "interactive" ? "Interactive Flashcard" : "Flowchart Flashcard"}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
