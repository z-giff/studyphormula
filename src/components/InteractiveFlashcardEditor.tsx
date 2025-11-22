import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  answer: string;
}

interface InteractiveFlashcardEditorProps {
  imageUrl: string;
  textBoxes: TextBox[];
  onChange: (textBoxes: TextBox[]) => void;
}

export const InteractiveFlashcardEditor = ({ imageUrl, textBoxes, onChange }: InteractiveFlashcardEditorProps) => {
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAddingBox, setIsAddingBox] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; handle: string } | null>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingBox || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newBox: TextBox = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      width: 15,
      height: 5,
      answer: "",
    };

    onChange([...textBoxes, newBox]);
    setSelectedBox(newBox.id);
    setIsAddingBox(false);
  };

  const handleAnswerChange = (id: string, answer: string) => {
    onChange(textBoxes.map(box => box.id === id ? { ...box, answer } : box));
  };

  const handleDeleteBox = (id: string) => {
    onChange(textBoxes.filter(box => box.id !== id));
    setSelectedBox(null);
  };

  const handleResizeStart = useCallback((e: React.MouseEvent, id: string, handle: string) => {
    e.stopPropagation();
    const box = textBoxes.find(b => b.id === id);
    if (!box || !containerRef.current) return;

    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: box.width,
      height: box.height,
      handle,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((moveEvent.clientX - resizeStartRef.current.x) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - resizeStartRef.current.y) / rect.height) * 100;

      const updatedBox = textBoxes.find(b => b.id === id);
      if (!updatedBox) return;

      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      let newX = updatedBox.x;
      let newY = updatedBox.y;

      switch (resizeStartRef.current.handle) {
        case "se":
          newWidth = Math.max(5, resizeStartRef.current.width + deltaX);
          newHeight = Math.max(3, resizeStartRef.current.height + deltaY);
          break;
        case "sw":
          newWidth = Math.max(5, resizeStartRef.current.width - deltaX);
          newHeight = Math.max(3, resizeStartRef.current.height + deltaY);
          newX = updatedBox.x + (updatedBox.width - newWidth);
          break;
        case "ne":
          newWidth = Math.max(5, resizeStartRef.current.width + deltaX);
          newHeight = Math.max(3, resizeStartRef.current.height - deltaY);
          newY = updatedBox.y + (updatedBox.height - newHeight);
          break;
        case "nw":
          newWidth = Math.max(5, resizeStartRef.current.width - deltaX);
          newHeight = Math.max(3, resizeStartRef.current.height - deltaY);
          newX = updatedBox.x + (updatedBox.width - newWidth);
          newY = updatedBox.y + (updatedBox.height - newHeight);
          break;
      }

      onChange(textBoxes.map(box => 
        box.id === id 
          ? { ...box, width: newWidth, height: newHeight, x: newX, y: newY }
          : box
      ));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [textBoxes, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={isAddingBox ? "default" : "outline"}
          size="sm"
          onClick={() => setIsAddingBox(!isAddingBox)}
        >
          {isAddingBox ? "Click on image to add box" : "Add Text Box"}
        </Button>
      </div>

      <div
        ref={containerRef}
        className="relative border-2 border-dashed border-border rounded-lg overflow-hidden"
        onClick={handleImageClick}
        style={{ minHeight: "400px", cursor: isAddingBox ? "crosshair" : "default" }}
      >
        <img src={imageUrl} alt="Flashcard" className="w-full h-auto" />
        
        {textBoxes.map((box) => (
          <div
            key={box.id}
            className="absolute border-2 cursor-pointer group"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
              borderColor: selectedBox === box.id ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.5)",
              backgroundColor: selectedBox === box.id ? "hsl(var(--primary) / 0.3)" : "hsl(var(--primary) / 0.15)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBox(box.id);
            }}
          >
            {box.answer && (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium" style={{ color: "hsl(var(--primary-foreground))" }}>
                {box.answer}
              </div>
            )}
            {selectedBox === box.id && !isResizing && (
              <>
                <div 
                  className="absolute w-3 h-3 bg-primary border border-background rounded-full -top-1.5 -left-1.5 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleResizeStart(e, box.id, "nw")}
                />
                <div 
                  className="absolute w-3 h-3 bg-primary border border-background rounded-full -top-1.5 -right-1.5 cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleResizeStart(e, box.id, "ne")}
                />
                <div 
                  className="absolute w-3 h-3 bg-primary border border-background rounded-full -bottom-1.5 -left-1.5 cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleResizeStart(e, box.id, "sw")}
                />
                <div 
                  className="absolute w-3 h-3 bg-primary border border-background rounded-full -bottom-1.5 -right-1.5 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleResizeStart(e, box.id, "se")}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {selectedBox && (
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <Label>Edit Selected Text Box</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteBox(selectedBox)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <Label htmlFor="answer">Correct Answer</Label>
            <Input
              id="answer"
              value={textBoxes.find(b => b.id === selectedBox)?.answer || ""}
              onChange={(e) => handleAnswerChange(selectedBox, e.target.value)}
              placeholder="Enter the correct answer"
            />
          </div>
        </div>
      )}

      {textBoxes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Click "Add Text Box" then click on the image to place fillable boxes
        </p>
      )}
    </div>
  );
};
