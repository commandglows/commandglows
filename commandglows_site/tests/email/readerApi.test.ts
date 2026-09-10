import { describe, it, expect, vi } from 'vitest'
import { handleReaderApi, readerText } from '../../src/lib/email/readerApi'
const env = { READWISE_READER_TOKEN: 'server-only-test', READWISE_READER_OWNER_IDS: 'owner' }
const authorize = vi.fn().mockResolvedValue({ actorId: 'owner' })
const context = (query = '') => ({ request: new Request(`https://example.test/api/admin/email/sources${query}`), locals: { auth: () => ({ userId: 'owner' }) } })
describe('Reader sources boundary', () => {
  it('denies other administrators without calling upstream', async () => {
    const fetch = vi.fn()
    const result = await handleReaderApi(context(), env, { authorize: vi.fn().mockResolvedValue({ actorId: 'other' }), fetch })
    expect(result.status).toBe(403); expect(fetch).not.toHaveBeenCalled()
  })
  it('keeps token server-side and pages only emails without bulk bodies', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ id: 'doc', category: 'email', title: 'Bonjour', summary: 'Résumé', html_content: '<p>secret body</p>' }], nextPageCursor: 'next' })))
    const response = await handleReaderApi(context('?cursor=current'), env, { authorize, fetch })
    const [url, options] = fetch.mock.calls[0]
    expect(url.hostname).toBe('readwise.io'); expect(url.searchParams.get('limit')).toBe('25')
    expect(url.searchParams.get('pageCursor')).toBe('current')
    expect(url.searchParams.has('withHtmlContent')).toBe(false)
    expect(options.redirect).toBe('error')
    const body = await response.json()
    expect(body.documents[0].content).toBe('')
    expect(body.next_cursor).toBe('next')
    expect(JSON.stringify(body)).not.toContain('server-only-test')
  })
  it('extracts detail as text and rejects unbounded responses', async () => {
    expect(readerText('<script>evil()</script><p>Hello &amp; world</p>')).toBe('Hello & world')
    const fetch = vi.fn().mockResolvedValue(new Response('x'.repeat(2_000_001)))
    expect((await handleReaderApi(context('?id=doc'), env, { authorize, fetch })).status).toBe(503)
  })
  it('reports missing connection without fabricating documents', async () => {
    const response = await handleReaderApi(context(), {}, { authorize })
    expect(await response.json()).toEqual({ configured: false, documents: [], next_cursor: null })
  })
})
