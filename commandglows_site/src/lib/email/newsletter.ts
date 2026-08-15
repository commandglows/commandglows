import { SITE, getLocalizedSiteUrl, getSiteUrl } from '@/constants'
import { newsletterStyle } from '@/theme/newsletter-email-theme'

export type NewsletterLang = 'fr' | 'en'
export type NewsletterDirection = 'ltr' | 'rtl'

export type NewsletterEmailContent = Readonly<{
  subject: string
  heading: string
  intro: string
  body: string
  cta: string
  footer: string
  unsubscribe: string
}>

export type NewsletterEmailRenderInput = Readonly<{
  lang: NewsletterLang
  dir?: NewsletterDirection
  content: NewsletterEmailContent
  ctaUrl: string
  unsubscribeUrl: string
}>

export type RenderedNewsletterEmail = Readonly<{
  subject: string
  html: string
  text: string
}>

const HTML_ESCAPE_PATTERN = /[&<>"']/g
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeEmailHtml(value: string): string {
  return value.replace(
    HTML_ESCAPE_PATTERN,
    (character) => HTML_ESCAPES[character]
  )
}

function normalizePlainText(value: string): string {
  return value.replace(/\r\n?/g, '\n').replaceAll('\u0000', '\uFFFD')
}

function singlePlainTextLine(value: string): string {
  return normalizePlainText(value).replace(/\n+/g, ' ').trim()
}

function assertSafeEmailUrl(
  value: string,
  field: 'ctaUrl' | 'unsubscribeUrl'
): void {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new TypeError(`${field} must be an absolute HTTP(S) URL`)
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new TypeError(`${field} must be an absolute HTTP(S) URL`)
  }
}

export function renderNewsletterEmail({
  lang,
  dir = 'ltr',
  content,
  ctaUrl,
  unsubscribeUrl,
}: NewsletterEmailRenderInput): RenderedNewsletterEmail {
  assertSafeEmailUrl(ctaUrl, 'ctaUrl')
  assertSafeEmailUrl(unsubscribeUrl, 'unsubscribeUrl')

  const escaped = {
    subject: escapeEmailHtml(content.subject),
    heading: escapeEmailHtml(content.heading),
    intro: escapeEmailHtml(content.intro),
    body: escapeEmailHtml(content.body),
    cta: escapeEmailHtml(content.cta),
    footer: escapeEmailHtml(content.footer),
    unsubscribe: escapeEmailHtml(content.unsubscribe),
    ctaUrl: escapeEmailHtml(ctaUrl),
    unsubscribeUrl: escapeEmailHtml(unsubscribeUrl),
  }

  const html = `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escaped.subject}</title>
  </head>
  <body style="${newsletterStyle('documentBody')}">
    <div lang="${lang}" dir="${dir}" style="${newsletterStyle('shell')}">
      <h1 style="${newsletterStyle('heading')}">${escaped.heading}</h1>
      <p style="${newsletterStyle('paragraph')}">${escaped.intro}</p>
      <p style="${newsletterStyle('body')}">${escaped.body}</p>
      <p style="${newsletterStyle('ctaRow')}">
        <a href="${escaped.ctaUrl}" style="${newsletterStyle('button')}">${escaped.cta}</a>
      </p>
      <p style="${newsletterStyle('footer')}">${escaped.footer}</p>
      <hr style="${newsletterStyle('divider')}" />
      <p style="${newsletterStyle('smallNote')}">
        <a href="${escaped.unsubscribeUrl}" style="${newsletterStyle('link')}">${escaped.unsubscribe}</a>
      </p>
    </div>
  </body>
</html>`

  const text = [
    normalizePlainText(content.heading),
    normalizePlainText(content.intro),
    normalizePlainText(content.body),
    `${singlePlainTextLine(content.cta)}: ${singlePlainTextLine(ctaUrl)}`,
    normalizePlainText(content.footer),
    `${singlePlainTextLine(content.unsubscribe)}: ${singlePlainTextLine(unsubscribeUrl)}`,
  ].join('\n\n')

  return {
    subject: normalizePlainText(content.subject),
    html,
    text,
  }
}

export function buildWelcomeEmail(
  lang: NewsletterLang,
  source: 'footer' | 'lead-magnet' | 'windows-mastery' | 'unknown',
  email: string
): RenderedNewsletterEmail {
  const salesPageUrl = getLocalizedSiteUrl(
    lang,
    lang === 'fr' ? '/maitrise-windows' : '/windows-mastery'
  )
  const unsubscribeUrl = new URL('/api/newsletter/unsubscribe', SITE.url)
  unsubscribeUrl.searchParams.set('email', email)
  unsubscribeUrl.searchParams.set('lang', lang)

  const content: NewsletterEmailContent =
    lang === 'fr'
      ? {
          subject:
            source === 'lead-magnet'
              ? 'Bienvenue chez CMDglows — votre prochaine étape'
              : 'Bienvenue chez CMDglows',
          heading: 'Bienvenue chez CMDglows',
          intro:
            "Vous êtes bien inscrit(e). Le point de départ le plus utile pour comprendre l'approche CMDglows est maintenant la page dédiée à la formation Windows.",
          body: "L'idée centrale est simple : vous n'avez pas forcément besoin de plus de motivation. Vous avez souvent surtout besoin de moins de friction, moins de bruit et d'un environnement plus cohérent.",
          cta: 'Voir la page de vente',
          footer:
            "Vous recevrez ensuite des e-mails plus utiles et plus structurés que le message de bienvenue générique qu'il y avait avant.",
          unsubscribe: 'Se désabonner',
        }
      : {
          subject:
            source === 'lead-magnet'
              ? 'Welcome to CMDglows — your next step'
              : 'Welcome to CMDglows',
          heading: 'Welcome to CMDglows',
          intro:
            'You are subscribed. The most useful starting point for understanding the CMDglows approach is now the dedicated Windows course sales page.',
          body: 'The core idea is simple: you probably do not need more motivation first. You mostly need less friction, less noise, and a more coherent work environment.',
          cta: 'See the sales page',
          footer:
            'You will now receive a more coherent path than the older generic welcome email.',
          unsubscribe: 'Unsubscribe',
        }

  return renderNewsletterEmail({
    lang,
    content,
    ctaUrl: salesPageUrl,
    unsubscribeUrl: unsubscribeUrl.toString(),
  })
}

export function renderUnsubscribeConfirmationPage(
  lang: NewsletterLang
): string {
  const content =
    lang === 'fr'
      ? {
          title: 'Désabonnement confirmé',
          heading: 'Vous êtes désabonné(e)',
          body: 'Vous avez été désabonné(e) de la newsletter CMDglows.',
          back: 'Retour à CMDglows',
        }
      : {
          title: 'Unsubscribe confirmed',
          heading: 'Unsubscribed',
          body: "You've been unsubscribed from the CMDglows newsletter.",
          back: 'Back to CMDglows',
        }
  const homeUrl = getSiteUrl(lang === 'fr' ? '/fr' : '/')

  return `<!doctype html>
<html lang="${lang}" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeEmailHtml(content.title)}</title>
  </head>
  <body style="${newsletterStyle('page')}">
    <main lang="${lang}" dir="ltr" style="${newsletterStyle('pageShell')}">
      <h1 style="${newsletterStyle('pageHeading')}">${escapeEmailHtml(content.heading)}</h1>
      <p style="${newsletterStyle('pageBody')}">${escapeEmailHtml(content.body)}</p>
      <a href="${escapeEmailHtml(homeUrl)}" style="${newsletterStyle('pageLink')}">${escapeEmailHtml(content.back)}</a>
    </main>
  </body>
</html>`
}
