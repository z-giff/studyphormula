import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  // no personalization fields
}

const HERO_GIF =
  'https://phormula.co/__l5e/assets-v1/3da8ec4a-313d-4c88-a15a-dfe468011f50/swirl-unfurl-20fps.gif'
const HERO_FALLBACK =
  'https://phormula.co/__l5e/assets-v1/39e42426-b578-4a05-a5d1-9521615052a8/swirl-unfurl-fallback.png'

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

const hero = {
  display: 'block',
  width: '100%',
  maxWidth: '520px',
  height: 'auto',
  border: '0',
}

const body = {
  padding: '32px 40px 0',
}

const heading = {
  color: '#1A0F0A',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#4A3F4F',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}


const footer = {
  color: '#8A7F90',
  fontSize: '13px',
  lineHeight: '1.5',
  marginTop: '32px',
  textAlign: 'center' as const,
}

const Email = (_props: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thanks for joining Phormula — we'll be in touch soon.</Preview>
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
          <Heading style={heading}>Thanks for signing up</Heading>
          <Text style={paragraph}>
            We're glad you're here. Phormula is being built to help you see ideas,
            connect them, and remember them differently with color-coded flashcards,
            interactive diagrams, and AI-generated study sets.
          </Text>
          <Text style={paragraph}>
            We're not quite ready for you yet, but we're working hard to get there.
            We'll let you know as soon as the product is ready for you to use.
          </Text>
          </Section>
        </Section>
        <Text style={footer}>
          You received this because you signed up for Phormula.
          <br />
          If you did not sign up, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Welcome to Phormula',
  displayName: 'Welcome Email',
  previewData: {},
} satisfies TemplateEntry
