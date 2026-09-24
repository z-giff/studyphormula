/**
 * Flowchart and drawing cards show the board the user made on their back
 * instead of a definition, on a white back in every study view and theme.
 */

/** The back of a board card is white in every theme, whatever the set's colour. */
export const BOARD_BACK_COLOR = "#ffffff";

export const hasBoardBack = (card: { flashcard_type?: string; interactive_data?: unknown }): boolean =>
  (card.flashcard_type === "flowchart" || card.flashcard_type === "drawing") &&
  !!card.interactive_data;
