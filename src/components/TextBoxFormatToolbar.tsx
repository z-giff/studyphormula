import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NodeColorPalette } from "./NodeColorPalette";
import { MAX_FONT_SIZE, MIN_FONT_SIZE, TextBoxFormat } from "@/lib/textBoxStyle";

/** Gap between the toolbar and the box it belongs to. */
const ANCHOR_GAP = 8;
/** Space kept between the toolbar and the edges of the image. */
const EDGE_GUTTER = 6;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

interface TextBoxFormatToolbarProps {
  /** The selected box, in percentages of the image. */
  anchor: { x: number; y: number; width: number; height: number };
  format: TextBoxFormat;
  onFormatChange: (patch: Partial<TextBoxFormat>) => void;
  onApplyToAll: () => void;
  onDelete: () => void;
}

/**
 * Formatting controls for the selected text box, floating beside it.
 *
 * The toolbar sits above its box and drops below when the box is too close to
 * the top of the image to leave room. Either way it stays inside the image: the
 * frame around the artwork clips its overflow, so a toolbar that ran past an
 * edge would simply be cut off. Positions are measured rather than guessed
 * because the image is displayed at whatever width the layout gives it.
 *
 * The colour palettes portal out to the body, so they are free to overflow.
 */
export const TextBoxFormatToolbar = ({
  anchor,
  format,
  onFormatChange,
  onApplyToAll,
  onDelete,
}: TextBoxFormatToolbarProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [boxPaletteOpen, setBoxPaletteOpen] = useState(false);
  const [fontPaletteOpen, setFontPaletteOpen] = useState(false);
  const [placeBelow, setPlaceBelow] = useState(false);
  /** Pixels to shift the centred toolbar by to keep it off the image edges. */
  const [nudge, setNudge] = useState(0);

  // Font size is held as text while it is being typed: committing every
  // keystroke would clamp "2" up to the minimum before "24" can be finished.
  const [sizeDraft, setSizeDraft] = useState(String(format.fontSize));
  useEffect(() => setSizeDraft(String(format.fontSize)), [format.fontSize]);

  const centre = anchor.x + anchor.width / 2;

  useLayoutEffect(() => {
    const bar = barRef.current;
    const frame = bar?.offsetParent as HTMLElement | null;
    if (!bar || !frame) return;

    const place = () => {
      const half = bar.offsetWidth / 2;
      const centrePx = (centre / 100) * frame.clientWidth;
      const low = half + EDGE_GUTTER;
      const high = frame.clientWidth - half - EDGE_GUTTER;
      // A toolbar wider than the image cannot clear both edges; centre it.
      const resolved = low > high ? frame.clientWidth / 2 : clamp(centrePx, low, high);
      setNudge(resolved - centrePx);

      const topPx = (anchor.y / 100) * frame.clientHeight;
      setPlaceBelow(topPx < bar.offsetHeight + ANCHOR_GAP + EDGE_GUTTER);
    };

    place();
    // The image resizes with the layout, which moves every percentage anchor.
    const observer = new ResizeObserver(place);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [centre, anchor.y]);

  const commitSize = (raw: string) => {
    setSizeDraft(raw);
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
      onFormatChange({ fontSize: parsed });
    }
  };

  // Whatever half-typed value is left behind snaps back into range.
  const settleSize = () => {
    const parsed = Number.parseInt(sizeDraft, 10);
    const size = Number.isFinite(parsed)
      ? clamp(parsed, MIN_FONT_SIZE, MAX_FONT_SIZE)
      : format.fontSize;
    setSizeDraft(String(size));
    onFormatChange({ fontSize: size });
  };

  return (
    <div
      ref={barRef}
      className="absolute z-20 flex max-w-full flex-wrap items-center gap-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{
        left: `${centre}%`,
        transform: `translateX(calc(-50% + ${nudge}px))`,
        ...(placeBelow
          ? { top: `${anchor.y + anchor.height}%`, marginTop: ANCHOR_GAP }
          : { bottom: `${100 - anchor.y}%`, marginBottom: ANCHOR_GAP }),
      }}
      // The image deselects on click and boxes drag on mousedown; neither
      // should fire because someone reached for a control in here.
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <NodeColorPalette
        currentColor={format.bgColor}
        onColorChange={(color) => onFormatChange({ bgColor: color })}
        open={boxPaletteOpen}
        onOpenChange={setBoxPaletteOpen}
        side={placeBelow ? "bottom" : "top"}
        align="start"
      >
        <button
          type="button"
          title="Box colour"
          aria-label="Box colour"
          className="flex h-7 w-7 items-center justify-center rounded-sm hover:bg-accent"
        >
          <span
            className="h-4 w-4 rounded-sm border border-border"
            style={{ backgroundColor: format.bgColor }}
          />
        </button>
      </NodeColorPalette>

      <NodeColorPalette
        currentColor={format.fontColor}
        onColorChange={(color) => onFormatChange({ fontColor: color })}
        open={fontPaletteOpen}
        onOpenChange={setFontPaletteOpen}
        side={placeBelow ? "bottom" : "top"}
        align="start"
      >
        <button
          type="button"
          title="Font colour"
          aria-label="Font colour"
          className="flex h-7 w-7 flex-col items-center justify-center gap-0.5 rounded-sm hover:bg-accent"
        >
          <span className="text-xs font-semibold leading-none">A</span>
          <span
            className="h-1 w-4 rounded-sm border border-border"
            style={{ backgroundColor: format.fontColor }}
          />
        </button>
      </NodeColorPalette>

      <div className="mx-0.5 h-5 w-px bg-border" />

      <Input
        type="number"
        value={sizeDraft}
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        onChange={(e) => commitSize(e.target.value)}
        onBlur={settleSize}
        title="Font size"
        aria-label="Font size"
        className="h-7 w-14 px-1.5 text-center text-xs"
      />

      <div className="mx-0.5 h-5 w-px bg-border" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onApplyToAll}
        className="h-7 px-2 text-xs"
      >
        Apply to all
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        title="Delete text box"
        aria-label="Delete text box"
        className="h-7 w-7 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
