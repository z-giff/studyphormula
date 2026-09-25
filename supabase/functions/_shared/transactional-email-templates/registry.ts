import type { ComponentType } from 'npm:react@18.3.1'
import { template as welcomeTemplate } from './welcome.tsx'
import { template as flashcardsSharedTemplate } from './flashcards-shared.tsx'
import { template as flashcardsInviteTemplate } from './flashcards-invite.tsx'
import { template as premiumTrialEndingTemplate } from './premium-trial-ending.tsx'
import { template as premiumRenewalReminderTemplate } from './premium-renewal-reminder.tsx'

export interface TemplateEntry {
  component: ComponentType<Record<string, any>>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
  // Only the database (service role) may send it: the template shows text users
  // typed, so a browser holding the public anon key must not choose its content.
  serviceRoleOnly?: boolean
  // A billing notice the Terms promise (trial ending, renewal reminders): it
  // still goes to an address that unsubscribed from Phormula's other emails,
  // but never to one that bounced or complained.
  essential?: boolean
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome: welcomeTemplate,
  'flashcards-shared': flashcardsSharedTemplate,
  'flashcards-invite': flashcardsInviteTemplate,
  'premium-trial-ending': premiumTrialEndingTemplate,
  'premium-renewal-reminder': premiumRenewalReminderTemplate,
}
