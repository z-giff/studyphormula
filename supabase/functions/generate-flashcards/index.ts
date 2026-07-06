 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };

const MAX_FLASHCARDS = 100;

// Recovers complete card objects from a JSON string that may be truncated
// (e.g. a large tool-call payload cut off mid-stream). Scans the flashcards
// array and parses each complete top-level object, skipping any partial
// trailing one.
function salvageFlashcards(raw: string): Array<{ term: string; definition: string }> {
  const cards: Array<{ term: string; definition: string }> = [];
  const start = raw.indexOf('[');
  if (start === -1) return cards;
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escaped = false;
  for (let i = start + 1; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') { if (depth === 0) objStart = i; depth++; }
    else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try { cards.push(JSON.parse(raw.slice(objStart, i + 1))); } catch { /* skip partial */ }
        objStart = -1;
      }
    } else if (ch === ']' && depth === 0) break;
  }
  return cards;
}
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
    const { content } = await req.json();
     
     if (!content || typeof content !== 'string') {
       return new Response(JSON.stringify({ error: 'Content is required' }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
     if (!LOVABLE_API_KEY) {
       console.error('LOVABLE_API_KEY is not configured');
       return new Response(JSON.stringify({ error: 'AI service not configured' }), {
         status: 500,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
    const systemPrompt = `You are an expert educator creating a COMPLETE, exam-focused flashcard study set optimized for long-term understanding, active recall, and assessment preparation.

Your goal: a student should be able to study ONLY these flashcards and gain a thorough understanding of the material while being well prepared for quizzes, midterms, and final exams.

CARD COUNT — scale with the material, up to a hard maximum of 100 cards:
- Determine the number of flashcards from the amount and complexity of the content — never from a fixed default.
- Short or simple content (roughly a page or less) → a focused set of around 10-25 cards.
- Medium content (several pages or a short lecture) → around 25-50 cards.
- Long or information-dense material (full lecture decks, textbook chapters, multi-page documents) → 50-100 cards. Err toward MORE cards for dense material; undershooting coverage is worse than a large set.
- Never exceed 100 cards, and never pad with filler just to reach a number — every card must earn its place.

COVERAGE — this is the top priority:
- Analyze the ENTIRE provided content and cover EVERY major topic and subtopic in the document.
- Prioritize high-yield information most likely to appear on quizzes and exams.
- Include important definitions, processes, mechanisms, formulas, relationships, comparisons, cause-and-effect concepts, exceptions, and high-yield facts (specific percentages, thresholds, years, categories, named frameworks/laws/models).
- Where the content describes charts, tables, figures, or diagrams, turn their key takeaways into flashcards (notable values, rankings, trends, and what they imply).
- Break complex concepts into several smaller, memorable flashcards rather than one long card.

CARD FORMATS — for each concept, INDEPENDENTLY choose the format that best reinforces it, and naturally mix styles across the set:
1. Term ↔ Definition — vocabulary, named laws/acts/frameworks, classifications, structures, formulas.
2. Question ↔ Answer — mechanisms, "why" and "how" concepts, multi-step processes, applied reasoning.
3. Comparison cards — "What is the difference between X and Y?" for contrasting concepts.
4. Cause/effect cards — "Why does X lead to Y?" for relationships and consequences.
5. Example-based cards — tie abstract concepts to concrete examples from the material.
6. Application/exam-style cards — deeper "why/how" questions a professor would ask on an exam.
7. Simplified-explanation cards — for complex topics, the answer explains the idea in a simple, easy-to-understand way while staying accurate to the material.
Never ask the user to pick a format — decide automatically per concept. Straightforward facts → term/definition. Complex or applied ideas → question/answer or explanation cards.

ORGANIZATION:
- Structure the set to follow the document's own logical sections (its major topics or slide groupings), ordering cards section by section from start to finish.
- End the set with a handful of deeper exam-style synthesis cards that tie the whole material together (e.g., overall takeaways, cross-topic "why" questions).

CARD QUALITY:
- Each flashcard must be concise, accurate, and focused on ONE key idea.
- Answers must be complete enough to actually learn from — avoid vague one-liners — but without unnecessary length.
- When a topic is complex, explain it simply (plain language, brief reasoning, or a quick example) while staying accurate to the provided material.
- Preserve important terminology exactly where appropriate.
- Avoid duplicate or repetitive cards and filler/overly obvious cards.
- Always populate the "term" field with the FRONT of the card (either the term OR the question) and the "definition" field with the BACK of the card (either the definition OR the answer). Do not add labels like "Q:" or "A:".`;
 
     console.log('Calling AI gateway for flashcard generation...');
     
     const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${LOVABLE_API_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         model: 'google/gemini-3-flash-preview',
         messages: [
           { role: 'system', content: systemPrompt },
           { role: 'user', content: `Generate a complete exam-prep flashcard set from this material. Do not restrict the output to 10-15 cards — scale the card count to the content, up to a maximum of 100 cards. For long or information-dense material, generate 50-100 cards; cover every major topic and subtopic. Focus on high-yield, testable material. Use a natural mix of definition, question/answer, comparison, application, and simplified explanation cards. If a concept is complex, explain it in a simple way. Make the final set detailed enough that a student could use it as their main study resource for a quiz, midterm, or final exam.\n\nMaterial:\n\n${content.substring(0, 120000)}` }
         ],
         tools: [
           {
             type: 'function',
             function: {
               name: 'generate_flashcards',
               description: 'Generate a complete exam-prep flashcard set from the provided content',
               parameters: {
                 type: 'object',
                 properties: {
                   flashcards: {
                     type: 'array',
                     items: {
                       type: 'object',
                       properties: {
                         term: { type: 'string', description: 'The term or question for the front of the card' },
                         definition: { type: 'string', description: 'The definition or answer for the back of the card' }
                       },
                       required: ['term', 'definition'],
                       additionalProperties: false
                     }
                   }
                 },
                 required: ['flashcards'],
                 additionalProperties: false
               }
             }
           }
         ],
         tool_choice: { type: 'function', function: { name: 'generate_flashcards' } },
         // Generous output budget so large sets (up to 100 cards) are never
         // cut off by a low gateway default.
         max_tokens: 32768
       }),
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error('AI gateway error:', response.status, errorText);
       
       if (response.status === 429) {
         return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
           status: 429,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
       }
       if (response.status === 402) {
         return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
           status: 402,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
       }
       
       return new Response(JSON.stringify({ error: 'AI generation failed' }), {
         status: 500,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
      const data = await response.json();
      console.log('AI response received, finish_reason:', data.choices?.[0]?.finish_reason);

      // Extract flashcards from tool call response
      let flashcards: Array<{ term: string; definition: string }> = [];

      const toolCalls = data.choices?.[0]?.message?.tool_calls;
      console.log('Tool calls found:', toolCalls ? toolCalls.length : 0);

      if (toolCalls && toolCalls.length > 0) {
        const rawArgs = toolCalls[0].function.arguments;
        try {
          const args = JSON.parse(rawArgs);
          flashcards = args.flashcards || [];
        } catch (parseError) {
          // Large outputs can occasionally be truncated mid-JSON; recover
          // every complete card instead of failing the whole generation.
          console.error('Failed to parse tool call arguments, salvaging complete cards:', parseError);
          flashcards = salvageFlashcards(rawArgs);
          console.log('Salvaged flashcards:', flashcards.length);
        }
      }
      
      // Fallback: try to parse from content if no tool calls
      if (flashcards.length === 0) {
        const messageContent = data.choices?.[0]?.message?.content;
        console.log('Fallback - message content:', messageContent);
        if (messageContent) {
          try {
            // Try to extract JSON from the content (might be wrapped in markdown)
            const jsonMatch = messageContent.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              flashcards = JSON.parse(jsonMatch[0]);
              console.log('Parsed flashcards from content:', flashcards.length);
            }
          } catch (parseError) {
            console.error('Failed to parse AI response content as JSON:', parseError);
          }
        }
      }
 
     // Keep only well-formed cards and enforce the hard cap.
     if (Array.isArray(flashcards)) {
       flashcards = flashcards
         .filter((c) => c && typeof c.term === 'string' && typeof c.definition === 'string' && c.term.trim() && c.definition.trim())
         .slice(0, MAX_FLASHCARDS);
     }

     if (!Array.isArray(flashcards) || flashcards.length === 0) {
       return new Response(JSON.stringify({ error: 'No flashcards could be generated from this content' }), {
         status: 400,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
     }
 
     console.log(`Generated ${flashcards.length} flashcards`);
 
     return new Response(JSON.stringify({ flashcards }), {
       status: 200,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
 
   } catch (error) {
     console.error('generate-flashcards error:', error);
     return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 });