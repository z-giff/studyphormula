// Shared by the billing, stripe-webhook, renewal-reminders and delete-account
// functions: the Stripe and Supabase clients, and the one routine that copies
// a customer's subscription from Stripe into public.subscriptions (and
// cancels a duplicate one).
//
// Nothing here trusts what a webhook event says about a subscription. Every
// change is re-read from the Stripe API, so events that arrive late, twice or
// out of order all land on the same, current answer.

import Stripe from 'npm:stripe@22.6.2'
import { createClient } from 'npm:@supabase/supabase-js@2'

export { Stripe }

/** A required secret is missing: payments are not set up on this project yet. */
export class ConfigError extends Error {}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new ConfigError(`${name} is not set`)
  return value
}

let stripeClient: Stripe | null = null

export function stripe(): Stripe {
  stripeClient ??= new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
    httpClient: Stripe.createFetchHttpClient(),
    appInfo: { name: 'Phormula' },
  })
  return stripeClient
}

export function adminClient() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type Admin = ReturnType<typeof adminClient>

/**
 * The plans Premium can be bought on, shortest first, and the secret holding
 * each one's Stripe price. A semester is four months.
 */
export const PLANS = [
  { id: 'monthly', env: 'STRIPE_PRICE_MONTHLY', interval: 'month', intervalCount: 1 },
  { id: 'semester', env: 'STRIPE_PRICE_SEMESTER', interval: 'month', intervalCount: 4 },
  { id: 'two_semesters', env: 'STRIPE_PRICE_TWO_SEMESTERS', interval: 'month', intervalCount: 8 },
  { id: 'yearly', env: 'STRIPE_PRICE_YEARLY', interval: 'year', intervalCount: 1 },
] as const

export type PlanId = (typeof PLANS)[number]['id']

/**
 * A billing period in words: "Monthly" / "a month", "1 semester" / "every 4
 * months", "Yearly" / "a year". Mirrors billingPeriod() in src/lib/premium.ts.
 */
export function describeBillingPeriod(
  interval: string | null | undefined,
  count: number | null | undefined,
): { planName?: string; every?: string } {
  const n = count ?? 1
  if (interval === 'month' && n === 1) return { planName: 'Monthly', every: 'a month' }
  if (interval === 'month' && n === 4) return { planName: '1 semester', every: 'every 4 months' }
  if (interval === 'month' && n === 8) return { planName: '2 semesters', every: 'every 8 months' }
  if (interval === 'year' && n === 1) return { planName: 'Yearly', every: 'a year' }
  if (!interval) return {}
  return { planName: `Every ${n} ${interval}s`, every: n === 1 ? `a ${interval}` : `every ${n} ${interval}s` }
}

/** Statuses that still unlock Premium. Mirrors public.user_has_premium(). */
export const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

/** Statuses Stripe could still bill, or bring back. */
export const BILLABLE_STATUSES = new Set([...LIVE_STATUSES, 'unpaid', 'paused', 'incomplete'])

/**
 * The subscription that decides a customer's access: the first live one they
 * started, else the newest. A second live one is a duplicate, and
 * syncCustomer cancels it.
 */
export function pickSubscription(subscriptions: Stripe.Subscription[]): Stripe.Subscription | null {
  const live = subscriptions.filter((s) => LIVE_STATUSES.has(s.status)).sort((a, b) => a.created - b.created)
  // Stripe lists subscriptions newest first
  return live[0] ?? subscriptions[0] ?? null
}

const toIso = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000).toISOString() : null

/** "$5.99", "$60", "¥600": Stripe amounts are in the smallest unit, except for zero-decimal currencies like JPY. */
export function formatAmount(amount: number, currency: string): string {
  const code = currency.toUpperCase()
  const digits =
    new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits ?? 2
  const value = amount / 10 ** digits
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: Number.isInteger(value) ? 0 : digits,
  }).format(value)
}

// A card Stripe can charge when the subscription renews or its trial ends: the
// subscription's own, or the customer's default (where the Customer Portal
// puts a card someone adds during a trial). Needs `customer` expanded.
function hasPaymentMethod(subscription: Stripe.Subscription): boolean {
  if (subscription.default_payment_method || subscription.default_source) return true
  const customer = subscription.customer
  if (typeof customer === 'string' || customer.deleted) return false
  return !!(customer.invoice_settings?.default_payment_method || customer.default_source)
}

/** The columns of public.subscriptions that describe the subscription itself. */
export function subscriptionFields(subscription: Stripe.Subscription | null) {
  const item = subscription?.items.data[0]
  const periodEnd = item?.current_period_end ?? null
  return {
    stripe_subscription_id: subscription?.id ?? null,
    status: subscription?.status ?? null,
    price_id: item?.price.id ?? null,
    billing_interval: item?.price.recurring?.interval ?? null,
    // 4 for a semester plan: Stripe bills it every 4 months
    billing_interval_count: item?.price.recurring?.interval_count ?? null,
    current_period_end: toIso(periodEnd),
    // Cancelling in the Customer Portal stops the subscription at the end of the
    // paid period; either way this is the day access ends.
    cancel_at: toIso(
      subscription?.cancel_at ?? (subscription?.cancel_at_period_end ? periodEnd : null),
    ),
    has_payment_method: subscription ? hasPaymentMethod(subscription) : false,
    // The first monthly renewal reminder comes six months after this
    started_at: toIso(subscription?.start_date),
  }
}

export type SubscriptionFields = ReturnType<typeof subscriptionFields>

/** The Phormula user a Stripe customer was made for, from the metadata the billing function stamps on it. */
async function customerUserId(customerId: string): Promise<string | null> {
  const customer = await stripe().customers.retrieve(customerId)
  if (customer.deleted) return null
  return customer.metadata?.supabase_user_id || null
}

export interface SyncResult {
  fields: SubscriptionFields
  /** The subscription the fields came from, with its customer expanded. */
  subscription: Stripe.Subscription | null
  /** The customer has had a subscription before, in any state: their free trial is used up. */
  hadSubscription: boolean
}

/**
 * Re-read a customer's subscriptions from Stripe and store the one that
 * decides their access. `userIdHint` links a customer the table does not know
 * yet (Checkout passes the user as client_reference_id); failing that, the
 * user id stamped on the customer is used.
 *
 * A second subscription Stripe could still bill is then cancelled. That comes
 * after storing the one that counts, so a problem cancelling never costs
 * anyone their Premium; the error still fails the sync, and Stripe retries
 * the webhook.
 */
export async function syncCustomer(
  admin: Admin,
  customerId: string,
  userIdHint?: string | null,
): Promise<SyncResult> {
  const { data: subscriptions } = await stripe().subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
    expand: ['data.customer'],
  })
  const subscription = pickSubscription(subscriptions)
  const fields = subscriptionFields(subscription)

  await storeSubscription(admin, customerId, fields, userIdHint)
  if (subscription && LIVE_STATUSES.has(subscription.status)) {
    await cancelDuplicates(customerId, subscription, subscriptions)
  }

  return { fields, subscription, hadSubscription: subscriptions.length > 0 }
}

async function storeSubscription(
  admin: Admin,
  customerId: string,
  fields: SubscriptionFields,
  userIdHint?: string | null,
) {
  const { data: updated, error } = await admin
    .from('subscriptions')
    .update(fields)
    .eq('stripe_customer_id', customerId)
    .select('user_id')
  if (error) throw error
  if (updated.length > 0) return

  const userId = userIdHint || (await customerUserId(customerId))
  if (!userId) {
    console.warn(`Stripe customer ${customerId} is not linked to a Phormula user; nothing stored`)
    return
  }

  // Replaces a customer left over from test mode or deleted in Stripe
  const { error: upsertError } = await admin
    .from('subscriptions')
    .upsert({ user_id: userId, stripe_customer_id: customerId, ...fields }, { onConflict: 'user_id' })
  // 23503: the user has since deleted their account, so there's no one to update
  if (upsertError?.code === '23503') {
    console.warn(`Stripe customer ${customerId} belongs to a deleted account; nothing stored`)
    return
  }
  if (upsertError) throw upsertError
}

/**
 * Once a customer has a live subscription, any other one Stripe could still
 * bill is a duplicate: two Checkout tabs, or an old Checkout page paid later.
 * What a duplicate was paid is refunded in full, a bill it left unpaid is
 * voided so it can't be paid later, and then it is cancelled. The idempotency
 * keys make a retried or concurrent webhook do each step once.
 */
async function cancelDuplicates(customerId: string, kept: Stripe.Subscription, subscriptions: Stripe.Subscription[]) {
  const duplicates = subscriptions.filter((s) => s.id !== kept.id && BILLABLE_STATUSES.has(s.status))
  for (const duplicate of duplicates) {
    console.warn(`Cancelling ${duplicate.id}, a duplicate of ${kept.id} for Stripe customer ${customerId}`)
    await settleDuplicateInvoice(duplicate)
    await stripe().subscriptions.cancel(
      duplicate.id,
      { invoice_now: false, prorate: false, cancellation_details: { comment: `Duplicate of ${kept.id}` } },
      { idempotencyKey: `cancel-duplicate-${duplicate.id}` },
    )
  }
}

const errorCode = (error: unknown) => (error as { code?: string })?.code

async function settleDuplicateInvoice(duplicate: Stripe.Subscription) {
  const invoiceId =
    typeof duplicate.latest_invoice === 'string' ? duplicate.latest_invoice : duplicate.latest_invoice?.id
  if (!invoiceId) return
  const invoice = await stripe().invoices.retrieve(invoiceId)

  if (invoice.status === 'draft') {
    await stripe().invoices.del(invoice.id).catch((error) => {
      if (errorCode(error) !== 'resource_missing') throw error
    })
    return
  }
  if (invoice.status === 'open') {
    await stripe().invoices.voidInvoice(invoice.id, {}, { idempotencyKey: `void-duplicate-${invoice.id}` })
    return
  }
  // A free trial's first invoice is paid, for nothing
  if (invoice.status !== 'paid' || invoice.amount_paid <= 0) return

  const { data: payments } = await stripe().invoicePayments.list({ invoice: invoice.id, status: 'paid' })
  for (const { id, payment } of payments) {
    const paymentIntent = typeof payment.payment_intent === 'string' ? payment.payment_intent : payment.payment_intent?.id
    const charge = typeof payment.charge === 'string' ? payment.charge : payment.charge?.id
    if (!paymentIntent && !charge) continue
    try {
      await stripe().refunds.create(
        { ...(paymentIntent ? { payment_intent: paymentIntent } : { charge }), reason: 'duplicate' },
        { idempotencyKey: `refund-duplicate-${id}` },
      )
    } catch (error) {
      if (errorCode(error) !== 'charge_already_refunded') throw error
    }
  }
}
