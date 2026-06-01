import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


function isValidImageSource(urlString: string): boolean {
  // Allow data URLs (base64 encoded images)
  if (urlString.startsWith('data:image/')) {
    return true;
  }
  
  // For regular URLs, validate protocol is https
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Fetch an image URL and convert to base64 data URL for the AI API
async function imageUrlToDataUrl(urlString: string): Promise<string> {
  if (urlString.startsWith('data:')) {
    return urlString;
  }
  const resp = await fetch(urlString);
  if (!resp.ok) {
    throw new Error(`Failed to fetch image: ${resp.status}`);
  }
  const contentType = resp.headers.get('content-type') || 'image/jpeg';
  const buffer = await resp.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return `data:${contentType};base64,${base64}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user's session using Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    const body = await req.json();
    const { imageUrl } = body;

    // Validate imageUrl exists and is a string
    if (!imageUrl || typeof imageUrl !== 'string') {
      console.error('Invalid imageUrl parameter');
      return new Response(JSON.stringify({ error: 'Invalid request: imageUrl is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL format and allowed domains
    if (!isValidImageSource(imageUrl)) {
      console.error('URL validation failed for:', imageUrl);
      return new Response(JSON.stringify({ error: 'Invalid request: URL not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Detecting text in image for user:', user.id);

    // Convert external URLs to data URLs so the AI gateway can access them
    const resolvedImageUrl = await imageUrlToDataUrl(imageUrl);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a precise OCR bounding-box detector. Detect every visible text LABEL in this image (anatomy labels, diagram callouts, captions, titles, etc.).

For each label, return a bounding box that COMPLETELY COVERS the entire phrase — from the very first character on the left to the very last character on the right, and from the top of the tallest glyph (including ascenders/caps) to the bottom of descenders. The box must fully enclose every letter so that an opaque rectangle placed at those coordinates would hide the original text entirely with no letters peeking out on any side.

CRITICAL RULES:
- GROUP multi-word phrases that visually belong to the same label into ONE single box (e.g. "Aortic valve", "Pulmonary artery", "Left ventricle" = one box each, NOT one per word).
- If a label wraps onto two lines (e.g. "Pulmonary" above "artery"), return ONE box that spans BOTH lines vertically and is wide enough to cover the widest line.
- Width must equal the FULL pixel width of the phrase (longest line if multi-line), not just one word.
- Height must equal the FULL pixel height of the text including ascenders and descenders (and all lines if multi-line).
- Coordinates are percentages of the full image: x,y = top-left corner of the box; (0,0) is top-left, (100,100) is bottom-right.
- Add a tiny safety margin (~1% of image dimensions) on every side so the box slightly overshoots the glyphs rather than clipping them. Never undershoot.
- Do NOT detect text that is part of the illustration itself (arrows, flow markers, watermarks) — only readable labels.
- Estimate fontSize as the pixel height of a capital letter mapped to a 8–48 range.

Return ONLY a JSON array, no prose, no markdown:
[
  { "text": "Aortic valve", "x": 70.2, "y": 55.4, "width": 14.8, "height": 4.2, "fontSize": 18 }
]`
              },
              {
                type: "image_url",
                image_url: {
                  url: resolvedImageUrl
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to process image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No response from AI");
      return new Response(JSON.stringify({ error: 'Failed to process image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    let jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Try to find JSON in code blocks
      jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (jsonMatch) {
        jsonMatch = [jsonMatch[1]];
      }
    }

    if (!jsonMatch) {
      console.error('Could not find JSON in response');
      return new Response(JSON.stringify({ error: 'Failed to process image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const textBoxes = JSON.parse(jsonMatch[0]);
    console.log('Detected text boxes count:', textBoxes.length);

    return new Response(JSON.stringify({ textBoxes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in detect-text function:', error);
    return new Response(JSON.stringify({ error: 'Failed to process image' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
