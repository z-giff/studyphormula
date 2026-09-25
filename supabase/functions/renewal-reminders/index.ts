// Renewal reminders for Phormula Premium. A cron job calls this every hour
// (drizzle/migrations/0009_premium_renewal_reminders.sql), and it emails each
// subscriber whose plan is about to renew when it renews and what they'll be
// charged, with a link to switch plans or cancel first:
//
//   billed every 4 months or longer   35 days before every renewal
//   billed monthly                    7 days before a renewal, every 6 months
//
// public.premium_renewal_reminders_due() decides who is due. Each one is read
// again from Stripe before anything is sent, so a plan cancelled or changed
// since the last sync never gets a reminder it shouldn't, and the amount is
// the one Stripe will actually charge, discounts and tax included. A renewal
// that will charge nothing is marked done without an email.
//
// Like every Phormula email, the reminder goes out through
// send-transactional-email.
//
// verify_jwt is on (supabase/config.toml), and only the service role may call it.

import {
  type Admin,
  ConfigError,
  adminClient,
  describeBillingPeriod,
  formatAmount,
  stripe,
  syncCustomer,
} from '../_shared/stripe-billing.ts'

/** The columns of a public.subscriptions row this needs. */
interface DueSubscription {
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  current_period_end: string
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// The role claim of the caller's JWT. The gateway has already verified the
// signature (verify_jwt = true), so the claim can be trusted.
function callerRole(req: Request): string | null {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const payload = token?.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    return JSON.parse(atob(padded)).role ?? null
  } catch {
    return null
  }
}

const sameMoment = (iso: string, seconds: number) => new Date(iso).getTime() === seconds * 1000

// This renewal has had its reminder
async function markReminded(admin: Admin, row: DueSubscription) {
  const { error } = await admin
    .from('subscriptions')
    .update({ renewal_reminder_period_end: row.current_period_end, renewal_reminded_at: new Date().toISOString() })
    .eq('user_id', row.user_id)
  if (error) throw error
}

// 'sent', or why not
async function remind(admin: Admin, row: DueSubscription): Promise<string> {
  const subscription = await stripe().subscriptions.retrieve(row.stripe_subscription_id)
  const item = subscription.items.data[0]
  const periodEnd = item?.current_period_end
  const renewing = subscription.status === 'active' && !subscription.cancel_at && !subscription.cancel_at_period_end
  if (!item || !renewing || !sameMoment(row.current_period_end, periodEnd)) {
    // The stored row is behind Stripe: bring it up to date, and the next run decides again
    await syncCustomer(admin, row.stripe_customer_id, row.user_id)
    return 'resynced'
  }

  const upcoming = await stripe().invoices.createPreview({ subscription: subscription.id })
  if (upcoming.amount_due <= 0) {
    await markReminded(admin, row)
    return 'nothing to charge'
  }

  const { data: account, error: userError } = await admin.auth.admin.getUserById(row.user_id)
  if (userError) throw userError
  const email = account.user?.email
  if (!email) {
    await markReminded(admin, row)
    return 'no email address'
  }

  const { planName, every } = describeBillingPeriod(
    item.price.recurring?.interval,
    item.price.recurring?.interval_count,
  )
  const { error: sendError } = await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'premium-renewal-reminder',
      recipientEmail: email,
      // One reminder per renewal, even if a run is retried
      idempotencyKey: `premium-renewal-${subscription.id}-${periodEnd}`,
      templateData: {
        renewsAt: new Date(periodEnd * 1000).toISOString(),
        planName,
        amountLabel: formatAmount(upcoming.amount_due, upcoming.currency),
        every,
      },
    },
  })
  if (sendError) throw sendError
  await markReminded(admin, row)
  return 'sent'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  if (callerRole(req) !== 'service_role') {
    return json({ error: 'Forbidden' }, 403)
  }

  try {
    const admin = adminClient()
    const { data: due, error } = await admin.rpc('premium_renewal_reminders_due')
    if (error) throw error

    const outcomes: Record<string, number> = {}
    for (const row of (due ?? []) as DueSubscription[]) {
      let outcome: string
      try {
        outcome = await remind(admin, row)
      } catch (err) {
        // One subscriber's problem never holds up the rest; they're due again next hour
        console.error(`Renewal reminder for ${row.stripe_subscription_id} failed:`, err)
        outcome = 'failed'
      }
      outcomes[outcome] = (outcomes[outcome] ?? 0) + 1
    }
    console.log('Renewal reminders', outcomes)
    return json({ due: due?.length ?? 0, ...outcomes })
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error('Renewal reminders are not configured:', error.message)
      return json({ error: 'Not configured' }, 500)
    }
    console.error('Renewal reminders failed:', error)
    return json({ error: 'Failed' }, 500)
  }
})
