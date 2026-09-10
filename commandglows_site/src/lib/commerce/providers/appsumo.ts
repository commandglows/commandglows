import { createHmac, timingSafeEqual } from 'node:crypto'
import type {
  CommerceEnvironment,
  CommerceNormalizedEvent,
  CommerceWebhookContext,
  CommerceWebhookParseResult,
} from '../types'

type ServerEnv = Record<string, string | undefined>

type AppSumoWebhookPayload = {
  license_key?: unknown
  event?: unknown
  license_status?: unknown
  event_timestamp?: unknown
  created_at?: unknown
  tier?: unknown
  test?: unknown
  [key: string]: unknown
}

type AppSumoTokenResponse = {
  access_token?: unknown
  error?: unknown
}

type AppSumoLicenseResponse = {
  license_key?: unknown
  status?: unknown
  scopes?: unknown
  tier?: unknown
  [key: string]: unknown
}

export type AppSumoOAuthParseResult =
  | {
      ok: true
      validationOnly: false
      normalizedEvent: CommerceNormalizedEvent
      redirectPath: string
    }
  | {
      ok: true
      validationOnly: true
      message: string
    }
  | {
      ok: false
      message: string
      status: number
    }

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function stringFrom(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return nonEmpty(value)
}

function configuredEnvironment(env: ServerEnv): CommerceEnvironment {
  const value = nonEmpty(env.APPSUMO_ENVIRONMENT) ?? nonEmpty(env.COMMERCE_ENVIRONMENT)
  if (value === 'production' || value === 'sandbox' || value === 'development') {
    return value
  }
  return 'sandbox'
}

function defaultOffer(env: ServerEnv, tier?: string) {
  const productId = nonEmpty(env.APPSUMO_PRODUCT_ID) ?? 'appsumo'
  const plan = nonEmpty(env.APPSUMO_PLAN) ?? (tier ? `tier_${tier}` : 'pending_review')
  return {
    offerId: nonEmpty(env.APPSUMO_OFFER_ID) ?? `${productId}/${plan}`,
    productId,
    plan,
  }
}

function eventTypeFor(eventName?: string): CommerceNormalizedEvent['eventType'] {
  if (!eventName) return 'pending_review'
  const normalized = eventName.toLowerCase()
  if (normalized === 'deactivate') return 'revoked'
  return 'pending_review'
}

function statusFor(eventName?: string): CommerceNormalizedEvent['status'] {
  return eventName?.toLowerCase() === 'deactivate' ? 'pending_review' : 'pending_review'
}

function metadataFromPayload(payload: AppSumoWebhookPayload): Record<string, string> {
  return Object.fromEntries(
    Object.entries(payload)
      .map(([key, value]) => [key, stringFrom(value)] as const)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  )
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function verifySignature(rawBody: string, timestamp: string, signature: string, apiKey: string) {
  const expected = createHmac('sha256', apiKey).update(`${timestamp}${rawBody}`).digest('hex')
  return safeCompare(expected, signature)
}

function normalizedEventFromLicense(args: {
  env: ServerEnv
  licenseKey: string
  providerEventId: string
  source: 'webhook' | 'oauth'
  eventName?: string
  tier?: string
  metadata: Record<string, string>
}): CommerceNormalizedEvent {
  const offer = defaultOffer(args.env, args.tier)
  return {
    provider: 'appsumo',
    offerId: offer.offerId,
    productId: offer.productId,
    plan: offer.plan,
    eventType: eventTypeFor(args.eventName),
    environment: configuredEnvironment(args.env),
    providerEventId: args.providerEventId,
    providerOrderId: args.licenseKey,
    idempotencyKey: `appsumo:${args.source}:${args.providerEventId}`,
    status: statusFor(args.eventName),
    providerCustomerId: args.licenseKey,
    sourceRef: `appsumo:${args.licenseKey}`,
    providerSourceRef: args.licenseKey,
    metadata: {
      source: 'appsumo',
      license_key: args.licenseKey,
      appsumo_source: args.source,
      ...args.metadata,
    },
  }
}

export function parseAppSumoWebhook(
  context: CommerceWebhookContext,
  env: ServerEnv
): CommerceWebhookParseResult {
  let payload: AppSumoWebhookPayload
  try {
    payload = JSON.parse(context.rawBody) as AppSumoWebhookPayload
  } catch {
    return { ok: false, ignored: false, reason: 'invalid_payload', message: 'Invalid AppSumo webhook JSON', status: 400 }
  }

  const eventName = nonEmpty(payload.event)
  if (payload.test === true) {
    return { ok: false, ignored: true, reason: 'ignored_event', message: 'AppSumo webhook validation received', eventType: eventName, status: 200 }
  }

  const apiKey = nonEmpty(env.APPSUMO_API_KEY)
  const timestamp = nonEmpty(context.eventName)
  const signature = nonEmpty(context.signature)
  if (apiKey && (!timestamp || !signature || !verifySignature(context.rawBody, timestamp, signature, apiKey))) {
    return { ok: false, ignored: false, reason: 'invalid_signature', message: 'Invalid AppSumo webhook signature', status: 400 }
  }

  const licenseKey = nonEmpty(payload.license_key)
  if (!licenseKey || !eventName) {
    return { ok: false, ignored: false, reason: 'invalid_event', message: 'AppSumo webhook is missing license data', eventType: eventName, status: 422 }
  }

  const eventTimestamp = stringFrom(payload.event_timestamp)
  return {
    ok: true,
    parsed: true,
    ignored: false,
    normalizedEvent: normalizedEventFromLicense({
      env,
      licenseKey,
      providerEventId: eventTimestamp ? `${eventName}:${licenseKey}:${eventTimestamp}` : `${eventName}:${licenseKey}`,
      source: 'webhook',
      eventName,
      tier: stringFrom(payload.tier),
      metadata: metadataFromPayload(payload),
    }),
  }
}

export async function parseAppSumoOAuthCallback(
  requestUrl: URL,
  env: ServerEnv,
  fetcher: typeof fetch = fetch
): Promise<AppSumoOAuthParseResult> {
  const code = nonEmpty(requestUrl.searchParams.get('code'))
  if (!code) {
    return { ok: true, validationOnly: true, message: 'AppSumo OAuth callback is reachable' }
  }

  const clientId = nonEmpty(env.APPSUMO_CLIENT_ID)
  const clientSecret = nonEmpty(env.APPSUMO_CLIENT_SECRET)
  const redirectUri = nonEmpty(env.APPSUMO_REDIRECT_URI) ?? requestUrl.origin + requestUrl.pathname
  if (!clientId || !clientSecret) {
    return { ok: false, message: 'AppSumo OAuth is not configured', status: 500 }
  }

  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    grant_type: 'authorization_code',
  })
  const tokenResponse = await fetcher('https://appsumo.com/openid/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody,
  })
  if (!tokenResponse.ok) {
    return { ok: false, message: 'AppSumo OAuth token exchange failed', status: 502 }
  }
  const token = await tokenResponse.json() as AppSumoTokenResponse
  const accessToken = nonEmpty(token.access_token)
  if (!accessToken) {
    return { ok: false, message: 'AppSumo OAuth token response did not include an access token', status: 502 }
  }

  const licenseResponse = await fetcher(`https://appsumo.com/openid/license_key/?access_token=${encodeURIComponent(accessToken)}`)
  if (!licenseResponse.ok) {
    return { ok: false, message: 'AppSumo license lookup failed', status: 502 }
  }
  const license = await licenseResponse.json() as AppSumoLicenseResponse
  const licenseKey = nonEmpty(license.license_key)
  if (!licenseKey) {
    return { ok: false, message: 'AppSumo license response did not include a license key', status: 502 }
  }

  return {
    ok: true,
    validationOnly: false,
    redirectPath: nonEmpty(env.APPSUMO_OAUTH_SUCCESS_PATH) ?? '/purchase/success?provider=appsumo',
    normalizedEvent: normalizedEventFromLicense({
      env,
      licenseKey,
      providerEventId: `oauth:${licenseKey}:${code}`,
      source: 'oauth',
      eventName: nonEmpty(license.status) ?? 'oauth',
      tier: stringFrom(license.tier),
      metadata: metadataFromPayload(license),
    }),
  }
}
