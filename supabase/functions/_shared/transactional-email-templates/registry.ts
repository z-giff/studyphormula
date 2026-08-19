import type { ComponentType } from 'npm:react@18.3.1'
import { template as welcomeTemplate } from './welcome.tsx'

export interface TemplateEntry {
  component: ComponentType<Record<string, any>>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome: welcomeTemplate,
}
