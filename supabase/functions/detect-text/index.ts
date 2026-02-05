import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed domains for image URLs (Supabase storage and common image hosts)
const ALLOWED_HOSTS = [
  'supabase.co',
  'supabase.com',
  'awvwrdjtptjyalmsyejt.supabase.co',
];

function isValidImageSource(urlString: string): boolean {
  // Allow data URLs (base64 encoded images)
  if (urlString.startsWith('data:image/')) {
    // Validate it's a proper data URL with base64 content
    const dataUrlRegex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/]+=*$/;
    return dataUrlRegex.test(urlString);
  }
  
  // For regular URLs, validate protocol and host
  try {
    const url = new URL(urlString);
    
    // Check if protocol is https
    if (url.protocol !== 'https:') {
      return false;
    }
    
    // Check if host is allowed
    const isAllowed = ALLOWED_HOSTS.some(host => 
      url.hostname === host || url.hostname.endsWith('.' + host)
    );
    
    return isAllowed;
  } catch {
    return false;
  }
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
                text: `Analyze this image and detect all visible text regions. For each text region, provide:
1. The exact text content
2. The bounding box coordinates as percentages (x, y, width, height) where (0,0) is top-left and (100,100) is bottom-right
3. Estimated font size (8-48)

Return ONLY a JSON array with this structure:
[
  {
    "text": "detected text",
    "x": 10.5,
    "y": 20.3,
    "width": 15.2,
    "height": 5.1,
    "fontSize": 14
  }
]

Be precise with coordinates and include all visible text, even small labels.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
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
