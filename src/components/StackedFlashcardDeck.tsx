import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Bookmark, Copy } from "lucide-react";

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  image_url: string | null;
  position: number;
  section_id: string | null;
  color: string | null;
  flashcard_type?: string;
  interactive_data?: any;
  is_bookmarked?: boolean;
}

interface StackedFlashcardDeckProps {
  flashcards: Flashcard[];
  setColor: string;
  onEdit: (flashcard: Flashcard) => void;
  onDelete: (flashcardId: string) => void;
  onToggleBookmark: (flashcardId: string, currentStatus: boolean) => void;
  onCopy: (flashcardId: string) => void;
}

export const StackedFlashcardDeck = ({
  flashcards,
  setColor,
  onEdit,
  onDelete,
  onToggleBookmark,
  onCopy,
}: StackedFlashcardDeckProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const handleFlip = (index: number) => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      newSet.delete(currentIndex);
      return newSet;
    });
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevious = () => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      newSet.delete(currentIndex);
      return newSet;
    });
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const getStackedCards = () => {
    const cards = [];
    const visibleCount = Math.min(3, flashcards.length);
    
    for (let i = 0; i < visibleCount; i++) {
      const cardIndex = (currentIndex + i) % flashcards.length;
      cards.push({ ...flashcards[cardIndex], stackPosition: i, originalIndex: cardIndex });
    }
    
    return cards.reverse();
  };

  const stackedCards = getStackedCards();
  const currentCard = flashcards[currentIndex];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Stacked deck container */}
      <div className="relative w-full max-w-md h-[400px] perspective-1000">
        {stackedCards.map((card) => {
          const isTop = card.stackPosition === 0;
          const isFlipped = flippedCards.has(card.originalIndex);
          const offset = card.stackPosition * 8;
          const scale = 1 - card.stackPosition * 0.05;
          const zIndex = 10 - card.stackPosition;

          return (
            <div
              key={`${card.id}-${card.stackPosition}`}
              className="absolute inset-0 transition-all duration-300 ease-out preserve-3d"
              style={{
                transform: `translateY(${offset}px) translateX(${offset}px) scale(${scale})`,
                zIndex,
              }}
            >
              <div
                className={`relative w-full h-full transition-transform duration-500 preserve-3d cursor-pointer ${
                  isFlipped ? "rotate-y-180" : ""
                }`}
                onClick={() => isTop && handleFlip(card.originalIndex)}
              >
                {/* Front of card */}
                <Card
                  className="absolute inset-0 backface-hidden shadow-lg border-2"
                  style={{ borderColor: setColor }}
                >
                  <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
                    {card.image_url && (
                      <img
                        src={card.image_url}
                        alt={card.term}
                        className="w-full max-h-32 object-contain rounded-lg mb-4"
                      />
                    )}
                    <h3 className="text-2xl font-bold">{card.term}</h3>
                    {isTop && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Click to flip
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Back of card */}
                <Card
                  className="absolute inset-0 backface-hidden rotate-y-180 shadow-lg border-2"
                  style={{ borderColor: setColor }}
                >
                  <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <p className="text-lg">{card.definition}</p>
                    {isTop && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Click to flip back
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="lg" onClick={handlePrevious}>
          <ChevronLeft className="h-5 w-5 mr-1" />
          Previous
        </Button>
        <span className="text-muted-foreground font-medium min-w-[80px] text-center">
          {currentIndex + 1} / {flashcards.length}
        </span>
        <Button variant="outline" size="lg" onClick={handleNext}>
          Next
          <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </div>

      {/* Action buttons for current card */}
      {currentCard && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleBookmark(currentCard.id, currentCard.is_bookmarked || false)}
          >
            <Bookmark
              className={`h-4 w-4 mr-1 ${
                currentCard.is_bookmarked ? "fill-primary text-primary" : ""
              }`}
            />
            {currentCard.is_bookmarked ? "Bookmarked" : "Bookmark"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(currentCard)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onCopy(currentCard.id)}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(currentCard.id)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      )}

      {/* Custom CSS for 3D transforms */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};
