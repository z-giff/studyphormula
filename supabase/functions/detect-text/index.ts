import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OCR_CONFIDENCE_THRESHOLD = 0.86;

interface DetectedTextBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  confidence: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseJsonArray(content: string): unknown[] | null {
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonText = codeBlockMatch?.[1] ?? content.match(/\[[\s\S]*\]/)?.[0];

  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function sanitizeTextBoxes(rawBoxes: unknown): DetectedTextBox[] {
  if (!Array.isArray(rawBoxes)) return [];

  return rawBoxes.flatMap((box: any) => {
    const text = typeof box?.text === 'string' ? box.text.trim().replace(/\s+/g, ' ') : '';
    const confidence = Number(box?.confidence);
    const rawX = Number(box?.x);
    const rawY = Number(box?.y);
    const rawWidth = Number(box?.width);
    const rawHeight = Number(box?.height);
    const rawFontSize = Number(box?.fontSize);

    if (!text || text.length < 2 || !/[A-Za-z0-9]/.test(text)) return [];
    if (!Number.isFinite(confidence) || confidence < OCR_CONFIDENCE_THRESHOLD) return [];
    if (![rawX, rawY, rawWidth, rawHeight].every(Number.isFinite)) return [];
    if (rawWidth < 1.5 || rawHeight < 0.8 || rawWidth > 60 || rawHeight > 20) return [];

    const x = clamp(rawX, 0, 100);
    const y = clamp(rawY, 0, 100);
    const width = clamp(rawWidth, 0, 100 - x);
    const height = clamp(rawHeight, 0, 100 - y);

    if (width < 1.5 || height < 0.8) return [];

    return [{
      text,
      x,
      y,
      width,
      height,
      fontSize: clamp(Number.isFinite(rawFontSize) ? rawFontSize : 14, 8, 48),
      confidence,
    }];
  });
}


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
                text: `You are a strict high-precision OCR verifier for study diagrams. Detect ONLY visible, readable text labels that you can localize with high confidence.

Accuracy is more important than quantity. It is better to return 8 correct labels than 20 labels with any false positives.

For each label, return a bounding box anchored directly to the real visible text. The box must be centered on the actual text location and match the actual text dimensions closely enough that an opaque rectangle placed there would cover the original label. Never invent labels and never place boxes in blank areas.

MANDATORY VALIDATION BEFORE RETURNING EACH BOX:
1. Confirm there are visible glyphs/letters inside the proposed box.
2. Confirm the visible glyphs spell the returned text.
3. Confirm the box overlaps the original text itself, not a pointer line, organ area, blank whitespace, or nearby region.
4. If the text or its exact location is uncertain, REJECT it.
5. Assign confidence from 0 to 1 based on both text readability and location accuracy. Only return boxes with confidence >= ${OCR_CONFIDENCE_THRESHOLD}.

CRITICAL RULES:
- GROUP nearby words that visually belong to one label into ONE box (e.g. "Aortic valve", "Pulmonary artery", "Right ventricle", "Left atrium" = one box each, NOT separate words).
- If a label wraps onto two lines, return ONE box spanning BOTH lines and only if both lines are clearly part of the same label.
- Coordinates are percentages of the full image: x,y = top-left corner; (0,0) is top-left, (100,100) is bottom-right.
- Width and height must match the actual text area with only a small margin. Do not use oversized boxes to compensate for uncertainty.
- Do NOT detect text that is absent, partially guessed, hidden, decorative, a watermark, or part of the illustration/arrow/shape.
- Do NOT infer common anatomy labels unless the exact words are visibly present at that exact location.
- Reject any detection that would put a box far away from the source text.
- Estimate fontSize as the pixel height of a capital letter mapped to a 8–48 range.

Return ONLY a JSON array, no prose, no markdown. Include confidence on every item:
[
  { "text": "Aortic valve", "x": 70.2, "y": 55.4, "width": 14.8, "height": 4.2, "fontSize": 18, "confidence": 0.94 }
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

    const parsedBoxes = parseJsonArray(content);

    if (!parsedBoxes) {
      console.error('Could not find JSON in response');
      return new Response(JSON.stringify({ error: 'Failed to process image' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const textBoxes = sanitizeTextBoxes(parsedBoxes);
    console.log('Detected high-confidence text boxes count:', textBoxes.length);

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
