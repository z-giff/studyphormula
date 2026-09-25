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
| Database | `supabase/migrations/20260711180416_243b8b19-….sql`, tightened by `…20260711183510_85c8d314-….sql` and `…20260724162153_48de71ad-….sql` | `waitlist` table (RLS: no client access) + `waitlist_count()` RPC, callable only by the service role |

The `waitlist` table has RLS enabled with policies that refuse every browser
read and write, so nobody can scrape emails — the edge function (service role)
is the only write path, and the only public read is the aggregate count, served
by the `waitlist-count` function.

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

### 2. Confirmation email

After recording a new signup, `waitlist-signup` sends the `welcome` email
(*"We're not quite ready for you yet"*) through `send-transactional-email`, like
every Phormula email (see [`EMAILS.md`](./EMAILS.md)), and stamps
`confirmation_sent_at`. A repeat signup gets no second email. The template is
`supabase/functions/_shared/transactional-email-templates/welcome.tsx`.

The same email also goes to anyone who confirms a new account's email address
(the `send_welcome_email_on_confirm` trigger). Before launch that's only you and
your testers; the launch checklist below replaces it for real sign-ups.

## Social proof counter

The page shows "Join N+ students already waiting" once the waitlist reaches
25 signups (`SOCIAL_PROOF_THRESHOLD` in `src/pages/Waitlist.tsx`).

## Launch day checklist

1. Set `VITE_LAUNCHED="true"` in `.env` and redeploy — the full app opens up.
2. Restore `/auth` in `public/sitemap.xml` and update `public/llms.txt`.
3. Remove "Join the waitlist" phrasing from meta descriptions in `index.html`.
4. Email the waitlist (export from Supabase → Table Editor → `waitlist`).
5. Give account sign-ups their own welcome email. Until then, everyone who
   confirms a new account gets the waitlist's *"We're not quite ready for you
   yet"* email (the `send_welcome_email_on_confirm` trigger sends `welcome`).
   Write a sign-up welcome template, point the trigger at it, and keep
   `welcome` for the waitlist.
