import type {
  CommerceCheckoutRequest,
  CommerceCheckoutResponse,
  CommerceCheckoutFailure,
  CommerceWebhookContext,
  CommerceWebhookParseResult,
} from '../types'

export const POLAR_PROVIDER_ID = 'polar' as const

type LegacyConfig = Record<string, string | undefined>

function toFailure(
  code: CommerceCheckoutFailure['code'],
  message: string
): CommerceCheckoutResponse {
  return {
    ok: false,
    code,
    message,
  }
}

export function isPolarLegacyConfigurationPresent(
  env: LegacyConfig
): boolean {
  const token = env.POLAR_ACCESS_TOKEN?.trim()
  const product = (env.POLAR_COMMANDGLOWS_PRODUCT_ID || env.POLAR_PRODUCT_ID)?.trim()

  return Boolean(token && product)
}

export async function createPolarCheckout(
  _request: Omit<CommerceCheckoutRequest, 'offerId'>,
  offerId: string,
  env: LegacyConfig
): Promise<CommerceCheckoutResponse> {
  if (!isPolarLegacyConfigurationPresent(env)) {
    return toFailure('provider_not_configured', 'Polar legacy configuration is missing')
  }

  const productId =
    env.POLAR_COMMANDGLOWS_PRODUCT_ID?.trim() || env.POLAR_PRODUCT_ID?.trim()

  const message =
    `Offer ${offerId} is configured only in the legacy Polar route` +
    (productId ? ` for product ${productId}` : '')

  return toFailure(
    'provider_unavailable',
    `${message}; use /api/polar/checkout for product-specific checkout flows`
  )
}

export async function parsePolarWebhook(): Promise<CommerceWebhookParseResult> {
  return {
    ok: false,
    ignored: true,
    reason: 'invalid_provider',
    message: 'Polar webhook parsing is routed through /api/polar/webhook and Convex',
    status: 400,
  }
}

export async function normalizePolarCommerceEvent(
  context: CommerceWebhookContext
): Promise<CommerceWebhookParseResult> {
  if (!context.signature) {
    return parsePolarWebhook()
  }

  return parsePolarWebhook()
}
