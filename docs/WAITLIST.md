# Pre-launch Waitlist — Setup & Operations

While `VITE_LAUNCHED` is not `"true"`, every route on the site funnels to the
waitlist page (`src/pages/Waitlist.tsx`). Visitors can only submit an email +
pass a Cloudflare Turnstile ("I'm not a robot") check. Nothing else is
collected.

## How the pieces fit

| Piece | File | Purpose |
|---|---|---|
| Launch gate | `src/lib/launchGate.ts`, `src/App.tsx` | Hides the app until launch; developer bypass |
| Waitlist page | `src/pages/Waitlist.tsx` | Email + captcha form, success states, social proof count |
| Captcha widget | `src/components/TurnstileWidget.tsx` | Renders Cloudflare Turnstile |
| Edge function | `supabase/functions/waitlist-signup/index.ts` | Verifies captcha server-side, inserts email, sends confirmation |
| Database | `supabase/migrations/20260711000000_waitlist.sql` | `waitlist` table (RLS: no client access) + `waitlist_count()` RPC |

The `waitlist` table has RLS enabled with **no policies**, so browsers cannot
read or scrape emails — the edge function (service role) is the only write
path, and the only public read is the aggregate `waitlist_count()`.

## Developer access (bypass the gate)

Visit the site once with the dev key from `.env`:

```
https://phormula.co/?dev=<VITE_DEV_ACCESS_KEY>
```

That browser now sees the full app (stored in localStorage; the key is
stripped from the URL immediately). To preview the waitlist again as a
visitor:

```
https://phormula.co/?dev=off
```

> Note: like all `VITE_*` values, the key ships inside the JS bundle. It's a
> pre-launch curtain, not hard security — the app itself is still protected by
> Supabase auth + RLS.

## Required configuration

### 1. Cloudflare Turnstile (captcha)

Out of the box the code uses Cloudflare's **test keys**, which always pass.
Before going live:

1. Create a widget at https://dash.cloudflare.com/ → Turnstile (free).
2. Put the **site key** in `.env` → `VITE_TURNSTILE_SITE_KEY`.
3. Put the **secret key** in Supabase → Project Settings → Edge Functions →
   Secrets → `TURNSTILE_SECRET_KEY`.

### 2. Resend (confirmation email)

1. Create an API key at https://resend.com (free tier is plenty).
2. Add Supabase secret `RESEND_API_KEY`.
3. Optionally verify your domain in Resend and set secret
   `RESEND_FROM="Phormula <hello@phormula.co>"` (defaults to
   `onboarding@resend.dev`, which only delivers to your own Resend account
   email until a domain is verified).

If `RESEND_API_KEY` is missing, signups still work — the email is just
skipped (logged as a warning).

**Editing the email:** the template lives in
`supabase/functions/waitlist-signup/index.ts` between the
`CONFIRMATION EMAIL TEMPLATE — EDIT ME` markers.

## Social proof counter

The page shows "Join N+ students already waiting" once the waitlist reaches
25 signups (`SOCIAL_PROOF_THRESHOLD` in `src/pages/Waitlist.tsx`).

## Launch day checklist

1. Set `VITE_LAUNCHED="true"` in `.env` and redeploy — the full app opens up.
2. Restore `/auth` in `public/sitemap.xml` and update `public/llms.txt`.
3. Remove "Join the waitlist" phrasing from meta descriptions in `index.html`.
4. Email the waitlist (export from Supabase → Table Editor → `waitlist`).
