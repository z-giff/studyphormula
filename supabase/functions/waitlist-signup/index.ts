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

// ===========================================================================
// CONFIRMATION EMAIL TEMPLATE — EDIT ME
// This is a generic placeholder. Update the subject, copy, and styling before
// launch. Keep it a single self-contained HTML string (inline styles only —
// most email clients strip <style> blocks).
// ===========================================================================
const EMAIL_SUBJECT = "You're on the Phormula waitlist!";

const EMAIL_HTML = `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f6f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f8;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;padding:40px 32px;box-shadow:0 1px 4px rgba(20,20,40,0.08);">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <div style="font-size:24px;font-weight:700;color:#1a1a2e;letter-spacing:0.5px;">Phormula</div>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:16px;">
                <h1 style="margin:0;font-size:22px;font-weight:600;color:#1a1a2e;text-align:center;">You're on the list &#127881;</h1>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#4a4a5e;text-align:center;">
                  Thanks for joining the Phormula waitlist! We're building the easiest,
                  most satisfying way to memorize &mdash; beautiful color-coded flashcards,
                  interactive diagrams, and AI-generated study sets.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:24px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#4a4a5e;text-align:center;">
                  We'll email you the moment early access opens. No spam, ever.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-top:8px;border-top:1px solid #ececf1;">
                <p style="margin:16px 0 0;font-size:12px;color:#9a9aad;text-align:center;">
                  &copy; 2026 Phormula &middot; You received this because you signed up at phormula.co
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
// ===========================================================================
// END OF EMAIL TEMPLATE
// ===========================================================================

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

async function sendConfirmationEmail(email: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured — skipping confirmation email");
    return false;
  }

  // Default sender works out of the box on Resend; set RESEND_FROM to a
  // verified domain sender (e.g. "Phormula <hello@phormula.co>") for production.
  const from = Deno.env.get("RESEND_FROM") || "Phormula <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: EMAIL_SUBJECT,
      html: EMAIL_HTML,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend API error:", response.status, errorText);
    return false;
  }

  return true;
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

    const { data: inserted, error: insertError } = await supabase
      .from('waitlist')
      .insert({ email: rawEmail })
      .select('id')
      .single();

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

    if (!alreadyRegistered && inserted) {
      const emailSent = await sendConfirmationEmail(rawEmail);
      if (emailSent) {
        await supabase
          .from('waitlist')
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq('id', inserted.id);
      }
    }

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
