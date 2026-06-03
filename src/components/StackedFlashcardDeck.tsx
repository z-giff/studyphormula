import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pencil, Trash2, Bookmark, Copy, Maximize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DrawingCanvasDisplay } from "@/components/DrawingCanvasDisplay";
import { FlowchartCanvasDisplay } from "@/components/FlowchartCanvasDisplay";
import { InteractiveFlashcardStudy } from "@/components/InteractiveFlashcardStudy";

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
  isBookmarkSet?: boolean;
}

// Helper function to determine contrasting text color
const getContrastColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export const StackedFlashcardDeck = ({
  flashcards,
  setColor,
  onEdit,
  onDelete,
  onToggleBookmark,
  onCopy,
  isBookmarkSet = false,
}: StackedFlashcardDeckProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [expandedFlowchartData, setExpandedFlowchartData] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<"next" | "prev" | null>(null);

  const handleFlip = (index: number) => {
    if (isAnimating) return;
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
    if (isAnimating) return;
    setAnimationDirection("next");
    setIsAnimating(true);
    
    setTimeout(() => {
      setFlippedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentIndex);
        return newSet;
      });
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
      setAnimationDirection(null);
      setIsAnimating(false);
    }, 400);
  };

  const handlePrevious = () => {
    if (isAnimating) return;
    setAnimationDirection("prev");
    setIsAnimating(true);
    
    setTimeout(() => {
      setFlippedCards((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentIndex);
        return newSet;
      });
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
      setAnimationDirection(null);
      setIsAnimating(false);
    }, 400);
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
      <div
        className={`relative w-full max-w-xl perspective-1000 ${
          currentCard?.flashcard_type === "interactive" ? "h-[640px]" : "h-[320px]"
        }`}
      >
        {stackedCards.map((card) => {
          const isTop = card.stackPosition === 0;
          const isFlipped = flippedCards.has(card.originalIndex);
          const offset = card.stackPosition * 8;
          const zIndex = 10 - card.stackPosition;
          
          // Animation styles for the top card
          const isAnimatingOut = isTop && animationDirection === "next";
          const isAnimatingIn = isTop && animationDirection === "prev";
          const isInteractive = card.flashcard_type === "interactive";

          return (
            <div
              key={`${card.id}-${card.stackPosition}`}
              className={`absolute inset-0 preserve-3d ${
                isAnimatingOut ? "animate-whoosh-out" : ""
              } ${isAnimatingIn ? "animate-whoosh-in" : ""}`}
              style={{
                transform: isAnimatingOut 
                  ? undefined 
                  : `translateY(${offset}px) translateX(${offset}px)`,
                zIndex: isAnimatingOut ? 0 : zIndex,
                transition: isAnimating ? "none" : "all 0.3s ease-out",
              }}
            >
              <div
                className={`relative w-full h-full preserve-3d ${
                  isInteractive
                    ? ""
                    : `transition-transform duration-500 cursor-pointer ${isFlipped ? "rotate-y-180" : ""}`
                }`}
                onClick={() => isTop && !isInteractive && handleFlip(card.originalIndex)}
              >
                {(() => {
                  // Use first card's color for all cards
                  const firstCardColor = flashcards[0]?.color || setColor;
                  const cardColor = firstCardColor;
                  const textColor = getContrastColor(cardColor);

                  if (isInteractive) {
                    return (
                      <Card
                        className="absolute inset-0 shadow-lg border-2 overflow-hidden"
                        style={{ borderColor: cardColor, backgroundColor: cardColor }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CardContent className="flex flex-col h-full p-6 gap-4">
                          <h3
                            className="text-2xl font-bold text-center"
                            style={{ color: textColor }}
                          >
                            {card.term}
                          </h3>
                          <div className="flex-1 overflow-auto bg-background rounded-lg p-3">
                            {card.image_url && card.interactive_data?.textBoxes ? (
                              <InteractiveFlashcardStudy
                                imageUrl={card.image_url}
                                textBoxes={card.interactive_data.textBoxes}
                                cardColor={cardColor}
                              />
                            ) : (
                              <p className="text-sm text-muted-foreground text-center">
                                No interactive content available.
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <>
                      {/* Front of card */}
                      <Card
                        className="absolute inset-0 backface-hidden shadow-lg border-2"
                        style={{ 
                          borderColor: cardColor,
                          backgroundColor: cardColor,
                        }}
                      >
                        <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
                          {card.image_url && (
                            <img
                              src={card.image_url}
                              alt={card.term}
                              className="w-full max-h-32 object-contain rounded-lg mb-4"
                            />
                          )}
                          <h3 className="text-2xl font-bold" style={{ color: textColor }}>{card.term}</h3>
                        </CardContent>
                      </Card>

                      {/* Back of card */}
                      <Card
                        className="absolute inset-0 backface-hidden rotate-y-180 shadow-lg border-2"
                        style={{ 
                          borderColor: cardColor,
                          backgroundColor: cardColor,
                        }}
                      >
                        <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
                          {card.flashcard_type === "drawing" && card.interactive_data ? (
                            <div className="w-full flex items-center justify-center px-4">
                              <DrawingCanvasDisplay 
                                drawingData={card.interactive_data.drawingData || card.interactive_data}
                                className="rounded-lg shadow-sm max-w-full mx-auto"
                              />
                            </div>
                          ) : card.flashcard_type === "flowchart" && card.interactive_data ? (
                            <div 
                              className="relative w-full h-48 bg-white rounded-lg border border-border shadow-sm overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="w-full h-full flowchart-preview">
                                <FlowchartCanvasDisplay
                                  flowchartData={card.interactive_data.flowchartData || card.interactive_data}
                                  showControls={false}
                                />
                              </div>
                              <button
                                className="absolute bottom-2 right-2 p-1.5 bg-background/90 hover:bg-background border border-border rounded-md shadow-sm transition-colors z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedFlowchartData(card.interactive_data.flowchartData || card.interactive_data);
                                }}
                                title="Expand flowchart"
                              >
                                <Maximize2 className="h-4 w-4 text-foreground" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-lg" style={{ color: textColor }}>{card.definition}</p>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
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
          {!isBookmarkSet && (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Custom CSS for 3D transforms and animations */}
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
        
        @keyframes whoosh-out {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 1;
          }
          40% {
            transform: translateY(-20px) translateX(80px) rotateZ(8deg);
            opacity: 1;
          }
          100% {
            transform: translateY(24px) translateX(24px);
            opacity: 0.7;
          }
        }
        
        @keyframes whoosh-in {
          0% {
            transform: translateY(24px) translateX(-50px);
            opacity: 0.7;
          }
          60% {
            transform: translateY(-10px) translateX(-40px) rotateZ(-5deg);
            opacity: 1;
          }
          100% {
            transform: translateY(0) translateX(0);
            opacity: 1;
          }
        }
        
        .animate-whoosh-out {
          animation: whoosh-out 0.4s ease-in-out forwards;
        }
        
        .animate-whoosh-in {
          animation: whoosh-in 0.4s ease-in-out forwards;
        }
      `}</style>

      {/* Flowchart Expanded Modal */}
      <Dialog open={!!expandedFlowchartData} onOpenChange={() => setExpandedFlowchartData(null)}>
        <DialogContent className="max-w-4xl w-[90vw] h-[70vh] p-0 overflow-hidden">
          <div className="w-full h-full bg-white rounded-lg">
            {expandedFlowchartData && (
              <FlowchartCanvasDisplay flowchartData={expandedFlowchartData} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
