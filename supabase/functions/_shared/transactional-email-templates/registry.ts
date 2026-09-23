import type { ComponentType } from 'npm:react@18.3.1'
import { template as welcomeTemplate } from './welcome.tsx'
import { template as flashcardsSharedTemplate } from './flashcards-shared.tsx'
import { template as flashcardsInviteTemplate } from './flashcards-invite.tsx'

export interface TemplateEntry {
  component: ComponentType<Record<string, any>>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
  // Only the database (service role) may send it: the template shows text users
  // typed, so a browser holding the public anon key must not choose its content.
  serviceRoleOnly?: boolean
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome: welcomeTemplate,
  'flashcards-shared': flashcardsSharedTemplate,
  'flashcards-invite': flashcardsInviteTemplate,
}
