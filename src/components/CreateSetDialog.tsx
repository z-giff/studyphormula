import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Plus } from "lucide-react";
const PRESET_COLORS = [
  "#000000", // Black
  "#a6a6a6", // Grey
  "#ffffff", // White
  "#e2a9f1", // Lavender
  "#38b6ff", // Sky Blue
  "#ea3d57", // Coral Red
  "#6db2a0", // Sage Green
  "#ffde59", // Sunshine Yellow
];

interface CreateSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateSetDialog = ({ open, onOpenChange, onSuccess }: CreateSetDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      const { data, error } = await supabase.from("flashcard_sets").insert({
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
      }).select().single();

      if (error) throw error;

      toast.success("Flashcard set created successfully!");
      setFormData({ title: "", description: "", color: PRESET_COLORS[0] });
      onOpenChange(false);
      onSuccess();
      // Navigate to the new set with bulk editor open
      navigate(`/set/${data.id}?bulkEdit=true`);
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
                  className="w-10 h-10 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: formData.color === color ? "#000" : color === "#ffffff" ? "#d1d5db" : "transparent",
                    boxShadow: formData.color === color ? `0 0 0 2px ${color}` : "none",
                  }}
                  onClick={() => setFormData({ ...formData, color })}
                  disabled={isLoading}
                />
              ))}
              <label
                className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/50 transition-all hover:scale-110 hover:border-muted-foreground cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: formData.color && !PRESET_COLORS.includes(formData.color) ? formData.color : "transparent",
                  borderStyle: formData.color && !PRESET_COLORS.includes(formData.color) ? "solid" : "dashed",
                  borderColor: formData.color && !PRESET_COLORS.includes(formData.color) ? "#000" : undefined,
                }}
              >
                <Plus className="h-5 w-5 text-muted-foreground" style={{ display: formData.color && !PRESET_COLORS.includes(formData.color) ? "none" : "block" }} />
                <input
                  type="color"
                  className="sr-only"
                  value={formData.color || "#000000"}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  disabled={isLoading}
                />
              </label>
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
