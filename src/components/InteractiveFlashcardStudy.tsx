import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  answer: string;
}

interface InteractiveFlashcardStudyProps {
  imageUrl: string;
  textBoxes: TextBox[];
  cardColor: string;
}

export const InteractiveFlashcardStudy = ({ imageUrl, textBoxes, cardColor }: InteractiveFlashcardStudyProps) => {
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [validationState, setValidationState] = useState<Record<string, "correct" | "incorrect" | null>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  const handleAnswerChange = (id: string, value: string) => {
    setUserAnswers(prev => ({ ...prev, [id]: value }));
    setValidationState(prev => ({ ...prev, [id]: null }));
  };

  const handleCheckAnswer = (id: string) => {
    const box = textBoxes.find(b => b.id === id);
    if (!box) return;

    const userAnswer = userAnswers[id]?.trim().toLowerCase() || "";
    const correctAnswer = box.answer.trim().toLowerCase();
    
    setValidationState(prev => ({
      ...prev,
      [id]: userAnswer === correctAnswer ? "correct" : "incorrect"
    }));
  };

  const handleGiveUp = () => {
    setShowAnswers(true);
    const answers: Record<string, string> = {};
    textBoxes.forEach(box => {
      answers[box.id] = box.answer;
    });
    setUserAnswers(answers);
    
    const validation: Record<string, "correct" | null> = {};
    textBoxes.forEach(box => {
      validation[box.id] = "correct";
    });
    setValidationState(validation);
  };

  const getBoxBorderColor = (id: string) => {
    const state = validationState[id];
    if (state === "correct") return "#10B981";
    if (state === "incorrect") return "#EF4444";
    return cardColor;
  };

  const getBoxBackgroundColor = (id: string) => {
    const state = validationState[id];
    if (state === "correct") return "rgba(16, 185, 129, 0.2)";
    if (state === "incorrect") return "rgba(239, 68, 68, 0.2)";
    return "rgba(255, 255, 255, 0.9)";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGiveUp}
          disabled={showAnswers}
        >
          Give Up
        </Button>
      </div>

      <div className="relative border rounded-lg overflow-hidden">
        <img src={imageUrl} alt="Flashcard" className="w-full h-auto" />
        
        {textBoxes.map((box) => (
          <div
            key={box.id}
            className="absolute"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
          >
            <div className="relative w-full h-full">
              <Input
                value={userAnswers[box.id] || ""}
                onChange={(e) => handleAnswerChange(box.id, e.target.value)}
                onBlur={() => !showAnswers && handleCheckAnswer(box.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !showAnswers) {
                    handleCheckAnswer(box.id);
                  }
                }}
                disabled={showAnswers}
                className="h-full text-xs px-1 text-center"
                style={{
                  borderColor: getBoxBorderColor(box.id),
                  borderWidth: "2px",
                  backgroundColor: getBoxBackgroundColor(box.id),
                  color: "#000000",
                }}
              />
              {validationState[box.id] === "correct" && (
                <Check className="absolute -right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
              )}
              {validationState[box.id] === "incorrect" && (
                <X className="absolute -right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-red-600" />
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Fill in the text boxes. Press Enter or click outside to check your answer.
      </p>
    </div>
  );
};
