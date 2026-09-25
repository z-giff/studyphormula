# Emails

Every email Phormula sends goes out the same way, so there is one place to look
after and one place to check:

```
the sender ──► send-transactional-email ──► transactional_emails queue ──► process-email-queue ──► Lovable's email API
               renders the template,                                    (cron, every few seconds)    from noreply@phormula.co
               checks the unsubscribe list
```

| Email | Template | Sent by | When |
|---|---|---|---|
| Welcome | `welcome` | `waitlist-signup` function; `send_welcome_email_on_confirm` database trigger | Joining the waitlist; confirming an account's email address |
| Something was shared with you | `flashcards-shared` | `send_flashcard_share_email` database trigger (drizzle 0006) | A share to an address that has an account |
| Invite | `flashcards-invite` | The same trigger | A share to an address with no account yet |
| Trial ending | `premium-trial-ending` | `stripe-webhook` function | Three days before a free trial ends |
| Renewal reminder | `premium-renewal-reminder` | `renewal-reminders` function, woken hourly by a cron job (drizzle 0009) | Before a plan renews; see [`PAYMENTS.md`](./PAYMENTS.md) |

The templates live in `supabase/functions/_shared/transactional-email-templates/`.
Every template except `welcome` is `serviceRoleOnly`: only the server can send
it, because it shows text users typed or concerns billing.

Two kinds of email don't take this path. Sign-in emails (confirm your address,
reset your password, change your email) come from the sign-in system itself.
Receipts, refunds and "update your card" come from Stripe (see `PAYMENTS.md`).

`send-transactional-email` refuses any address on the suppression list
(unsubscribed, bounced or complained), for every template.

## Checks

Run these after deploying, and again after anything touches email.

**1. The deployed function knows every template and refuses browsers.** This
sends nothing either way. With the public anon key from `.env`:

```sh
curl -s -X POST https://awvwrdjtptjyalmsyejt.supabase.co/functions/v1/send-transactional-email \
  -H "Authorization: Bearer $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"templateName":"premium-renewal-reminder"}'
```

Expect `403` *"can only be sent by the server"*. A `404` naming the templates it
does know means an older build is deployed. Repeat with `flashcards-invite`.

**2. The database pieces are there.** In the SQL editor:

```sql
select
  (select count(*) from vault.decrypted_secrets where name = 'email_queue_service_role_key') as vault_key,
  exists (select 1 from pg_trigger where tgname = 'on_auth_user_email_confirmed') as welcome_trigger,
  exists (select 1 from pg_trigger where tgname = 'on_flashcard_share_created') as share_trigger,
  (select string_agg(jobname, ', ') from cron.job where active) as cron_jobs;
```

Expect `vault_key` 1, both triggers `true`, and `process-email-queue` and
`premium-renewal-reminders` among the cron jobs.

**3. Each email actually went out.** After a test share, trial or sign-up:

```sql
select template_name, status, count(*), max(created_at) as latest
from public.email_send_log
where created_at > now() - interval '7 days'
group by 1, 2
order by 1, 2;
```

Every template you tried shows `sent`. A `failed` or `dlq` row has the reason in
`error_message`; `suppressed` means the address unsubscribed or bounced.

**4. The database's calls reached the function.** The triggers and cron jobs call
it over HTTP:

```sql
select status_code, count(*)
from net._http_response
where created > now() - interval '1 day'
group by 1;
```

All `200`. `401` or `403` means the vault key is wrong; `404` means a function
isn't deployed.

The functions' own logs are under **More → Cloud → Edge functions** in Lovable.

## When Lovable's email update, or new Supabase API keys, arrive

- **Every row in the table above must still send**, not only the two database
  triggers Lovable's update mentions. The trial-ending and renewal emails are
  sent by edge functions, and the webhook deliberately doesn't fail when an
  email does, so a break there is silent.
- **The server-only check must survive.** Rerun check 1.
- **New API keys** (`sb_secret_…`) are not JWTs, and several pieces assume the
  old ones: the vault key the triggers and both cron jobs sign in with, the role
  checks in `send-transactional-email`, `process-email-queue` and
  `renewal-reminders`, and `verify_jwt` on the functions. Switch them together,
  and don't turn the legacy keys off until checks 1–4 pass on the new ones.
- Then rerun checks 1–4.
