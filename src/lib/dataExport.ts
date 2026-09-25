// Export My Data (Privacy & Security): everything Phormula keeps about the
// signed-in user, in one JSON file. The Privacy Policy (§11) promises it
// covers all of their data, so anything new that's stored per user belongs
// here too.

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { exportOwnStandardCardImages } from "@/lib/standardCardLayout";

// Supabase answers failures as { error } rather than throwing
function check<T>(what: string, { data, error }: { data: T; error: unknown }): T {
  if (error) {
    console.error(`Export: couldn't read ${what}`, error);
    throw new Error(`Couldn't read your ${what}`);
  }
  return data;
}

export async function buildDataExport(user: User): Promise<Blob> {
  const [profile, premium, files, sets, shares, pictures] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.rpc("get_premium_status").maybeSingle(),
    supabase.from("flashcard_files").select("*").eq("user_id", user.id).order("created_at"),
    // Each set with its sections and cards; bookmarks and resume position are on these rows
    supabase.from("flashcard_sets").select("*, sections(*), flashcards(*)").eq("user_id", user.id).order("created_at"),
    supabase.rpc("export_flashcard_shares"),
    exportOwnStandardCardImages(user.id),
  ]);

  const data = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      sign_in_methods: user.app_metadata?.providers ?? [],
    },
    profile: check("profile", profile),
    premium: check("Premium status", premium),
    files: check("files", files),
    sets: check("flashcard sets", sets),
    // Shares you sent (who to, when) and shares sent to you
    shares: check("shares", shares),
    // Pictures uploaded to cards, keyed by the path cards use after "storage:"
    pictures,
  };

  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
}
