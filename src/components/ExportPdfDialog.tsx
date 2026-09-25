import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, LayoutGrid, RefreshCw, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PdfPreview } from "@/components/PdfPreview";
import { downloadFlashcardPdf, generateFlashcardPdf, type FlashcardPdfOptions, type PdfFlashcard } from "@/lib/flashcardPdf";

interface ExportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  setColor: string;
  flashcards: PdfFlashcard[];
}

export function ExportPdfDialog({ open, onOpenChange, title, setColor, flashcards }: ExportPdfDialogProps) {
  const [options, setOptions] = useState<FlashcardPdfOptions>({
    format: "flashcards",
    orientation: "portrait",
    cardsPerPage: 4,
    sides: "same-page",
    removeStandardImages: false,
    includeTableImages: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewKey, setPreviewKey] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const generationRef = useRef(0);
  const optionsKey = useMemo(() => JSON.stringify(options), [options]);
  const isPreviewUpdating = open && previewKey !== optionsKey && !previewError;

  useEffect(() => {
    if (!open || flashcards.length === 0) return;
    const generation = ++generationRef.current;
    setPreviewError(false);
    setProgress(0);
    const timer = window.setTimeout(() => {
      void generateFlashcardPdf(title, flashcards, setColor, options, (completed, total) => {
        if (generation === generationRef.current) setProgress(Math.round((completed / total) * 100));
      }).then((blob) => {
        if (generation !== generationRef.current) return;
        setPreviewBlob(blob);
        setPreviewKey(optionsKey);
      }).catch((error) => {
        if (generation !== generationRef.current) return;
        console.error(error);
        setPreviewError(true);
      });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      generationRef.current += 1;
    };
  }, [open, optionsKey, retryCount, title, flashcards, setColor]);

  const exportPdf = async () => {
    setIsExporting(true);
    setProgress(0);
    try {
      const blob = previewBlob && previewKey === optionsKey
        ? previewBlob
        : await generateFlashcardPdf(title, flashcards, setColor, options, (completed, total) => setProgress(Math.round((completed / total) * 100)));
      downloadFlashcardPdf(blob, title);
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
      <DialogContent className="flex max-h-[94vh] flex-col sm:max-w-[1100px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Export PDF</DialogTitle>
          <DialogDescription>Prepare {flashcards.length} flashcards for printing on Letter paper.</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto py-1 lg:grid-cols-[340px_minmax(0,1fr)] lg:overflow-hidden">
          <div className="space-y-5">
          <div className="space-y-2">
            <Label>Format</Label>
            <RadioGroup value={options.format} onValueChange={(value: FlashcardPdfOptions["format"]) => setOptions((current) => ({ ...current, format: value }))} disabled={isExporting} className="grid grid-cols-2 gap-2">
              <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${options.format === "flashcards" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                <RadioGroupItem value="flashcards" className="sr-only" />
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Flashcards</span>
              </label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${options.format === "table" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                <RadioGroupItem value="table" className="sr-only" />
                <Table2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Table</span>
              </label>
            </RadioGroup>
          </div>

          <div className={`grid grid-cols-1 gap-4 ${options.format === "flashcards" ? "sm:grid-cols-2" : ""}`}>
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
            {options.format === "flashcards" && <div className="space-y-2">
              <Label>Flashcards per page</Label>
              <Select value={String(options.cardsPerPage)} onValueChange={(value) => setOptions((current) => ({ ...current, cardsPerPage: Number(value) as FlashcardPdfOptions["cardsPerPage"] }))} disabled={isExporting}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 4, 6, 8].map((count) => <SelectItem key={count} value={String(count)}>{count}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>}
          </div>

          {options.format === "flashcards" && <div className="space-y-3">
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
          </div>}

          {options.format === "flashcards" ? <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <Checkbox checked={options.removeStandardImages} onCheckedChange={(checked) => setOptions((current) => ({ ...current, removeStandardImages: checked === true }))} disabled={isExporting} className="mt-0.5" />
            <span><span className="block text-sm font-medium">Remove images from standard flashcards</span><span className="block text-xs text-muted-foreground">Drawings, flowcharts, and interactive diagrams are always retained.</span></span>
          </label> : <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <Checkbox checked={options.includeTableImages} onCheckedChange={(checked) => setOptions((current) => ({ ...current, includeTableImages: checked === true }))} disabled={isExporting} className="mt-0.5" />
            <span><span className="block text-sm font-medium">Include regular-card images</span><span className="block text-xs text-muted-foreground">Pictures appear with their matching term or definition. Visual study diagrams stay out of the table.</span></span>
          </label>}

          {isExporting && (
            <div className="space-y-2" aria-live="polite">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Creating PDF</span><span>{progress}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} /></div>
            </div>
          )}
          {previewError && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3" role="alert">
              <span className="text-sm text-destructive">The preview could not be created.</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setRetryCount((current) => current + 1)}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />Retry
              </Button>
            </div>
          )}
          </div>

          <PdfPreview blob={previewBlob} isUpdating={isPreviewUpdating} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>Cancel</Button>
          <Button type="button" onClick={exportPdf} disabled={isExporting || isPreviewUpdating || previewError || flashcards.length === 0}>
            <Download className="mr-2 h-4 w-4" />{isExporting ? "Creating…" : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}