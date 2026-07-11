import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_flashcard",
  title: "Create flashcard",
  description: "Add a standard term/definition flashcard to an existing set owned by the signed-in user.",
  inputSchema: {
    set_id: z.string().uuid(),
    term: z.string().trim().min(1).max(2000),
    definition: z.string().trim().min(1).max(4000),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ set_id, term, definition }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data: last } = await supabase
      .from("flashcards")
      .select("position")
      .eq("set_id", set_id)
      .order("position", { ascending: false })
      .limit(1);
    const nextPosition = (last?.[0]?.position ?? -1) + 1;
    const { data, error } = await supabase
      .from("flashcards")
      .insert({ set_id, term, definition, position: nextPosition, flashcard_type: "standard" })
      .select("id, term, definition, position")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { flashcard: data },
    };
  },
});