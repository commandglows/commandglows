import type { APIRoute } from 'astro'
import {
  extractTemuDataFromHtml,
  normalizeMarketplaceUrl,
} from '@/lib/temu'

export const prerender = false

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  })
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  const rawUrl = typeof payload?.url === 'string' ? payload.url : ''

  let sourceUrl: string
  try {
    sourceUrl = normalizeMarketplaceUrl(rawUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid_url'
    return jsonResponse({ error: message }, 400)
  }

  try {
    const upstream = await fetch(sourceUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    })

    if (!upstream.ok) {
      return jsonResponse(
        { error: 'upstream_fetch_failed', status: upstream.status },
        502
      )
    }

    const contentType = upstream.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return jsonResponse(
        { error: 'unsupported_content_type', contentType },
        415
      )
    }

    const html = await upstream.text()
    const result = extractTemuDataFromHtml(html, sourceUrl, upstream.url || sourceUrl)

    if (!result.description && result.images.length === 0 && !result.title) {
      return jsonResponse({ error: 'extraction_empty' }, 422)
    }

    return jsonResponse({ data: result })
  } catch (error) {
    console.error('Temu extract failed', error)
    return jsonResponse({ error: 'upstream_request_failed' }, 502)
  }
}
