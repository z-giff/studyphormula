import { useState } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DrawingCanvasDisplay, type DrawingData } from "@/components/DrawingCanvasDisplay";
import { FlowchartCanvasDisplay, type FlowchartData } from "@/components/FlowchartCanvasDisplay";

interface BoardCard {
  flashcard_type?: string;
  interactive_data?: unknown;
}

// Some cards were saved with the board nested under its own key.
type BoardData = Partial<DrawingData & FlowchartData> & {
  drawingData?: DrawingData;
  flowchartData?: FlowchartData;
};

/**
 * The board on the back of a flowchart or drawing card, filling a white back.
 * The board never takes a tap for itself, so tapping anywhere flips the card;
 * a flowchart also gets an expand button that opens it to pan and zoom.
 */
export const FlashcardBoardBack = ({ card }: { card: BoardCard }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const data = card.interactive_data as BoardData;

  if (card.flashcard_type === "drawing") {
    return (
      <div className="h-full w-full p-4">
        <DrawingCanvasDisplay drawingData={data.drawingData || (data as DrawingData)} />
      </div>
    );
  }

  const flowchartData = data.flowchartData || (data as FlowchartData);

  return (
    <div className="relative h-full w-full p-4">
      <FlowchartCanvasDisplay
        flowchartData={flowchartData}
        showControls={false}
        showGrid={false}
        interactive={false}
        className="border-0"
      />
      <button
        className="absolute top-3 right-3 p-1.5 bg-white/90 hover:bg-white border border-gray-200 rounded-md shadow-sm transition-colors z-10"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(true);
        }}
        title="Expand flowchart"
        aria-label="Expand flowchart"
      >
        <Maximize2 className="h-4 w-4 text-gray-700" />
      </button>

      {/* The dialog renders in a portal, but React still bubbles its clicks
          up through the card; stop them here so they don't flip it. */}
      <div className="contents" onClick={(e) => e.stopPropagation()}>
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-4xl w-[90vw] h-[70vh] p-0 overflow-hidden text-gray-900">
            <div className="w-full h-full bg-white rounded-lg">
              <FlowchartCanvasDisplay flowchartData={flowchartData} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
