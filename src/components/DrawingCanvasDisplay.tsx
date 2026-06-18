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

    // Calculate scale factors
    const scaleX = canvas.width / (drawingData.width || canvas.width);
    const scaleY = canvas.height / (drawingData.height || canvas.height);

    // Draw all strokes
    drawingData.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * Math.min(scaleX, scaleY);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * scaleX, stroke.points[i].y * scaleY);
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
