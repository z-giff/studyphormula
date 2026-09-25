import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Download, FileText, LayoutGrid, Loader2, RectangleHorizontal, RectangleVertical, RefreshCw, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PdfPreview } from "@/components/PdfPreview";
import { cn } from "@/lib/utils";
import {
  downloadFlashcardPdf,
  flashcardPageLayout,
  generateFlashcardPdf,
  type FlashcardPdfOptions,
  type PdfFlashcard,
  type PdfSides,
} from "@/lib/flashcardPdf";

interface ExportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  setColor: string;
  flashcards: PdfFlashcard[];
}

type CardsPerPage = FlashcardPdfOptions["cardsPerPage"];

const CARDS_PER_PAGE: CardsPerPage[] = [1, 2, 4, 6, 8];

const SIDES: { value: PdfSides; title: string; description: string }[] = [
  { value: "same-page", title: "Same page", description: "Each back sits beside its front." },
  { value: "duplex", title: "Double-sided", description: "Backs line up when printed on both sides." },
];

// A bordered choice that turns ember when picked, like the plan cards in Premium
const tileClass =
  "group rounded-xl border border-line-strong bg-secondary transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-accent";

function Section({ labelId, label, children }: { labelId: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 id={labelId} className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h3>
      {children}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  labelledBy: string;
  value: T;
  options: { value: T; label: string; icon: ReactNode }[];
  onChange: (value: T) => void;
  disabled: boolean;
}

function Segmented<T extends string>({ labelledBy, value, options, onChange, disabled }: SegmentedProps<T>) {
  return (
    <RadioGroupPrimitive.Root
      aria-labelledby={labelledBy}
      value={value}
      onValueChange={(next) => onChange(next as T)}
      disabled={disabled}
      className="grid grid-cols-2 gap-[3px] rounded-xl border bg-secondary p-[3px]"
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className="group flex h-[34px] items-center justify-center gap-2 rounded-[9px] border border-transparent px-2.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-line-strong data-[state=checked]:bg-accent data-[state=checked]:text-foreground data-[state=checked]:shadow-sm"
        >
          <span aria-hidden className="transition-colors group-data-[state=checked]:text-primary [&_svg]:h-[15px] [&_svg]:w-[15px]">
            {option.icon}
          </span>
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

interface CardsPerPagePickerProps {
  labelledBy: string;
  options: FlashcardPdfOptions;
  onChange: (cardsPerPage: CardsPerPage) => void;
  disabled: boolean;
}

// Each choice is a small page drawn with the same layout the PDF uses
function CardsPerPagePicker({ labelledBy, options, onChange, disabled }: CardsPerPagePickerProps) {
  const portrait = options.orientation === "portrait";
  return (
    <RadioGroupPrimitive.Root
      aria-labelledby={labelledBy}
      value={String(options.cardsPerPage)}
      onValueChange={(next) => onChange(Number(next) as CardsPerPage)}
      disabled={disabled}
      className="grid grid-cols-5 gap-2"
    >
      {CARDS_PER_PAGE.map((count) => (
        <RadioGroupPrimitive.Item
          key={count}
          value={String(count)}
          aria-label={count === 1 ? "1 card per page" : `${count} cards per page`}
          className={cn(tileClass, "flex h-[70px] flex-col items-center justify-center gap-1.5")}
        >
          <span
            aria-hidden
            className={cn(
              "relative block rounded-[3px] border border-muted-foreground/45 bg-foreground/[0.04] transition-colors group-data-[state=checked]:border-primary/75 group-data-[state=checked]:bg-primary/[0.08]",
              portrait ? "h-[38px] w-[30px]" : "h-[30px] w-[38px]",
            )}
          >
            {flashcardPageLayout(options.orientation, count, options.sides).map((panel, index) => (
              <span
                key={index}
                className={cn(
                  "absolute rounded-[1px] transition-colors",
                  panel.side === "back"
                    ? "bg-muted-foreground/30 group-data-[state=checked]:bg-primary/40"
                    : "bg-muted-foreground/75 group-data-[state=checked]:bg-primary",
                )}
                style={{ left: `${panel.x * 100}%`, top: `${panel.y * 100}%`, width: `${panel.width * 100}%`, height: `${panel.height * 100}%` }}
              />
            ))}
          </span>
          <span className="text-[13px] font-semibold tabular-nums text-muted-foreground group-data-[state=checked]:text-foreground">{count}</span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

function SidesDiagram({ sides }: { sides: PdfSides }) {
  return (
    <svg viewBox="0 0 44 40" fill="none" aria-hidden className="h-9 w-10 shrink-0 text-muted-foreground transition-colors group-data-[state=checked]:text-primary">
      {sides === "same-page" ? (
        <>
          <rect x="10.5" y="2.5" width="23" height="35" rx="2.5" className="fill-background" stroke="currentColor" strokeOpacity={0.6} />
          {[7, 14, 21, 28].map((y) => (
            <g key={y}>
              <rect x="14" y={y} width="7.5" height="5" rx="1" fill="currentColor" />
              <rect x="22.5" y={y} width="7.5" height="5" rx="1" fill="currentColor" fillOpacity={0.35} />
            </g>
          ))}
        </>
      ) : (
        <>
          <rect x="16.5" y="5.5" width="21" height="31" rx="2.5" className="fill-background" stroke="currentColor" strokeOpacity={0.35} />
          {[10, 18, 26].map((y) => (
            <rect key={y} x="29.5" y={y} width="5" height="5" rx="1" fill="currentColor" fillOpacity={0.35} />
          ))}
          <rect x="6.5" y="2.5" width="21" height="31" rx="2.5" className="fill-background" stroke="currentColor" strokeOpacity={0.6} />
          {[7, 15, 23].map((y) => (
            <rect key={y} x="10" y={y} width="14" height="5" rx="1" fill="currentColor" />
          ))}
        </>
      )}
    </svg>
  );
}

interface SidesPickerProps {
  labelledBy: string;
  value: PdfSides;
  onChange: (sides: PdfSides) => void;
  disabled: boolean;
}

function SidesPicker({ labelledBy, value, onChange, disabled }: SidesPickerProps) {
  return (
    <RadioGroupPrimitive.Root
      aria-labelledby={labelledBy}
      value={value}
      onValueChange={(next) => onChange(next as PdfSides)}
      disabled={disabled}
      className="grid gap-2"
    >
      {SIDES.map((option) => (
        <RadioGroupPrimitive.Item key={option.value} value={option.value} className={cn(tileClass, "flex w-full items-center gap-3 px-3 py-2 text-left")}>
          <SidesDiagram sides={option.value} />
          <span className="min-w-0 space-y-0.5">
            <span className="block text-[13.5px] font-semibold leading-[18px]">{option.title}</span>
            <span className="block text-xs text-muted-foreground">{option.description}</span>
          </span>
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

export function ExportPdfDialog({ open, onOpenChange, title, setColor, flashcards }: ExportPdfDialogProps) {
  const id = useId();
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
  const [previewPageCount, setPreviewPageCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [rail, setRail] = useState<HTMLDivElement | null>(null);
  const [railHasMore, setRailHasMore] = useState(false);
  const generationRef = useRef(0);
  const optionsKey = useMemo(() => JSON.stringify(options), [options]);
  const isPreviewUpdating = open && previewKey !== optionsKey && !previewError;
  const isTable = options.format === "table";

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
  }, [open, options, optionsKey, retryCount, title, flashcards, setColor]);

  // Fade the bottom of the settings while some are scrolled out of view
  useEffect(() => {
    if (!rail) return;
    const check = () => setRailHasMore(rail.scrollTop + rail.clientHeight < rail.scrollHeight - 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(rail);
    rail.addEventListener("scroll", check, { passive: true });
    return () => {
      observer.disconnect();
      rail.removeEventListener("scroll", check);
    };
  }, [rail, isTable]);

  const update = (patch: Partial<FlashcardPdfOptions>) => setOptions((current) => ({ ...current, ...patch }));

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

  const orientationLabel = options.orientation === "portrait" ? "Portrait" : "Landscape";
  const layoutLabel = isTable ? "Table" : options.sides === "duplex" ? "Double-sided, flip on long edge" : "Single-sided";

  let status: ReactNode;
  if (isExporting) {
    status = (
      <div className="flex items-center gap-3">
        <span>Creating PDF</span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted sm:w-40">
          <div className="h-full rounded-full transition-[width] [background-image:var(--gradient-primary)]" style={{ width: `${progress}%` }} />
        </div>
        <span className="tabular-nums">{progress}%</span>
      </div>
    );
  } else if (previewError) {
    status = (
      <div role="alert" className="flex items-center gap-3 text-destructive">
        <span>The preview could not be created.</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setRetryCount((current) => current + 1)}>
          <RefreshCw />Retry
        </Button>
      </div>
    );
  } else if (isPreviewUpdating || !previewPageCount) {
    status = (
      <span className="flex items-center gap-2.5">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        {previewBlob ? "Updating preview…" : "Preparing preview…"}
      </span>
    );
  } else {
    status = (
      <span className="flex min-w-0 items-center gap-2.5">
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate">
          <span className="font-semibold text-foreground">{previewPageCount} {previewPageCount === 1 ? "page" : "pages"}</span>
          {` · ${orientationLabel} · ${layoutLabel}`}
        </span>
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isExporting && onOpenChange(next)}>
      <DialogContent className="flex h-[94dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-[calc(100vw-3rem)] sm:max-w-[1100px] sm:rounded-2xl md:h-[min(800px,94dvh)]">
        <DialogHeader className="space-y-1.5 px-5 pb-4 pr-12 pt-7 text-left sm:px-8 sm:pr-16">
          <DialogTitle className="text-xl font-semibold tracking-tight">Export PDF</DialogTitle>
          <DialogDescription>
            {flashcards.length} {flashcards.length === 1 ? "card" : "cards"} from <span className="font-medium text-foreground">{title}</span>, on US Letter paper
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-5 px-5 pb-5 pt-1 sm:px-8 md:grid-cols-[280px_minmax(0,1fr)] md:grid-rows-1 md:gap-7 md:pb-6 lg:grid-cols-[324px_minmax(0,1fr)]">
          {/* Settings come first when reading, but the preview leads on small screens */}
          <div className="relative order-last flex min-h-0 flex-col md:order-none">
            <div ref={setRail} className="-mx-1 min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
              <Section labelId={`${id}-format`} label="Format">
                <Segmented
                  labelledBy={`${id}-format`}
                  value={options.format}
                  onChange={(format) => update({ format })}
                  disabled={isExporting}
                  options={[
                    { value: "flashcards", label: "Flashcards", icon: <LayoutGrid /> },
                    { value: "table", label: "Table", icon: <Table2 /> },
                  ]}
                />
              </Section>

              <Section labelId={`${id}-orientation`} label="Orientation">
                <Segmented
                  labelledBy={`${id}-orientation`}
                  value={options.orientation}
                  onChange={(orientation) => update({ orientation })}
                  disabled={isExporting}
                  options={[
                    { value: "portrait", label: "Portrait", icon: <RectangleVertical /> },
                    { value: "landscape", label: "Landscape", icon: <RectangleHorizontal /> },
                  ]}
                />
              </Section>

              {!isTable && (
                <>
                  <Section labelId={`${id}-per-page`} label="Cards per page">
                    <CardsPerPagePicker
                      labelledBy={`${id}-per-page`}
                      options={options}
                      onChange={(cardsPerPage) => update({ cardsPerPage })}
                      disabled={isExporting}
                    />
                  </Section>

                  <Section labelId={`${id}-sides`} label="Front and back">
                    <SidesPicker labelledBy={`${id}-sides`} value={options.sides} onChange={(sides) => update({ sides })} disabled={isExporting} />
                  </Section>
                </>
              )}

              <Section labelId={`${id}-pictures-section`} label="Pictures">
                <div className="flex items-center justify-between gap-4 rounded-xl border bg-secondary px-3.5 py-2.5">
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor={`${id}-pictures`} className="text-[13.5px] font-semibold leading-[18px]">
                      {isTable ? "Pictures in the table" : "Pictures on standard cards"}
                    </Label>
                    <p id={`${id}-pictures-hint`} className="text-xs text-muted-foreground">
                      {isTable ? "Shown with their term or definition." : "Drawings and diagrams always print."}
                    </p>
                  </div>
                  <Switch
                    id={`${id}-pictures`}
                    aria-describedby={`${id}-pictures-hint`}
                    checked={isTable ? options.includeTableImages : !options.removeStandardImages}
                    onCheckedChange={(checked) => update(isTable ? { includeTableImages: checked } : { removeStandardImages: !checked })}
                    disabled={isExporting}
                  />
                </div>
              </Section>
            </div>
            {railHasMore && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background" />}
          </div>

          <PdfPreview blob={previewBlob} isUpdating={isPreviewUpdating} onPageCountChange={setPreviewPageCount} className="h-72 md:h-auto" />
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="min-w-0 text-[13px] text-muted-foreground" aria-live="polite">
            {status}
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              className="flex-1 rounded-xl font-bold sm:flex-none"
              onClick={exportPdf}
              disabled={isExporting || isPreviewUpdating || previewError || flashcards.length === 0}
            >
              {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
              {isExporting ? "Creating…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
