import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You are an expert educational content creator specializing in exam preparation. Your job is to analyze uploaded study material and generate a COMPLETE, thorough flashcard set that covers every important concept.

GENERATION RULES:
1. Do NOT limit yourself to 10-15 flashcards. Generate as many as needed to fully cover the material.
   - Short content (< 500 words): 10-25 cards
   - Medium content (500-2000 words): 25-50 cards
   - Long/dense content (2000+ words): 50-100+ cards
2. Cover ALL important concepts: definitions, processes, examples, comparisons, statistics, named frameworks, categories, dates, principles, and key takeaways.
3. Do not skip small but testable details like numbers, specific examples, named models, or listed categories.
4. Avoid duplicate cards and filler/obvious cards.

FLASHCARD FORMAT:
Automatically choose the best format for each concept — do NOT ask the user. Use a natural mix of:
- Definition/term cards for vocabulary and key concepts
- Question/answer cards for understanding and application
- Comparison cards (e.g., "How does X differ from Y?")
- Cause/effect cards (e.g., "What happens when X?")
- Example-based cards (e.g., "Give an example of X")
- Application cards (e.g., "How would you apply X in practice?")
- "Why/How" explanation cards for complex topics

ANSWER QUALITY:
- Each answer must be detailed enough to actually learn from — not vague or overly short.
- For complex topics, explain simply while staying accurate to the source material.
- Keep answers clear and well-organized. Use short sentences.

STRUCTURE:
- Group flashcards by topic/section from the source material.
- Within each section, order cards from foundational concepts to more advanced ones.

OUTPUT: Return ONLY a JSON array of objects with "term" and "definition" fields. No markdown, no explanation, no wrapper text.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const content = body.content;

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

    const contentLength = content.length;
    const cardGuidance = contentLength < 1500
      ? 'This is short content. Generate 10-25 focused flashcards.'
      : contentLength < 6000
      ? 'This is medium-length content. Generate 25-50 thorough flashcards.'
      : 'This is long/dense content. Generate 50-100+ flashcards for comprehensive exam prep.';

    console.log(`Generating flashcards for content of length ${contentLength}...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Generate a complete exam-prep flashcard set from this material. ${cardGuidance} Do not restrict the output. Create as many flashcards as needed to thoroughly cover every testable concept.\n\n${content.substring(0, 60000)}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_flashcards',
              description: 'Generate a comprehensive set of flashcards from the provided content',
              parameters: {
                type: 'object',
                properties: {
                  flashcards: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        term: { type: 'string', description: 'The term, question, or prompt for the front of the card' },
                        definition: { type: 'string', description: 'The definition, answer, or explanation for the back of the card' }
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
        tool_choice: { type: 'function', function: { name: 'generate_flashcards' } }
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
    console.log('AI response received');

    let flashcards: Array<{ term: string; definition: string }> = [];

    const toolCalls = data.choices?.[0]?.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      try {
        const args = JSON.parse(toolCalls[0].function.arguments);
        flashcards = args.flashcards || [];
      } catch (parseError) {
        console.error('Failed to parse tool call arguments:', parseError);
      }
    }

    if (flashcards.length === 0) {
      const messageContent = data.choices?.[0]?.message?.content;
      if (messageContent) {
        try {
          const jsonMatch = messageContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            flashcards = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('Failed to parse AI response content as JSON:', parseError);
        }
      }
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
