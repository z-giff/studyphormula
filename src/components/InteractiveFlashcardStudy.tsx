import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { BOX_BORDER_COLOR, BOX_BORDER_WIDTH, formatOf } from "@/lib/textBoxStyle";

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
  /** Fill that hides the label underneath. White until the user changes it. */
  bgColor?: string;
}

interface InteractiveFlashcardStudyProps {
  imageUrl: string;
  textBoxes: TextBox[];
}

export const InteractiveFlashcardStudy = ({ imageUrl, textBoxes }: InteractiveFlashcardStudyProps) => {
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [validationState, setValidationState] = useState<Record<string, "correct" | "incorrect" | null>>({});
  const [checked, setChecked] = useState(false);

  const handleAnswerChange = (id: string, value: string) => {
    setUserAnswers(prev => ({ ...prev, [id]: value }));
    if (checked) {
      setValidationState(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleCheckAll = () => {
    const newState: Record<string, "correct" | "incorrect"> = {};
    textBoxes.forEach(box => {
      const ua = (userAnswers[box.id] || "").trim().toLowerCase();
      const ca = box.answer.trim().toLowerCase();
      newState[box.id] = ua && ua === ca ? "correct" : "incorrect";
    });
    setValidationState(newState);
    setChecked(true);
  };

  const handleReset = () => {
    setUserAnswers({});
    setValidationState({});
    setChecked(false);
  };

  // Checking answers recolours the outline as feedback; until then every box
  // wears the same black one it was created with.
  const getBoxBorderColor = (id: string) => {
    const state = validationState[id];
    if (state === "correct") return "#10B981";
    if (state === "incorrect") return "#EF4444";
    return BOX_BORDER_COLOR;
  };

  const getBoxBackgroundColor = (box: TextBox) => {
    const state = validationState[box.id];
    if (state === "correct") return "rgba(16, 185, 129, 0.15)";
    if (state === "incorrect") return "rgba(239, 68, 68, 0.15)";
    return formatOf(box).bgColor;
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {checked ? (
          <Button variant="outline" size="sm" onClick={handleReset}>
            Try Again
          </Button>
        ) : (
          <Button size="sm" onClick={handleCheckAll}>
            Check Answers
          </Button>
        )}
      </div>

      <div className="relative border rounded-lg overflow-hidden">
        {/* block, not inline: an inline image leaves a baseline gap under it,
            which makes this box taller than the artwork and shifts every
            percentage-positioned mask down by a few pixels. */}
        <img src={imageUrl} alt="Flashcard" loading="lazy" decoding="async" className="block w-full h-auto" />

        {textBoxes.map((box) => {
          const format = formatOf(box);

          return (
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
              <div 
                className="relative w-full h-full cursor-text"
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) input.focus();
                }}
              >
                <Input
                  value={userAnswers[box.id] || ""}
                  onChange={(e) => handleAnswerChange(box.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCheckAll();
                    }
                  }}
                  disabled={checked && validationState[box.id] === "correct"}
                  className="h-full px-1 text-center cursor-text"
                  style={{
                    borderColor: getBoxBorderColor(box.id),
                    borderWidth: `${BOX_BORDER_WIDTH}px`,
                    backgroundColor: getBoxBackgroundColor(box),
                    color: format.fontColor,
                    fontSize: `${format.fontSize}px`,
                    fontWeight: format.fontWeight,
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
          );
        })}
      </div>

      {checked && (
        <div className="space-y-1 text-sm">
          {textBoxes
            .filter(b => validationState[b.id] === "incorrect")
            .map(b => (
              <div key={b.id} className="flex items-center gap-2 text-muted-foreground">
                <X className="h-3.5 w-3.5 text-red-600 shrink-0" />
                <span>
                  Your answer: <span className="font-medium text-foreground">{userAnswers[b.id] || "(blank)"}</span>
                  {" — Correct: "}
                  <span className="font-medium text-green-600">{b.answer}</span>
                </span>
              </div>
            ))}
        </div>
      )}
      {!checked && (
        <p className="text-sm text-muted-foreground text-center">
          Type your answers into the boxes, then click Check Answers.
        </p>
      )}
    </div>
  );
};
