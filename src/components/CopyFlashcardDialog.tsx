import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CopyFlashcardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcardId: string;
  currentSetId: string;
}

interface FlashcardSet {
  id: string;
  title: string;
}

export const CopyFlashcardDialog = ({ open, onOpenChange, flashcardId, currentSetId }: CopyFlashcardDialogProps) => {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUserSets();
    }
  }, [open]);

  const fetchUserSets = async () => {
    try {
      const { data, error } = await supabase
        .from("flashcard_sets")
        .select("id, title")
        .neq("id", currentSetId)
        .order("title");

      if (error) throw error;
      setSets(data || []);
    } catch (error: any) {
      toast.error("Failed to load sets");
    }
  };

  const handleCopy = async () => {
    if (!selectedSetId) {
      toast.error("Please select a destination set");
      return;
    }

    setIsLoading(true);
    try {
      // Fetch the original flashcard
      const { data: originalCard, error: fetchError } = await supabase
        .from("flashcards")
        .select("*")
        .eq("id", flashcardId)
        .single();

      if (fetchError) throw fetchError;

      // Get the max position in the destination set
      const { data: maxPosData } = await supabase
        .from("flashcards")
        .select("position")
        .eq("set_id", selectedSetId)
        .order("position", { ascending: false })
        .limit(1);

      const newPosition = maxPosData && maxPosData.length > 0 ? maxPosData[0].position + 1 : 0;

      // Create a copy in the new set
      const { error: insertError } = await supabase
        .from("flashcards")
        .insert({
          set_id: selectedSetId,
          term: originalCard.term,
          definition: originalCard.definition,
          image_url: originalCard.image_url,
          color: originalCard.color,
          flashcard_type: originalCard.flashcard_type,
          interactive_data: originalCard.interactive_data,
          position: newPosition,
          is_bookmarked: false,
        });

      if (insertError) throw insertError;

      toast.success("Flashcard copied successfully");
      onOpenChange(false);
      setSelectedSetId("");
    } catch (error: any) {
      toast.error(error.message || "Failed to copy flashcard");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Flashcard to Another Set</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="destination-set">Select Destination Set</Label>
            <Select value={selectedSetId} onValueChange={setSelectedSetId}>
              <SelectTrigger id="destination-set">
                <SelectValue placeholder="Choose a set..." />
              </SelectTrigger>
              <SelectContent>
                {sets.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No other sets available
                  </div>
                ) : (
                  sets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopy} disabled={isLoading || !selectedSetId}>
              {isLoading ? "Copying..." : "Copy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
