import { Fragment, forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { FlashcardText } from "@/components/FlashcardText";
import { cn } from "@/lib/utils";
import { CARD_TEXT_MAX, CARD_TEXT_MIN, STANDARD_CARD_RATIO, TEXT_LAYER, stackOrder, textRegion, type CardRegion } from "@/lib/standardCardGeometry";
import type { PictureFrame, StandardCardImage, StandardCardSide } from "@/lib/standardCardLayout";

/**
 * One face of a regular card with pictures, drawn the same way everywhere:
 * the editor's preview, the deck, Memorization, Swipe and shared sets. The
 * face keeps the card's 1.75 shape and everything on it is sized in
 * proportion to its width, so a picture sits in the same place, at the same
 * size, next to text of the same size, on a phone or a big screen.
 */

const NO_FRAMES: PictureFrame[] = [];

const pictureStyle = (image: StandardCardImage, zIndex: number): CSSProperties => ({
  position: "absolute",
  left: `${image.x}%`,
  top: `${image.y}%`,
  width: `${image.width}%`,
  height: `${image.height}%`,
  transform: image.rotation ? `rotate(${image.rotation}deg)` : undefined,
  zIndex,
});

// Text over a picture gets a glow in the opposite shade, so it stays readable
const isLight = (color: string) => {
  const hex = color.trim().replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((digit) => digit + digit).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return false;
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
};
const haloFor = (textColor: string) => {
  const glow = isLight(textColor) ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.85)";
  return `0 0 0.5cqw ${glow}, 0 0 1.2cqw ${glow}, 0 0 2.2cqw ${glow}`;
};

interface FittedTextProps {
  text: string;
  region: CardRegion;
  side: StandardCardSide;
  color?: string;
  halo?: string;
}

/**
 * The card's text in its region, at the largest size up to the card's usual
 * one that fits. Sizes are in cqw (a percentage of the face's width), so the
 * fit comes out the same at every size the face is drawn.
 */
const FittedText = ({ text, region, side, color, halo }: FittedTextProps) => {
  const box = useRef<HTMLDivElement>(null);
  const max = CARD_TEXT_MAX[side];
  const [size, setSize] = useState(max);

  const fit = useCallback(() => {
    const element = box.current;
    const content = element?.firstElementChild as HTMLElement | null;
    if (!element || !content || !element.clientHeight) return;
    const fits = (candidate: number) => {
      element.style.fontSize = `${candidate}cqw`;
      return content.scrollHeight <= element.clientHeight + 0.5 && content.scrollWidth <= element.clientWidth + 0.5;
    };
    let best = CARD_TEXT_MIN;
    if (fits(max)) best = max;
    else {
      let low = CARD_TEXT_MIN;
      let high = max;
      for (let step = 0; step < 9; step += 1) {
        const middle = (low + high) / 2;
        if (fits(middle)) {
          best = middle;
          low = middle;
        } else high = middle;
      }
    }
    element.style.fontSize = `${best}cqw`;
    setSize(best);
  }, [max]);

  useLayoutEffect(() => fit(), [fit, text, region.left, region.top, region.right, region.bottom]);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    // Measure again once the face has a size (a hidden side) and once the card's font has loaded
    const observer = new ResizeObserver(() => fit());
    observer.observe(element);
    let active = true;
    document.fonts?.ready.then(() => active && fit()).catch(() => undefined);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [fit]);

  return (
    <div
      ref={box}
      className="pointer-events-none absolute flex items-center justify-center overflow-hidden text-center"
      style={{
        left: `${region.left}%`,
        top: `${region.top}%`,
        width: `${region.right - region.left}%`,
        height: `${region.bottom - region.top}%`,
        padding: "0.4cqw",
        fontSize: `${size}cqw`,
        color,
        textShadow: halo,
        zIndex: TEXT_LAYER,
      }}
    >
      <FlashcardText text={text} className={side === "front" ? "font-bold" : undefined} style={{ lineHeight: side === "front" ? 1.2 : 1.4 }} />
    </div>
  );
};

/** The card's text where a card without pictures has always shown it. */
export const ClassicCardText = ({ text, side, color }: { text: string; side: StandardCardSide; color?: string }) => (
  <div className="absolute flex items-center justify-center overflow-auto p-4 text-center" style={{ inset: "8%", zIndex: TEXT_LAYER }}>
    <FlashcardText text={text} className={side === "front" ? "text-2xl font-bold" : "text-lg"} style={{ color }} />
  </div>
);

export interface StandardCardCanvasProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  side: StandardCardSide;
  text: string;
  images: StandardCardImage[];
  /** What each picture source is shown from (a signed link, a local copy), by source. */
  sources: Record<string, string | undefined>;
  textColor?: string;
  /** Pictures still uploading: the text keeps clear of where they'll land. */
  pendingFrames?: PictureFrame[];
  /** The editor draws each picture itself, to make it draggable; viewers leave this out. */
  renderPicture?: (image: StandardCardImage, style: CSSProperties, src: string | undefined) => ReactNode;
  /** Outline the text's region (the editor, while a picture is selected). */
  showTextArea?: boolean;
  /** Drawn inside the face, above the pictures and clipped with it. */
  children?: ReactNode;
}

export const StandardCardCanvas = forwardRef<HTMLDivElement, StandardCardCanvasProps>(({
  side, text, images, sources, textColor, pendingFrames = NO_FRAMES, renderPicture, showTextArea, children, className, style, ...rest
}, ref) => {
  const order = useMemo(() => stackOrder(images), [images]);
  const hasPictures = images.length > 0 || pendingFrames.length > 0;
  const region = useMemo(() => textRegion(images, pendingFrames), [images, pendingFrames]);
  const halo = images.some((image) => image.textFlow === "behind") && textColor ? haloFor(textColor) : undefined;

  return (
    <div
      ref={ref}
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio: `${STANDARD_CARD_RATIO}`, containerType: "inline-size", ...style }}
      {...rest}
    >
      {images.map((image) => {
        const imageStyle = pictureStyle(image, order[image.id]);
        const src = sources[image.src];
        return (
          <Fragment key={image.id}>
            {renderPicture
              ? renderPicture(image, imageStyle, src)
              : src && <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className="pointer-events-none select-none" style={{ ...imageStyle, objectFit: image.fit }} />}
          </Fragment>
        );
      })}
      {hasPictures
        ? <FittedText text={text} region={region} side={side} color={textColor} halo={halo} />
        : <ClassicCardText text={text} side={side} color={textColor} />}
      {showTextArea && hasPictures && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg border-[1.5px] border-dashed border-black/40"
          style={{ left: `${region.left}%`, top: `${region.top}%`, width: `${region.right - region.left}%`, height: `${region.bottom - region.top}%`, zIndex: TEXT_LAYER - 1 }}
        >
          <span className="absolute left-2 top-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-black/60">Text area</span>
        </div>
      )}
      {children}
    </div>
  );
});
StandardCardCanvas.displayName = "StandardCardCanvas";
