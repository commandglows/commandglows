import { getEntrySlug, type DocEntry } from './docs'
import { getPrivateCoursePath, isFormationSlug } from './courseGating'

export function getPublishedCourseEntry(entries: DocEntry[], slug: string | undefined) {
  const normalized = slug?.replace(/^\/+|\/+$/g, '')
  return entries.find(entry => !entry.data.draft && isFormationSlug(getEntrySlug(entry)) && getEntrySlug(entry) === normalized)
}

export function getAlternatePrivateCoursePath(entries: DocEntry[], slug: string) {
  const target = slug.replace(/^(fr|en)\//, slug.startsWith('fr/') ? 'en/' : 'fr/')
  return getPublishedCourseEntry(entries, target) ? getPrivateCoursePath(target) : null
}

export function getPrivateCourseModuleLessons(entries: DocEntry[], slug: string) {
  const module = slug.split('/').slice(0, 3).join('/')
  if (slug.split('/').length < 3) return []
  return entries.filter(entry => {
    const candidate = getEntrySlug(entry)
    return !entry.data.draft && !entry.data.sidebar?.hidden && (candidate === module || candidate.startsWith(`${module}/`))
  }).sort((a, b) => (a.data.sidebar?.order ?? Number.MAX_SAFE_INTEGER) - (b.data.sidebar?.order ?? Number.MAX_SAFE_INTEGER) || getEntrySlug(a).localeCompare(getEntrySlug(b)))
}

/** Rewrite only course navigation in already-rendered, trusted content on the server.
 * Relative links resolve against the public lesson, not the dashboard route.
 * Publication and entitlement checks still run on every destination request.
 */
export function privateCourseHref(href: string, slug: string, origin: string, publishedSlugs: readonly string[] = []) {
  if (!href || href.startsWith('#')) return href
  try {
    let url = new URL(href, `${origin}/${slug}/`)
    let target = url.pathname.replace(/^\/+|\/+$/g, '')
    // Content uses both module-child and lesson-sibling relative links.
    // Choose a sibling only when it is a published destination in this corpus.
    if (!href.startsWith('/') && !/^[a-z][a-z\d+.-]*:/i.test(href) && !publishedSlugs.includes(target)) {
      const sibling = new URL(href, `${origin}/${slug}`)
      const siblingSlug = sibling.pathname.replace(/^\/+|\/+$/g, '')
      if (publishedSlugs.includes(siblingSlug)) { url = sibling; target = siblingSlug }
    }
    if (url.origin !== origin || !isFormationSlug(target)) return href
    return getPrivateCoursePath(target) + url.search + url.hash
  } catch { return href }
}

export function rewritePrivateCourseLinks(html: string, slug: string, origin: string, publishedSlugs: readonly string[] = []) {
  return html.replace(/<a\b[^>]*>/gi, tag => tag.replace(/\shref=(['"])(.*?)\1/i, (attribute, quote, href) => {
    const decoded = href.replace(/&amp;/g, '&')
    const target = privateCourseHref(decoded, slug, origin, publishedSlugs)
    if (target === decoded) return attribute
    const escaped = target.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;')
    return ` href=${quote}${escaped}${quote}`
  }))
}
