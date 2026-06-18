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

    // Get container dimensions
    const containerWidth = container.clientWidth;
    const aspectRatio = (drawingData.height || 400) / (drawingData.width || 800);
    const containerHeight = Math.min(containerWidth * aspectRatio, container.clientHeight || 500);

    // Set canvas size
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Clear canvas with light background
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!drawingData.strokes || drawingData.strokes.length === 0) {
      // Show placeholder if no drawing
      ctx.fillStyle = "#9ca3af";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No drawing", canvas.width / 2, canvas.height / 2);
      return;
    }

    // Compute bounding box of the actual drawing so we can center it
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

    if (!isFinite(minX) || !isFinite(minY)) return;

    // Pad for stroke width so edges aren't clipped
    const pad = Math.max(maxStrokeWidth, 2);
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    const contentWidth = Math.max(maxX - minX, 1);
    const contentHeight = Math.max(maxY - minY, 1);

    // Leave a small margin inside the canvas
    const margin = 16;
    const availW = Math.max(canvas.width - margin * 2, 1);
    const availH = Math.max(canvas.height - margin * 2, 1);

    // Uniform scale to preserve aspect ratio
    const scale = Math.min(availW / contentWidth, availH / contentHeight);

    // Offset to center the drawing's bounding box within the canvas
    const offsetX = (canvas.width - contentWidth * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - contentHeight * scale) / 2 - minY * scale;

    // Draw all strokes
    drawingData.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(stroke.width * scale, 0.5);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(stroke.points[0].x * scale + offsetX, stroke.points[0].y * scale + offsetY);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * scale + offsetX, stroke.points[i].y * scale + offsetY);
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
