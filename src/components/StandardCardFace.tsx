import { useEffect, useMemo, useState } from "react";
import { FlashcardText } from "@/components/FlashcardText";
import { getStandardCardLayout, resolveStandardImageSource, type StandardCardSide } from "@/lib/standardCardLayout";

interface StandardCardFaceProps {
  side: StandardCardSide;
  term: string;
  definition: string;
  imageUrl?: string | null;
  interactiveData?: unknown;
  textColor?: string;
  className?: string;
}

export const StandardCardFace = ({ side, term, definition, imageUrl, interactiveData, textColor, className = "" }: StandardCardFaceProps) => {
  const layout = useMemo(() => getStandardCardLayout(interactiveData, imageUrl), [interactiveData, imageUrl]);
  const images = layout[side];
  const [sources, setSources] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    Promise.all(images.map(async (image) => [image.id, await resolveStandardImageSource(image.src)] as const))
      .then((entries) => active && setSources(Object.fromEntries(entries)))
      .catch(() => active && setSources({}));
    return () => { active = false; };
  }, [images]);

  const avoid = images.filter((image) => image.textFlow === "avoid");
  const textStyle = avoid.length ? (() => {
    const topClear = Math.min(...avoid.map((image) => image.y));
    const bottomClear = 100 - Math.max(...avoid.map((image) => image.y + image.height));
    return topClear >= bottomClear
      ? { left: "6%", right: "6%", top: "5%", height: `${Math.max(18, topClear - 8)}%` }
      : { left: "6%", right: "6%", bottom: "5%", height: `${Math.max(18, bottomClear - 8)}%` };
  })() : { inset: "8%" };

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div className="absolute z-20 flex items-center justify-center overflow-auto p-4 text-center" style={textStyle}>
        <FlashcardText text={side === "front" ? term : definition} className={side === "front" ? "text-2xl font-bold" : "text-lg"} style={{ color: textColor }} />
      </div>
      {images.sort((a, b) => a.zIndex - b.zIndex).map((image) => sources[image.id] && (
        <img key={image.id} src={sources[image.id]} alt="" loading="lazy" decoding="async" className="pointer-events-none absolute" style={{ left: `${image.x}%`, top: `${image.y}%`, width: `${image.width}%`, height: `${image.height}%`, objectFit: image.fit, transform: `rotate(${image.rotation}deg)`, zIndex: image.zIndex + 1 }} />
      ))}
    </div>
  );
};
