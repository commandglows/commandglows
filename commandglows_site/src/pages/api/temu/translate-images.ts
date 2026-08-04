import type { APIRoute } from 'astro'
import { translateProductImageWithGemini } from '@/lib/geminiImageEdit'

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
  const images = Array.isArray(payload?.images)
    ? payload.images.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0
      )
    : []

  if (!images.length) {
    return jsonResponse({ error: 'invalid_payload' }, 400)
  }

  try {
    const translatedImages = []
    for (const [index, imageUrl] of images.entries()) {
      const translated = await translateProductImageWithGemini(imageUrl, index)
      translatedImages.push(translated)
    }

    return jsonResponse({ data: { images: translatedImages } })
  } catch (error) {
    console.error('Temu image translation failed', error)
    const message = error instanceof Error ? error.message : 'translate_failed'
    if (message === 'gemini_not_configured') {
      return jsonResponse({ error: 'gemini_not_configured' }, 503)
    }
    return jsonResponse({ error: 'translate_failed' }, 502)
  }
}
