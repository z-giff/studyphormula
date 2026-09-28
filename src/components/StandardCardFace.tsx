import { useMemo } from "react";
import { ClassicCardText, StandardCardCanvas } from "@/components/StandardCardCanvas";
import { usePictureSources } from "@/hooks/usePictureSources";
import { getStandardCardLayout, type StandardCardSide } from "@/lib/standardCardLayout";

interface StandardCardFaceProps {
  side: StandardCardSide;
  term: string;
  definition: string;
  imageUrl?: string | null;
  interactiveData?: unknown;
  textColor?: string;
  className?: string;
}

/**
 * A regular card's face in the study views. A side with pictures is drawn by
 * the same canvas as the editor's preview, kept at the card's shape in the
 * middle of whatever space the view gives it; a side without pictures shows
 * its text as it always has.
 */
export const StandardCardFace = ({ side, term, definition, imageUrl, interactiveData, textColor, className = "" }: StandardCardFaceProps) => {
  const layout = useMemo(() => getStandardCardLayout(interactiveData, imageUrl), [interactiveData, imageUrl]);
  const images = layout[side];
  const sources = usePictureSources(images);
  const text = side === "front" ? term : definition;

  if (!images.length) {
    return (
      <div className={`relative h-full w-full overflow-hidden ${className}`}>
        <ClassicCardText text={text} side={side} color={textColor} />
      </div>
    );
  }

  return (
    <div className={`flex h-full w-full items-center justify-center overflow-hidden ${className}`} style={{ containerType: "size" }}>
      <StandardCardCanvas side={side} text={text} images={images} sources={sources} textColor={textColor} style={{ width: "min(100cqw, 175cqh)" }} />
    </div>
  );
};
