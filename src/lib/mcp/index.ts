import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listFlashcardSets from "./tools/list-flashcard-sets";
import getFlashcardSet from "./tools/get-flashcard-set";
import createFlashcardSet from "./tools/create-flashcard-set";
import createFlashcard from "./tools/create-flashcard";
import deleteFlashcard from "./tools/delete-flashcard";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "phormula-mcp",
  title: "Phormula",
  version: "0.1.0",
  instructions:
    "Tools for the Phormula flashcard app. List a user's flashcard sets, read the cards in a set, and create or delete flashcards on the signed-in user's account.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listFlashcardSets,
    getFlashcardSet,
    createFlashcardSet,
    createFlashcard,
    deleteFlashcard,
  ],
});