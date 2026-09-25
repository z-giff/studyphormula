import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateFlashcardPdf, type FlashcardPdfOptions, type PdfFlashcard } from "@/lib/flashcardPdf";

interface ExportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  setColor: string;
  flashcards: PdfFlashcard[];
}

export function ExportPdfDialog({ open, onOpenChange, title, setColor, flashcards }: ExportPdfDialogProps) {
  const [options, setOptions] = useState<FlashcardPdfOptions>({
    orientation: "portrait",
    cardsPerPage: 4,
    sides: "same-page",
    removeStandardImages: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportPdf = async () => {
    setIsExporting(true);
    setProgress(0);
    try {
      await generateFlashcardPdf(title, flashcards, setColor, options, (completed, total) => {
        setProgress(Math.round((completed / total) * 100));
      });
      toast.success("PDF downloaded");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Could not create the PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isExporting && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Export PDF</DialogTitle>
          <DialogDescription>Prepare {flashcards.length} flashcards for printing on Letter paper.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Orientation</Label>
              <Select value={options.orientation} onValueChange={(value: FlashcardPdfOptions["orientation"]) => setOptions((current) => ({ ...current, orientation: value }))} disabled={isExporting}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Flashcards per page</Label>
              <Select value={String(options.cardsPerPage)} onValueChange={(value) => setOptions((current) => ({ ...current, cardsPerPage: Number(value) as FlashcardPdfOptions["cardsPerPage"] }))} disabled={isExporting}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 4, 6, 8].map((count) => <SelectItem key={count} value={String(count)}>{count}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Front and back placement</Label>
            <RadioGroup value={options.sides} onValueChange={(value: FlashcardPdfOptions["sides"]) => setOptions((current) => ({ ...current, sides: value }))} disabled={isExporting}>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                <RadioGroupItem value="same-page" className="mt-0.5" />
                <span><span className="block text-sm font-medium">Same page</span><span className="block text-xs text-muted-foreground">Each front is followed by its back in the grid.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                <RadioGroupItem value="duplex" className="mt-0.5" />
                <span><span className="block text-sm font-medium">Separate duplex pages</span><span className="block text-xs text-muted-foreground">Backs are mirrored to align when printed double-sided on the long edge.</span></span>
              </label>
            </RadioGroup>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <Checkbox checked={options.removeStandardImages} onCheckedChange={(checked) => setOptions((current) => ({ ...current, removeStandardImages: checked === true }))} disabled={isExporting} className="mt-0.5" />
            <span><span className="block text-sm font-medium">Remove images from standard flashcards</span><span className="block text-xs text-muted-foreground">Drawings, flowcharts, and interactive diagrams are always retained.</span></span>
          </label>

          {isExporting && (
            <div className="space-y-2" aria-live="polite">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Creating PDF</span><span>{progress}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>Cancel</Button>
          <Button type="button" onClick={exportPdf} disabled={isExporting || flashcards.length === 0}>
            <Download className="mr-2 h-4 w-4" />{isExporting ? "Creating…" : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}