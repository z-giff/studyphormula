import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const PRESET_COLORS = [
  "#e2a9f1", // Lavender Pink
  "#38b6ff", // Sky Blue
  "#6db2a0", // Sage Teal
  "#ffde59", // Sunny Yellow
  "#ea3d57", // Coral Red
];

interface CreateSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateSetDialog = ({ open, onOpenChange, onSuccess }: CreateSetDialogProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    color: PRESET_COLORS[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("You must be logged in to create a set");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a title for your flashcard set");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("flashcard_sets").insert({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
      });

      if (error) throw error;

      toast.success("Flashcard set created successfully!");
      setFormData({ title: "", description: "", color: PRESET_COLORS[0] });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create flashcard set");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Flashcard Set</DialogTitle>
          <DialogDescription>
            Give your flashcard set a name, description, and choose a color theme.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Human Anatomy - Chapter 1"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of what this set covers..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Color Theme</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-9 h-9 rounded-lg transition-all ${
                    formData.color === color
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                  disabled={isLoading}
                />
              ))}
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
              {isLoading ? "Creating..." : "Create Set"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
