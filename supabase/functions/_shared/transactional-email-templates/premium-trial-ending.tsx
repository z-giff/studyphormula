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

// Sent by the stripe-webhook function when Stripe says a free trial of
// Phormula Premium ends in three days (customer.subscription.trial_will_end).
// Two versions: with no card on file the trial simply ends unless they add
// one; with a card on file it is charged and Premium carries on.
// Same frame as the welcome email.

const SITE_URL = 'https://phormula.co'
// The app opens the Stripe billing page when it sees ?billing=manage
const BILLING_URL = `${SITE_URL}/dashboard?billing=manage`

const HERO_GIF =
  'https://phormula.co/__l5e/assets-v1/3da8ec4a-313d-4c88-a15a-dfe468011f50/swirl-unfurl-20fps.gif'
const HERO_FALLBACK =
  'https://phormula.co/__l5e/assets-v1/39e42426-b578-4a05-a5d1-9521615052a8/swirl-unfurl-fallback.png'

export interface TrialEndingProps {
  /** When the trial ends, as an ISO timestamp. */
  trialEndsAt?: string
  /** Stripe has a card to charge when the trial ends. */
  hasPaymentMethod?: boolean
  /** "Monthly" or "Yearly" */
  planName?: string
  /** What they pay after the trial, e.g. "$5.99 a month" */
  priceLabel?: string
}

// "in 3 days", "tomorrow", "today". Relative rather than a date, so it reads
// right in every time zone.
const endsIn = (iso?: string) => {
  const ms = iso ? new Date(iso).getTime() - Date.now() : Number.NaN
  if (!Number.isFinite(ms)) return 'soon'
  const days = Math.round(ms / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
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
const Email = ({ trialEndsAt, hasPaymentMethod, planName, priceLabel }: TrialEndingProps) => {
  const when = endsIn(trialEndsAt)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {hasPaymentMethod
          ? `Your Premium trial ends ${when}, and Premium carries on after that.`
          : `Add a card to keep Auto-Flashcard, interactive, flowchart and drawing cards, and the MC Quiz.`}
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
              <Heading style={heading}>Your free trial ends {when}</Heading>

              {hasPaymentMethod ? (
                <Text style={paragraph}>
                  Thanks for trying Phormula Premium. When your trial ends, the card you added will be
                  charged{priceLabel ? ` ${priceLabel}` : ''} and Premium carries on without a break.
                  There's nothing you need to do.
                </Text>
              ) : (
                <Text style={paragraph}>
                  Thanks for trying Phormula Premium. To keep making cards with Auto-Flashcard and
                  studying with interactive, flowchart and drawing cards and the MC Quiz, add a card
                  before your trial ends.
                </Text>
              )}

              <Section style={plan}>
                <Text style={planKind}>Phormula Premium{planName ? ` · ${planName}` : ''}</Text>
                <Text style={planTitle}>Free trial ends {when}</Text>
                <Text style={planDetail}>
                  {priceLabel ? `Then ${priceLabel} · Cancel anytime` : 'Cancel anytime'}
                </Text>
              </Section>

              <Button href={BILLING_URL} style={button}>
                {hasPaymentMethod ? 'Manage billing' : 'Add a card'}
              </Button>

              <Text style={note}>
                {hasPaymentMethod
                  ? "Want to switch plans or cancel? Do it from Manage billing before your trial ends and you won't be charged."
                  : "If you don't add one, you won't be charged. Your account goes back to Free, every card you've made stays saved, and your interactive, flowchart and drawing cards unlock again whenever you upgrade."}
              </Text>
            </Section>
          </Section>
          <Text style={footer}>
            You received this because you started a free trial of Phormula Premium.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: TrialEndingProps) => `Your Phormula Premium trial ends ${endsIn(data.trialEndsAt)}`,
  displayName: 'Premium trial ending',
  previewData: {
    trialEndsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    hasPaymentMethod: false,
    planName: 'Monthly',
    priceLabel: '$5.99 a month',
  },
  // Only the webhook sends it: a browser holding the public anon key must not be
  // able to send billing notices to arbitrary addresses.
  serviceRoleOnly: true,
} satisfies TemplateEntry
