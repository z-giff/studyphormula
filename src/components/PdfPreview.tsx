import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus } from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPreviewProps {
  blob: Blob | null;
  isUpdating: boolean;
  onPageCountChange?: (pageCount: number) => void;
  className?: string;
}

// "fit" shows the whole page in the space available; the rest are CSS pixels per PDF point
const ZOOM_LEVELS = ["fit", 1, 1.25, 1.5] as const;

export function PdfPreview({ blob, isUpdating, onPageCountChange, className }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [hasRendered, setHasRendered] = useState(false);

  // The space a fitted page can fill
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => {
      setArea({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!blob) {
      setDocument(null);
      return;
    }

    let active = true;
    let loadedDocument: PDFDocumentProxy | null = null;
    const load = async () => {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const nextDocument = await getDocument({ data: bytes }).promise;
      if (!active) {
        await nextDocument.destroy();
        return;
      }
      loadedDocument = nextDocument;
      setPageNumber(1);
      setDocument(nextDocument);
    };
    void load();

    return () => {
      active = false;
      setDocument(null);
      if (loadedDocument) void loadedDocument.destroy();
    };
  }, [blob]);

  useEffect(() => {
    onPageCountChange?.(document?.numPages ?? 0);
  }, [document, onPageCountChange]);

  const zoom = ZOOM_LEVELS[zoomIndex];
  // Resizing only matters while the page is fitted to the space
  const fitWidth = zoom === "fit" ? area.width : 0;
  const fitHeight = zoom === "fit" ? area.height : 0;

  useEffect(() => {
    if (!document || (zoom === "fit" && (!fitWidth || !fitHeight))) return;
    let active = true;
    let renderTask: RenderTask | null = null;

    const render = async () => {
      const page = await document.getPage(pageNumber);
      const natural = page.getViewport({ scale: 1 });
      const scale = zoom === "fit" ? Math.min(fitWidth / natural.width, fitHeight / natural.height) : zoom;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context || !active) return;
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      renderTask = page.render({
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      });
      await renderTask.promise;
      if (active) setHasRendered(true);
    };
    void render().catch((error) => {
      if (error?.name !== "RenderingCancelledException") console.error(error);
    });

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [document, pageNumber, zoom, fitWidth, fitHeight]);

  const pageCount = document?.numPages ?? 0;

  return (
    <div role="region" aria-label="PDF preview" className={cn("relative min-h-0 overflow-hidden rounded-lg border bg-black/35", className)}>
      {/* Margin auto centres the page, and still lets a zoomed page scroll from its edge */}
      <div ref={viewportRef} className="absolute inset-0 flex overflow-auto px-4 pb-16 pt-4 sm:px-6 sm:pb-[72px] sm:pt-6">
        <canvas
          ref={canvasRef}
          className={cn(
            "m-auto block shrink-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.5),0_22px_48px_-18px_rgba(0,0,0,0.9)]",
            !hasRendered && "invisible",
          )}
        />
      </div>
      {(!hasRendered || isUpdating) && (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center" aria-live="polite">
          <span className="flex items-center gap-2 rounded-full border border-line-strong bg-secondary px-3 py-1.5 text-xs font-medium shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            {hasRendered ? "Updating preview…" : "Preparing preview…"}
          </span>
        </div>
      )}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-line-strong bg-secondary p-1 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] sm:bottom-4">
        <Button type="button" variant="ghost" size="icon" className="h-[30px] w-[30px] rounded-full" aria-label="Previous page" disabled={pageNumber <= 1 || !document} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>
          <ChevronLeft />
        </Button>
        <span className="min-w-[60px] text-center text-xs font-semibold tabular-nums">{pageCount ? `${pageNumber} of ${pageCount}` : "–"}</span>
        <Button type="button" variant="ghost" size="icon" className="h-[30px] w-[30px] rounded-full" aria-label="Next page" disabled={!document || pageNumber >= pageCount} onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}>
          <ChevronRight />
        </Button>
        <span aria-hidden className="mx-1 h-4 w-px bg-line-strong" />
        <Button type="button" variant="ghost" size="icon" className="h-[30px] w-[30px] rounded-full" aria-label="Zoom out" disabled={zoomIndex === 0} onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}>
          <Minus />
        </Button>
        <span className="min-w-[42px] text-center text-xs font-semibold tabular-nums text-muted-foreground">{zoom === "fit" ? "Fit" : `${Math.round(zoom * 100)}%`}</span>
        <Button type="button" variant="ghost" size="icon" className="h-[30px] w-[30px] rounded-full" aria-label="Zoom in" disabled={zoomIndex === ZOOM_LEVELS.length - 1} onClick={() => setZoomIndex((current) => Math.min(ZOOM_LEVELS.length - 1, current + 1))}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}
