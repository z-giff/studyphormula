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

const cta = {
  backgroundColor: '#F2795F',
  borderRadius: '10px',
  color: '#1A0F0A',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  padding: '14px 28px',
  textDecoration: 'none',
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
    <Preview>Welcome to Phormula — your way of learning, reformulated.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Heading style={heading}>
            {fullName ? `Welcome, ${fullName}` : 'Welcome to Phormula'}
          </Heading>
          <Text style={paragraph}>
            Thanks for signing up. Phormula is built to help you see ideas, connect them,
            and remember them differently — with color-coded flashcards, interactive
            diagrams, and AI-generated study sets.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button href="https://studyphormula.lovable.app/dashboard" style={cta}>
              Open your dashboard
            </Button>
          </Section>
          <Text style={paragraph}>
            Start by creating your first set, or explore the study modes designed to
            match how you actually learn.
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
