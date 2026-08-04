import type { APIRoute } from 'astro'
import { generateTemuResaleCopyWithGemini } from '@/lib/geminiCli'

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
  const sourceUrl = typeof payload?.sourceUrl === 'string' ? payload.sourceUrl.trim() : ''
  const title = typeof payload?.title === 'string' ? payload.title.trim() : ''
  const description =
    typeof payload?.description === 'string' ? payload.description.trim() : ''
  const sellerLanguage =
    payload?.sellerLanguage === 'en' || payload?.sellerLanguage === 'fr'
      ? payload.sellerLanguage
      : 'fr'
  const images = Array.isArray(payload?.images)
    ? payload.images.filter((item): item is string => typeof item === 'string')
    : []

  if (!sourceUrl || (!title && !description && images.length === 0)) {
    return jsonResponse({ error: 'invalid_payload' }, 400)
  }

  try {
    const data = await generateTemuResaleCopyWithGemini({
      sourceUrl,
      title,
      description,
      images,
      sellerLanguage,
    })
    return jsonResponse({ data })
  } catch (error) {
    console.error('Temu rewrite failed', error)
    const message = error instanceof Error ? error.message : 'rewrite_failed'
    if (message === 'gemini_not_configured') {
      return jsonResponse({ error: 'gemini_not_configured' }, 503)
    }
    return jsonResponse({ error: 'rewrite_failed' }, 502)
  }
}
