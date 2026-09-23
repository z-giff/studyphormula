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

// Shared look for the two emails a flashcard share sends: the invite
// (flashcards-invite) and the heads-up to an existing user (flashcards-shared).
// Same frame as the welcome email.

export const SITE_URL = 'https://phormula.co'

const HERO_GIF =
  'https://phormula.co/__l5e/assets-v1/3da8ec4a-313d-4c88-a15a-dfe468011f50/swirl-unfurl-20fps.gif'
const HERO_FALLBACK =
  'https://phormula.co/__l5e/assets-v1/39e42426-b578-4a05-a5d1-9521615052a8/swirl-unfurl-fallback.png'

export interface ShareEmailProps {
  senderName?: string
  itemType?: 'set' | 'file'
  itemTitle?: string
  setCount?: number
  cardCount?: number
  recipientEmail?: string
}

// Names and titles are typed by users: keep them on one line and a sane length,
// since they also end up in the subject.
const tidy = (value: unknown, max: number, fallback: string) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return fallback
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const describeShare = (props: ShareEmailProps) => {
  const isFile = props.itemType === 'file'
  const cards = plural(Number(props.cardCount) || 0, 'card')
  return {
    sender: tidy(props.senderName, 60, 'Someone'),
    title: tidy(props.itemTitle, 80, isFile ? 'Untitled file' : 'Untitled set'),
    isFile,
    noun: isFile ? 'a file of flashcards' : 'a flashcard set',
    counts: isFile ? `${plural(Number(props.setCount) || 0, 'set')} · ${cards}` : cards,
  }
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

export const paragraph = {
  color: '#4A3F4F',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const item = {
  backgroundColor: '#FBF7F5',
  border: '1px solid #EFE6E1',
  borderLeft: '4px solid #F2795F',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
}

const itemKind = {
  color: '#8A7F90',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}

const itemTitle = {
  color: '#1A0F0A',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.35',
  margin: '0 0 4px',
}

const itemCounts = {
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

export const note = {
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

interface LayoutProps {
  preview: string
  heading: string
  share: ReturnType<typeof describeShare>
  actionLabel: string
  actionHref: string
  footer: React.ReactNode
  children: React.ReactNode
  afterAction?: React.ReactNode
}

export const ShareEmailLayout = (props: LayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{props.preview}</Preview>
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
            <Heading style={heading}>{props.heading}</Heading>

            <Section style={item}>
              <Text style={itemKind}>{props.share.isFile ? 'File' : 'Flashcard set'}</Text>
              <Text style={itemTitle}>{props.share.title}</Text>
              <Text style={itemCounts}>{props.share.counts}</Text>
            </Section>

            {props.children}

            <Button href={props.actionHref} style={button}>
              {props.actionLabel}
            </Button>

            {props.afterAction}
          </Section>
        </Section>
        <Text style={footer}>{props.footer}</Text>
      </Container>
    </Body>
  </Html>
)
