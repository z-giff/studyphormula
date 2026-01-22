import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface FlashcardFile {
  id: string;
  name: string;
}

interface MoveSetToFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setTitle: string;
  files: FlashcardFile[];
  selectedFileId: string | null;
  onSelectedFileIdChange: (fileId: string | null) => void;
  isSaving: boolean;
  onSave: () => void;
}

export function MoveSetToFileDialog({
  open,
  onOpenChange,
  setTitle,
  files,
  selectedFileId,
  onSelectedFileIdChange,
  isSaving,
  onSave,
}: MoveSetToFileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Move set to file</DialogTitle>
          <DialogDescription>
            Choose where to store <span className="font-medium text-foreground">{setTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>File</Label>
          <Select value={selectedFileId ?? "none"} onValueChange={(v) => onSelectedFileIdChange(v === "none" ? null : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a file" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="none">No file</SelectItem>
              {files.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
