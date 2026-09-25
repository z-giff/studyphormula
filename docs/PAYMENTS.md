# Phormula Premium — Payments Setup & Operations

Premium is a Stripe subscription, billed monthly, every semester (4 months),
every two semesters (8 months) or yearly: whichever of those you set up. First-time
subscribers get a **7-day free trial with no card needed**, one per email address.
Payment happens on Stripe's own pages: **Stripe Checkout** takes the money and the
**Stripe Customer Portal** handles cancelling, switching plans, card changes and
invoices. Phormula never sees card details.

## What Premium unlocks

| Feature | Free | Premium | Enforced by |
|---|---|---|---|
| Standard cards, Memorize, Swipe Study, AI generation, import, sharing | ✓ | ✓ | — |
| **Interactive cards** (make, edit, study, text detection on the image) | — | ✓ | UI, database trigger, `detect-text` |
| **Flowchart cards** (make, edit, study) | — | ✓ | UI, database trigger |
| **Drawing cards** (make, edit, study) | — | ✓ | UI, database trigger |
| **MC Quiz** (built from standard cards; needs at least 4) | — | ✓ | UI |

Someone without Premium who already has premium cards (made while subscribed,
or in a set shared with them) keeps them. The card's term stays readable,
but the card itself shows **Unlock with Premium**. They can still bookmark,
reorder, move or delete those cards. Memorize and Swipe Study leave them out of
the session with a note saying how many were skipped.

## The free trial

- **Who gets it:** anyone whose account and email address have never had a
  subscription. Checkout checks the account's Stripe customer, and a list of
  every email address that has subscribed (`public.premium_trial_claims`).
  That list keeps a one-way hash of each address, never the address itself,
  and it outlives the account on purpose: deleting the account and signing up
  again with the same email gets no second trial. Spellings that reach the
  same inbox count as one address: capital letters, a `+tag`
  (`sam+2@example.com`), and dots in a Gmail address.
- **No card at checkout:** Stripe skips the card form. Premium unlocks straight
  away, and the profile reads *"Free trial until Oct 1. Add a card to keep
  Premium after that"*, with an **Add a card** button (the Customer Portal).
- **When it ends:** with a card on file, Stripe charges it and Premium carries
  on. With no card, Stripe **cancels** the subscription and Premium stops. If
  they upgrade again, they pay straight away; there's no second trial.
- **Length:** `STRIPE_TRIAL_DAYS` (default `7`; `0` turns trials off).
- **Worth knowing:** because no card is needed, a different email address still
  gets a trial of its own. Requiring a card is the usual way to stop that; it's
  a one-line change if you'd rather.

The upgrade dialog only offers the trial when Checkout will give it:
`get_premium_status()` returns `trial_available` from the same check.

## Reminder emails

Both go through the same email system as the welcome and sharing emails
(`send-transactional-email`; see [`EMAILS.md`](./EMAILS.md)), and both buttons
open `phormula.co/dashboard?billing=manage`, which takes them straight to
Stripe's billing page (after signing in if needed). **Leave Stripe's own trial
and renewal reminder emails turned off**, so nobody gets two. Both are billing
notices the Terms promise, so they still reach someone who unsubscribed from
Phormula's other emails; an address that bounced or complained gets nothing.

**Trial ending.** Three days before a trial ends, Stripe tells the webhook
(`customer.subscription.trial_will_end`), and Phormula sends *"Your free trial
ends in 3 days"*. Without a card on file, the email asks them to **Add a card**;
with one, it says what they'll be charged and links to **Manage billing**.
Template: `premium-trial-ending.tsx`.

**Renewal.** The Terms promise a reminder before renewals wherever the law
requires one, so Phormula sends one before:

| Plan | When |
|---|---|
| 1 semester, 2 semesters, yearly | 35 days before every renewal |
| Monthly | 7 days before a renewal, every 6 months (the first about six months in) |

It says the date, the plan, and what Stripe will actually charge (discounts and
tax included), with **Manage billing** to switch plans or cancel first. A plan
that's cancelling, on a trial, past due, granted by hand, or renewing for free
(a 100% coupon) gets none. The `renewal-reminders` function sends them; a cron
job (`premium-renewal-reminders`, drizzle migration 0009) wakes it every hour,
and `public.premium_renewal_reminders_due()` decides who is due. Each
subscription is re-read from Stripe before anything is sent. Template:
`premium-renewal-reminder.tsx`. To change the timing, change that function in a
new migration.

## Duplicate subscriptions

One person has one subscription. Checkout refuses anyone who already has
Premium, and opening a new Checkout page expires any other open one for the
same customer, so a second tab or an old page can't be paid later. If a second
live subscription appears anyway, the next sync (webhook or app) keeps the
first one and cancels the other at once: anything it was paid is **refunded in
full**, and an unpaid bill it left is voided. In Stripe it shows as cancelled,
with the comment *"Duplicate of sub_…"*.

## How the pieces fit

```
Upgrade dialog ──► billing (checkout) ──► Stripe Checkout ──► back to the page
                                                               ?checkout=success
                                                                    │
Stripe ──► stripe-webhook ──► public.subscriptions ◄── billing (sync)┘
                                       │
                 get_premium_status() ─┴─► the app unlocks

cron (hourly) ──► renewal-reminders ──► send-transactional-email
```

| Piece | File | Purpose |
|---|---|---|
| Database | `drizzle/migrations/0000_premium_subscriptions.sql`, `0002_premium_semester_plans.sql`, `0008_one_free_trial_per_email.sql`, `0009_premium_renewal_reminders.sql` | `subscriptions` table (no client access), `get_premium_status()`, the trigger that refuses premium cards from anyone without Premium; each plan's billing interval count; the free-trial list; renewal reminders and their cron job |
| Billing function | `supabase/functions/billing/index.ts` | `pricing`, `checkout`, `portal`, `sync` |
| Webhook | `supabase/functions/stripe-webhook/index.ts` | Verifies Stripe's signature, then re-reads the subscription from Stripe |
| Renewal reminders | `supabase/functions/renewal-reminders/index.ts` | Emails subscribers before their plan renews |
| Shared | `supabase/functions/_shared/stripe-billing.ts` | Stripe client, and the one sync routine the functions use, which also cancels duplicates |
| App state | `src/components/PremiumProvider.tsx`, `src/hooks/usePremium.ts` | Who has Premium; finishes the return from Checkout |
| Upgrade dialog | `src/components/UpgradeDialog.tsx` | Live prices from Stripe for every plan on offer, checkout |
| Plan & billing | `src/components/ProfileSheet.tsx` | Plan section: upgrade, renewal date, **Manage billing** |
| Gates | `src/lib/premium.ts`, `src/components/PremiumLock.tsx` | What's premium, locked cards, locked pages |
| Emails | `supabase/functions/_shared/transactional-email-templates/premium-trial-ending.tsx`, `premium-renewal-reminder.tsx` | Trial ending, renewal reminder |

The webhook never trusts the event's own copy of the subscription. It takes
the customer ID and asks Stripe for the current state, so late, duplicate or
out-of-order events all end in the same, correct answer. The app also syncs
straight from Stripe when someone lands back from Checkout or the Customer
Portal, so they never wait on the webhook.

## Setup (do all of this in Stripe **test mode** first, then again in live mode)

Stripe keeps test-mode and live-mode settings apart, so every step in Stripe
has to be done in both.

### 1. Create the product and prices

1. Sign in at https://dashboard.stripe.com and make sure **Test mode** is on.
2. **Product catalog → Add product.** Name it `Phormula Premium`.
3. Add a **recurring** price for each plan you want to offer, all on this one
   product:

   | Plan | Billing period in Stripe | Secret for its price ID |
   |---|---|---|
   | Monthly | **Monthly** | `STRIPE_PRICE_MONTHLY` |
   | 1 semester | **Custom → every 4 months** | `STRIPE_PRICE_SEMESTER` |
   | 2 semesters | **Custom → every 8 months** | `STRIPE_PRICE_TWO_SEMESTERS` |
   | Yearly | **Yearly** | `STRIPE_PRICE_YEARLY` |

   Offer any combination. The upgrade dialog shows only the plans whose secret
   is set, in that order, with each longer plan's monthly equivalent and how
   much it saves over paying monthly.
4. Copy each price's ID (`price_…`) from the product page.
5. **Settings → Public details:** set **Terms of service** to
   `https://phormula.co/terms`. Checkout makes every subscriber tick a box
   agreeing to the Terms and asking for Premium to start straight away, with
   the EU/UK withdrawal acknowledgement the Terms promise (§6, Refunds). Stripe
   won't show that box without the URL, so until it's set, the upgrade dialog
   says Premium isn't available to buy yet.

### 2. Turn on the Customer Portal

**Settings → Billing → Customer portal.** Allow customers to:

- **Cancel subscriptions**, set to *At end of billing period*. The Terms of
  Service promise access until the period ends.
- **Switch plans**, with every Premium price you offer added to the product
  list. The Privacy Policy (§11) tells subscribers they can switch plans from
  Manage billing, so this one is required.
- **Update payment methods**. Trial users add their card here, so this one is
  essential.
- **View invoice history**

Then press **Save**. Stripe refuses to open the portal in test mode until these
settings have been saved once, so the Manage billing button won't work until
then.

### 3. Handle failed renewals

In Stripe's Billing settings, open the failed-payment settings (**Settings →
Billing → Revenue recovery**; older dashboards call it *Subscriptions and
emails*). Turn on Smart Retries, and set what happens *if all retries for a
payment fail* to **Cancel the subscription**. While Stripe retries, the
subscriber keeps Premium (status `past_due`); when it gives up, access stops.
Any other choice leaves a subscriber whose card keeps failing with Premium
indefinitely. Turn on the emails there that ask customers to update their card.

### 4. Run the database migrations

Migrations live in `drizzle/migrations/`, and Lovable doesn't run new ones when
commits sync from GitHub. In the Lovable chat, ask it to **apply the pending
migrations in `drizzle/migrations`**. Premium needs 0000, 0002, 0008 and 0009.

Do this **before** deploying the functions: until 0009 has run, saving a
subscription fails (it writes the new `started_at` column), so the app never
hears about new subscribers; until 0008 has run, Checkout fails.

### 5. Add the webhook endpoint

**Developers → Webhooks → Add endpoint** (in newer dashboards: *Workbench →
Webhooks → Create an event destination*).

- **Endpoint URL:** `https://awvwrdjtptjyalmsyejt.supabase.co/functions/v1/stripe-webhook`
- **Events:**
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.paused`
  - `customer.subscription.resumed`
  - `customer.subscription.pending_update_applied`
  - `customer.subscription.pending_update_expired`
  - `customer.subscription.trial_will_end`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `invoice.payment_action_required`
  - `customer.updated`
  - `payment_method.attached`

The last two tell the app when a trial user adds a card. *Shortcut:* selecting
**all events** works too; the function acknowledges and ignores the ones it
doesn't need.

After saving, reveal the endpoint's **Signing secret** (`whsec_…`).

### 6. Add the secrets

Add these as edge function secrets: Lovable → **Cloud → Secrets**, or Supabase
→ **Project Settings → Edge Functions → Secrets**. None of them go in `.env`;
everything there ships to the browser.

| Secret | Value | Required |
|---|---|---|
| `STRIPE_SECRET_KEY` | **Developers → API keys → Secret key** (`sk_test_…`) | Yes |
| `STRIPE_PRICE_MONTHLY` | The monthly price ID (`price_…`) | At least one plan |
| `STRIPE_PRICE_SEMESTER` | The every-4-months price ID (`price_…`) | At least one plan |
| `STRIPE_PRICE_TWO_SEMESTERS` | The every-8-months price ID (`price_…`) | At least one plan |
| `STRIPE_PRICE_YEARLY` | The yearly price ID (`price_…`) | At least one plan |
| `STRIPE_WEBHOOK_SECRET` | The endpoint's signing secret (`whsec_…`) | Yes |
| `SITE_URL` | Where Stripe sends people back to. Defaults to `https://phormula.co` | No |
| `STRIPE_TRIAL_DAYS` | Free trial length for first-time subscribers. Defaults to `7`; `0` turns trials off | No |
| `STRIPE_AUTOMATIC_TAX` | `true` to have Stripe Tax add sales tax/VAT. Only after Stripe Tax is set up, or Checkout fails | No |

*Tighter option:* instead of the full secret key, create a **restricted key**
with write access to Customers, Checkout Sessions, Customer portal,
Subscriptions (cancelling duplicates and deleted accounts' plans), Invoices
(voiding a duplicate's bill) and Refunds (refunding a duplicate), and read
access to Prices.

Until the secrets are set, the upgrade dialog says *"Premium isn't available to
buy just yet"*, and nothing breaks.

### 7. Deploy the functions

Lovable doesn't deploy a changed function when commits sync from GitHub either.
After the migrations (step 4), ask it in the chat to **deploy** these, then
check each one's deploy time under **More → Cloud → Edge functions**:

`billing`, `stripe-webhook`, `renewal-reminders`, `delete-account`,
`send-transactional-email`, `preview-transactional-email`, `detect-text`

`supabase/config.toml` already turns JWT verification **off** for
`stripe-webhook`, because Stripe can't send a Supabase login. With the Supabase
CLI instead:

```sh
supabase functions deploy billing
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy renewal-reminders
supabase functions deploy delete-account
supabase functions deploy send-transactional-email
supabase functions deploy preview-transactional-email
supabase functions deploy detect-text
```

### 8. Test the whole loop

Sign in to the app (use `?dev=<key>` while the waitlist gate is up), open a
set, and press **MC Quiz**.

1. The upgrade dialog shows your prices and offers the trial. **Start 7-day
   free trial.**
2. Stripe asks for no card, only that you tick the box agreeing to the Terms.
   Confirm.
3. You land back on the quiz with *"Your free trial has started"*, unlocked.
4. Stripe → Webhooks → your endpoint: the deliveries show `200`.
5. Profile → **Add a card** → add `4242 4242 4242 4242`, any future expiry and
   any CVC. Back in the app, the profile now reads *"Free trial until …, then
   billed monthly."*
6. Profile → **Manage billing** → switch plans, then cancel. The profile reads
   *"Premium until … It won't renew."*

To test paying straight away, use an account that has subscribed before (it
gets no second trial), or set `STRIPE_TRIAL_DAYS` to `0` for a moment.

To check the one-trial rule, delete a test account that had a trial
(Privacy & Security), sign up again with the same email, and open the upgrade
dialog: it offers no trial, and Checkout asks for payment.

To check duplicates, open the upgrade dialog in two tabs and continue to
Checkout in both. The first tab's Checkout page now says it has expired.

`4000 0025 0000 3155` tests a card that asks for 3-D Secure authentication.
`4000 0000 0000 0002` tests a declined card: Checkout shows the error and
nothing unlocks.

To see a renewal or a failed renewal without waiting, use a Stripe **test
clock**. Subscriptions made through the app's Checkout aren't on one. In the
dashboard, start a subscription simulation (**Billing → Subscriptions → Test
clocks**) for a new customer. Give that customer the metadata key
`supabase_user_id`, set to your user ID (Authentication → Users). The webhook
then links the simulated subscription to your account as you move the clock
forward. Moving the clock to three days before the trial ends sends the
trial-ending email.

Renewal reminders go by today's date, not a test clock's, so a clock won't
trigger one. Look at the email in Lovable's email preview, and see who is due
right now with `select * from premium_renewal_reminders_due();` in the SQL
editor.

## Premium for you and testers, free

**With Stripe:** create a coupon (**Product catalog → Coupons**), 100% off,
duration *Forever*. Give it a promotion code. Checkout already has an *Add
promotion code* link. Renewals that cost nothing get no reminder email.

**By hand**, for an account that has never subscribed (SQL editor):

```sql
insert into public.subscriptions (user_id, stripe_customer_id, status)
select id, 'manual:' || id, 'active' from auth.users where email = 'you@example.com';
```

It never expires, and there's no Manage billing for it. It also uses up that
email address's free trial. Remove it with:

```sql
delete from public.subscriptions
where stripe_customer_id like 'manual:%'
  and user_id = (select id from auth.users where email = 'you@example.com');
```

## Going live

1. Finish **account activation** in Stripe (business details, bank account).
2. Recreate the product and every price in **live mode**. On the product page,
   *Copy to live mode* does this. Save the Customer Portal (with **Switch
   plans**) and failed-payment settings again; test and live settings are kept
   separately.
3. Add a **live** webhook endpoint with the same URL and events. It gets a new
   signing secret.
4. Swap the secrets: live `STRIPE_SECRET_KEY`, live price IDs, live
   `STRIPE_WEBHOOK_SECRET`.
5. Clear the test subscriptions, so test purchases don't carry over as real
   Premium:
   ```sql
   delete from public.subscriptions where stripe_customer_id like 'cus_%';
   ```
   Test trials also left their email addresses on the free-trial list. To give
   testers a real trial at launch, clear it too:
   ```sql
   delete from public.premium_trial_claims;
   ```
6. Turn on customer emails in Stripe: **Settings → Customer emails**, for
   successful payments and refunds. Leave Stripe's trial and renewal reminders
   off; Phormula sends its own.

## Day to day

- **Who is paying:** Stripe → Billing → Subscriptions. What the app believes
  is in the `subscriptions` table.
- **Account deletion:** deleting an account from Privacy & Security cancels any
  subscription in Stripe immediately (no refund for the rest of the period),
  keeps the email address on the free-trial list if they subscribed, deletes
  the pictures they uploaded, then deletes the account
  (`supabase/functions/delete-account`). If you ever delete a user by hand in
  Supabase, cancel their subscription in Stripe first.
- **Refunds:** issue them in Stripe. A refund doesn't cancel the subscription.
  To end access too, cancel it immediately in Stripe; the webhook updates the
  app. Duplicates are refunded and cancelled automatically (see above).
- **Changing the price:** add a new price in Stripe and point that plan's
  `STRIPE_PRICE_…` secret at it. New subscribers get it.
  Existing subscribers stay on their old price unless you move them in Stripe.
  The Terms promise 30 days' notice before a price change reaches them; the
  renewal reminder shows the new amount only if the change is scheduled before
  it goes out, so email monthly subscribers yourself.
- **Missed webhooks:** Stripe retries failed deliveries for three days. The app
  also re-syncs from Stripe when someone returns from Checkout or the Customer
  Portal, and whenever a stored subscription looks renewed-but-stale. Three days after a paid period
  ends with no word from Stripe, access stops until the next sync.
