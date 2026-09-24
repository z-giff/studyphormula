// Shared by the billing and stripe-webhook functions: the Stripe and Supabase
// clients, and the one routine that copies a customer's subscription from
// Stripe into public.subscriptions.
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

/** Statuses that still unlock Premium. Mirrors public.user_has_premium(). */
export const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

/** The subscription that decides a customer's access: a live one if there is one, else the newest. */
export function pickSubscription(subscriptions: Stripe.Subscription[]): Stripe.Subscription | null {
  // Stripe lists subscriptions newest first
  return subscriptions.find((s) => LIVE_STATUSES.has(s.status)) ?? subscriptions[0] ?? null
}

const toIso = (seconds: number | null | undefined) =>
  seconds ? new Date(seconds * 1000).toISOString() : null

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
    current_period_end: toIso(periodEnd),
    // Cancelling in the Customer Portal stops the subscription at the end of the
    // paid period; either way this is the day access ends.
    cancel_at: toIso(
      subscription?.cancel_at ?? (subscription?.cancel_at_period_end ? periodEnd : null),
    ),
    has_payment_method: subscription ? hasPaymentMethod(subscription) : false,
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
  const result = { fields, subscription, hadSubscription: subscriptions.length > 0 }

  const { data: updated, error } = await admin
    .from('subscriptions')
    .update(fields)
    .eq('stripe_customer_id', customerId)
    .select('user_id')
  if (error) throw error
  if (updated.length > 0) return result

  const userId = userIdHint || (await customerUserId(customerId))
  if (!userId) {
    console.warn(`Stripe customer ${customerId} is not linked to a Phormula user; nothing stored`)
    return result
  }

  // Replaces a customer left over from test mode or deleted in Stripe
  const { error: upsertError } = await admin
    .from('subscriptions')
    .upsert({ user_id: userId, stripe_customer_id: customerId, ...fields }, { onConflict: 'user_id' })
  // 23503: the user has since deleted their account, so there's no one to update
  if (upsertError?.code === '23503') {
    console.warn(`Stripe customer ${customerId} belongs to a deleted account; nothing stored`)
    return result
  }
  if (upsertError) throw upsertError
  return result
}
