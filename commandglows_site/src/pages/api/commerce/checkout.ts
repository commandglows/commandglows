import type { APIRoute } from 'astro'
import type {
  CommerceCheckoutRequest,
  CommerceProviderId,
} from '@/lib/commerce/types'
import { getServerEnv } from '@/lib/serverEnv'
import { createLemonSqueezyCheckout } from '@/lib/commerce/providers/lemonsqueezy'
import {
  createPolarCheckout,
  isPolarLegacyConfigurationPresent,
} from '@/lib/commerce/providers/polar'
import {
  getCommerceOffer,
  getOfferProviderConfig,
  getOfferProviderCandidates,
  normalizeCommerceProviderOrder,
} from '@/lib/commerce/offers'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

type CheckoutHttpResult = {
  ok: boolean
  provider?: string
  statusText: string
  status: number
  checkoutUrl?: string
}

type CheckoutRequestData = {
  offerId: string
  provider?: string
  source?: string
  sourceRef?: string
  discountCode?: string
  successUrl: string
  cancelUrl: string
  metadata: NonNullable<CommerceCheckoutRequest['metadata']>
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function getFirstNonEmpty(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    if (isNonEmptyString(value)) {
      return value
    }
  }
  return undefined
}

function isCommerceProviderId(value: string | undefined): value is CommerceProviderId {
  return value === 'lemonsqueezy' || value === 'polar' || value === 'custom'
}

function resolveRedirectUrl(
  rawValue: string | null,
  request: Request
): string | undefined {
  const value = rawValue?.trim()
  if (!value) {
    return undefined
  }

  try {
    return new URL(value, request.url).toString()
  } catch {
    return undefined
  }
}

function normalizeSuccessCancelUrl(
  rawValue: string | null,
  request: Request,
  fallbackPath: string
) {
  return resolveRedirectUrl(rawValue, request) ??
    new URL(fallbackPath, request.url).toString()
}

function parseCheckoutRequestFromQuery(request: Request): CheckoutRequestData {
  const url = new URL(request.url)
  const search = url.searchParams
  const offerId = getFirstNonEmpty(search.get('offerId'))

  return {
    offerId: offerId ?? '',
    provider: getFirstNonEmpty(search.get('provider')?.toLowerCase()),
    source: getFirstNonEmpty(search.get('source')),
    sourceRef: getFirstNonEmpty(search.get('sourceRef')),
    discountCode: getFirstNonEmpty(search.get('discountCode')),
    successUrl: normalizeSuccessCancelUrl(
      search.get('successUrl'),
      request,
      '/purchase/success'
    ),
    cancelUrl: normalizeSuccessCancelUrl(
      search.get('cancelUrl'),
      request,
      '/purchase/cancel'
    ),
    metadata: {
      offer_id: offerId ?? '',
      global_user_id: getFirstNonEmpty(search.get('globalUserId')),
      source: getFirstNonEmpty(search.get('source')),
      source_ref: getFirstNonEmpty(search.get('sourceRef')),
      identity_token: getFirstNonEmpty(search.get('identityToken')),
    },
  }
}

function parseCheckoutBody(body: unknown, request: Request): CheckoutRequestData | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const payload = body as Record<string, unknown>
  const offerId = getFirstNonEmpty(payload.offerId?.toString()) ?? ''

  return {
    offerId,
    provider: getFirstNonEmpty(payload.provider?.toString())?.toLowerCase(),
    source: getFirstNonEmpty(payload.source?.toString()),
    sourceRef: getFirstNonEmpty(payload.sourceRef?.toString()),
    discountCode: getFirstNonEmpty(payload.discountCode?.toString()),
    successUrl: normalizeSuccessCancelUrl(
      getFirstNonEmpty(payload.successUrl?.toString()) ?? null,
      request,
      '/purchase/success'
    ),
    cancelUrl: normalizeSuccessCancelUrl(
      getFirstNonEmpty(payload.cancelUrl?.toString()) ?? null,
      request,
      '/purchase/cancel'
    ),
    metadata: {
      offer_id: offerId,
      global_user_id: getFirstNonEmpty(payload.globalUserId?.toString()),
      source: getFirstNonEmpty(payload.source?.toString()),
      source_ref: getFirstNonEmpty(payload.sourceRef?.toString()),
      identity_token: getFirstNonEmpty(payload.identityToken?.toString()),
    },
  }
}

function buildCheckoutRequest(
  raw: CheckoutRequestData
): Omit<CommerceCheckoutRequest, 'offerId'> {
  return {
    provider: isCommerceProviderId(raw.provider) ? raw.provider : undefined,
    successUrl: raw.successUrl,
    cancelUrl: raw.cancelUrl,
    discountCode: raw.discountCode,
    customerEmail: undefined,
    customerName: undefined,
    metadata: {
      ...raw.metadata,
    },
    idempotencyHint: raw.sourceRef,
  }
}

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  })
}

function pickProviderCandidates(offerId: string) {
  const offer = getCommerceOffer(offerId)
  if (!offer) {
    return []
  }

  const candidates = normalizeCommerceProviderOrder(offerId)
  const allowed = getOfferProviderCandidates(offerId)
  return candidates.filter((candidate) => allowed.includes(candidate))
}

function toProviderUnavailableMessage(provider: string) {
  if (provider === 'polar') {
    return 'Polar checkout is now served by the legacy formation checkout route'
  }

  return `${provider}: missing configuration`
}

function toInvalidProviderMessage(requestedProvider: string) {
  return `${requestedProvider}: provider_not_allowed_or_unknown`
}

async function runPolarCheckout(
  checkoutRequest: Omit<CommerceCheckoutRequest, 'offerId'>,
  offerId: string,
  env: ReturnType<typeof getServerEnv>
) {
  const polarResult = await createPolarCheckout(checkoutRequest, offerId, env)
  if (polarResult.ok) {
    return {
      ok: true,
      provider: 'polar',
      statusText: polarResult.checkoutUrl,
      status: 200,
      checkoutUrl: polarResult.checkoutUrl,
    } as CheckoutHttpResult
  }

  if (isPolarLegacyConfigurationPresent(env)) {
    return {
      ok: false,
      statusText: 'Use /api/polar/checkout for polar checkout flows',
      status: 409,
    } as CheckoutHttpResult
  }

  return {
    ok: false,
    statusText: toProviderUnavailableMessage('polar'),
    status: polarResult.code === 'provider_not_configured' ? 503 : 400,
  } as CheckoutHttpResult
}

async function runCheckoutWithProvider(
  requestData: CheckoutRequestData,
  env: ReturnType<typeof getServerEnv>
) {
  if (!requestData.offerId) {
    return {
      ok: false,
      statusText: 'Missing offerId',
      status: 400,
    } as CheckoutHttpResult
  }

  if (!getCommerceOffer(requestData.offerId)) {
    return {
      ok: false,
      statusText: 'Offer not found',
      status: 404,
    } as CheckoutHttpResult
  }

  const normalizedCandidateOrder = pickProviderCandidates(requestData.offerId)
  const requestedProvider = requestData.provider
  const requestedCommerceProvider = isCommerceProviderId(requestedProvider)
    ? requestedProvider
    : undefined
  if (!requestData.successUrl || !requestData.cancelUrl) {
    return {
      ok: false,
      statusText: 'Missing checkout redirect URLs',
      status: 400,
    } as CheckoutHttpResult
  }

  const checkoutRequest = buildCheckoutRequest(requestData)

  if (requestedProvider && !requestedCommerceProvider) {
    return {
      ok: false,
      statusText: toInvalidProviderMessage(requestedProvider),
      status: 400,
    } as CheckoutHttpResult
  }

  if (requestedCommerceProvider === 'polar') {
    return runPolarCheckout(checkoutRequest, requestData.offerId, env)
  }

  if (
    requestedCommerceProvider &&
    !normalizedCandidateOrder.includes(requestedCommerceProvider)
  ) {
    return {
      ok: false,
      statusText: toInvalidProviderMessage(requestedCommerceProvider),
      status: 400,
    } as CheckoutHttpResult
  }

  const providerOrder =
    requestedCommerceProvider &&
    normalizedCandidateOrder.includes(requestedCommerceProvider)
      ? [requestedCommerceProvider]
      : normalizedCandidateOrder

  for (const provider of providerOrder) {
    const offerProviderConfig = getOfferProviderConfig(requestData.offerId, provider)
    if (!offerProviderConfig) {
      continue
    }

    if (provider === 'lemonsqueezy') {
      const providerResult = await createLemonSqueezyCheckout(
        checkoutRequest,
        requestData.offerId,
        env
      )

      if (providerResult.ok) {
        return {
          ok: true,
          provider,
          statusText: providerResult.checkoutUrl,
          status: 200,
          checkoutUrl: providerResult.checkoutUrl,
        } as CheckoutHttpResult
      }

      if (providerResult.code === 'missing_env' || providerResult.code === 'provider_not_configured') {
        continue
      }

      return {
        ok: false,
        statusText: providerResult.message,
        status: 502,
      } as CheckoutHttpResult
    }

    if (provider === 'polar') {
      const polarResult = await runPolarCheckout(
        checkoutRequest,
        requestData.offerId,
        env
      )
      return polarResult
    }
  }

  return {
    ok: false,
    statusText: 'No configured checkout provider',
    status: 503,
  } as CheckoutHttpResult
}

export const GET: APIRoute = async ({ request }) => {
  const requestData = parseCheckoutRequestFromQuery(request)
  const env = getServerEnv()

  const result =
    (await runCheckoutWithProvider(requestData, env)) as CheckoutHttpResult

  if (!result.ok) {
    return jsonResponse(
      {
        message: result.statusText,
        provider: result.provider,
      },
      result.status
    )
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: result.statusText,
    },
  })
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ message: 'Invalid checkout payload' }, 400)
  }

  const requestData = parseCheckoutBody(body, request)
  if (!requestData) {
    return jsonResponse({ message: 'Invalid checkout payload' }, 400)
  }

  const result =
    (await runCheckoutWithProvider(requestData, env)) as CheckoutHttpResult

  if (!result.ok) {
    return jsonResponse(
      {
        message: result.statusText,
        provider: result.provider,
      },
      result.status
    )
  }

  return jsonResponse({
    ok: true,
    provider: result.provider,
    checkoutUrl: result.statusText,
  }, 200)
}
