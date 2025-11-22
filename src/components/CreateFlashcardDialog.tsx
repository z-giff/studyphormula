import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InteractiveFlashcardEditor } from "./InteractiveFlashcardEditor";

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F97316", // Bright Orange
  "#84CC16", // Lime
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
  "#7C3AED", // Violet
  "#D946EF", // Fuchsia
  "#F43F5E", // Rose
  "#64748B", // Slate
  "#14B8A6", // Teal
];

interface CreateFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  onSuccess: () => void;
}

export const CreateFlashcardDialog = ({ open, onOpenChange, setId, onSuccess }: CreateFlashcardDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [flashcardType, setFlashcardType] = useState<"standard" | "interactive">("standard");
  const [formData, setFormData] = useState({
    term: "",
    definition: "",
    imageUrl: "",
    color: null as string | null,
  });
  const [interactiveData, setInteractiveData] = useState<{
    imageUrl: string;
    textBoxes: Array<{ id: string; x: number; y: number; width: number; height: number; answer: string }>;
  }>({
    imageUrl: "",
    textBoxes: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (flashcardType === "standard") {
      if (!formData.term.trim() || !formData.definition.trim()) {
        toast.error("Please fill in both term and definition");
        return;
      }
    } else {
      if (!interactiveData.imageUrl.trim()) {
        toast.error("Please provide an image URL");
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

      const insertData = flashcardType === "standard"
        ? {
            set_id: setId,
            term: formData.term.trim(),
            definition: formData.definition.trim(),
            image_url: formData.imageUrl.trim() || null,
            color: formData.color,
            position: maxPosition + 1,
            flashcard_type: "standard",
          }
        : {
            set_id: setId,
            term: "Interactive Flashcard",
            definition: "Fill in the blanks",
            image_url: interactiveData.imageUrl.trim(),
            color: formData.color,
            position: maxPosition + 1,
            flashcard_type: "interactive",
            interactive_data: { textBoxes: interactiveData.textBoxes },
          };

      const { error } = await supabase.from("flashcards").insert(insertData);

      if (error) throw error;

      toast.success("Flashcard created successfully!");
      setFormData({ term: "", definition: "", imageUrl: "", color: null });
      setInteractiveData({ imageUrl: "", textBoxes: [] });
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
          <Tabs value={flashcardType} onValueChange={(v) => setFlashcardType(v as "standard" | "interactive")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="standard">Standard</TabsTrigger>
              <TabsTrigger value="interactive">Interactive</TabsTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      id="imageUrl"
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
                <p className="text-xs text-muted-foreground">
                  Paste a URL to an image or diagram for visual learning
                </p>
              </div>

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
            </TabsContent>

            <TabsContent value="interactive" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="interactiveImageUrl">Image URL *</Label>
                <Input
                  id="interactiveImageUrl"
                  type="url"
                  placeholder="https://example.com/diagram.jpg"
                  value={interactiveData.imageUrl}
                  onChange={(e) => setInteractiveData({ ...interactiveData, imageUrl: e.target.value })}
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Upload or paste an image URL for the interactive flashcard
                </p>
              </div>

              {interactiveData.imageUrl && (
                <InteractiveFlashcardEditor
                  imageUrl={interactiveData.imageUrl}
                  textBoxes={interactiveData.textBoxes}
                  onChange={(textBoxes) => setInteractiveData({ ...interactiveData, textBoxes })}
                  onImageChange={(imageUrl) => setInteractiveData({ ...interactiveData, imageUrl })}
                />
              )}

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
              {isLoading ? "Creating..." : `Create ${flashcardType === "standard" ? "Flashcard" : "Interactive Flashcard"}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
