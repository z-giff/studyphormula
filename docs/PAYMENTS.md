# Phormula Premium — Payments Setup & Operations

Premium is a Stripe subscription, billed monthly, every semester (4 months),
every two semesters (8 months) or yearly: whichever of those you set up. First-time
subscribers get a **7-day free trial with no card needed**. Payment happens on
Stripe's own pages: **Stripe Checkout** takes the money and the **Stripe
Customer Portal** handles cancelling, card changes and invoices. Phormula
never sees card details.

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

- **Who gets it:** anyone who has never had a subscription on their account.
  Checkout checks this against Stripe, so an account gets one trial, ever.
- **No card at checkout:** Stripe skips the card form. Premium unlocks straight
  away, and the profile reads *"Free trial until Oct 1. Add a card to keep
  Premium after that"*, with an **Add a card** button (the Customer Portal).
- **When it ends:** with a card on file, Stripe charges it and Premium carries
  on. With no card, Stripe **cancels** the subscription and Premium stops. If
  they upgrade again, they pay straight away; there's no second trial.
- **Length:** `STRIPE_TRIAL_DAYS` (default `7`; `0` turns trials off).
- **Worth knowing:** because no card is needed, someone can make a new account
  (new email) for another trial. Requiring a card is the usual way to stop
  that; it's a one-line change if you'd rather.

**The reminder email.** Three days before a trial ends, Stripe tells the
webhook (`customer.subscription.trial_will_end`), and Phormula sends its own
branded email, *"Your free trial ends in 3 days"*, through the same email
system as the welcome and sharing emails. Without a card on file, the email
asks them to **Add a card**; with one, it says what they'll be charged and
links to **Manage billing**. Both buttons open `phormula.co/dashboard?billing=manage`,
which takes them straight to Stripe's billing page (after signing in if
needed). The template is
`supabase/functions/_shared/transactional-email-templates/premium-trial-ending.tsx`,
and it shows up in the email preview with the others. **Leave Stripe's own
trial reminder email turned off**, so nobody gets two.

## How the pieces fit

```
Upgrade dialog ──► billing (checkout) ──► Stripe Checkout ──► back to the page
                                                               ?checkout=success
                                                                    │
Stripe ──► stripe-webhook ──► public.subscriptions ◄── billing (sync)┘
                                       │
                 get_premium_status() ─┴─► the app unlocks
```

| Piece | File | Purpose |
|---|---|---|
| Database | `supabase/migrations/20260924120000_premium_subscriptions.sql`, `…190000_premium_semester_plans.sql` | `subscriptions` table (no client access), `get_premium_status()`, and the trigger that refuses premium cards from anyone without Premium; the second adds each plan's billing interval count |
| Billing function | `supabase/functions/billing/index.ts` | `pricing`, `checkout`, `portal`, `sync` |
| Webhook | `supabase/functions/stripe-webhook/index.ts` | Verifies Stripe's signature, then re-reads the subscription from Stripe |
| Shared | `supabase/functions/_shared/stripe-billing.ts` | Stripe client and the one sync routine both functions use |
| App state | `src/components/PremiumProvider.tsx`, `src/hooks/usePremium.ts` | Who has Premium; finishes the return from Checkout |
| Upgrade dialog | `src/components/UpgradeDialog.tsx` | Live prices from Stripe for every plan on offer, checkout |
| Plan & billing | `src/components/ProfileSheet.tsx` | Plan section: upgrade, renewal date, **Manage billing** |
| Gates | `src/lib/premium.ts`, `src/components/PremiumLock.tsx` | What's premium, locked cards, locked pages |
| Trial email | `supabase/functions/_shared/transactional-email-templates/premium-trial-ending.tsx` | The "your free trial ends in 3 days" email |

The webhook never trusts the event's own copy of the subscription. It takes
the customer ID and asks Stripe for the current state, so late, duplicate or
out-of-order events all end in the same, correct answer. The app also syncs
straight from Stripe when someone lands back from Checkout or the Customer
Portal, so they never wait on the webhook.

## Setup (do all of this in Stripe **test mode** first)

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

### 2. Turn on the Customer Portal

**Settings → Billing → Customer portal.** Allow customers to:

- **Cancel subscriptions**, set to *At end of billing period*. The Terms of
  Service promise access until the period ends.
- **Update payment methods**. Trial users add their card here, so this one is
  essential.
- **View invoice history**
- *Optional:* **Switch plans**, with every Premium price added, so people can
  move between plans

Then press **Save**. Stripe refuses to open the portal in test mode until these
settings have been saved once, so the Manage billing button won't work until
then.

### 3. Handle failed renewals

In Stripe's Billing settings, open the failed-payment settings (**Settings →
Billing → Revenue recovery**; older dashboards call it *Subscriptions and
emails*). Turn on Smart Retries, and set what happens *if all retries for a
payment fail* to **Cancel the subscription**. While Stripe retries, the
subscriber keeps Premium (status `past_due`); when it gives up, access stops.
Turn on the emails there that ask customers to update their card.

### 4. Run the database migrations

The `subscriptions` table must exist, with a `billing_interval_count` column
(Cloud → Database → Tables in Lovable, or the Supabase Table Editor). If it
doesn't, paste the contents of each of these into the SQL editor and run them,
in this order:

1. `supabase/migrations/20260924120000_premium_subscriptions.sql` (skip if the
   table already exists)
2. `supabase/migrations/20260924190000_premium_semester_plans.sql` (skip if the
   column already exists)

Until the second one has run, saving a subscription fails, so the app never
hears about new subscribers.

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
with write access to Customers, Checkout Sessions and Customer portal, and read
access to Subscriptions and Prices.

Until the secrets are set, the upgrade dialog says *"Premium isn't available to
buy just yet"*, and nothing breaks.

### 7. Deploy the functions

The new functions are `billing` and `stripe-webhook`, and `detect-text`
changed. `supabase/config.toml` already turns JWT verification **off** for
`stripe-webhook`, because Stripe can't send a Supabase login. With the Supabase
CLI:

```sh
supabase functions deploy billing
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy detect-text
```

### 8. Test the whole loop

Sign in to the app (use `?dev=<key>` while the waitlist gate is up), open a
set, and press **MC Quiz**.

1. The upgrade dialog shows your prices and offers the trial. **Start 7-day
   free trial.**
2. Stripe asks for no card. Confirm.
3. You land back on the quiz with *"Your free trial has started"*, unlocked.
4. Stripe → Webhooks → your endpoint: the deliveries show `200`.
5. Profile → **Add a card** → add `4242 4242 4242 4242`, any future expiry and
   any CVC. Back in the app, the profile now reads *"Free trial until …, then
   billed monthly."*
6. Profile → **Manage billing** → cancel. The profile reads *"Premium until …
   It won't renew."*

To test paying straight away, use an account that has subscribed before (it
gets no second trial), or set `STRIPE_TRIAL_DAYS` to `0` for a moment.

`4000 0025 0000 3155` tests a card that asks for 3-D Secure authentication.
`4000 0000 0000 0002` tests a declined card: Checkout shows the error and
nothing unlocks.

To see a renewal or a failed renewal without waiting a month, use a Stripe
**test clock**. Subscriptions made through the app's Checkout aren't on one.
In the dashboard, start a subscription simulation (**Billing → Subscriptions →
Test clocks**) for a new customer. Give that customer the metadata key
`supabase_user_id`, set to your user ID (Authentication → Users). The webhook
then links the simulated subscription to your account as you move the clock
forward. Moving the clock to three days before the trial ends also sends the
trial-ending email.

## Premium for you and testers, free

**With Stripe:** create a coupon (**Product catalog → Coupons**), 100% off,
duration *Forever*. Give it a promotion code. Checkout already has an *Add
promotion code* link.

**By hand**, for an account that has never subscribed (SQL editor):

```sql
insert into public.subscriptions (user_id, stripe_customer_id, status)
select id, 'manual:' || id, 'active' from auth.users where email = 'you@example.com';
```

It never expires, and there's no Manage billing for it. Remove it with:

```sql
delete from public.subscriptions
where stripe_customer_id like 'manual:%'
  and user_id = (select id from auth.users where email = 'you@example.com');
```

## Going live

1. Finish **account activation** in Stripe (business details, bank account).
2. Recreate the product and both prices in **live mode**. On the product page,
   *Copy to live mode* does this. Save the Customer Portal and failed-payment
   settings again; test and live settings are kept separately.
3. Add a **live** webhook endpoint with the same URL and events. It gets a new
   signing secret.
4. Swap the secrets: live `STRIPE_SECRET_KEY`, live price IDs, live
   `STRIPE_WEBHOOK_SECRET`.
5. Clear the test subscriptions, so test purchases don't carry over as real
   Premium:
   ```sql
   delete from public.subscriptions where stripe_customer_id like 'cus_%';
   ```
6. Turn on customer emails in Stripe: **Settings → Customer emails**, for
   successful payments and refunds.
7. Update the legal pages. The Privacy Policy (§6.1) still lists a generic
   "payment processor". Name Stripe. See `docs/legal/README.md`.

## Day to day

- **Who is paying:** Stripe → Billing → Subscriptions. What the app believes
  is in the `subscriptions` table.
- **Account deletion:** deleting an account from Privacy & Security cancels any
  subscription in Stripe immediately (no refund for the rest of the period),
  then deletes the account (`supabase/functions/delete-account`). If you ever
  delete a user by hand in Supabase, cancel their subscription in Stripe first.
- **Refunds:** issue them in Stripe. A refund doesn't cancel the subscription.
  To end access too, cancel it immediately in Stripe; the webhook updates the
  app.
- **Changing the price:** add a new price in Stripe and point that plan's
  `STRIPE_PRICE_…` secret at it. New subscribers get it.
  Existing subscribers stay on their old price unless you move them in Stripe.
  The Terms promise 30 days' notice before a price change reaches them.
- **Missed webhooks:** Stripe retries failed deliveries for three days. The app
  also re-syncs from Stripe when someone returns from Checkout or the Customer
  Portal, and whenever a stored subscription looks renewed-but-stale. Three days after a paid period
  ends with no word from Stripe, access stops until the next sync.
