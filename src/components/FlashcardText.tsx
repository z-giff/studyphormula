import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { parseFlashcardText, type FlashcardBlock } from "@/lib/flashcardText";

/**
 * Renders a card's term or definition the way it was typed.
 *
 * Two layouts, chosen by the content itself:
 *  - plain paragraphs are centred, keeping every line break the user entered
 *    and showing a real gap where they left a blank line;
 *  - as soon as the text contains a bullet or numbered list the whole block
 *    goes left-aligned, so markers and their text line up down the card
 *    instead of each item floating on its own centre.
 *
 * Either way the block itself stays centred in the card: the study views place
 * it in a `flex items-center justify-center` box and this fills the width, so
 * vertical (and, for paragraphs, horizontal) centring is unchanged.
 *
 * Spacing is expressed in `em` so one component serves the 3xl term on the
 * study page and the lg definition in the stacked deck without retuning.
 */
interface FlashcardTextProps {
  text: string;
  /** Typography for the block — size, weight, leading. */
  className?: string;
  style?: React.CSSProperties;
}

const renderBlock = (block: FlashcardBlock, key: number) => {
  if (block.kind === "paragraph") {
    // pre-wrap: single newlines stay newlines, and runs of spaces the user
    // typed for alignment survive.
    return (
      <p key={key} className="whitespace-pre-wrap">
        {block.text}
      </p>
    );
  }

  const List = block.kind === "number" ? "ol" : "ul";
  return (
    <List key={key} className="list-none space-y-[0.5em] p-0">
      {block.items.map((item, i) => (
        <li key={i} className="flex gap-[0.6em]">
          <span
            aria-hidden
            className={cn(
              "shrink-0 select-none",
              block.kind === "number" && "tabular-nums",
            )}
          >
            {item.marker}
          </span>
          <span className="min-w-0 flex-1 whitespace-pre-wrap">{item.text}</span>
        </li>
      ))}
    </List>
  );
};

export const FlashcardText = ({ text, className, style }: FlashcardTextProps) => {
  const blocks = useMemo(() => parseFlashcardText(text ?? ""), [text]);
  const isList = blocks.some((b) => b.kind !== "paragraph");

  return (
    <div
      className={cn(
        "w-full min-w-0 break-words space-y-[0.75em]",
        isList ? "text-left" : "text-center",
        className,
      )}
      style={style}
    >
      {blocks.map(renderBlock)}
    </div>
  );
};

export default FlashcardText;
