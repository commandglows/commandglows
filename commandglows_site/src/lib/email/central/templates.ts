export interface EmailContent {
  templateKey:
    | 'subscription_confirmation'
    | 'service_notification'
    | 'newsletter'
  locale: 'fr' | 'en'
  brand: string
  legalFooter: string
  subject?: string
  paragraphs?: string[]
  actionUrl?: string
  actionLabel?: string
  unsubscribeUrl?: string
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char]!
  )
}

function checkedText(value: unknown, max: number): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  ) {
    throw new Error('invalid_template_content')
  }
  return value.trim()
}

function checkedUrl(value: string): string {
  if (value === '{{{ pm:unsubscribe }}}') return value
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    value.length > 2048
  ) {
    throw new Error('invalid_template_url')
  }
  return value
}

/** Deliberately text-based: no arbitrary HTML, remote images or tracking pixels. */
export function renderEmail(content: EmailContent) {
  if (!['fr', 'en'].includes(content.locale))
    throw new Error('invalid_template_locale')
  if (
    ![
      'subscription_confirmation',
      'service_notification',
      'newsletter',
    ].includes(content.templateKey)
  ) {
    throw new Error('invalid_template_key')
  }
  const brand = checkedText(content.brand, 100)
  const footer = checkedText(content.legalFooter, 1000)
  const fr = content.locale === 'fr'
  const confirmation = content.templateKey === 'subscription_confirmation'
  let subject: string
  let paragraphs: string[]
  let label = content.actionLabel
  if (confirmation) {
    subject = fr
      ? `Confirmez votre inscription à ${brand}`
      : `Confirm your subscription to ${brand}`
    paragraphs = fr
      ? [
          `Vous avez demandé à recevoir les emails de ${brand}. Confirmez votre adresse pour activer cette inscription.`,
          'Si vous n’avez pas fait cette demande, ignorez cet email. Vous ne serez pas inscrit sans confirmation.',
        ]
      : [
          `You asked to receive emails from ${brand}. Confirm your address to activate this subscription.`,
          'If you did not make this request, ignore this email. Your subscription will remain inactive.',
        ]
    label = fr ? 'Confirmer mon inscription' : 'Confirm my subscription'
    if (!content.actionUrl) throw new Error('confirmation_link_required')
  } else {
    subject = checkedText(content.subject, 200)
    if (
      !Array.isArray(content.paragraphs) ||
      content.paragraphs.length < 1 ||
      content.paragraphs.length > 30
    ) {
      throw new Error('invalid_template_paragraphs')
    }
    paragraphs = content.paragraphs.map((value) => checkedText(value, 4000))
  }
  if (/[\r\n]/.test(subject)) throw new Error('invalid_template_subject')
  const action = content.actionUrl
    ? { url: checkedUrl(content.actionUrl), label: checkedText(label, 120) }
    : null
  if (content.templateKey === 'newsletter' && !content.unsubscribeUrl)
    throw new Error('unsubscribe_required')
  const unsubscribe = content.unsubscribeUrl
    ? checkedUrl(content.unsubscribeUrl)
    : null
  const unsubscribeLabel = fr
    ? 'Me désabonner de ces emails'
    : 'Unsubscribe from these emails'
  const main = `<h1>${escapeHtml(subject)}</h1>${paragraphs.map((text) => `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`).join('')}`
  const actionHtml = action
    ? `<p><a href="${escapeHtml(action.url)}">${escapeHtml(action.label)}</a></p>`
    : ''
  const optoutHtml = unsubscribe
    ? `<p><a href="${escapeHtml(unsubscribe)}">${unsubscribeLabel}</a></p>`
    : ''
  // Semantic markup remains usable after email clients strip CSS and root attributes.
  const html = `<!doctype html><html lang="${content.locale}" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(subject)}</title></head><body><main lang="${content.locale}" dir="ltr">${main}${actionHtml}<footer><p>${escapeHtml(brand)}</p><p>${escapeHtml(footer)}</p>${optoutHtml}</footer></main></body></html>`
  const text = [
    subject,
    ...paragraphs,
    action ? `${action.label}: ${action.url}` : '',
    brand,
    footer,
    unsubscribe ? `${unsubscribeLabel}: ${unsubscribe}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  return { subject, html, text, templateVersion: '1' as const }
}
