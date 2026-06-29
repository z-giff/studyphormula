 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
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
 
    const systemPrompt = `You are an expert educator creating high-quality flashcards optimized for memorization and active recall.

For each concept in the provided content, you must INDEPENDENTLY decide which of two flashcard formats best promotes learning for that specific concept, and then naturally mix both formats throughout the set:

1. Definition ↔ Term format (term on front, definition on back)
   Use for: vocabulary, anatomical structures, named processes, equations, laws, chemical compounds, classifications, and any concept where direct recall of a name/definition is most effective.

2. Question ↔ Answer format (question on front, answer on back)
   Use for: mechanisms, cause-and-effect relationships, applications, comparisons, "why" and "how" concepts, multi-step processes, clinical reasoning, and any concept where active retrieval beats simple definition recall.

Guiding principle: do NOT force a single format. Choose whichever format best helps a student remember each specific piece of information. Straightforward concepts → definition/term. Complex or applied concepts → question/answer. A good set will naturally alternate between both styles.

Quality rules:
- Generate concise, high-quality flashcards (typically 5-20 depending on content length).
- Avoid repetitive or redundant cards.
- Keep questions and answers tight; no unnecessary length.
- Preserve important terminology exactly where appropriate.
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
           { role: 'user', content: `Generate flashcards from this content:\n\n${content.substring(0, 30000)}` }
         ],
         tools: [
           {
             type: 'function',
             function: {
               name: 'generate_flashcards',
               description: 'Generate flashcards from the provided content',
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
      console.log('AI response received:', JSON.stringify(data, null, 2));
      
      // Extract flashcards from tool call response
      let flashcards: Array<{ term: string; definition: string }> = [];
      
      const toolCalls = data.choices?.[0]?.message?.tool_calls;
      console.log('Tool calls found:', toolCalls ? toolCalls.length : 0);
      
      if (toolCalls && toolCalls.length > 0) {
        try {
          const args = JSON.parse(toolCalls[0].function.arguments);
          console.log('Parsed tool arguments:', JSON.stringify(args, null, 2));
          flashcards = args.flashcards || [];
        } catch (parseError) {
          console.error('Failed to parse tool call arguments:', parseError);
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