import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_flashcard_set",
  title: "Get flashcard set",
  description: "Read a single flashcard set and all of its flashcards (term, definition, position).",
  inputSchema: {
    set_id: z.string().uuid().describe("The flashcard set id."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ set_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: set, error: setErr } = await supabase
      .from("flashcard_sets")
      .select("id, title, description, color, created_at, updated_at")
      .eq("id", set_id)
      .maybeSingle();
    if (setErr) return { content: [{ type: "text", text: setErr.message }], isError: true };
    if (!set) return { content: [{ type: "text", text: "Set not found" }], isError: true };
    const { data: cards, error: cardErr } = await supabase
      .from("flashcards")
      .select("id, term, definition, position, flashcard_type, is_bookmarked")
      .eq("set_id", set_id)
      .order("position", { ascending: true });
    if (cardErr) return { content: [{ type: "text", text: cardErr.message }], isError: true };
    const payload = { set, flashcards: cards ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});