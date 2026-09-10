import { requireEmailAdmin } from './central/campaignApi'
import { errorResponse, json } from './central/api'
import { EmailHttpError } from './central/security'
import { getServerEnv } from '../serverEnv'

type Context = { request: Request; locals: { auth: () => { userId?: string | null } } }
type Dependencies = { authorize?: typeof requireEmailAdmin; fetch?: typeof fetch }
const safeText = (value: unknown, limit: number) => typeof value === 'string' ? value.slice(0, limit) : ''

// Plain-text extraction only. Never render upstream markup or remote images.
export function readerText(value: unknown): string {
  return safeText(value, 300_000)
    .replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>|<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|apos);/g, (_, entity: string) => ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity]!)
    .replace(/\n{3,}/g, '\n\n').trim().slice(0, 100_000)
}

export async function handleReaderApi(
  { request, locals }: Context,
  env: Record<string, string | undefined> = getServerEnv(),
  deps: Dependencies = {},
) {
  try {
    const actor = await (deps.authorize ?? requireEmailAdmin)(locals, env)
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) throw new EmailHttpError('forbidden', 403)
    if (request.method !== 'GET') throw new EmailHttpError('method_not_allowed', 405)
    const ownerIds = (env.READWISE_READER_OWNER_IDS ?? '').split(',').map(v => v.trim()).filter(Boolean)
    if (!ownerIds.length && !env.READWISE_READER_TOKEN) return json(200, { configured: false, documents: [], next_cursor: null })
    if (!ownerIds.includes(actor.actorId)) throw new EmailHttpError('forbidden', 403)
    if (!env.READWISE_READER_TOKEN) return json(200, { configured: false, documents: [], next_cursor: null })
    const query = new URL(request.url).searchParams
    if ([...query.keys()].some(k => !['cursor', 'id'].includes(k))) throw new EmailHttpError('invalid_request', 400)
    const id = query.get('id'), cursor = query.get('cursor')
    if ((id && !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) || (cursor && cursor.length > 2048)) throw new EmailHttpError('invalid_request', 400)
    const upstream = new URL('https://readwise.io/api/v3/list/')
    upstream.searchParams.set('limit', id ? '1' : '25')
    upstream.searchParams.set('category', 'email')
    if (cursor) upstream.searchParams.set('pageCursor', cursor)
    if (id) { upstream.searchParams.set('id', id); upstream.searchParams.set('withHtmlContent', 'true') }
    const response = await (deps.fetch ?? fetch)(upstream, {
      headers: { Authorization: `Token ${env.READWISE_READER_TOKEN}` },
      redirect: 'error', signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new EmailHttpError(response.status === 429 ? 'rate_limited' : 'reader_unavailable', response.status === 429 ? 429 : 503)
    if (!response.body) throw new EmailHttpError('reader_unavailable', 503)
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []; let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.length
        if (size > 2_000_000) { await reader.cancel(); throw new EmailHttpError('reader_unavailable', 503) }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    const raw = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!Array.isArray(raw.results) || raw.results.length > 25) throw new EmailHttpError('reader_unavailable', 503)
    const documents = raw.results.filter((r: any) => r.category === 'email' && /^[a-zA-Z0-9_-]{1,128}$/.test(r.id)).map((r: any) => ({
      id: r.id, title: safeText(r.title, 500), author: safeText(r.author, 200),
      summary: readerText(safeText(r.summary, 4000)),
      content: id ? readerText(r.html_content ?? r.summary) : '',
      published_at: safeText(r.published_date ?? r.created_at, 64),
      location: safeText(r.location, 32),
      reader_url: `https://read.readwise.io/read/${encodeURIComponent(r.id)}`,
    }))
    return json(200, { configured: true, documents, next_cursor: safeText(raw.nextPageCursor, 2048) || null })
  } catch (error) { return errorResponse(error) }
}
