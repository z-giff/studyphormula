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
  }
}

export type SubscriptionFields = ReturnType<typeof subscriptionFields>

/** The Phormula user a Stripe customer was made for, from the metadata the billing function stamps on it. */
async function customerUserId(customerId: string): Promise<string | null> {
  const customer = await stripe().customers.retrieve(customerId)
  if (customer.deleted) return null
  return customer.metadata?.supabase_user_id || null
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
): Promise<SubscriptionFields> {
  const { data: subscriptions } = await stripe().subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  })
  const fields = subscriptionFields(pickSubscription(subscriptions))

  const { data: updated, error } = await admin
    .from('subscriptions')
    .update(fields)
    .eq('stripe_customer_id', customerId)
    .select('user_id')
  if (error) throw error
  if (updated.length > 0) return fields

  const userId = userIdHint || (await customerUserId(customerId))
  if (!userId) {
    console.warn(`Stripe customer ${customerId} is not linked to a Phormula user; nothing stored`)
    return fields
  }

  // Replaces a customer left over from test mode or deleted in Stripe
  const { error: upsertError } = await admin
    .from('subscriptions')
    .upsert({ user_id: userId, stripe_customer_id: customerId, ...fields }, { onConflict: 'user_id' })
  if (upsertError) throw upsertError
  return fields
}
