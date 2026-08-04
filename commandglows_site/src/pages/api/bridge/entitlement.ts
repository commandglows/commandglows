import type { APIRoute } from 'astro'
import { verifyToken } from '@clerk/astro/server'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'
import {
  getBearerTokenFromAuthorizationHeader,
  getConvexBridgeSecret,
  getSuiteEntitlementVerifySecret,
  type ReplayGlowzEntitlementReasonCode,
  type ReplayGlowzEntitlementSnapshot,
} from '@/lib/suiteBridge'

export const prerender = false

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const ENTITLEMENT_SECRET_HEADER = 'x-suite-entitlement-secret'
const ALLOWED_REASON_CODES = new Set<ReplayGlowzEntitlementReasonCode>([
  'active_entitlement',
  'default_free_entitlement',
  'missing_product_entitlement',
  'account_not_found',
  'global_user_not_found',
])

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  })
}

function splitOptionalList(value: string | undefined): string[] | undefined {
  const entries = value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  return entries && entries.length > 0 ? entries : undefined
}

function getClerkUserIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const subject = (payload as Record<string, unknown>).sub
  return typeof subject === 'string' && subject.trim() ? subject.trim() : null
}

function parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function parseSnapshot(value: unknown): ReplayGlowzEntitlementSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Record<string, unknown>
  const hasAccess = payload.hasAccess
  const reasonCode = payload.reasonCode
  if (typeof hasAccess !== 'boolean' || typeof reasonCode !== 'string') {
    return null
  }
  if (
    !ALLOWED_REASON_CODES.has(reasonCode as ReplayGlowzEntitlementReasonCode)
  ) {
    return null
  }

  return {
    hasAccess,
    globalUserId: parseNullableString(payload.globalUserId),
    matchedProductId: parseNullableString(payload.matchedProductId),
    reasonCode: reasonCode as ReplayGlowzEntitlementReasonCode,
  }
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv()
  const endpointSecret = getSuiteEntitlementVerifySecret(env)
  const convexBridgeSecret = getConvexBridgeSecret(env)
  const clerkSecretKey = env.CLERK_SECRET_KEY?.trim()
  const convexUrl = env.PUBLIC_CONVEX_URL

  if (!endpointSecret || !convexBridgeSecret) {
    return jsonResponse(
      {
        status: 'unavailable',
        error: 'entitlement_bridge_secret_not_configured',
      },
      503
    )
  }

  const incomingSecret = request.headers.get(ENTITLEMENT_SECRET_HEADER)
  if (!incomingSecret || incomingSecret !== endpointSecret) {
    return jsonResponse(
      { status: 'unauthorized', error: 'invalid_entitlement_bridge_secret' },
      401
    )
  }

  if (!clerkSecretKey) {
    return jsonResponse(
      { status: 'unavailable', error: 'clerk_secret_not_configured' },
      503
    )
  }

  if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
    return jsonResponse(
      { status: 'unavailable', error: 'convex_not_configured' },
      503
    )
  }

  const bearerToken = getBearerTokenFromAuthorizationHeader(
    request.headers.get('authorization')
  )
  if (!bearerToken) {
    return jsonResponse(
      { status: 'unauthorized', error: 'missing_clerk_session_token' },
      401
    )
  }

  let clerkUserId: string | null
  try {
    const claims = await verifyToken(bearerToken, {
      secretKey: clerkSecretKey,
      audience: splitOptionalList(env.SUITE_ENTITLEMENT_CLERK_AUDIENCE),
    })
    clerkUserId = getClerkUserIdFromPayload(claims)
  } catch {
    console.error('Clerk entitlement token verification failed.')
    return jsonResponse(
      { status: 'unauthorized', error: 'invalid_clerk_session_token' },
      401
    )
  }

  if (!clerkUserId) {
    return jsonResponse(
      { status: 'unauthorized', error: 'invalid_clerk_session_subject' },
      401
    )
  }

  const convex = new ConvexHttpClient(convexUrl)
  try {
    const rawSnapshot = await convex.mutation(
      'bridge:ensureReplayGlowzEntitlementSnapshotByClerkId' as never,
      {
        clerkId: clerkUserId,
        bridgeSecret: convexBridgeSecret,
        environment: env.VERCEL_ENV ?? env.NODE_ENV ?? 'production',
      } as never
    )
    const snapshot = parseSnapshot(rawSnapshot)
    if (!snapshot) {
      return jsonResponse(
        { status: 'error', error: 'invalid_entitlement_snapshot' },
        502
      )
    }

    return jsonResponse({ status: 'ok', ...snapshot }, 200)
  } catch {
    console.error('ReplayGlowz entitlement verification failed.')
    return jsonResponse(
      { status: 'error', error: 'entitlement_verification_failed' },
      500
    )
  }
}
