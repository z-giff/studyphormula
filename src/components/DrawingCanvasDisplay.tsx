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

    const containerWidth = container.clientWidth;
    const origW = drawingData.width || 800;
    const origH = drawingData.height || 400;

    if (!drawingData.strokes || drawingData.strokes.length === 0) {
      const aspectRatio = origH / origW;
      const h = Math.min(containerWidth * aspectRatio, 300);
      canvas.width = containerWidth;
      canvas.height = h;
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#9ca3af";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No drawing", canvas.width / 2, canvas.height / 2);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const stroke of drawingData.strokes) {
      const halfW = stroke.width / 2;
      for (const p of stroke.points) {
        if (p.x - halfW < minX) minX = p.x - halfW;
        if (p.y - halfW < minY) minY = p.y - halfW;
        if (p.x + halfW > maxX) maxX = p.x + halfW;
        if (p.y + halfW > maxY) maxY = p.y + halfW;
      }
    }

    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const padX = contentW * 0.12;
    const padY = contentH * 0.12;
    const cropX = Math.max(0, minX - padX);
    const cropY = Math.max(0, minY - padY);
    const cropW = Math.min(origW - cropX, contentW + padX * 2);
    const cropH = Math.min(origH - cropY, contentH + padY * 2);

    const aspectRatio = cropH / cropW;
    const canvasHeight = Math.min(containerWidth * aspectRatio, 500);
    canvas.width = containerWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / cropW;
    const scaleY = canvas.height / cropH;

    drawingData.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * Math.min(scaleX, scaleY);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo((stroke.points[0].x - cropX) * scaleX, (stroke.points[0].y - cropY) * scaleY);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo((stroke.points[i].x - cropX) * scaleX, (stroke.points[i].y - cropY) * scaleY);
      }
      ctx.stroke();
    });
  }, [drawingData]);

  useEffect(() => {
    redrawCanvas();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(redrawCanvas, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [redrawCanvas]);

  return (
    <div ref={containerRef} className={`w-full rounded-lg overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ display: "block" }}
      />
    </div>
  );
};
