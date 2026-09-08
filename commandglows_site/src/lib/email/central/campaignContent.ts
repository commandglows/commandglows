import { escapeHtml, renderEmail } from './templates'
import { newsletterStyle } from '../../../theme/newsletter-email-theme'

export type CampaignBlock = {
  id: string
  type: 'heading' | 'text' | 'button' | 'divider' | 'source'
  text: string
  url?: string
  source_id?: string
}
export type CampaignContent = {
  title: string
  audienceId: string
  locale: 'fr' | 'en'
  subject: string
  preheader: string
  blocks: CampaignBlock[]
}
function text(value: unknown, max: number, empty = false): string {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) ||
    (!empty && !value.trim())
  )
    throw new Error('invalid_input')
  return value.trim()
}
export function campaignContent(input: any): CampaignContent {
  if (!input || !['fr', 'en'].includes(input.locale))
    throw new Error('invalid_input')
  const subject = text(input.subject, 200, true)
  const preheader = text(input.preheader, 300, true)
  if (/[\r\n]/.test(subject + preheader)) throw new Error('invalid_input')
  if (!Array.isArray(input.blocks) || input.blocks.length > 60)
    throw new Error('invalid_input')
  const blocks: CampaignBlock[] = input.blocks.map((block: any) => {
    if (
      !block ||
      Object.keys(block).some(
        (k) => !['id', 'type', 'text', 'url', 'source_id'].includes(k)
      ) ||
      !['heading', 'text', 'button', 'divider', 'source'].includes(block.type)
    )
      throw new Error('invalid_input')
    const result: CampaignBlock = {
      id: text(block.id, 100),
      type: block.type,
      text: text(block.text, 4000, true),
    }
    if (block.url !== undefined) {
      const url = new URL(text(block.url, 2048))
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error('invalid_input')
      result.url = url.href
    }
    if (block.source_id !== undefined)
      result.source_id = text(block.source_id, 200)
    return result
  })
  if (
    new Set(blocks.map((b) => b.id)).size !== blocks.length ||
    JSON.stringify(blocks).length > 48000
  )
    throw new Error('invalid_input')
  return {
    title: text(input.title, 160),
    audienceId: text(input.audienceId, 64),
    locale: input.locale,
    subject,
    preheader,
    blocks,
  }
}
export function renderCampaign(
  content: CampaignContent,
  business: { brand: string; legalFooter: string }
) {
  if (
    !content.subject ||
    !content.blocks.some((b) => b.type !== 'divider' && b.text.trim()) ||
    content.blocks.some(
      (b) =>
        b.type !== 'divider' &&
        (!b.text.trim() || (b.type === 'button' && !b.url))
    )
  )
    throw new Error('invalid_input')
  const base = renderEmail({
    templateKey: 'newsletter',
    locale: content.locale,
    brand: business.brand,
    legalFooter: business.legalFooter,
    subject: content.subject,
    paragraphs: ['Newsletter'],
    unsubscribeUrl: '{{{ pm:unsubscribe }}}',
  })
  const html = content.blocks
    .map((b) => {
      const value = escapeHtml(b.text).replace(/\n/g, '<br>')
      if (b.type === 'divider')
        return `<hr style="${newsletterStyle('divider')}">`
      if (b.type === 'heading')
        return `<h2 style="${newsletterStyle('heading')}">${value}</h2>`
      if (b.type === 'button')
        return `<p style="${newsletterStyle('ctaRow')}"><a href="${escapeHtml(b.url!)}" style="${newsletterStyle('button')}">${value}</a></p>`
      if (b.type === 'source')
        return `<blockquote style="margin:0"><p style="${newsletterStyle('paragraph')}">${value}</p>${b.url ? `<p style="${newsletterStyle('paragraph')}"><a style="${newsletterStyle('link')}" href="${escapeHtml(b.url)}">${content.locale === 'fr' ? 'Lire la source' : 'Read source'}</a></p>` : ''}</blockquote>`
      return `<p style="${newsletterStyle('paragraph')}">${value}</p>`
    })
    .join('')
  const plain = content.blocks
    .map((b) =>
      b.type === 'divider'
        ? '────────'
        : [b.text, b.url].filter(Boolean).join('\n')
    )
    .join('\n\n')
  const label =
    content.locale === 'fr'
      ? 'Me désabonner de ces emails'
      : 'Unsubscribe from these emails'
  const unsubscribe = '{{{ pm:unsubscribe }}}'
  const htmlDocument = `<!doctype html><html lang="${content.locale}" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(base.subject)}</title></head><body style="${newsletterStyle('documentBody')}">${content.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeHtml(content.preheader)}</div>` : ''}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${newsletterStyle('shell')}"><tr><td><main lang="${content.locale}"><p style="${newsletterStyle('smallNote')}">${escapeHtml(business.brand.trim())}</p><h1 style="${newsletterStyle('heading')}">${escapeHtml(base.subject)}</h1>${html}<hr style="${newsletterStyle('divider')}"><footer style="${newsletterStyle('footer')}"><p>${escapeHtml(business.brand.trim())}</p><p>${escapeHtml(business.legalFooter.trim())}</p><p><a style="${newsletterStyle('link')}" href="${unsubscribe}">${label}</a></p></footer></main></td></tr></table></body></html>`
  return {
    subject: base.subject,
    templateVersion: base.templateVersion,
    html: htmlDocument,
    text: [
      base.subject,
      content.preheader,
      plain,
      business.brand.trim(),
      business.legalFooter.trim(),
      `${label}: ${unsubscribe}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
  }
}
