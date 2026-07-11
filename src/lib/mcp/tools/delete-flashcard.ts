import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "delete_flashcard",
  title: "Delete flashcard",
  description: "Delete a single flashcard by id from a set owned by the signed-in user.",
  inputSchema: {
    flashcard_id: z.string().uuid(),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ flashcard_id }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase.from("flashcards").delete().eq("id", flashcard_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Deleted ${flashcard_id}` }], structuredContent: { deleted: flashcard_id } };
  },
});