import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eraser, Pen, Undo, Redo, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawingData {
  strokes: Array<{
    points: Array<{ x: number; y: number }>;
    color: string;
    width: number;
  }>;
  width: number;
  height: number;
}

interface DrawingCanvasEditorProps {
  drawingData: DrawingData;
  onChange: (data: DrawingData) => void;
}

const COLORS = [
  "#000000", // Black
  "#ffffff", // White
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#6b7280", // Gray
];

export const DrawingCanvasEditor = ({ drawingData, onChange }: DrawingCanvasEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [history, setHistory] = useState<DrawingData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });

  // Initialize canvas size
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = 400;
      setCanvasSize({ width, height });
      
      if (drawingData.width === 0 && drawingData.height === 0) {
        onChange({ ...drawingData, width, height });
      }
    }
  }, []);

  // Redraw canvas when data changes
  useEffect(() => {
    redrawCanvas();
  }, [drawingData.strokes, canvasSize]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    drawingData.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const scaleX = canvas.width / (drawingData.width || canvas.width);
      const scaleY = canvas.height / (drawingData.height || canvas.height);

      ctx.moveTo(stroke.points[0].x * scaleX, stroke.points[0].y * scaleY);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * scaleX, stroke.points[i].y * scaleY);
      }
      ctx.stroke();
    });
  }, [drawingData]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setCurrentStroke([point]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const point = getCanvasPoint(e);
    const newStroke = [...currentStroke, point];
    setCurrentStroke(newStroke);

    // Draw current stroke
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = tool === "eraser" ? "#f5f5f5" : strokeColor;
    ctx.lineWidth = tool === "eraser" ? strokeWidth * 3 : strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (newStroke.length >= 2) {
      const lastTwo = newStroke.slice(-2);
      ctx.moveTo(lastTwo[0].x, lastTwo[0].y);
      ctx.lineTo(lastTwo[1].x, lastTwo[1].y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    const newStroke = {
      points: currentStroke,
      color: tool === "eraser" ? "#f5f5f5" : strokeColor,
      width: tool === "eraser" ? strokeWidth * 3 : strokeWidth,
    };

    const newStrokes = [...drawingData.strokes, newStroke];
    const newData = { ...drawingData, strokes: newStrokes, width: canvasSize.width, height: canvasSize.height };
    
    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(drawingData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    onChange(newData);
    setIsDrawing(false);
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    if (historyIndex >= 0) {
      onChange(history[historyIndex]);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      if (nextIndex < history.length - 1) {
        onChange(history[nextIndex + 1]);
      }
    }
  };

  const handleClear = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(drawingData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    onChange({ strokes: [], width: canvasSize.width, height: canvasSize.height });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg">
        {/* Tools */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={tool === "pen" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("pen")}
          >
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={tool === "eraser" ? "default" : "outline"}
            size="sm"
            onClick={() => setTool("eraser")}
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setStrokeColor(color);
                setTool("pen");
              }}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-all",
                strokeColor === color && tool === "pen"
                  ? "ring-2 ring-offset-2 ring-primary scale-110"
                  : "hover:scale-105",
                color === "#ffffff" ? "border-gray-300" : "border-transparent"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Stroke Width */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="text-xs text-muted-foreground">Size:</span>
          <Slider
            value={[strokeWidth]}
            onValueChange={([value]) => setStrokeWidth(value)}
            min={1}
            max={20}
            step={1}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground w-4">{strokeWidth}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={historyIndex < 0}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className="border rounded-lg overflow-hidden bg-[#f5f5f5]"
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="cursor-crosshair touch-none w-full"
          style={{ height: `${canvasSize.height}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Draw your diagram, notes, or illustration. Use the tools above to customize your drawing.
      </p>
    </div>
  );
};
