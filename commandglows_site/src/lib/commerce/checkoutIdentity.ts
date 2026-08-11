import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_VERSION = 1
const TOKEN_TTL_SECONDS = 2 * 60 * 60

type CheckoutIdentityPayload = {
  v: number
  sub: string
  exp: number
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function signature(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

export function createCommerceCheckoutIdentityToken(
  globalUserId: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): string {
  const payload: CheckoutIdentityPayload = {
    v: TOKEN_VERSION,
    sub: globalUserId.trim(),
    exp: nowSeconds + TOKEN_TTL_SECONDS,
  }
  const encodedPayload = encode(JSON.stringify(payload))
  return `${encodedPayload}.${signature(encodedPayload, secret)}`
}

export function verifyCommerceCheckoutIdentityToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): string | null {
  const [encodedPayload, providedSignature, extra] = token.split('.')
  if (!encodedPayload || !providedSignature || extra) return null

  const expectedSignature = signature(encodedPayload, secret)
  const provided = Buffer.from(providedSignature)
  const expected = Buffer.from(expectedSignature)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<CheckoutIdentityPayload>
    if (
      payload.v !== TOKEN_VERSION ||
      typeof payload.sub !== 'string' ||
      !payload.sub.trim() ||
      typeof payload.exp !== 'number' ||
      payload.exp < nowSeconds
    ) {
      return null
    }
    return payload.sub.trim()
  } catch {
    return null
  }
}
