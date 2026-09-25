// Sharing flashcard sets and files with other people by email. The rules live
// in the database (drizzle/migrations/0003_flashcard_sharing.sql, and 0006 for
// the email a share sends); this is the shape the app sees and the wording it
// shows.

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { copyForeignStandardCardImages } from "@/lib/standardCardLayout";

export type ShareItemType = "set" | "file";

/** One entry under Shared flashcards, as list_shared_flashcards returns it. */
export interface SharedItem {
  id: string;
  item_type: ShareItemType;
  title: string;
  sender_name: string;
  set_count: number;
  card_count: number;
  created_at: string;
  seen_at: string | null;
  /** The recipient's own copy, while it still exists */
  added_item_id: string | null;
}

export interface SharedSetSummary {
  id: string;
  title: string;
  description: string | null;
  color: string;
  card_count: number;
}

/** A share opened in the read-only viewer, as get_shared_flashcards returns it. */
export interface SharedItemDetail extends SharedItem {
  sets: SharedSetSummary[];
}

/** Matches the database's limit on one send. */
export const MAX_SHARE_RECIPIENTS = 25;

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export const describeSharedCounts = (item: Pick<SharedItem, "item_type" | "set_count" | "card_count">) =>
  item.item_type === "file"
    ? `${plural(item.set_count, "set")} · ${plural(item.card_count, "card")}`
    : plural(item.card_count, "card");

/** Where the recipient's copy lives once it's on their dashboard. */
export const addedItemPath = (type: ShareItemType, id: string) =>
  type === "file" ? `/file/${id}` : `/set/${id}`;

/** Supabase errors are plain objects rather than Error instances. */
export const errorMessage = (error: unknown, fallback: string) =>
  typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;

export const addedMessage =(item: Pick<SharedItem, "item_type" | "title">) =>
  `"${item.title}" is now in your ${item.item_type === "file" ? "files" : "sets"}`;

/**
 * Copy a share onto the signed-in user's dashboard. Adding one that's already
 * there hands back the existing copy instead of making another.
 */
export async function addSharedToDashboard(shareId: string) {
  const { data, error } = await supabase.rpc("add_shared_flashcards", { p_share_id: shareId });
  if (error) throw error;
  const added = data as unknown as { item_type: ShareItemType; item_id: string };
  try {
    await copySharedPictures(added.item_type, added.item_id);
  } catch (err) {
    // The copy is added either way; its pictures just keep coming from the
    // sender's storage while the share lasts
    console.error("Couldn't copy the shared pictures:", err);
  }
  return added;
}

/**
 * add_shared_flashcards copies the cards but not the pictures uploaded to
 * them, which stay in the sender's storage, readable only while the share
 * lasts. Copy them into the recipient's own storage so their copy keeps them.
 */
async function copySharedPictures(itemType: ShareItemType, itemId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  let setIds = [itemId];
  if (itemType === "file") {
    const { data: sets, error } = await supabase
      .from("flashcard_sets")
      .select("id")
      .eq("file_id", itemId)
      .eq("user_id", userId);
    if (error) throw error;
    setIds = sets.map((set) => set.id);
  }
  if (setIds.length === 0) return;

  const { data: cards, error } = await supabase
    .from("flashcards")
    .select("id, interactive_data")
    .in("set_id", setIds)
    .not("interactive_data", "is", null);
  if (error) throw error;

  // One copy of a picture, however many cards use it
  const copies = new Map<string, Promise<string | null>>();
  for (const card of cards) {
    const interactiveData = await copyForeignStandardCardImages(card.interactive_data, userId, copies);
    if (!interactiveData) continue;
    const { error: updateError } = await supabase
      .from("flashcards")
      .update({ interactive_data: interactiveData as Json })
      .eq("id", card.id);
    // One card that can't be updated doesn't hold up the rest
    if (updateError) console.error(`Couldn't point card ${card.id} at its copied pictures:`, updateError);
  }
}
