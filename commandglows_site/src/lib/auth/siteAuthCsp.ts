import deployment from '../../../vercel.json'
function clerkOriginFromPublishableKey(key?: string): string | null {
  if (!key?.startsWith('pk_test_')) return null
  try {
    const decoded = Buffer.from(key.slice('pk_test_'.length), 'base64').toString('utf8').replace(/\$$/, '')
    const url = new URL(`https://${decoded}`)
    if (url.hostname.endsWith('.clerk.accounts.dev') && url.pathname === '/' && !url.port && !url.username && !url.password && !url.search && !url.hash) {
      return url.origin
    }
  } catch { /* An invalid key must never broaden the policy. */ }
  return null
}

/** Preserve deployment policy and authorize only configured identity origins. */
export function siteAuthContentSecurityPolicy(issuer?: string, clerkPublishableKey?: string): string {
  const baseline = deployment.headers.flatMap(entry => entry.headers).find(header => header.key.toLowerCase() === 'content-security-policy')?.value
  if (!baseline) throw new Error('site_csp_missing')
  const clerkOrigin = clerkOriginFromPublishableKey(clerkPublishableKey)
  const url = issuer ? new URL(issuer) : null
  if (url && (url.protocol !== 'https:' || url.pathname !== '/' || url.username || url.password || url.search || url.hash)) throw new Error('auth_issuer_invalid')
  if (!url && !clerkOrigin) return baseline
  return baseline.split(';').map(directive => {
    const sources = directive.trim().split(/\s+/)
    if (sources[0] === 'form-action' && url) return [...new Set([...sources, url.origin])].join(' ')
    if (clerkOrigin && ['script-src', 'style-src', 'frame-src', 'connect-src'].includes(sources[0])) return [...new Set([...sources, clerkOrigin])].join(' ')
    return directive.trim()
  }).join('; ')
}
