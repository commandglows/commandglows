export type TemuExtractionResult = {
  sourceUrl: string
  resolvedUrl: string
  title: string
  description: string
  images: string[]
  strategy: 'html-meta'
}

const MAX_IMAGES = 24

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function normalizeWhitespace(value: string): string {
  return decodeHtmlEntities(value).replace(/\s+/g, ' ').trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function collectMatches(source: string, pattern: RegExp): string[] {
  const values: string[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(source)) !== null) {
    const candidate = match[1] ?? match[2]
    if (candidate) {
      values.push(candidate)
    }
  }
  return values
}

function extractMetaContent(html: string, key: string, attribute: 'name' | 'property'): string[] {
  const escapedKey = escapeRegExp(key)
  const patterns = [
    new RegExp(
      `<meta[^>]+${attribute}=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      'gi'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${attribute}=["']${escapedKey}["'][^>]*>`,
      'gi'
    ),
  ]

  return patterns.flatMap((pattern) => collectMatches(html, pattern))
}

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(titleMatch?.[1] ?? '')
}

function absolutizeUrl(candidate: string, baseUrl: string): string | null {
  if (!candidate || candidate.startsWith('data:')) {
    return null
  }

  try {
    const url = new URL(candidate, baseUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

function parseJsonLdBlocks(html: string): Array<Record<string, unknown>> {
  const blocks = collectMatches(
    html,
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )

  const objects: Array<Record<string, unknown>> = []

  for (const block of blocks) {
    const normalized = block.trim()
    if (!normalized) continue

    try {
      const parsed = JSON.parse(normalized)
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object') {
            objects.push(item as Record<string, unknown>)
          }
        }
      } else if (parsed && typeof parsed === 'object') {
        objects.push(parsed as Record<string, unknown>)
      }
    } catch {
      // Ignore malformed structured-data blocks.
    }
  }

  return objects
}

function extractDescriptionFromJsonLd(blocks: Array<Record<string, unknown>>): string {
  for (const block of blocks) {
    const description = block.description
    if (typeof description === 'string' && normalizeWhitespace(description)) {
      return normalizeWhitespace(description)
    }

    const graph = block['@graph']
    if (Array.isArray(graph)) {
      for (const item of graph) {
        if (item && typeof item === 'object') {
          const nestedDescription = (item as Record<string, unknown>).description
          if (
            typeof nestedDescription === 'string' &&
            normalizeWhitespace(nestedDescription)
          ) {
            return normalizeWhitespace(nestedDescription)
          }
        }
      }
    }
  }

  return ''
}

function extractImagesFromJsonLd(
  blocks: Array<Record<string, unknown>>,
  baseUrl: string
): string[] {
  const results: string[] = []

  const pushValue = (value: unknown) => {
    if (typeof value === 'string') {
      const absolute = absolutizeUrl(value, baseUrl)
      if (absolute) results.push(absolute)
      return
    }

    if (Array.isArray(value)) {
      for (const item of value) pushValue(item)
      return
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      pushValue(record.url)
      pushValue(record.contentUrl)
    }
  }

  for (const block of blocks) {
    pushValue(block.image)

    const graph = block['@graph']
    if (Array.isArray(graph)) {
      for (const item of graph) {
        if (item && typeof item === 'object') {
          pushValue((item as Record<string, unknown>).image)
        }
      }
    }
  }

  return results
}

function extractImgTags(html: string, baseUrl: string): string[] {
  const sources = collectMatches(
    html,
    /<img[^>]+(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi
  )
  return sources
    .map((source) => absolutizeUrl(source, baseUrl))
    .filter((value): value is string => Boolean(value))
}

function looksLikeProductImage(url: string): boolean {
  const lower = url.toLowerCase()
  if (lower.endsWith('.svg')) return false
  if (/(logo|icon|avatar|sprite|badge|banner)/.test(lower)) return false
  return true
}

function uniqueImages(images: string[]): string[] {
  const seen = new Set<string>()
  const results: string[] = []

  for (const image of images) {
    const normalized = image.trim()
    if (!normalized || seen.has(normalized) || !looksLikeProductImage(normalized)) {
      continue
    }
    seen.add(normalized)
    results.push(normalized)
    if (results.length >= MAX_IMAGES) {
      break
    }
  }

  return results
}

export function normalizeMarketplaceUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    throw new Error('url_required')
  }

  const value = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('invalid_url_protocol')
  }

  return url.toString()
}

export function extractTemuDataFromHtml(
  html: string,
  sourceUrl: string,
  resolvedUrl: string
): TemuExtractionResult {
  const jsonLdBlocks = parseJsonLdBlocks(html)
  const ogTitle = extractMetaContent(html, 'og:title', 'property')[0] ?? ''
  const title = normalizeWhitespace(ogTitle || extractTitle(html))

  const descriptionCandidates = [
    extractDescriptionFromJsonLd(jsonLdBlocks),
    ...extractMetaContent(html, 'description', 'name'),
    ...extractMetaContent(html, 'og:description', 'property'),
    ...extractMetaContent(html, 'twitter:description', 'name'),
  ]
    .map(normalizeWhitespace)
    .filter(Boolean)

  const images = uniqueImages([
    ...extractImagesFromJsonLd(jsonLdBlocks, resolvedUrl),
    ...extractMetaContent(html, 'og:image', 'property').map((value) =>
      absolutizeUrl(value, resolvedUrl)
    ),
    ...extractMetaContent(html, 'twitter:image', 'name').map((value) =>
      absolutizeUrl(value, resolvedUrl)
    ),
    ...extractImgTags(html, resolvedUrl),
  ].filter((value): value is string => Boolean(value)))

  return {
    sourceUrl,
    resolvedUrl,
    title,
    description: descriptionCandidates[0] ?? '',
    images,
    strategy: 'html-meta',
  }
}

export function getDownloadFilename(
  sourceUrl: string,
  index: number,
  contentType?: string | null
): string {
  const safeIndex = String(index + 1).padStart(2, '0')
  const url = new URL(sourceUrl)
  const urlSegment = url.pathname.split('/').filter(Boolean).pop() ?? `image-${safeIndex}`
  const baseName = urlSegment.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
  const extensionFromPath =
    baseName.match(/\.([a-zA-Z0-9]{2,5})(?:$|\?)/)?.[1]?.toLowerCase() ?? ''

  const contentTypeToExtension: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }

  const extension =
    extensionFromPath ||
    (contentType ? contentTypeToExtension[contentType.toLowerCase()] ?? 'jpg' : 'jpg')

  const normalizedBase = baseName.replace(/\.[a-zA-Z0-9]{2,5}$/, '') || `image-${safeIndex}`
  return `${normalizedBase}.${extension}`
}
