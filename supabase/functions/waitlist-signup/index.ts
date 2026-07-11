import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cloudflare Turnstile "always passes" test secret. Replace by setting the
// TURNSTILE_SECRET_KEY secret in Supabase (Settings -> Edge Functions).
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

const EMAIL_MAX_LENGTH = 255;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// NOTE: Confirmation emails are handled through Lovable, not this function.
// This function only records the signup (after captcha verification). If you
// ever want the function to send the email itself again, re-add the sending
// logic where `confirmation_sent_at` is noted below.

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifyTurnstile(token: string, remoteIp: string | null): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY") || TURNSTILE_TEST_SECRET;

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (remoteIp) formData.append("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    console.error("Turnstile siteverify request failed:", response.status);
    return false;
  }

  const data = await response.json();
  if (!data.success) {
    console.warn("Turnstile verification rejected:", data["error-codes"]);
  }
  return data.success === true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const turnstileToken = typeof body?.turnstileToken === 'string' ? body.turnstileToken : '';

    if (!rawEmail || rawEmail.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(rawEmail)) {
      return jsonResponse({ error: 'Please enter a valid email address' }, 400);
    }

    if (!turnstileToken) {
      return jsonResponse({ error: 'Captcha verification is required' }, 400);
    }

    const remoteIp = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for');
    const captchaOk = await verifyTurnstile(turnstileToken, remoteIp);
    if (!captchaOk) {
      return jsonResponse({ error: 'Captcha verification failed — please try again' }, 403);
    }

    // Service role client: the waitlist table has RLS enabled with no
    // policies, so this function is the only write path.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({ email: rawEmail });

    let alreadyRegistered = false;
    if (insertError) {
      // 23505 = unique_violation → this email is already on the waitlist.
      // Treat as success but skip the email (prevents resubmitting an address
      // to spam its inbox with confirmations).
      if (insertError.code === '23505') {
        alreadyRegistered = true;
      } else {
        console.error('Waitlist insert failed:', insertError);
        return jsonResponse({ error: 'Something went wrong — please try again' }, 500);
      }
    }

    // Confirmation email is sent via Lovable. If that ever moves back into
    // this function, send it here for new signups only (not duplicates) and
    // stamp `confirmation_sent_at` on the inserted row.

    const { data: count } = await supabase.rpc('waitlist_count');

    return jsonResponse({
      status: alreadyRegistered ? 'already_registered' : 'ok',
      count: typeof count === 'number' ? count : null,
    });
  } catch (error) {
    console.error('Error in waitlist-signup function:', error);
    return jsonResponse({ error: 'Something went wrong — please try again' }, 500);
  }
});
