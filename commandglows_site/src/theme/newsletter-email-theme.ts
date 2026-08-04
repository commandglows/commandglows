import { SITE_VISUAL_TOKENS } from '@/constants';

type InlineStyleValue = string | number;
type InlineStyleObject = Record<string, InlineStyleValue>;

const NEWSLETTER_ACCENT = '#ff00c8';
const NEWSLETTER_TEXT = '#171717';
const NEWSLETTER_MUTED = '#525252';
const NEWSLETTER_SUBTLE = '#737373';
const NEWSLETTER_DIVIDER = '#e5e5e5';
const NEWSLETTER_SURFACE = SITE_VISUAL_TOKENS.themeMeta.manifestBackground;
const NEWSLETTER_FOREGROUND = SITE_VISUAL_TOKENS.themeMeta.manifestTheme;
const NEWSLETTER_PRIMARY = SITE_VISUAL_TOKENS.themeMeta.website;

function serializeInlineStyle(style: InlineStyleObject): string {
  return Object.entries(style)
    .map(([property, value]) => {
      const serializedValue = typeof value === 'number' ? `${value}px` : value;
      return `${property}: ${serializedValue};`;
    })
    .join(' ');
}

const NEWSLETTER_EMAIL_STYLES = {
  shell: {
    'font-family': 'sans-serif',
    'max-width': 600,
    margin: '0 auto',
    color: NEWSLETTER_TEXT,
  },
  heading: {
    color: NEWSLETTER_TEXT,
    'font-size': 28,
    'line-height': '1.2',
    'margin-bottom': 16,
  },
  paragraph: {
    'font-size': 16,
    'line-height': '1.6',
    margin: '0 0 16px',
  },
  body: {
    'font-size': 16,
    'line-height': '1.6',
    margin: '0 0 24px',
  },
  ctaRow: {
    margin: '0 0 24px',
  },
  button: {
    display: 'inline-block',
    'background-color': NEWSLETTER_PRIMARY,
    color: NEWSLETTER_FOREGROUND,
    'text-decoration': 'none',
    padding: '12px 18px',
    'border-radius': 10,
    'font-weight': '600',
  },
  footer: {
    'font-size': 14,
    'line-height': '1.6',
    color: NEWSLETTER_MUTED,
    margin: '0 0 24px',
  },
  divider: {
    border: 'none',
    'border-top': `1px solid ${NEWSLETTER_DIVIDER}`,
    margin: '20px 0',
  },
  link: {
    color: NEWSLETTER_SUBTLE,
  },
  smallNote: {
    'font-size': 12,
    color: NEWSLETTER_SUBTLE,
    margin: '0',
  },
  page: {
    'font-family': 'sans-serif',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'center',
    'min-height': '100vh',
    margin: '0',
    padding: '2rem',
    background: NEWSLETTER_FOREGROUND,
  },
  pageShell: {
    'text-align': 'center',
    color: NEWSLETTER_SURFACE,
  },
  pageHeading: {
    margin: '0 0 16px',
  },
  pageBody: {
    color: '#999999',
    margin: '0 0 24px',
  },
  pageLink: {
    color: NEWSLETTER_ACCENT,
  },
} as const;

export function newsletterStyle(name: keyof typeof NEWSLETTER_EMAIL_STYLES): string {
  return serializeInlineStyle(NEWSLETTER_EMAIL_STYLES[name] as InlineStyleObject);
}
