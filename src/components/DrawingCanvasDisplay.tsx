import { useRef, useEffect, useCallback } from "react";

interface DrawingData {
  strokes: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  }>;
  width: number;
  height: number;
}

interface DrawingCanvasDisplayProps {
  drawingData: DrawingData;
  className?: string;
}

export const DrawingCanvasDisplay = ({ drawingData, className = "" }: DrawingCanvasDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const maxW = Math.max(container.clientWidth, 1);
    const maxH = Math.max(container.clientHeight || maxW * 0.6, 1);

    const drawPlaceholder = () => {
      canvas.width = maxW;
      canvas.height = maxH;
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#9ca3af";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No drawing", canvas.width / 2, canvas.height / 2);
    };

    if (!drawingData.strokes || drawingData.strokes.length === 0) {
      drawPlaceholder();
      return;
    }

    // Compute bounding box of the actual drawing
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxStrokeWidth = 0;
    for (const stroke of drawingData.strokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      if (stroke.width > maxStrokeWidth) maxStrokeWidth = stroke.width;
      for (const p of stroke.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }

    if (!isFinite(minX) || !isFinite(minY)) {
      drawPlaceholder();
      return;
    }

    // Pad for stroke width so edges aren't clipped
    const strokePad = Math.max(maxStrokeWidth, 2);
    minX -= strokePad;
    minY -= strokePad;
    maxX += strokePad;
    maxY += strokePad;

    const contentWidth = Math.max(maxX - minX, 1);
    const contentHeight = Math.max(maxY - minY, 1);

    // Canvas fills the available container area so the white drawing
    // surface stays visually balanced inside the card.
    canvas.width = maxW;
    canvas.height = maxH;

    // Inner padding around the drawing inside the white canvas
    const margin = 32;

    // Fit content into available canvas area, preserving aspect ratio.
    // Allow up-scaling small drawings so they feel proportional to the
    // canvas instead of sitting tiny in a corner.
    const scale = Math.min(
      (canvas.width - margin * 2) / contentWidth,
      (canvas.height - margin * 2) / contentHeight
    );
    const effectiveScale = scale > 0 ? scale : 1;

    // Background
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center bounding box within canvas
    const offsetX = (canvas.width - contentWidth * effectiveScale) / 2 - minX * effectiveScale;
    const offsetY = (canvas.height - contentHeight * effectiveScale) / 2 - minY * effectiveScale;

    // Draw all strokes
    drawingData.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(stroke.width * effectiveScale, 0.5);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(stroke.points[0].x * effectiveScale + offsetX, stroke.points[0].y * effectiveScale + offsetY);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * effectiveScale + offsetX, stroke.points[i].y * effectiveScale + offsetY);
      }
      ctx.stroke();
    });
  }, [drawingData]);

  useEffect(() => {
    redrawCanvas();

    // Redraw on resize
    const handleResize = () => {
      redrawCanvas();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [redrawCanvas]);

  return (
    <div ref={containerRef} className={`w-full h-full flex items-center justify-center rounded-lg overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ display: "block" }}
      />
    </div>
  );
};
