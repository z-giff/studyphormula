import { useState, useRef } from "react";
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
        className="relative border-2 border-dashed border-border rounded-lg overflow-hidden cursor-crosshair"
        onClick={handleImageClick}
        style={{ minHeight: "400px" }}
      >
        <img src={imageUrl} alt="Flashcard" className="w-full h-auto" />
        
        {textBoxes.map((box) => (
          <div
            key={box.id}
            className="absolute border-2 border-primary bg-primary/20 cursor-pointer"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBox(box.id);
            }}
          >
            {box.answer && (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-foreground bg-primary/80">
                {box.answer}
              </div>
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
