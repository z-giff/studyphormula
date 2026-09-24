// Phormula Premium, from the app's side. One function, four actions:
//
//   pricing   the Premium prices, read live from Stripe for the upgrade dialog
//   checkout  a Stripe Checkout page to subscribe on (monthly or yearly)
//   portal    the Stripe Customer Portal: cancel, add or change a card, invoices
//   sync      re-read the caller's subscription from Stripe right now, for the
//             moment they land back from Checkout before the webhook arrives
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   STRIPE_SECRET_KEY      sk_test_... while testing, sk_live_... at launch
//   STRIPE_PRICE_MONTHLY   price_... for the monthly plan
//   STRIPE_PRICE_YEARLY    price_... for the yearly plan (optional)
//   SITE_URL               where Stripe sends people back to (default https://phormula.co)
//   STRIPE_TRIAL_DAYS      free trial for first-time subscribers, no card needed (default 7, 0 = none)
//   STRIPE_AUTOMATIC_TAX   "true" to have Stripe Tax add sales tax / VAT (optional)

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import {
  type Admin,
  ConfigError,
  LIVE_STATUSES,
  adminClient,
  requireEnv,
  stripe,
  subscriptionFields,
  syncCustomer,
} from '../_shared/stripe-billing.ts'

type Interval = 'month' | 'year'

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

function priceIds(): Partial<Record<Interval, string>> {
  const month = Deno.env.get('STRIPE_PRICE_MONTHLY')
  const year = Deno.env.get('STRIPE_PRICE_YEARLY')
  if (!month && !year) throw new ConfigError('STRIPE_PRICE_MONTHLY is not set')
  return { ...(month && { month }), ...(year && { year }) }
}

// Stripe allows trials of up to two years
function trialDays(): number {
  const days = Number.parseInt(Deno.env.get('STRIPE_TRIAL_DAYS') ?? '7', 10)
  return Number.isFinite(days) ? Math.min(Math.max(days, 0), 730) : 7
}

// ---------------------------------------------------------------------------
// Where Stripe sends people back to
// ---------------------------------------------------------------------------

function siteUrl(): string {
  return new URL(Deno.env.get('SITE_URL') || 'https://phormula.co').origin
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
    Object.entries(priceIds()).map(async ([interval, id]) => {
      const price = await stripe().prices.retrieve(id)
      return { interval, amount: price.unit_amount, currency: price.currency }
    }),
  )
  pricingCache = { at: Date.now(), plans }
  return { plans, trialDays: trialDays() }
}

async function checkout(admin: Admin, req: Request, caller: Caller, body: Record<string, unknown>) {
  const interval: Interval = body.interval === 'year' ? 'year' : 'month'
  const price = priceIds()[interval]
  if (!price) throw new HttpError(400, `There is no ${interval}ly plan`, 'unknown_plan')

  // One subscription per person: someone who already has Premium manages it in the portal instead
  if (await hasPremium(admin, caller.id)) {
    throw new HttpError(409, 'You already have Phormula Premium', 'already_premium')
  }
  const customer = await getOrCreateCustomer(admin, caller)
  const { fields: current, hadSubscription } = await syncCustomer(admin, customer, caller.id)
  if (current.status && LIVE_STATUSES.has(current.status)) {
    throw new HttpError(409, 'You already have Phormula Premium', 'already_premium')
  }

  // One free trial per account, and no card needed for it. A trial that ends
  // without a card is cancelled rather than charged; upgrading again then
  // goes straight to a paid subscription.
  const trial = hadSubscription ? 0 : trialDays()
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
    ...(automaticTax && {
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
    }),
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
