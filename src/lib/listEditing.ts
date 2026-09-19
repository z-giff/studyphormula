/**
 * List auto-formatting for the flashcard editors.
 *
 * Pure text transforms, so the same behaviour applies to the term and the
 * definition field and both can be covered by tests without a DOM:
 *
 *  - typing "- " at the start of a line promotes the dash to a real bullet;
 *  - Enter inside a list item opens the next item, continuing the numbering;
 *  - Enter on an empty item drops the marker and returns to plain paragraphs.
 */
import { BULLET, matchBulletLine, matchNumberLine } from "./flashcardText";

/** The value and caret position a transform wants the textarea to take. */
export interface TextEdit {
  value: string;
  caret: number;
}

/** Bounds of the line containing `caret`. */
const lineAt = (value: string, caret: number) => {
  const start = value.lastIndexOf("\n", caret - 1) + 1;
  const nlAfter = value.indexOf("\n", caret);
  return { start, end: nlAfter === -1 ? value.length : nlAfter };
};

/**
 * Promote a just-typed "- " into "• ".
 *
 * Runs on every input event: the dash is only converted at the moment the
 * space lands, when everything before the caret on that line is the dash
 * itself, so dashes inside a sentence or a typed range like "5 - 3" are left
 * alone. Returns null when there is nothing to change.
 */
export function promoteDashToBullet(value: string, caret: number): TextEdit | null {
  const { start } = lineAt(value, caret);
  const before = value.slice(start, caret);
  if (!/^[ \t]*-[ \t]$/.test(before)) return null;

  const dash = caret - 2; // the "-" sits just before the space that triggered us
  return {
    value: value.slice(0, dash) + BULLET + value.slice(dash + 1),
    caret, // same length in, same length out
  };
}

/**
 * Handle Enter inside a list.
 *
 * Returns null when the caret is not in a list item, leaving Enter to insert
 * an ordinary newline.
 */
export function continueListOnEnter(value: string, caret: number): TextEdit | null {
  const { start, end } = lineAt(value, caret);
  const line = value.slice(start, end);

  const bullet = matchBulletLine(line);
  const numbered = bullet ? null : matchNumberLine(line);
  if (!bullet && !numbered) return null;

  const item = bullet ?? numbered!;
  if (!item.text.trim()) {
    // An empty item: Enter ends the list. The marker is removed and the caret
    // stays put on the now-blank line, so typing continues as a paragraph.
    return { value: value.slice(0, start) + value.slice(end), caret: start };
  }

  // Anything after the caret rides along into the new item, which is what
  // splitting an item in the middle should do.
  const marker = bullet ? `${BULLET} ` : `${numbered!.number + 1}. `;
  const insert = `\n${marker}`;
  return {
    value: value.slice(0, caret) + insert + value.slice(caret),
    caret: caret + insert.length,
  };
}
