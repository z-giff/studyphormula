// Deletes card pictures that no card refers to any more: taken off a card, on
// a deleted card or set, or uploaded and never saved. A cron job calls this
// once a day (drizzle/migrations/0015_clean_up_unused_card_pictures.sql), and
// public.unreferenced_card_pictures() decides what goes, a week after upload.
// Storage files can only be deleted through the Storage API, hence a function
// rather than SQL.
//
// verify_jwt is on (supabase/config.toml), and only the service role may call it.

import { createClient } from 'npm:@supabase/supabase-js@2'

const BUCKET = 'flashcard-images'
const BATCH = 1000
// Enough for any backlog in a few days, short enough for one run
const MAX_BATCHES = 10

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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  if (callerRole(req) !== 'service_role') {
    return json({ error: 'Forbidden' }, 403)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing required environment variables')
    return json({ error: 'Server configuration error' }, 500)
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let removed = 0
  try {
    for (let batch = 0; batch < MAX_BATCHES; batch++) {
      const { data: names, error } = await admin.rpc('unreferenced_card_pictures', { p_limit: BATCH })
      if (error) throw error
      if (!names?.length) break

      const { data: gone, error: removeError } = await admin.storage.from(BUCKET).remove(names as string[])
      if (removeError) throw removeError
      removed += gone.length
      // A short batch was the last; one that removed nothing would repeat forever
      if (names.length < BATCH || gone.length === 0) break
    }
  } catch (error) {
    console.error(`Picture clean-up failed after removing ${removed}:`, error)
    return json({ error: 'Failed', removed }, 500)
  }

  console.log('Unused card pictures removed', { removed })
  return json({ removed })
})
