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
  fullName?: string
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
  padding: '40px',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
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

const Email = ({ fullName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thanks for joining Phormula — we'll be in touch soon.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={heading}>
            {fullName ? `Thanks for signing up, ${fullName}` : 'Thanks for signing up'}
          </Heading>
          <Text style={paragraph}>
            We're glad you're here. Phormula is being built to help you see ideas,
            connect them, and remember them differently — with color-coded flashcards,
            interactive diagrams, and AI-generated study sets.
          </Text>
          <Text style={paragraph}>
            We're not quite ready for you yet, but we're working hard to get there.
            We'll let you know as soon as the product is ready for you to use.
          </Text>
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
  previewData: { fullName: 'Alex' },
} satisfies TemplateEntry
