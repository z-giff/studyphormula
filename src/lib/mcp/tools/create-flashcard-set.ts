import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_flashcard_set",
  title: "Create flashcard set",
  description: "Create a new empty flashcard set for the signed-in user.",
  inputSchema: {
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    color: z.string().max(32).optional().describe("Hex color like #38b6ff."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, description, color }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("flashcard_sets")
      .insert({ user_id: ctx.getUserId(), title, description: description ?? null, color: color ?? "#000000" })
      .select("id, title, description, color")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { set: data },
    };
  },
});