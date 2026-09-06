import deployment from '../../../vercel.json'
/** Preserve deployment policy, adding only the configured OIDC origin for form redirects. */
export function siteAuthContentSecurityPolicy(issuer?: string): string {
  const baseline = deployment.headers.flatMap(entry => entry.headers).find(header => header.key.toLowerCase() === 'content-security-policy')?.value
  if (!baseline) throw new Error('site_csp_missing')
  if (!issuer) return baseline
  const url = new URL(issuer)
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.username || url.password || url.search || url.hash) throw new Error('auth_issuer_invalid')
  return baseline.split(';').map(directive => {
    const sources = directive.trim().split(/\s+/)
    return sources[0] === 'form-action' ? [...new Set([...sources, url.origin])].join(' ') : directive.trim()
  }).join('; ')
}
