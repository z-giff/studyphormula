import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  describeShare,
  paragraph,
  ShareEmailLayout,
  SITE_URL,
  type ShareEmailProps,
} from './flashcard-share-layout.tsx'

// Sent when someone shares flashcards with an existing Phormula user. The share
// is already under Shared flashcards on their dashboard.

const Email = (props: ShareEmailProps) => {
  const share = describeShare(props)
  return (
    <ShareEmailLayout
      preview={`"${share.title}" is waiting under Shared flashcards on Phormula.`}
      heading={`${share.sender} shared ${share.noun} with you`}
      share={share}
      actionLabel="Open Shared flashcards"
      actionHref={`${SITE_URL}/shared`}
      footer={
        <>
          You received this because {share.sender} shared flashcards with you on Phormula.
        </>
      }
    >
      <Text style={paragraph}>
        You'll find it under <strong>Shared flashcards</strong> on your dashboard. Flip
        through {share.isFile ? 'its sets' : 'the cards'} first, or add{' '}
        {share.isFile ? 'the file' : 'the set'} to your dashboard to make it your own.
      </Text>
    </ShareEmailLayout>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const share = describeShare(data)
    return `${share.sender} shared "${share.title}" with you`
  },
  displayName: 'Flashcards shared',
  previewData: {
    senderName: 'Alex Rivera',
    itemType: 'file',
    itemTitle: 'Chemistry Finals',
    setCount: 3,
    cardCount: 58,
    recipientEmail: 'sam@example.com',
  },
  serviceRoleOnly: true,
} satisfies TemplateEntry
