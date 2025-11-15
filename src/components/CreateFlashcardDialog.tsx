import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";

interface CreateFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  onSuccess: () => void;
}

export const CreateFlashcardDialog = ({ open, onOpenChange, setId, onSuccess }: CreateFlashcardDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    term: "",
    definition: "",
    imageUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.term.trim() || !formData.definition.trim()) {
      toast.error("Please fill in both term and definition");
      return;
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

      const { error } = await supabase.from("flashcards").insert({
        set_id: setId,
        term: formData.term.trim(),
        definition: formData.definition.trim(),
        image_url: formData.imageUrl.trim() || null,
        position: maxPosition + 1,
      });

      if (error) throw error;

      toast.success("Flashcard created successfully!");
      setFormData({ term: "", definition: "", imageUrl: "" });
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Flashcard</DialogTitle>
          <DialogDescription>
            Add a term, definition, and optionally an image to your flashcard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
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
              {isLoading ? "Creating..." : "Create Flashcard"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
