// Stripe calls this whenever a subscription changes: bought, renewed, failed
// to renew, cancelled, ended. Each event is checked against the webhook's
// signing secret, then the customer's subscription is re-read from Stripe and
// stored, so the event's own copy of the data is never trusted. A second
// subscription for the same customer is cancelled and refunded there too.
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   STRIPE_SECRET_KEY       the same key the billing function uses
//   STRIPE_WEBHOOK_SECRET   whsec_... from the endpoint in Stripe -> Developers -> Webhooks
//
// verify_jwt is off for this function (supabase/config.toml): Stripe cannot
// send a Supabase JWT, and the signature check below stands in for it.

import {
  type Admin,
  ConfigError,
  type Stripe,
  type SyncResult,
  adminClient,
  describeBillingPeriod,
  formatAmount,
  requireEnv,
  stripe,
  syncCustomer,
} from '../_shared/stripe-billing.ts'

// Every event that can change what a customer's subscription gives them.
// Add the same list to the endpoint in the Stripe dashboard.
// customer.subscription.trial_will_end also sends the trial-ending email.
const SYNC_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.pending_update_applied',
  'customer.subscription.pending_update_expired',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  // A card added during a free trial, which decides whether the trial converts
  'customer.updated',
  'payment_method.attached',
])

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Checkout sessions, subscriptions, invoices and payment methods all name
// their customer; a customer event is about the customer itself
function customerOf(event: Stripe.Event): string | null {
  const object = event.data.object as {
    object?: string
    id?: string
    customer?: string | { id: string } | null
  }
  if (object.object === 'customer') return object.id ?? null
  const customer = object.customer
  return typeof customer === 'string' ? customer : customer?.id ?? null
}

// "1 semester" and "$19.99 every 4 months", from the subscription's price
function planDetails(subscription: Stripe.Subscription): { planName?: string; priceLabel?: string } {
  const price = subscription.items.data[0]?.price
  const { planName, every } = describeBillingPeriod(price?.recurring?.interval, price?.recurring?.interval_count)
  if (!price?.unit_amount || !price.currency || !every) return { planName }
  return { planName, priceLabel: `${formatAmount(price.unit_amount, price.currency)} ${every}` }
}

// Phormula's own heads-up, three days before a free trial ends: add a card to
// keep Premium, or (with one on file) when it will be charged
async function sendTrialEndingEmail(admin: Admin, customerId: string, { fields, subscription }: SyncResult) {
  // Someone who has already cancelled the trial doesn't need reminding
  if (!subscription?.trial_end || fields.status !== 'trialing' || fields.cancel_at) return

  const { data: row, error } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (error) throw error
  if (!row) return

  const { data: account, error: userError } = await admin.auth.admin.getUserById(row.user_id)
  if (userError) throw userError
  const email = account.user?.email
  if (!email) return

  const { error: sendError } = await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'premium-trial-ending',
      recipientEmail: email,
      // Stripe can deliver an event twice; one email per trial
      idempotencyKey: `premium-trial-ending-${subscription.id}-${subscription.trial_end}`,
      templateData: {
        trialEndsAt: new Date(subscription.trial_end * 1000).toISOString(),
        hasPaymentMethod: fields.has_payment_method,
        ...planDetails(subscription),
      },
    },
  })
  if (sendError) throw sendError
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let event: Stripe.Event
  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) return json({ error: 'Missing Stripe-Signature header' }, 400)
    event = await stripe().webhooks.constructEventAsync(
      await req.text(),
      signature,
      requireEnv('STRIPE_WEBHOOK_SECRET'),
    )
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error('Stripe webhook is not configured:', error.message)
      return json({ error: 'Not configured' }, 500)
    }
    console.warn('Rejected a webhook whose signature did not verify:', (error as Error).message)
    return json({ error: 'Invalid signature' }, 400)
  }

  if (!SYNC_EVENTS.has(event.type)) {
    return json({ received: true, ignored: event.type })
  }

  const customerId = customerOf(event)
  if (!customerId) {
    return json({ received: true, ignored: 'no customer' })
  }

  // Checkout names the Phormula user it was opened for
  const userIdHint =
    event.type === 'checkout.session.completed'
      ? (event.data.object as Stripe.Checkout.Session).client_reference_id
      : null

  const admin = adminClient()
  let synced: SyncResult
  try {
    synced = await syncCustomer(admin, customerId, userIdHint)
  } catch (error) {
    // A non-2xx makes Stripe retry the event with backoff, for up to three days
    console.error(`Could not sync ${customerId} after ${event.type} (${event.id}):`, error)
    return json({ error: 'Sync failed' }, 500)
  }

  if (event.type === 'customer.subscription.trial_will_end') {
    try {
      await sendTrialEndingEmail(admin, customerId, synced)
    } catch (error) {
      // An email problem never fails the webhook: Stripe would keep retrying,
      // and could switch the endpoint off, stopping every subscription update
      console.error(`Could not send the trial-ending email for ${customerId} (${event.id}):`, error)
    }
  }

  return json({ received: true })
})
