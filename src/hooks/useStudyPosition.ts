import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// How long a new position waits before it is written. Long enough that
// clicking through a stack is one write rather than one per card, short
// enough that a refresh right after the last click still lands on that card.
const SAVE_DELAY_MS = 400;

/**
 * Remembers which card of a set the user is on, so reopening the set resumes
 * there instead of restarting at the first card. The position lives on the set
 * row itself (`flashcard_sets.last_card_index`), which keeps it per set and
 * per user — sets have a single owner — and out of page-local state.
 *
 * Returns a `savePosition(index)` to call with the 0-based index of whichever
 * card is now showing.
 */
export const useStudyPosition = (setId: string | undefined) => {
  const pendingIndex = useRef<number | null>(null);
  const savedIndex = useRef<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const index = pendingIndex.current;
    pendingIndex.current = null;
    if (!setId || index === null || index === savedIndex.current) return;
    savedIndex.current = index;

    void (async () => {
      try {
        await supabase
          .from("flashcard_sets")
          .update({ last_card_index: index })
          .eq("id", setId);
      } catch {
        // no-op: resuming is a convenience, not worth interrupting a study
        // session over, and the next move writes the position again
      }
    })();
  }, [setId]);

  const savePosition = useCallback(
    (index: number) => {
      pendingIndex.current = index;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  // Don't drop the last move when the user leaves the set or the page goes away
  useEffect(() => {
    const handlePageHide = () => flush();
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      flush();
    };
  }, [flush]);

  return savePosition;
};
