import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { Button } from "@/components/ui/button";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPreviewProps {
  blob: Blob | null;
  isUpdating: boolean;
}

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5];

export function PdfPreview({ blob, isUpdating }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [isRendering, setIsRendering] = useState(false);

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
    if (!document) return;
    let active = true;
    let renderTask: RenderTask | null = null;

    const render = async () => {
      setIsRendering(true);
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: ZOOM_LEVELS[zoomIndex] });
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
      if (active) setIsRendering(false);
    };
    void render().catch((error) => {
      if (error?.name !== "RenderingCancelledException") console.error(error);
      if (active) setIsRendering(false);
    });

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [document, pageNumber, zoomIndex]);

  const pageCount = document?.numPages ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border bg-muted/40" aria-label="PDF preview">
      <div className="flex h-11 shrink-0 items-center justify-between border-b bg-card px-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={pageNumber <= 1 || !document} onClick={() => setPageNumber((current) => Math.max(1, current - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-20 text-center text-xs tabular-nums text-muted-foreground">{pageCount ? `${pageNumber} / ${pageCount}` : "— / —"}</span>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Next page" disabled={!document || pageNumber >= pageCount} onClick={() => setPageNumber((current) => Math.min(pageCount, current + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Zoom out" disabled={zoomIndex === 0} onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-11 text-center text-xs tabular-nums text-muted-foreground">{Math.round(ZOOM_LEVELS[zoomIndex] * 100)}%</span>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Zoom in" disabled={zoomIndex === ZOOM_LEVELS.length - 1} onClick={() => setZoomIndex((current) => Math.min(ZOOM_LEVELS.length - 1, current + 1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative min-h-[360px] flex-1 overflow-auto p-4 sm:min-h-0">
        <div className="flex min-h-full min-w-full items-start justify-center">
          <canvas ref={canvasRef} className="bg-card shadow-sm" />
        </div>
        {(!document || isRendering || isUpdating) && (
          <div className="absolute inset-x-0 top-3 flex justify-center" aria-live="polite">
            <span className="rounded-md border bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
              {!document ? "Preparing preview…" : isUpdating ? "Updating preview…" : "Rendering page…"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}