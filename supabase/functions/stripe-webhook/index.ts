// Stripe calls this whenever a subscription changes: bought, renewed, failed
// to renew, cancelled, ended. Each event is checked against the webhook's
// signing secret, then the customer's subscription is re-read from Stripe and
// stored, so the event's own copy of the data is never trusted.
//
// Secrets (Supabase -> Edge Functions -> Secrets):
//   STRIPE_SECRET_KEY       the same key the billing function uses
//   STRIPE_WEBHOOK_SECRET   whsec_... from the endpoint in Stripe -> Developers -> Webhooks
//
// verify_jwt is off for this function (supabase/config.toml): Stripe cannot
// send a Supabase JWT, and the signature check below stands in for it.

import {
  ConfigError,
  type Stripe,
  adminClient,
  requireEnv,
  stripe,
  syncCustomer,
} from '../_shared/stripe-billing.ts'

// Every event that can change what a customer's subscription gives them.
// Add the same list to the endpoint in the Stripe dashboard.
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
])

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Checkout sessions, subscriptions and invoices all name their customer
function customerOf(event: Stripe.Event): string | null {
  const object = event.data.object as { customer?: string | { id: string } | null }
  const customer = object.customer
  return typeof customer === 'string' ? customer : customer?.id ?? null
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

  try {
    await syncCustomer(adminClient(), customerId, userIdHint)
  } catch (error) {
    // A non-2xx makes Stripe retry the event with backoff, for up to three days
    console.error(`Could not sync ${customerId} after ${event.type} (${event.id}):`, error)
    return json({ error: 'Sync failed' }, 500)
  }

  return json({ received: true })
})
