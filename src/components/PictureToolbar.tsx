import { forwardRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ArrowDown, ArrowLeftRight, ArrowUp, BringToFront, Check, ChevronDown, Copy, Crop, Layers, RotateCw, SendToBack, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuShortcut, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ArrangeMove } from "@/lib/standardCardGeometry";
import type { StandardCardImage, StandardCardSide, StandardTextFlow } from "@/lib/standardCardLayout";

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
const keys = (shift: boolean, bracket: "[" | "]") => IS_MAC ? `${shift ? "⇧" : ""}⌘${bracket}` : `Ctrl+${shift ? "Shift+" : ""}${bracket}`;

// How the text and a picture share the card, drawn as a picture beside lines of text
export const TextFlowIcon = ({ flow, className }: { flow: StandardTextFlow; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("h-[18px] w-[18px] shrink-0", className)}>
    {flow === "avoid" && <><rect x="3" y="5" width="9" height="9" rx="1.5" /><path d="M15 6h6M15 10h6M15 14h6M3 18.5h18" /></>}
    {flow === "overlap" && <><path d="M3 5h18M3 19h18M3 12h3M18 12h3" /><rect x="7" y="7.5" width="10" height="9" rx="1.5" fill="currentColor" fillOpacity={0.35} /></>}
    {flow === "behind" && <><rect x="6" y="3.5" width="12" height="17" rx="1.5" strokeDasharray="2.5 2.5" /><path d="M3 8h18M3 12h18M3 16h18" /></>}
  </svg>
);

const TEXT_FLOWS: Array<{ value: StandardTextFlow; label: string; hint: string }> = [
  { value: "avoid", label: "Keep text clear", hint: "The words move out of its way" },
  { value: "overlap", label: "Over text", hint: "Sits on top of the words" },
  { value: "behind", label: "Behind text", hint: "The words sit on top of it" },
];

const ARRANGE: Array<{ move: ArrangeMove; label: string; icon: ReactNode; shortcut: string }> = [
  { move: "front", label: "Bring to front", icon: <BringToFront className="h-4 w-4" />, shortcut: keys(true, "]") },
  { move: "forward", label: "Bring forward", icon: <ArrowUp className="h-4 w-4" />, shortcut: keys(false, "]") },
  { move: "backward", label: "Send backward", icon: <ArrowDown className="h-4 w-4" />, shortcut: keys(false, "[") },
  { move: "back", label: "Send to back", icon: <SendToBack className="h-4 w-4" />, shortcut: keys(true, "[") },
];

const formatAngle = (angle: number) => (angle < 0 ? `−${-angle}` : `${angle}`) + "°";

interface PictureToolbarProps {
  picture: StandardCardImage;
  side: StandardCardSide;
  /** Whether the picture is already front- or backmost on its side of the text. */
  limits: { atFront: boolean; atBack: boolean };
  /** Sitting under the card on a narrow screen, with bigger buttons, rather than floating over it. */
  docked?: boolean;
  onTextFlow: (flow: StandardTextFlow) => void;
  onRotate: () => void;
  onResetRotation: () => void;
  onArrange: (move: ArrangeMove) => void;
  onMoveSide: () => void;
  onDuplicate: () => void;
  /** Only for a picture that was cropped to its frame, to show all of it again. */
  onUncrop?: () => void;
  onDelete: () => void;
  className?: string;
  style?: CSSProperties;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/** The controls for the selected picture, next to it on the card. */
export const PictureToolbar = forwardRef<HTMLDivElement, PictureToolbarProps>(({
  picture, side, limits, docked, onTextFlow, onRotate, onResetRotation, onArrange, onMoveSide, onDuplicate, onUncrop, onDelete, className, style, onKeyDown,
}, ref) => {
  const flow = TEXT_FLOWS.find((item) => item.value === picture.textFlow) ?? TEXT_FLOWS[0];
  const otherSide = side === "front" ? "back" : "front";
  const button = cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 data-[state=open]:bg-accent",
    docked ? "h-11 min-w-11 flex-1" : "h-[34px] min-w-9",
  );
  // Docked, the text menu takes the first row and the buttons share the second
  const divider = docked ? null : <span aria-hidden className="mx-0.5 h-[22px] w-px shrink-0 bg-line-strong" />;
  const tip = (label: string, trigger: ReactNode) => (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side={docked ? "top" : "bottom"} className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Picture"
      className={cn(
        "flex items-center rounded-xl border border-line-strong bg-popover p-1 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.7)]",
        docked ? "w-full flex-wrap justify-center gap-1" : "h-11 gap-0.5",
        className,
      )}
      style={style}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={onKeyDown}
    >
      <DropdownMenu>
        {tip("How the text and this picture share the card",
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn(button, "justify-start whitespace-nowrap", docked ? "basis-full px-3" : "w-[176px]")}>
              <TextFlowIcon flow={flow.value} />
              <span className="flex-1 text-left">{flow.label}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>)}
        <DropdownMenuContent align="start" className="w-72 p-1.5">
          <DropdownMenuLabel className="px-2 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">Text around this picture</DropdownMenuLabel>
          <DropdownMenuPrimitive.RadioGroup value={picture.textFlow} onValueChange={(value) => onTextFlow(value as StandardTextFlow)}>
            {TEXT_FLOWS.map((item) => (
              <DropdownMenuPrimitive.RadioItem
                key={item.value}
                value={item.value}
                className="group flex cursor-default select-none items-center gap-3 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent data-[state=checked]:bg-accent/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary group-data-[state=checked]:bg-primary/15 group-data-[state=checked]:text-primary">
                  <TextFlowIcon flow={item.value} className="h-5 w-5" />
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.hint}</span>
                </span>
                <DropdownMenuPrimitive.ItemIndicator>
                  <Check className="h-4 w-4 text-primary" />
                </DropdownMenuPrimitive.ItemIndicator>
              </DropdownMenuPrimitive.RadioItem>
            ))}
          </DropdownMenuPrimitive.RadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {divider}
      {tip("Rotate 90°", <button type="button" className={button} aria-label="Rotate 90 degrees clockwise" onClick={onRotate}><RotateCw className="h-[17px] w-[17px]" /></button>)}
      {tip(picture.rotation ? "Straighten" : "Drag the round handle to turn it",
        <button type="button" className={cn(button, "w-12 tabular-nums text-muted-foreground")} aria-label={`Rotation ${formatAngle(picture.rotation)}. Straighten`} onClick={onResetRotation}>{formatAngle(picture.rotation)}</button>)}
      {divider}
      <DropdownMenu>
        {tip("Arrange",
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn(button, "gap-0.5")} aria-label="Arrange">
              <Layers className="h-[17px] w-[17px]" />
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>
          </DropdownMenuTrigger>)}
        <DropdownMenuContent align="start" className="w-60 p-1.5">
          {ARRANGE.map((item) => (
            <DropdownMenuItem
              key={item.move}
              className="gap-2.5 rounded-lg py-2"
              disabled={item.move === "front" || item.move === "forward" ? limits.atFront : limits.atBack}
              onSelect={() => onArrange(item.move)}
            >
              {item.icon}
              {item.label}
              <DropdownMenuShortcut className="tracking-normal">{item.shortcut}</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
          {picture.textFlow === "behind" && (
            <p className="max-w-[13.5rem] px-2 pb-1 pt-1.5 text-xs leading-4 text-muted-foreground">This picture stays behind the words. Change that under Text.</p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {divider}
      {tip(`Move to the ${otherSide}`, <button type="button" className={button} aria-label={`Move to the ${otherSide} of the card`} onClick={onMoveSide}><ArrowLeftRight className="h-[17px] w-[17px]" /></button>)}
      {tip("Duplicate", <button type="button" className={button} aria-label="Duplicate picture" onClick={onDuplicate}><Copy className="h-[17px] w-[17px]" /></button>)}
      {onUncrop && tip("Show the whole picture", <button type="button" className={button} aria-label="Show the whole picture" onClick={onUncrop}><Crop className="h-[17px] w-[17px]" /></button>)}
      {tip("Delete", <button type="button" className={cn(button, "hover:bg-destructive/20 hover:text-red-300")} aria-label="Delete picture" onClick={onDelete}><Trash2 className="h-[17px] w-[17px]" /></button>)}
    </div>
  );
});
PictureToolbar.displayName = "PictureToolbar";
