import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  answer: string;
  fontSize?: number;
  fontWeight?: string;
  fontColor?: string;
}

interface InteractiveFlashcardEditorProps {
  imageUrl: string;
  textBoxes: TextBox[];
  onChange: (textBoxes: TextBox[]) => void;
  onImageChange: (imageUrl: string) => void;
}

export const InteractiveFlashcardEditor = ({ imageUrl, textBoxes, onChange, onImageChange }: InteractiveFlashcardEditorProps) => {
  const { toast } = useToast();
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [editingBox, setEditingBox] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const [isAddingBox, setIsAddingBox] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; handle: string } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; boxX: number; boxY: number } | null>(null);

  // Auto-focus the inline input when editing starts
  useEffect(() => {
    if (editingBox && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [editingBox]);

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
      fontSize: 14,
      fontWeight: "normal",
      fontColor: "#000000",
    };

    onChange([...textBoxes, newBox]);
    setSelectedBox(newBox.id);
    setIsAddingBox(false);
  };

  const handleAnswerChange = (id: string, answer: string) => {
    onChange(textBoxes.map(box => box.id === id ? { ...box, answer } : box));
  };

  const handleFontChange = (id: string, property: string, value: any) => {
    onChange(textBoxes.map(box => box.id === id ? { ...box, [property]: value } : box));
  };

  const handleDragStart = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const box = textBoxes.find(b => b.id === id);
    if (!box || !containerRef.current) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      boxX: box.x,
      boxY: box.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = ((moveEvent.clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - dragStartRef.current.y) / rect.height) * 100;

      const newX = Math.max(0, Math.min(100 - (textBoxes.find(b => b.id === id)?.width || 0), dragStartRef.current.boxX + deltaX));
      const newY = Math.max(0, Math.min(100 - (textBoxes.find(b => b.id === id)?.height || 0), dragStartRef.current.boxY + deltaY));

      onChange(textBoxes.map(box => box.id === id ? { ...box, x: newX, y: newY } : box));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [textBoxes, onChange]);

  const handleDeleteBox = (id: string) => {
    onChange(textBoxes.filter(box => box.id !== id));
    setSelectedBox(null);
  };

  const handleAutoDetect = async () => {
    if (!imageUrl) {
      toast({
        title: "No image",
        description: "Please add an image first",
        variant: "destructive",
      });
      return;
    }

    setIsDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-text', {
        body: { imageUrl }
      });

      if (error) throw error;

      if (data?.textBoxes && Array.isArray(data.textBoxes)) {
        const MIN_CONFIDENCE = 0.86;
        const REL_X = 0.08;
        const REL_Y = 0.18;
        const MIN_PAD_X = 0.35;
        const MIN_PAD_Y = 0.25;
        const MAX_PAD_X = 1.1;
        const MAX_PAD_Y = 0.9;

        const validDetections = data.textBoxes.filter((box: any) => {
          const text = typeof box?.text === "string" ? box.text.trim() : "";
          const confidence = Number(box?.confidence ?? 0);
          const values = [box?.x, box?.y, box?.width, box?.height].map(Number);

          return (
            text.length > 1 &&
            /[A-Za-z0-9]/.test(text) &&
            confidence >= MIN_CONFIDENCE &&
            values.every(Number.isFinite) &&
            values[0] >= 0 &&
            values[1] >= 0 &&
            values[0] <= 100 &&
            values[1] <= 100 &&
            values[2] >= 1.5 &&
            values[3] >= 0.8 &&
            values[2] <= 60 &&
            values[3] <= 20
          );
        });

        const newBoxes: TextBox[] = validDetections.map((box: any) => {
          const rawX = Number(box.x) || 0;
          const rawY = Number(box.y) || 0;
          const rawW = Number(box.width) || 0;
          const rawH = Number(box.height) || 0;

          const padX = Math.min(MAX_PAD_X, Math.max(MIN_PAD_X, rawW * REL_X));
          const padY = Math.min(MAX_PAD_Y, Math.max(MIN_PAD_Y, rawH * REL_Y));

          const x = Math.max(0, rawX - padX);
          const y = Math.max(0, rawY - padY);
          const width = Math.min(100 - x, rawW + padX * 2);
          const height = Math.min(100 - y, rawH + padY * 2);

          return {
            id: Math.random().toString(36).substr(2, 9),
            x,
            y,
            width,
            height,
            answer: box.text,
            fontSize: 14,
            fontWeight: "normal",
            fontColor: "#000000",
          };
        });

        if (newBoxes.length === 0) {
          toast({
            title: "No reliable text found",
            description: "Detection skipped low-confidence or unverified labels",
            variant: "destructive",
          });
          return;
        }

        onChange([...textBoxes, ...newBoxes]);
        toast({
          title: "Text detected",
          description: `Found ${newBoxes.length} reliable text region${newBoxes.length !== 1 ? 's' : ''}`,
        });
      } else {
        toast({
          title: "No text found",
          description: "Could not detect any text in the image",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error detecting text:', error);
      toast({
        title: "Detection failed",
        description: "Failed to detect text in image",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
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
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAutoDetect}
          disabled={isDetecting || !imageUrl}
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {isDetecting ? "Detecting..." : "Auto-detect Text"}
        </Button>
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
            className="absolute border-2 cursor-move group"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
              borderColor: selectedBox === box.id ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.5)",
              backgroundColor: "hsl(var(--background))",
            }}
            onMouseDown={(e) => {
              if (!isResizing) {
                handleDragStart(e, box.id);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBox(box.id);
              setEditingBox(box.id);
            }}
          >
            {editingBox === box.id ? (
              <input
                ref={inlineInputRef}
                type="text"
                value={box.answer}
                onChange={(e) => handleAnswerChange(box.id, e.target.value)}
                onBlur={() => setEditingBox(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    setEditingBox(null);
                  }
                }}
                className="absolute inset-0 w-full h-full bg-transparent border-none outline-none text-center"
                style={{ 
                  fontSize: `${box.fontSize || 14}px`,
                  fontWeight: box.fontWeight || "normal",
                  color: box.fontColor || "#000000",
                }}
                placeholder="Enter answer..."
              />
            ) : (
              box.answer && (
                <div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ 
                    fontSize: `${box.fontSize || 14}px`,
                    fontWeight: box.fontWeight || "normal",
                    color: box.fontColor || "#000000",
                  }}
                >
                  {box.answer}
                </div>
              )
            )}
            {selectedBox === box.id && !isResizing && !isDragging && (
              <>
                <div 
                  className="absolute w-3 h-3 bg-primary border border-background rounded-full -top-1.5 -left-1.5 cursor-nw-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onMouseDown={(e) => handleResizeStart(e, box.id, "nw")}
                />
                <div 
                  className="absolute w-3 h-3 bg-primary border border-background rounded-full -top-1.5 -right-1.5 cursor-ne-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onMouseDown={(e) => handleResizeStart(e, box.id, "ne")}
                />
                <div 
                  className="absolute w-3 h-3 bg-primary border border-background rounded-full -bottom-1.5 -left-1.5 cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onMouseDown={(e) => handleResizeStart(e, box.id, "sw")}
                />
                <div 
                  className="absolute w-3 h-3 bg-primary border border-background rounded-full -bottom-1.5 -right-1.5 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onMouseDown={(e) => handleResizeStart(e, box.id, "se")}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {selectedBox && (
        <div className="p-4 border rounded-lg space-y-4">
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
