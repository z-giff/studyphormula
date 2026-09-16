/**
 * The look of an interactive flashcard text box.
 *
 * Auto-detect produces every box in the same neutral style — white fill, black
 * answer text — so a freshly detected diagram reads consistently instead of
 * each mask taking on whatever colour happened to sit behind its label. The
 * editor then lets a user recolour and resize boxes individually, so these are
 * defaults and fallbacks rather than fixed rules.
 *
 * The outline is the exception: every box carries the same one, in the editor
 * and in study mode alike, so a mask stays findable on any artwork.
 *
 * Editor and study mode both read from here; keeping the values in one place is
 * what stops the two views from drifting apart.
 */

/** Fill a box uses until the user picks another colour. */
export const DEFAULT_BOX_COLOR = "#FFFFFF";
/** Answer colour a box uses until the user picks another colour. */
export const DEFAULT_FONT_COLOR = "#000000";
/** Answer size, in px, a box uses until the user changes it. */
export const DEFAULT_FONT_SIZE = 14;
/** Answer weight. Nothing edits this yet; it is carried so formatting copies whole. */
export const DEFAULT_FONT_WEIGHT = "normal";

export const BOX_BORDER_WIDTH = 2;
export const BOX_BORDER_COLOR = "#000000";

/** `box-sizing: border-box` keeps this inset, so a box never outgrows its detected bounds. */
export const BOX_BORDER = `${BOX_BORDER_WIDTH}px solid ${BOX_BORDER_COLOR}`;

/** Bounds of the font-size control, matching the range the detector clamps to. */
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 48;

/** Everything about a box that "Apply to all" copies. */
export interface TextBoxFormat {
  bgColor: string;
  fontColor: string;
  fontSize: number;
  fontWeight: string;
}

/**
 * The formatting of `box`, with defaults filled in.
 *
 * Cards saved before boxes carried formatting — and before auto-detect settled
 * on white — have some or all of these fields missing, so every read goes
 * through here rather than repeating fallbacks at each use site.
 */
export function formatOf(box: Partial<TextBoxFormat>): TextBoxFormat {
  return {
    bgColor: box.bgColor || DEFAULT_BOX_COLOR,
    fontColor: box.fontColor || DEFAULT_FONT_COLOR,
    fontSize: box.fontSize || DEFAULT_FONT_SIZE,
    fontWeight: box.fontWeight || DEFAULT_FONT_WEIGHT,
  };
}
