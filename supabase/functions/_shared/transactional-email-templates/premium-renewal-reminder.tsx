import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

// Sent by the renewal-reminders function before Phormula Premium renews: 35
// days before each renewal of a plan billed every 4 months or longer, and
// every six months on a monthly plan (drizzle/migrations/0009). It says when
// the plan renews and what will be charged, and how to switch plans or cancel
// before then. Same frame as the trial-ending email.

const SITE_URL = 'https://phormula.co'
// The app opens the Stripe billing page when it sees ?billing=manage
const BILLING_URL = `${SITE_URL}/dashboard?billing=manage`

const HERO_GIF =
  'https://phormula.co/__l5e/assets-v1/3da8ec4a-313d-4c88-a15a-dfe468011f50/swirl-unfurl-20fps.gif'
const HERO_FALLBACK =
  'https://phormula.co/__l5e/assets-v1/39e42426-b578-4a05-a5d1-9521615052a8/swirl-unfurl-fallback.png'

export interface RenewalReminderProps {
  /** When the plan renews, as an ISO timestamp. */
  renewsAt?: string
  /** "Monthly", "1 semester", "2 semesters" or "Yearly" */
  planName?: string
  /** What the renewal will charge, tax included, e.g. "$59.99" */
  amountLabel?: string
  /** How often the plan bills, e.g. "a year" or "every 4 months" */
  every?: string
}

// "October 30, 2026". Stripe renews on the UTC date.
const formatDate = (iso?: string) => {
  const date = iso ? new Date(iso) : null
  if (!date || Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

const main = {
  backgroundColor: '#FAFAFA',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '40px 24px',
  maxWidth: '520px',
}

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '0 0 40px',
  overflow: 'hidden' as const,
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
}

const heroWrap = {
  padding: '0',
  margin: '0',
  backgroundColor: '#1A0F0A',
}

const body = {
  padding: '32px 40px 0',
}

const heading = {
  color: '#1A0F0A',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 20px',
}

const paragraph = {
  color: '#4A3F4F',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const plan = {
  backgroundColor: '#FBF7F5',
  border: '1px solid #EFE6E1',
  borderLeft: '4px solid #F2795F',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
}

const planKind = {
  color: '#8A7F90',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}

const planTitle = {
  color: '#1A0F0A',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.35',
  margin: '0 0 4px',
}

const planDetail = {
  color: '#6B6070',
  fontSize: '14px',
  margin: '0',
}

// Ember with dark text, as in the app: never white on ember
const button = {
  backgroundColor: '#F2795F',
  borderRadius: '10px',
  color: '#1A0F0A',
  fontSize: '16px',
  fontWeight: '600',
  padding: '14px 28px',
  textDecoration: 'none',
}

const note = {
  color: '#8A7F90',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '20px 0 0',
}

const footer = {
  color: '#8A7F90',
  fontSize: '13px',
  lineHeight: '1.5',
  marginTop: '32px',
  textAlign: 'center' as const,
}

// Email templates never hot-reload, and the registry needs `template` from here
// eslint-disable-next-line react-refresh/only-export-components
const Email = ({ renewsAt, planName, amountLabel, every }: RenewalReminderProps) => {
  const date = formatDate(renewsAt)
  const on = date ? `on ${date}` : 'soon'
  const charge = amountLabel ? ` ${amountLabel}` : ''
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {`Your Phormula Premium renews ${on}${amountLabel ? ` for ${amountLabel}` : ''}. Switch plans or cancel anytime before then.`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={card}>
            <Section style={heroWrap}>
              {/* Animated GIF for clients that support it, static PNG for Outlook.
                  Both markers and the <img> must live in one HTML stream. */}
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    `<!--[if !mso]><!-->` +
                    `<img src="${HERO_GIF}" alt="Phormula" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;" />` +
                    `<!--<![endif]-->` +
                    `<!--[if mso]><img src="${HERO_FALLBACK}" alt="Phormula" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;" /><![endif]-->`,
                }}
              />
            </Section>

            <Section style={body}>
              <Heading style={heading}>Your Premium renews {on}</Heading>

              <Text style={paragraph}>
                Thanks for studying with Phormula Premium. Your plan renews automatically {on}, and the card
                on file will be charged{charge}. There's nothing you need to do to keep it.
              </Text>

              <Section style={plan}>
                <Text style={planKind}>Phormula Premium{planName ? ` · ${planName}` : ''}</Text>
                <Text style={planTitle}>Renews {on}</Text>
                <Text style={planDetail}>
                  {amountLabel && every ? `${amountLabel} ${every} · Cancel anytime` : 'Cancel anytime'}
                </Text>
              </Section>

              <Button href={BILLING_URL} style={button}>
                Manage billing
              </Button>

              <Text style={note}>
                Want to switch plans or cancel? Do it from Manage billing before the renewal date. If you
                cancel, Premium stays on until then and you won't be charged again.
              </Text>
            </Section>
          </Section>
          <Text style={footer}>
            You received this because you have a Phormula Premium subscription. We send a reminder before it
            renews, so a charge never comes as a surprise.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: RenewalReminderProps) => {
    const date = formatDate(data.renewsAt)
    return date ? `Your Phormula Premium renews on ${date}` : 'Your Phormula Premium renews soon'
  },
  displayName: 'Premium renewal reminder',
  previewData: {
    renewsAt: new Date(Date.now() + 35 * 86_400_000).toISOString(),
    planName: 'Yearly',
    amountLabel: '$59.99',
    every: 'a year',
  },
  // Only the renewal-reminders function sends it: a browser holding the public
  // anon key must not be able to send billing notices to arbitrary addresses.
  serviceRoleOnly: true,
  // The Terms promise a reminder before renewals where the law requires one
  essential: true,
} satisfies TemplateEntry
