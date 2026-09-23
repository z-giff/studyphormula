import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  describeShare,
  note,
  paragraph,
  ShareEmailLayout,
  SITE_URL,
  type ShareEmailProps,
} from './flashcard-share-layout.tsx'

// Sent when someone shares flashcards with an address that has no Phormula
// account yet. The share waits under that address until they sign up with it.

const signupUrl = (email?: string) =>
  `${SITE_URL}/auth?mode=signup&next=${encodeURIComponent('/shared')}` +
  (email ? `&email=${encodeURIComponent(email)}` : '')

const Email = (props: ShareEmailProps) => {
  const share = describeShare(props)
  const email = props.recipientEmail
  return (
    <ShareEmailLayout
      preview={`${share.sender} shared "${share.title}" with you. It's waiting for you on Phormula.`}
      heading={`${share.sender} shared ${share.noun} with you`}
      share={share}
      actionLabel="Sign up to open it"
      actionHref={signupUrl(email)}
      afterAction={
        email ? (
          <Text style={note}>
            Sign up with <strong>{email}</strong> so it finds you. It'll be under
            Shared flashcards as soon as you're in.
          </Text>
        ) : undefined
      }
      footer={
        <>
          You received this because {share.sender} shared flashcards with you on Phormula.
          <br />
          If you weren't expecting it, you can safely ignore this email.
        </>
      }
    >
      <Text style={paragraph}>
        It's waiting for you on Phormula, a study tool for people who learn by seeing.
        Flashcards there can be labelled diagrams, flowcharts and sketches, not just
        words on a card.
      </Text>
      <Text style={paragraph}>
        You don't have an account yet. Create one and you can flip through{' '}
        {share.isFile ? 'the sets' : 'the cards'}, then add {share.isFile ? 'the file' : 'the set'} to
        your dashboard to study it your way.
      </Text>
    </ShareEmailLayout>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `${describeShare(data).sender} shared flashcards with you on Phormula`,
  displayName: 'Flashcards shared (invite)',
  previewData: {
    senderName: 'Alex Rivera',
    itemType: 'set',
    itemTitle: 'Biology Ch. 4: Cell Structure',
    setCount: 1,
    cardCount: 24,
    recipientEmail: 'sam@example.com',
  },
  serviceRoleOnly: true,
} satisfies TemplateEntry
