import {
  EMAIL_CLIENT_ADAPTATIONS,
  EMAIL_TOKENS,
  type EmailAdapterTokenSource,
} from '@/theme/generated/email-tokens'

type InlineStyleValue = string | number
type InlineStyleObject = Record<string, InlineStyleValue>

type EmailDimension = EmailAdapterTokenSource['semantic.space.unit']

/**
 * Compatibility name retained for the existing email-contract tests. The
 * value is the generated adapter itself, never a locally maintained copy.
 */
export const EMAIL_ADAPTER_SOURCE_FIXTURE = EMAIL_TOKENS
export { EMAIL_CLIENT_ADAPTATIONS }

function serializeInlineStyle(style: InlineStyleObject): string {
  return Object.entries(style)
    .map(([property, value]) => {
      const serializedValue = typeof value === 'number' ? `${value}px` : value
      return `${property}: ${serializedValue};`
    })
    .join(' ')
}

function dimensionToCss(value: EmailDimension): string {
  return `${value.amount}${value.unit}`
}

const spacingUnit = EMAIL_TOKENS['semantic.space.unit'].amount
const emailFontFamily =
  EMAIL_TOKENS['semantic.typography.email.body.family'].join(', ')

const NEWSLETTER_EMAIL_STYLES = {
  documentBody: {
    'background-color': EMAIL_CLIENT_ADAPTATIONS.surface,
    color: EMAIL_CLIENT_ADAPTATIONS.text,
    'font-family': emailFontFamily,
    margin: '0',
    padding: `${spacingUnit * 6}px ${spacingUnit * 3}px`,
  },
  shell: {
    'background-color': EMAIL_CLIENT_ADAPTATIONS.surface,
    color: EMAIL_CLIENT_ADAPTATIONS.text,
    'font-family': emailFontFamily,
    'max-width': EMAIL_CLIENT_ADAPTATIONS.maxContentWidth,
    margin: '0 auto',
  },
  heading: {
    color: EMAIL_CLIENT_ADAPTATIONS.text,
    'font-size': 28,
    'line-height': '1.2',
    margin: `0 0 ${spacingUnit * 4}px`,
  },
  paragraph: {
    color: EMAIL_CLIENT_ADAPTATIONS.text,
    'font-size': 16,
    'line-height': '1.6',
    margin: `0 0 ${spacingUnit * 4}px`,
  },
  body: {
    color: EMAIL_CLIENT_ADAPTATIONS.text,
    'font-size': 16,
    'line-height': '1.6',
    margin: `0 0 ${spacingUnit * 6}px`,
  },
  ctaRow: {
    margin: `0 0 ${spacingUnit * 6}px`,
  },
  button: {
    display: 'inline-block',
    'background-color': EMAIL_TOKENS['component.email.button.background'],
    color: EMAIL_CLIENT_ADAPTATIONS.foreground,
    'text-decoration': 'none',
    padding: `${spacingUnit * 3}px ${spacingUnit * 4.5}px`,
    'border-radius': dimensionToCss(
      EMAIL_TOKENS['component.email.button.radius']
    ),
    'font-weight': '600',
  },
  footer: {
    color: EMAIL_CLIENT_ADAPTATIONS.mutedText,
    'font-size': 14,
    'line-height': '1.6',
    margin: `0 0 ${spacingUnit * 6}px`,
  },
  divider: {
    border: 'none',
    'border-top': `1px solid ${EMAIL_CLIENT_ADAPTATIONS.divider}`,
    margin: `${spacingUnit * 5}px 0`,
  },
  link: {
    color: EMAIL_CLIENT_ADAPTATIONS.subtleText,
  },
  smallNote: {
    color: EMAIL_CLIENT_ADAPTATIONS.subtleText,
    'font-size': 12,
    'line-height': '1.6',
    margin: '0',
  },
  page: {
    'background-color': EMAIL_CLIENT_ADAPTATIONS.foreground,
    color: EMAIL_CLIENT_ADAPTATIONS.surface,
    'font-family': emailFontFamily,
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '100vh',
    margin: '0',
    padding: `${spacingUnit * 8}px`,
  },
  pageShell: {
    color: EMAIL_CLIENT_ADAPTATIONS.surface,
    'text-align': 'center',
  },
  pageHeading: {
    margin: `0 0 ${spacingUnit * 4}px`,
  },
  pageBody: {
    color: EMAIL_CLIENT_ADAPTATIONS.confirmationText,
    margin: `0 0 ${spacingUnit * 6}px`,
  },
  pageLink: {
    color: EMAIL_TOKENS['component.email.button.background'],
  },
} as const

export type NewsletterStyleName = keyof typeof NEWSLETTER_EMAIL_STYLES

export const NEWSLETTER_STYLE_NAMES = Object.freeze(
  Object.keys(NEWSLETTER_EMAIL_STYLES) as NewsletterStyleName[]
)

export function newsletterStyle(name: NewsletterStyleName): string {
  return serializeInlineStyle(
    NEWSLETTER_EMAIL_STYLES[name] as InlineStyleObject
  )
}
