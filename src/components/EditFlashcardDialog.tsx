import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Pipette } from "lucide-react";
import { InteractiveFlashcardEditor } from "@/components/InteractiveFlashcardEditor";
import { FlowchartCanvasEditor } from "@/components/FlowchartCanvasEditor";
import { DrawingCanvasEditor } from "@/components/DrawingCanvasEditor";
import { ImageUploader } from "@/components/ImageUploader";
import { StandardCardImageEditor } from "@/components/StandardCardImageEditor";
import { getStandardCardLayout, withStandardCardLayout, type StandardCardLayout } from "@/lib/standardCardLayout";
import { FlashcardTextarea } from "./FlashcardTextarea";
import { usePremium } from "@/hooks/usePremium";
import { isPremiumCardType, isPremiumRequiredError } from "@/lib/premium";

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

type FlashcardType = "standard" | "interactive" | "flowchart" | "drawing";

export const EditFlashcardDialog = ({ open, onOpenChange, flashcard, onSuccess }: EditFlashcardDialogProps) => {
  const { id: setIdFromParams } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const { isPremium, loading: premiumLoading, openUpgrade, requirePremium } = usePremium();
  const showPremiumMarks = !premiumLoading && !isPremium;

  const [selectedSetColor, setSelectedSetColor] = useState("#38b6ff");
  const [flashcardType, setFlashcardType] = useState<FlashcardType>(
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
  const [standardLayout, setStandardLayout] = useState<StandardCardLayout>(() => getStandardCardLayout(flashcard.interactive_data, flashcard.image_url));
  // Pictures still uploading would be left off the card if it were saved now
  const [picturesBusy, setPicturesBusy] = useState(false);
  const waitingForPictures = flashcardType === "standard" && picturesBusy;

  // Turning a card into an interactive, flowchart or drawing card needs Premium
  const handleTypeChange = (value: string) => {
    const type = value as FlashcardType;
    if (isPremiumCardType(type) && !requirePremium(type)) return;
    setFlashcardType(type);
  };

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
    setStandardLayout(getStandardCardLayout(flashcard.interactive_data, flashcard.image_url));
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

    if (isPremiumCardType(flashcardType) && !requirePremium(flashcardType)) return;

    if (flashcardType === "standard") {
      if (!formData.term.trim() || !formData.definition.trim()) {
        toast.error("Please fill in both term and definition");
        return;
      }
      if (picturesBusy) {
        toast.info("Wait for the pictures to finish uploading");
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
        updateData.image_url = null;
        updateData.interactive_data = withStandardCardLayout(flashcard.interactive_data, standardLayout);
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
      if (isPremiumRequiredError(error) && isPremiumCardType(flashcardType)) {
        openUpgrade(flashcardType);
      } else {
        toast.error(error.message || "Failed to update flashcard");
      }
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
          <Tabs
            value={flashcardType}
            onValueChange={handleTypeChange}
            activationMode={showPremiumMarks ? "manual" : "automatic"}
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="standard">Standard</TabsTrigger>
              {(
                [
                  ["interactive", "Interactive"],
                  ["flowchart", "Flowchart"],
                  ["drawing", "Drawing"],
                ] as const
              ).map(([value, label]) => (
                <TabsTrigger key={value} value={value} className="gap-1.5">
                  {label}
                  {showPremiumMarks && <Crown className="h-3 w-3 text-primary" aria-label="Premium" />}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="standard" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-term">Term / Question *</Label>
                <FlashcardTextarea
                  id="edit-term"
                  placeholder="e.g., What is the mitochondria?"
                  value={formData.term}
                  onValueChange={(term) => setFormData({ ...formData, term })}
                  disabled={isLoading}
                  required={flashcardType === "standard"}
                  rows={2}
                  className="min-h-11 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-definition">Definition / Answer *</Label>
                <FlashcardTextarea
                  id="edit-definition"
                  placeholder="The powerhouse of the cell..."
                  value={formData.definition}
                  onValueChange={(definition) => setFormData({ ...formData, definition })}
                  disabled={isLoading}
                  rows={4}
                  required={flashcardType === "standard"}
                />
              </div>

              <StandardCardImageEditor term={formData.term} definition={formData.definition} color={selectedSetColor} layout={standardLayout} onChange={setStandardLayout} disabled={isLoading} onBusyChange={setPicturesBusy} />
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

              <DrawingCanvasEditor
                drawingData={drawingData}
                onChange={setDrawingData}
              />
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
            <Button type="submit" disabled={isLoading || waitingForPictures}>
              {isLoading ? "Saving..." : waitingForPictures ? "Uploading pictures…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
