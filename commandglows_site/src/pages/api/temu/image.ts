import type { APIRoute } from 'astro'
import { getDownloadFilename, normalizeMarketplaceUrl } from '@/lib/temu'

export const prerender = false

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/octet-stream',
])

export const GET: APIRoute = async ({ url }) => {
  const src = url.searchParams.get('src') ?? ''
  const index = Number.parseInt(url.searchParams.get('index') ?? '0', 10)

  let sourceUrl: string
  try {
    sourceUrl = normalizeMarketplaceUrl(src)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid_url'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const upstream = await fetch(sourceUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'image_fetch_failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const contentType = (upstream.headers.get('content-type') ?? 'application/octet-stream')
      .split(';')[0]
      .trim()

    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      return new Response(JSON.stringify({ error: 'unsupported_image_type' }), {
        status: 415,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const buffer = await upstream.arrayBuffer()
    const filename = getDownloadFilename(sourceUrl, Number.isNaN(index) ? 0 : index, contentType)

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Temu image download failed', error)
    return new Response(JSON.stringify({ error: 'image_request_failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
