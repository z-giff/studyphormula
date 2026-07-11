import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_flashcard_sets",
  title: "List flashcard sets",
  description: "List the signed-in user's flashcard sets, most recently updated first.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max number of sets to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("flashcard_sets")
      .select("id, title, description, color, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { sets: data ?? [] },
    };
  },
});