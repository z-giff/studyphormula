import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";

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

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  image_url: string | null;
  color?: string | null;
}

interface EditFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: Flashcard;
  onSuccess: () => void;
}

export const EditFlashcardDialog = ({ open, onOpenChange, flashcard, onSuccess }: EditFlashcardDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    term: flashcard.term,
    definition: flashcard.definition,
    imageUrl: flashcard.image_url || "",
    color: flashcard.color || null,
  });

  useEffect(() => {
    setFormData({
      term: flashcard.term,
      definition: flashcard.definition,
      imageUrl: flashcard.image_url || "",
      color: flashcard.color || null,
    });
  }, [flashcard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.term.trim() || !formData.definition.trim()) {
      toast.error("Please fill in both term and definition");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("flashcards")
        .update({
          term: formData.term.trim(),
          definition: formData.definition.trim(),
          image_url: formData.imageUrl.trim() || null,
          color: formData.color,
        })
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Flashcard</DialogTitle>
          <DialogDescription>
            Update the term, definition, or image for this flashcard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="edit-term">Term / Question *</Label>
            <Input
              id="edit-term"
              placeholder="e.g., What is the mitochondria?"
              value={formData.term}
              onChange={(e) => setFormData({ ...formData, term: e.target.value })}
              disabled={isLoading}
              required
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
              required
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
