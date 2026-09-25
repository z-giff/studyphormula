// Phormula Premium, from the app's side. One function, six actions:
//
//   pricing             the Premium prices, read live from Stripe for the upgrade dialog
//   checkout            a Stripe Checkout page to subscribe on (monthly, 1 or 2 semesters, or yearly)
//   portal              the Stripe Customer Portal: cancel, add or change a card, invoices
//   sync                re-read the caller's subscription from Stripe right now, for the
//                       moment they land back from Checkout before the webhook arrives
//   start_plan_preview  what starting the paid plan now would charge today, for
//                       someone on the free trial
//   start_plan          end the free trial now and start paying, which lifts the
//                       trial's limits on Auto-Flashcard, text detection and the MC Quiz
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   STRIPE_SECRET_KEY      sk_test_... while testing, sk_live_... at launch
//   STRIPE_PRICE_MONTHLY        price_... billed every month
//   STRIPE_PRICE_SEMESTER       price_... billed every 4 months (optional)
//   STRIPE_PRICE_TWO_SEMESTERS  price_... billed every 8 months (optional)
//   STRIPE_PRICE_YEARLY         price_... billed every year (optional)
//   At least one plan must be set; the upgrade dialog offers whichever are.
//   SITE_URL               where Stripe sends people back to (default https://phormula.co)
//   STRIPE_TRIAL_DAYS      free trial for first-time subscribers, no card needed (default 7, 0 = none)
//   STRIPE_AUTOMATIC_TAX   "true" to have Stripe Tax add sales tax / VAT (optional)
//
// Checkout makes subscribers agree to the Terms, so Stripe needs their URL:
// Settings → Public details → Terms of service.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import {
  type Admin,
  ConfigError,
  LIVE_STATUSES,
  PLANS,
  type PlanId,
  adminClient,
  requireEnv,
  stripe,
  subscriptionFields,
  syncCustomer,
} from '../_shared/stripe-billing.ts'

class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// The plans on offer: those whose price secret is set, shortest first
function offeredPlans() {
  const offered = PLANS.flatMap((plan) => {
    const priceId = Deno.env.get(plan.env)
    return priceId ? [{ ...plan, priceId }] : []
  })
  if (offered.length === 0) throw new ConfigError('No STRIPE_PRICE_* secret is set')
  return offered
}

// The plan the app asked for, or null for one we don't sell. Pages loaded
// before semester plans existed send { interval: 'month' | 'year' } instead.
function requestedPlan(body: Record<string, unknown>): PlanId | null {
  if (body.plan !== undefined) return PLANS.find((p) => p.id === body.plan)?.id ?? null
  return body.interval === 'year' ? 'yearly' : 'monthly'
}

// Stripe allows trials of up to two years
function trialDays(): number {
  const days = Number.parseInt(Deno.env.get('STRIPE_TRIAL_DAYS') ?? '7', 10)
  return Number.isFinite(days) ? Math.min(Math.max(days, 0), 730) : 7
}

// Uses of Auto-Flashcard, text detection and the MC Quiz a free trial
// includes. Mirrors public.premium_trial_use_limit().
const TRIAL_USE_LIMIT = 3

// ---------------------------------------------------------------------------
// Where Stripe sends people back to
// ---------------------------------------------------------------------------

function siteUrl(): string {
  return new URL(Deno.env.get('SITE_URL') || 'https://phormula.co').origin
}

// Next to the box Checkout makes them tick. EU and UK consumers can withdraw
// within 14 days, but may lose that right once a service they asked to start
// straight away has been fully provided; the Terms (§6, Refunds) say Checkout
// tells them so and asks them to confirm.
function termsAcceptance(): string {
  return (
    `I agree to the [Terms of Service](${siteUrl()}/terms) and ask for Premium to start straight away. ` +
    `If I'm in the EU or UK, I understand I may lose my 14-day right to withdraw once Premium has been fully provided.`
  )
}

// Back to the page the request came from when that is the site, a local dev
// server or a Lovable preview; anywhere else goes to SITE_URL.
function returnOrigin(req: Request): string {
  const site = siteUrl()
  const origin = req.headers.get('origin')
  if (!origin) return site
  try {
    const url = new URL(origin)
    const allowed =
      url.origin === site ||
      ['localhost', '127.0.0.1'].includes(url.hostname) ||
      (url.protocol === 'https:' &&
        (url.hostname.endsWith('.lovable.app') || url.hostname.endsWith('.lovableproject.com')))
    return allowed ? url.origin : site
  } catch {
    return site
  }
}

// A same-site URL for the path the app asked to come back to, plus params.
function returnUrl(req: Request, path: unknown, params: Record<string, string> = {}): string {
  const origin = returnOrigin(req)
  let url = new URL('/dashboard', origin)
  if (typeof path === 'string' && path.startsWith('/')) {
    const candidate = new URL(path, origin)
    // "/\evil.com" parses as another host; only keep paths that stay on this site
    if (candidate.origin === origin) url = candidate
  }
  url.hash = ''
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

// ---------------------------------------------------------------------------
// The caller and their Stripe customer
// ---------------------------------------------------------------------------

interface Caller {
  id: string
  email?: string
}

async function requireCaller(admin: Admin, req: Request): Promise<Caller> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const { data, error } = token ? await admin.auth.getUser(token) : { data: null, error: null }
  if (error || !data?.user) throw new HttpError(401, 'Sign in to manage Premium', 'unauthorized')
  return { id: data.user.id, email: data.user.email }
}

async function storedCustomerId(admin: Admin, userId: string): Promise<string | null> {
  const { data, error } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  const customerId = data?.stripe_customer_id
  // Access granted by hand has no Stripe customer behind it
  return customerId?.startsWith('cus_') ? customerId : null
}

const isMissing = (error: unknown) =>
  (error as { code?: string })?.code === 'resource_missing'

async function getOrCreateCustomer(admin: Admin, caller: Caller): Promise<string> {
  const storedId = await storedCustomerId(admin, caller.id)
  if (storedId) {
    try {
      const customer = await stripe().customers.retrieve(storedId)
      if (!customer.deleted) return customer.id
    } catch (error) {
      // Made with other keys (test mode, before going live): start a new customer
      if (!isMissing(error)) throw error
    }
  }

  const customer = await stripe().customers.create({
    email: caller.email,
    metadata: { supabase_user_id: caller.id },
  })
  const { error } = await admin
    .from('subscriptions')
    .upsert(
      { user_id: caller.id, stripe_customer_id: customer.id, ...subscriptionFields(null) },
      { onConflict: 'user_id' },
    )
  if (error) throw error
  return customer.id
}

async function hasPremium(admin: Admin, userId: string): Promise<boolean> {
  const { data, error } = await admin.rpc('user_has_premium', { p_user_id: userId })
  if (error) throw error
  return data === true
}

// Subscribed on this account, or with this email address on any account
async function trialUsed(admin: Admin, userId: string): Promise<boolean> {
  const { data, error } = await admin.rpc('premium_trial_used', { p_user_id: userId })
  if (error) throw error
  return data === true
}

// One Checkout page at a time: a page left open in another tab, or paid days
// later, would otherwise start a second subscription. If one slips through
// anyway, syncCustomer cancels it.
async function expireOpenCheckouts(customer: string) {
  const { data: sessions } = await stripe().checkout.sessions.list({ customer, status: 'open', limit: 100 })
  await Promise.all(
    sessions.map((session) =>
      stripe()
        .checkout.sessions.expire(session.id)
        // Finished or expired in the meantime
        .catch((error) => console.warn(`Could not expire Checkout session ${session.id}:`, error.message)),
    ),
  )
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

// Prices barely change, so a warm function keeps them for a few minutes
let pricingCache: { at: number; plans: unknown[] } | null = null
const PRICING_TTL_MS = 5 * 60 * 1000

async function pricing() {
  if (pricingCache && Date.now() - pricingCache.at < PRICING_TTL_MS) {
    return { plans: pricingCache.plans, trialDays: trialDays() }
  }
  const plans = await Promise.all(
    offeredPlans().map(async (plan) => {
      const price = await stripe().prices.retrieve(plan.priceId)
      // The dialog shows the period Stripe will actually bill; say so if the
      // price in the secret doesn't match the plan it's meant for
      const interval = price.recurring?.interval ?? plan.interval
      const intervalCount = price.recurring?.interval_count ?? plan.intervalCount
      if (interval !== plan.interval || intervalCount !== plan.intervalCount) {
        console.warn(
          `${plan.env} (${plan.priceId}) bills every ${intervalCount} ${interval}(s), ` +
            `but the ${plan.id} plan expects every ${plan.intervalCount} ${plan.interval}(s)`,
        )
      }
      return { plan: plan.id, interval, intervalCount, amount: price.unit_amount, currency: price.currency }
    }),
  )
  pricingCache = { at: Date.now(), plans }
  return { plans, trialDays: trialDays() }
}

async function checkout(admin: Admin, req: Request, caller: Caller, body: Record<string, unknown>) {
  const plan = requestedPlan(body)
  const price = plan && offeredPlans().find((p) => p.id === plan)?.priceId
  if (!price) throw new HttpError(400, 'That plan is not available', 'unknown_plan')

  // One subscription per person: someone who already has Premium manages it in the portal instead
  if (await hasPremium(admin, caller.id)) {
    throw new HttpError(409, 'You already have Phormula Premium', 'already_premium')
  }
  const customer = await getOrCreateCustomer(admin, caller)
  const { fields: current, hadSubscription } = await syncCustomer(admin, customer, caller.id)
  if (current.status && LIVE_STATUSES.has(current.status)) {
    throw new HttpError(409, 'You already have Phormula Premium', 'already_premium')
  }

  // One free trial per email address, and no card needed for it. An address
  // keeps its used trial when its account is deleted and signed up again
  // (public.premium_trial_claims). A trial that ends without a card is
  // cancelled rather than charged; upgrading again then goes straight to a
  // paid subscription.
  const trial = hadSubscription || (await trialUsed(admin, caller.id)) ? 0 : trialDays()
  await expireOpenCheckouts(customer)
  const automaticTax = Deno.env.get('STRIPE_AUTOMATIC_TAX') === 'true'
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: caller.id,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { supabase_user_id: caller.id },
      ...(trial > 0 && {
        trial_period_days: trial,
        trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      }),
    },
    ...(trial > 0 && { payment_method_collection: 'if_required' }),
    success_url: returnUrl(req, body.returnPath, { checkout: 'success' }),
    cancel_url: returnUrl(req, body.returnPath, { checkout: 'cancelled' }),
    consent_collection: { terms_of_service: 'required' },
    custom_text: {
      terms_of_service_acceptance: { message: termsAcceptance() },
      // A trial's limits, said on Stripe's page too, next to the button that starts it
      ...(trial > 0 && {
        submit: {
          message:
            `Your ${trial}-day free trial includes ${TRIAL_USE_LIMIT} uses each of Auto-Flashcard, text detection ` +
            'and the MC Quiz. Everything else is unlimited, and a paid plan has no limits.',
        },
      }),
    },
    ...(automaticTax && {
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
    }),
  }).catch((error) => {
    // Stripe only asks for the Terms once their URL is in its public details
    // (Settings → Public details)
    if (/terms of service/i.test(error?.message ?? '')) {
      throw new ConfigError(`Stripe has no Terms of Service URL to show at Checkout: ${error.message}`)
    }
    throw error
  })
  if (!session.url) throw new Error('Stripe returned a Checkout session without a URL')
  return { url: session.url }
}

async function portal(admin: Admin, req: Request, caller: Caller, body: Record<string, unknown>) {
  const customer = await storedCustomerId(admin, caller.id)
  if (!customer) throw new HttpError(404, 'There is no billing account to manage yet', 'no_billing_account')
  const session = await stripe().billingPortal.sessions.create({
    customer,
    // The app re-reads the subscription when it sees this, as it does after Checkout
    return_url: returnUrl(req, body.returnPath, { billing: 'portal' }),
  })
  return { url: session.url }
}

async function sync(admin: Admin, caller: Caller) {
  const customer = await storedCustomerId(admin, caller.id)
  if (customer) await syncCustomer(admin, customer, caller.id)
  return { isPremium: await hasPremium(admin, caller.id) }
}

// The caller's subscription as Stripe has it now, for starting a plan early
async function currentSubscription(admin: Admin, caller: Caller) {
  const customer = await storedCustomerId(admin, caller.id)
  if (!customer) throw new HttpError(409, "You're not on a free trial", 'not_trialing')
  return { customer, ...(await syncCustomer(admin, customer, caller.id)) }
}

// What starting now charges today, discounts and tax included, for the
// confirmation in the upgrade dialog
async function startPlanPreview(admin: Admin, caller: Caller) {
  const { subscription, fields } = await currentSubscription(admin, caller)
  if (subscription?.status !== 'trialing') throw new HttpError(409, "You're not on a free trial", 'not_trialing')
  const invoice = await stripe().invoices.createPreview({
    subscription: subscription.id,
    subscription_details: { trial_end: 'now' },
  })
  return { amount: invoice.amount_due, currency: invoice.currency, hasPaymentMethod: fields.has_payment_method }
}

// End the free trial now and start paying, which lifts the trial's limits at
// once. The card on file is charged for the first billing period today.
// error_if_incomplete makes Stripe refuse the change when that charge fails
// or needs the bank's approval, so a failed payment leaves the trial as it
// was, rather than an unpaid plan with Premium on.
async function startPlan(admin: Admin, caller: Caller) {
  const { customer, subscription, fields } = await currentSubscription(admin, caller)
  // Started already: a second click, or another tab
  if (subscription?.status === 'active') return { isPremium: await hasPremium(admin, caller.id) }
  if (subscription?.status !== 'trialing') throw new HttpError(409, "You're not on a free trial", 'not_trialing')
  if (!fields.has_payment_method) {
    throw new HttpError(402, 'Add a card to start your plan', 'payment_method_required')
  }

  try {
    await stripe().subscriptions.update(subscription.id, {
      trial_end: 'now',
      payment_behavior: 'error_if_incomplete',
    })
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 402) {
      throw new HttpError(
        402,
        "Your card couldn't be charged, so your free trial carries on. Check your card in Manage billing, then try again.",
        'payment_failed',
      )
    }
    throw error
  }
  // Show the paid plan straight away, rather than when the webhook lands
  await syncCustomer(admin, customer, caller.id)
  return { isPremium: await hasPremium(admin, caller.id) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const action = body?.action
    if (action === 'pricing') return json(await pricing())

    const admin = adminClient()
    const caller = await requireCaller(admin, req)
    switch (action) {
      case 'checkout':
        return json(await checkout(admin, req, caller, body))
      case 'portal':
        return json(await portal(admin, req, caller, body))
      case 'sync':
        return json(await sync(admin, caller))
      case 'start_plan_preview':
        return json(await startPlanPreview(admin, caller))
      case 'start_plan':
        return json(await startPlan(admin, caller))
      default:
        return json({ error: 'Unknown action' }, 400)
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message, code: error.code }, error.status)
    }
    if (error instanceof ConfigError) {
      console.error('Billing is not configured:', error.message)
      return json({ error: 'Premium is not available to buy yet', code: 'not_configured' }, 503)
    }
    console.error('Billing request failed:', error)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
})
