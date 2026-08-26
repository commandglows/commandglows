import { createPublicKey, createVerify } from 'node:crypto'

type Auth0Claims = {
  sub: string
  email?: string
  email_verified?: boolean
  [key: string]: unknown
}

type JwtHeader = {
  alg?: unknown
  kid?: unknown
  typ?: unknown
}

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string }

const JWKS_CACHE_TTL_MS = 10 * 60 * 1000
const jwksCache = new Map<string, { expiresAt: number; keys: Jwk[] }>()

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function decodeJsonPart(value: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >
}

function audienceMatches(value: unknown, expected: string): boolean {
  return (
    value === expected || (Array.isArray(value) && value.includes(expected))
  )
}

function normalizeIssuer(domainOrIssuer: string): string {
  const withScheme = domainOrIssuer.includes('://')
    ? domainOrIssuer
    : `https://${domainOrIssuer}`
  const parsed = new URL(withScheme)
  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error('invalid_auth0_issuer')
  }
  parsed.pathname = '/'
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString()
}

async function getJwks(issuer: string): Promise<Jwk[]> {
  const cached = jwksCache.get(issuer)
  if (cached && cached.expiresAt > Date.now()) return cached.keys

  const response = await fetch(`${issuer}.well-known/jwks.json`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error('auth0_jwks_unavailable')
  const payload = (await response.json()) as { keys?: unknown }
  if (!Array.isArray(payload.keys)) throw new Error('auth0_jwks_invalid')
  const keys = payload.keys.filter(
    (key): key is Jwk =>
      Boolean(key) &&
      typeof key === 'object' &&
      (key as JsonWebKey).kty === 'RSA' &&
      nonEmptyString((key as Jwk).kid)
  )
  jwksCache.set(issuer, {
    keys,
    expiresAt: Date.now() + JWKS_CACHE_TTL_MS,
  })
  return keys
}

export async function verifyAuth0AccessToken(
  token: string,
  config: { domainOrIssuer: string; audience: string; nowSeconds?: number }
): Promise<Auth0Claims> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('invalid_jwt_shape')

  const header = decodeJsonPart(parts[0]!) as JwtHeader
  const claims = decodeJsonPart(parts[1]!)
  if (header.alg !== 'RS256' || !nonEmptyString(header.kid)) {
    throw new Error('invalid_jwt_header')
  }

  const issuer = normalizeIssuer(config.domainOrIssuer)
  const key = (await getJwks(issuer)).find(
    (candidate) =>
      candidate.kid === header.kid &&
      (!candidate.alg || candidate.alg === 'RS256') &&
      (!candidate.use || candidate.use === 'sig')
  )
  if (!key) throw new Error('jwt_signing_key_not_found')

  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${parts[0]}.${parts[1]}`)
  verifier.end()
  if (
    !verifier.verify(
      createPublicKey({ key, format: 'jwk' }),
      parts[2]!,
      'base64url'
    )
  ) {
    throw new Error('invalid_jwt_signature')
  }

  const now = config.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (
    claims.iss !== issuer ||
    !audienceMatches(claims.aud, config.audience) ||
    !nonEmptyString(claims.sub) ||
    typeof claims.exp !== 'number' ||
    claims.exp <= now ||
    (typeof claims.nbf === 'number' && claims.nbf > now + 60)
  ) {
    throw new Error('invalid_jwt_claims')
  }

  return {
    ...claims,
    sub: claims.sub.trim(),
    email:
      claims.email_verified === true && nonEmptyString(claims.email)
        ? claims.email.trim().toLowerCase()
        : undefined,
  }
}
