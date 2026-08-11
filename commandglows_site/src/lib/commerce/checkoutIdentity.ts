import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const TOKEN_VERSION = 3
const TOKEN_TTL_SECONDS = 10 * 60
export const COMMERCE_CHECKOUT_AUDIENCE = 'suite-commerce-checkout'

type CheckoutIdentityPayload = {
  v: number
  sub: string
  productId: string
  environment: string
  aud: typeof COMMERCE_CHECKOUT_AUDIENCE
  jti: string
  exp: number
}

export type VerifiedCommerceCheckoutIdentity = {
  globalUserId: string
  productId: string
  environment: string
  jti: string
  expiresAt: number
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function signature(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

export function createCommerceCheckoutIdentityToken(
  globalUserId: string,
  productId: string,
  environment: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  jti = randomBytes(24).toString('base64url')
): string {
  const payload: CheckoutIdentityPayload = {
    v: TOKEN_VERSION,
    sub: globalUserId.trim(),
    productId: productId.trim(),
    environment: environment.trim(),
    aud: COMMERCE_CHECKOUT_AUDIENCE,
    jti,
    exp: nowSeconds + TOKEN_TTL_SECONDS,
  }
  const encodedPayload = encode(JSON.stringify(payload))
  return `${encodedPayload}.${signature(encodedPayload, secret)}`
}

export function verifyCommerceCheckoutIdentityToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): VerifiedCommerceCheckoutIdentity | null {
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
      typeof payload.productId !== 'string' ||
      !payload.productId.trim() ||
      typeof payload.environment !== 'string' ||
      !payload.environment.trim() ||
      payload.aud !== COMMERCE_CHECKOUT_AUDIENCE ||
      typeof payload.jti !== 'string' ||
      payload.jti.length < 24 ||
      typeof payload.exp !== 'number' ||
      payload.exp < nowSeconds
    ) {
      return null
    }
    return {
      globalUserId: payload.sub.trim(),
      productId: payload.productId.trim(),
      environment: payload.environment.trim(),
      jti: payload.jti,
      expiresAt: payload.exp,
    }
  } catch {
    return null
  }
}

export function hashCommerceCheckoutJti(jti: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`suite-commerce-checkout:${jti}`)
    .digest('hex')
}
