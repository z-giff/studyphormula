// Deletes the signed-in user's Phormula account, from Privacy & Security.
//
// 1. Any Premium subscription is cancelled in Stripe straight away, so a
//    deleted account is never charged again, and the Stripe customer is
//    unlinked from the user. The customer itself stays: Stripe keeps payment
//    and invoice records for as long as tax law requires.
// 2. If they ever subscribed, their email address stays on the list of
//    addresses whose free trial is used (a one-way hash of it, in
//    public.premium_trial_claims), so signing up again gets no second trial.
// 3. The pictures they uploaded to cards are deleted from storage.
// 4. The user is deleted, which takes everything else with it: profile,
//    files, sets, cards, sections, shares sent and received, and the
//    subscriptions row.
//
// If cancelling in Stripe fails, nothing is deleted, so no one ends up with an
// account gone but a subscription still billing.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { type Admin, BILLABLE_STATUSES, ConfigError, adminClient, stripe } from '../_shared/stripe-billing.ts'

// Where uploaded card pictures live, one folder per user (src/lib/standardCardLayout.ts)
const PICTURES_BUCKET = 'flashcard-images'

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const isMissing = (error: unknown) =>
  (error as { code?: string })?.code === 'resource_missing'

// Cancels anything Stripe could still bill. Returns whether they ever subscribed.
async function endStripeBilling(admin: Admin, userId: string): Promise<boolean> {
  const { data: row, error } = await admin
    .from('subscriptions')
    .select('stripe_customer_id, status')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  const subscribed = row?.status != null
  const customer = row?.stripe_customer_id
  // No Stripe customer (never opened Checkout, or Premium granted by hand)
  if (!customer?.startsWith('cus_')) return subscribed

  try {
    const { data: subscriptions } = await stripe().subscriptions.list({ customer, status: 'all', limit: 100 })
    for (const subscription of subscriptions) {
      if (!BILLABLE_STATUSES.has(subscription.status)) continue
      // Ends now, with no final invoice and no proration: the Terms don't refund
      // the rest of a billing period
      await stripe().subscriptions.cancel(subscription.id, {
        invoice_now: false,
        prorate: false,
        cancellation_details: { comment: 'Phormula account deleted' },
      })
    }
    // Without the user id, later webhooks for this customer have no account to
    // write to and are simply acknowledged
    await stripe().customers.update(customer, {
      metadata: { supabase_user_id: '', phormula_account_deleted_at: new Date().toISOString() },
    })
    return subscribed || subscriptions.length > 0
  } catch (error) {
    // A customer from other keys (test mode) or deleted in Stripe bills no one
    if (!isMissing(error)) throw error
    return subscribed
  }
}

// Storage isn't part of the database, so deleting the user doesn't take their
// pictures with it
async function deleteUploadedPictures(admin: Admin, userId: string) {
  const bucket = admin.storage.from(PICTURES_BUCKET)
  for (;;) {
    const { data: objects, error } = await bucket.list(userId, { limit: 1000 })
    if (error) {
      // A project without the bucket has no pictures to delete
      if (/not found/i.test(error.message)) return
      throw error
    }
    // Folders list with no id; uploads sit straight in the user's folder
    const paths = (objects ?? []).filter((object) => object.id).map((object) => `${userId}/${object.name}`)
    if (paths.length === 0) return
    const { data: removed, error: removeError } = await bucket.remove(paths)
    if (removeError) throw removeError
    // Nothing more it can remove: stop rather than list the same names forever
    if (!removed?.length) throw new Error(`Could not remove pictures for ${userId}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const admin = adminClient()
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    const { data, error } = token ? await admin.auth.getUser(token) : { data: null, error: null }
    const userId = data?.user?.id
    if (error || !userId) throw new HttpError(401, 'Sign in to delete your account')

    // The app sends this only after the user has typed DELETE
    const body = await req.json().catch(() => ({}))
    if (body?.confirm !== 'DELETE') throw new HttpError(400, 'Deletion was not confirmed')

    const subscribed = await endStripeBilling(admin, userId)

    if (subscribed) {
      const { error: claimError } = await admin.rpc('claim_premium_trial', { p_user_id: userId })
      if (claimError) throw claimError
    }

    await deleteUploadedPictures(admin, userId)

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) throw deleteError

    console.log('Account deleted', { userId })
    return json({ deleted: true })
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, error.status)
    }
    if (error instanceof ConfigError) {
      // A Stripe customer exists but Stripe isn't reachable from here: don't
      // delete an account whose subscription can't be cancelled
      console.error('Account deletion blocked, Stripe is not configured:', error.message)
      return json({ error: "We couldn't delete your account right now. Please try again later." }, 503)
    }
    console.error('Account deletion failed:', error)
    return json({ error: "We couldn't delete your account. Please try again." }, 500)
  }
})
