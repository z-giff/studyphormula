/**
 * Flashcard rich-text: one plain-text format shared by the editors and every
 * study view, so what a user types is exactly what they see when flipping.
 *
 * The format is deliberately plain text (no markup, no schema change): a card
 * stores the literal characters the user typed. Meaning is derived from the
 * shape of each line:
 *
 *   • item        →  bullet item ("-" and "*" are accepted too, so cards
 *                    written before this existed still read as lists)
 *   1. item       →  numbered item ("1)" is accepted too)
 *   anything else →  paragraph text
 *   a blank line  →  ends the current block
 *
 * Line breaks inside a paragraph are kept, and a blank line between two
 * paragraphs renders as a real gap rather than collapsing into one run of text.
 */

/** A bullet item, or a numbered item carrying the number the user typed. */
export interface ListItem {
  /** Rendered marker: "•" for bullets, the typed number for ordered lists. */
  marker: string;
  text: string;
}

export type FlashcardBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "bullet"; items: ListItem[] }
  | { kind: "number"; items: ListItem[] };

/** `- text`, `* text`, `• text` — the trailing text may be empty. */
const BULLET_LINE = /^[ \t]*([-*•])(?:[ \t]+(.*))?$/;
/** `1. text`, `12) text` — the trailing text may be empty. */
const NUMBER_LINE = /^[ \t]*(\d{1,3})[.)](?:[ \t]+(.*))?$/;

/** The glyph a typed "-" is promoted to, and what the study view draws. */
export const BULLET = "•";

export const matchBulletLine = (line: string) => {
  const m = BULLET_LINE.exec(line);
  return m ? { text: m[2] ?? "" } : null;
};

export const matchNumberLine = (line: string) => {
  const m = NUMBER_LINE.exec(line);
  return m ? { number: Number(m[1]), text: m[2] ?? "" } : null;
};

/** True when the text contains at least one bullet or numbered line. */
export const hasListFormatting = (text: string): boolean =>
  text.split("\n").some((line) => matchBulletLine(line) || matchNumberLine(line));

/**
 * Split raw card text into renderable blocks. Consecutive list lines of the
 * same kind collapse into one list; everything else accumulates into
 * paragraphs that are broken by blank lines.
 */
export function parseFlashcardText(text: string): FlashcardBlock[] {
  const blocks: FlashcardBlock[] = [];
  // The block currently being accumulated, flushed whenever the kind changes.
  let paragraph: string[] = [];
  let list: ListItem[] | null = null;
  let listKind: "bullet" | "number" = "bullet";

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
      paragraph = [];
    }
    if (list) {
      // A dangling empty marker is the list the user was still typing when
      // they saved — drop it rather than drawing a stray bullet.
      while (list.length && !list[list.length - 1].text.trim()) list.pop();
      if (list.length) blocks.push({ kind: listKind, items: list });
      list = null;
    }
  };

  for (const line of text.split("\n")) {
    const bullet = matchBulletLine(line);
    const numbered = bullet ? null : matchNumberLine(line);

    if (bullet || numbered) {
      const kind = bullet ? "bullet" : "number";
      if (paragraph.length || (list && listKind !== kind)) flush();
      listKind = kind;
      list ??= [];
      list.push({
        marker: bullet ? BULLET : `${numbered!.number}.`,
        text: (bullet ? bullet.text : numbered!.text).trim(),
      });
      continue;
    }

    if (!line.trim()) {
      // A blank line closes whatever block is open; paragraphs are separated
      // by the gap between blocks rather than by an empty line of text.
      flush();
      continue;
    }

    if (list) flush();
    paragraph.push(line);
  }

  flush();
  return blocks;
}
