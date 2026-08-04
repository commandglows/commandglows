import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'
import {
  getConvexBridgeSecret,
  getSocialGlowzBridgeSecret,
} from '@/lib/suiteBridge'

export const prerender = false

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const SOCIAL_BRIDGE_SECRET_HEADER = 'x-socialglowz-suite-secret'

type SocialGlowzSnapshotRequest = {
  operation: 'snapshot'
  providerAccountId: string
  email?: string
  sourceRef?: string
}

type SocialGlowzRedeemRequest = {
  operation: 'redeem_code'
  providerAccountId: string
  code: string
  email?: string
  sourceRef?: string
}

type SocialGlowzManualGrantRequest = {
  operation: 'manual_grant'
  providerAccountId: string
  plan: string
  source?: string
  email?: string
  sourceRef?: string
}

type SocialGlowzRevokeRequest = {
  operation: 'revoke'
  providerAccountId: string
  reason?: string
  email?: string
  sourceRef?: string
}

type SocialGlowzRefundRequest = {
  operation: 'refund'
  providerAccountId: string
  reason?: string
  email?: string
  sourceRef?: string
}

type SocialGlowzUpsertCodeRequest = {
  operation: 'upsert_code'
  code: string
  plan: string
  source?: string
  status?: string
  sourceRef?: string
}

type SocialGlowzDisableCodeRequest = {
  operation: 'disable_code'
  code: string
  sourceRef?: string
}

type SocialGlowzCommerceRequest = {
  operation: 'commerce'
  provider: string
  offerId: string
  productId: string
  plan: string
  eventType: 'paid' | 'refunded' | 'revoked'
  environment: 'production' | 'sandbox' | 'development'
  providerEventId: string
  providerOrderId: string
  idempotencyKey: string
  status: 'applied' | 'pending_review' | 'ignored'
  customerEmail?: string
  providerCustomerId?: string
  globalUserId?: string
  sourceRef?: string
  providerSourceRef?: string
  providerInvoiceId?: string
  metadata?: Record<string, string>
}

type SocialGlowzBridgeRequest =
  | SocialGlowzSnapshotRequest
  | SocialGlowzRedeemRequest
  | SocialGlowzManualGrantRequest
  | SocialGlowzRevokeRequest
  | SocialGlowzRefundRequest
  | SocialGlowzUpsertCodeRequest
  | SocialGlowzDisableCodeRequest
  | SocialGlowzCommerceRequest

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseSocialGlowzRequest(
  body: unknown
): SocialGlowzBridgeRequest | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const payload = body as Record<string, unknown>
  const operation = asNonEmptyString(payload.operation)
  if (!operation) {
    return null
  }

  const email = asNonEmptyString(payload.email) ?? undefined
  const sourceRef = asNonEmptyString(payload.sourceRef) ?? undefined

  if (operation === 'snapshot') {
    const providerAccountId = asNonEmptyString(payload.providerAccountId)
    if (!providerAccountId) {
      return null
    }

    return {
      operation: 'snapshot',
      providerAccountId,
      email,
      sourceRef,
    }
  }

  if (operation === 'manual_grant') {
    const providerAccountId = asNonEmptyString(payload.providerAccountId)
    if (!providerAccountId) {
      return null
    }

    const plan = asNonEmptyString(payload.plan)
    if (!plan) {
      return null
    }

    return {
      operation: 'manual_grant',
      providerAccountId,
      plan,
      source: asNonEmptyString(payload.source) ?? undefined,
      email,
      sourceRef,
    }
  }

  if (operation === 'revoke') {
    const providerAccountId = asNonEmptyString(payload.providerAccountId)
    if (!providerAccountId) {
      return null
    }

    return {
      operation: 'revoke',
      providerAccountId,
      reason: asNonEmptyString(payload.reason) ?? undefined,
      email,
      sourceRef,
    }
  }

  if (operation === 'refund') {
    const providerAccountId = asNonEmptyString(payload.providerAccountId)
    if (!providerAccountId) {
      return null
    }

    return {
      operation: 'refund',
      providerAccountId,
      reason: asNonEmptyString(payload.reason) ?? undefined,
      email,
      sourceRef,
    }
  }

  if (operation === 'upsert_code') {
    const code = asNonEmptyString(payload.code)
    const plan = asNonEmptyString(payload.plan)
    if (!code || !plan) {
      return null
    }

    return {
      operation: 'upsert_code',
      code,
      plan,
      source: asNonEmptyString(payload.source) ?? undefined,
      status: asNonEmptyString(payload.status) ?? undefined,
      sourceRef: sourceRef,
    }
  }

  if (operation === 'disable_code') {
    const code = asNonEmptyString(payload.code)
    if (!code) {
      return null
    }

    return {
      operation: 'disable_code',
      code,
      sourceRef,
    }
  }

  if (operation === 'commerce') {
    const provider = asNonEmptyString(payload.provider)
    const offerId = asNonEmptyString(payload.offerId)
    const productId = asNonEmptyString(payload.productId)
    const plan = asNonEmptyString(payload.plan)
    const eventType = asNonEmptyString(payload.eventType)
    const environment =
      (asNonEmptyString(payload.environment) as
        | 'production'
        | 'sandbox'
        | 'development'
        | undefined) ?? undefined
    const providerEventId = asNonEmptyString(payload.providerEventId)
    const providerOrderId = asNonEmptyString(payload.providerOrderId)
    const idempotencyKey = asNonEmptyString(payload.idempotencyKey)
    const status = asNonEmptyString(payload.status)

    if (
      !provider ||
      !offerId ||
      !productId ||
      !plan ||
      !eventType ||
      !providerEventId ||
      !providerOrderId ||
      !idempotencyKey ||
      !status
    ) {
      return null
    }

    if (
      eventType !== 'paid' &&
      eventType !== 'refunded' &&
      eventType !== 'revoked'
    ) {
      return null
    }

    if (!environment) {
      return null
    }

    if (status !== 'applied' && status !== 'pending_review' && status !== 'ignored') {
      return null
    }

    const rawMetadata =
      typeof payload.metadata === 'object' && payload.metadata !== null
        ? (payload.metadata as Record<string, unknown>)
        : undefined

    const metadata = rawMetadata
      ? Object.fromEntries(
          Object.entries(rawMetadata)
            .filter(
              ([, value]) => typeof value === 'string' && value.trim().length > 0
            )
            .map(([key, value]) => [key, (value as string).trim()] as const)
        ) as Record<string, string>
      : undefined

    return {
      operation: 'commerce',
      provider,
      offerId,
      productId,
      plan,
      eventType,
      environment,
      providerEventId,
      providerOrderId,
      idempotencyKey,
      status,
      customerEmail: asNonEmptyString(payload.customerEmail) ?? undefined,
      providerCustomerId: asNonEmptyString(payload.providerCustomerId) ?? undefined,
      globalUserId: asNonEmptyString(payload.globalUserId) ?? undefined,
      sourceRef: asNonEmptyString(payload.sourceRef) ?? undefined,
      providerSourceRef: asNonEmptyString(payload.providerSourceRef) ?? undefined,
      providerInvoiceId: asNonEmptyString(payload.providerInvoiceId) ?? undefined,
      metadata,
    }
  }

  if (operation === 'redeem_code') {
    const providerAccountId = asNonEmptyString(payload.providerAccountId)
    const code = asNonEmptyString(payload.code)
    if (!providerAccountId || !code) {
      return null
    }

    return {
      operation: 'redeem_code',
      providerAccountId,
      code,
      email,
      sourceRef,
    }
  }

  return null
}

function mapBridgeError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (!message) return 'bridge_operation_failed'
  if (/bridge_secret_mismatch/i.test(message)) return 'bridge_secret_mismatch'
  if (/bridge_secret_not_configured/i.test(message))
    return 'bridge_secret_not_configured'
  if (/code_not_found/i.test(message)) return 'code_not_found'
  if (/code_disabled/i.test(message)) return 'code_disabled'
  if (/code_already_used|code_already_redeemed/i.test(message))
    return 'code_already_used'
  if (/already_disabled/i.test(message)) return 'code_disabled'
  if (/plan_not_allowed/i.test(message)) return 'plan_not_allowed'
  if (/source_not_allowed/i.test(message)) return 'source_not_allowed'
  if (/provider_account_id_required|code_required|invalid_payload/i.test(message))
    return 'invalid_payload'
  if (/product_not_allowed/i.test(message)) return 'product_not_allowed'
  if (/unsupported_operation/i.test(message)) return 'invalid_payload'
  return 'bridge_operation_failed'
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv()
  const endpointSecret = getSocialGlowzBridgeSecret(env)
  const convexBridgeSecret = getConvexBridgeSecret(env)
  const convexUrl = env.PUBLIC_CONVEX_URL

  if (!endpointSecret || !convexBridgeSecret) {
    return jsonResponse(
      { status: 'unavailable', error: 'socialglowz_bridge_not_configured' },
      503
    )
  }

  const incomingSecret = request.headers.get(SOCIAL_BRIDGE_SECRET_HEADER)
  if (!incomingSecret || incomingSecret !== endpointSecret) {
    return jsonResponse(
      { status: 'unauthorized', error: 'invalid_socialglowz_bridge_secret' },
      401
    )
  }

  if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
    return jsonResponse(
      { status: 'unavailable', error: 'convex_not_configured' },
      503
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ status: 'bad_request', error: 'invalid_json' }, 400)
  }

  const parsed = parseSocialGlowzRequest(body)
  if (!parsed) {
    return jsonResponse({ status: 'bad_request', error: 'invalid_payload' }, 400)
  }

  const convex = new ConvexHttpClient(convexUrl)
  const environment = env.VERCEL_ENV ?? env.NODE_ENV ?? 'production'

  try {
    if (parsed.operation === 'snapshot') {
      const snapshot = await convex.mutation(
        'bridge:ensureSocialGlowzEntitlementSnapshotByProviderAccount' as never,
        {
          providerAccountId: parsed.providerAccountId,
          email: parsed.email,
          sourceRef: parsed.sourceRef,
          environment,
          bridgeSecret: convexBridgeSecret,
        } as never
      )
      return jsonResponse({ status: 'ok', snapshot }, 200)
    }

    if (parsed.operation === 'manual_grant') {
      const result = await convex.mutation(
        'bridge:manualGrantSocialGlowzAccess' as never,
        {
          providerAccountId: parsed.providerAccountId,
          plan: parsed.plan,
          source: parsed.source,
          sourceRef: parsed.sourceRef,
          environment,
          bridgeSecret: convexBridgeSecret,
        } as never
      )
      return jsonResponse({ status: 'ok', result }, 200)
    }

    if (parsed.operation === 'revoke') {
      const result = await convex.mutation(
        'bridge:revokeSocialGlowzAccessByProviderAccount' as never,
        {
          providerAccountId: parsed.providerAccountId,
          reason: parsed.reason,
          sourceRef: parsed.sourceRef,
          environment,
          bridgeSecret: convexBridgeSecret,
        } as never
      )
      return jsonResponse({ status: 'ok', result }, 200)
    }

    if (parsed.operation === 'refund') {
      const result = await convex.mutation(
        'bridge:refundSocialGlowzAccessByProviderAccount' as never,
        {
          providerAccountId: parsed.providerAccountId,
          reason: parsed.reason,
          sourceRef: parsed.sourceRef,
          environment,
          bridgeSecret: convexBridgeSecret,
        } as never
      )
      return jsonResponse({ status: 'ok', result }, 200)
    }

    if (parsed.operation === 'commerce') {
      const result = await convex.mutation(
        'bridge:processSocialGlowzCommerceEvent' as never,
        {
          provider: parsed.provider,
          offerId: parsed.offerId,
          productId: parsed.productId,
          plan: parsed.plan,
          eventType: parsed.eventType,
          environment: parsed.environment,
          providerEventId: parsed.providerEventId,
          providerOrderId: parsed.providerOrderId,
          idempotencyKey: parsed.idempotencyKey,
          status: parsed.status,
          customerEmail: parsed.customerEmail,
          providerCustomerId: parsed.providerCustomerId,
          globalUserId: parsed.globalUserId,
          sourceRef: parsed.sourceRef,
          providerSourceRef: parsed.providerSourceRef,
          providerInvoiceId: parsed.providerInvoiceId,
          metadata: parsed.metadata,
          bridgeSecret: convexBridgeSecret,
        } as never
      )
      return jsonResponse({ status: 'ok', result }, 200)
    }

    if (parsed.operation === 'disable_code') {
      const result = await convex.mutation(
        'bridge:disableSocialGlowzActivationCode' as never,
        {
          code: parsed.code,
          sourceRef: parsed.sourceRef,
          environment,
          bridgeSecret: convexBridgeSecret,
        } as never
      )
      return jsonResponse({ status: 'ok', result }, 200)
    }

    if (parsed.operation === 'upsert_code') {
      const result = await convex.mutation('bridge:upsertSocialGlowzActivationCode' as never, {
        code: parsed.code,
        plan: parsed.plan,
        source: parsed.source,
        status: parsed.status,
        sourceRef: parsed.sourceRef,
        environment,
        bridgeSecret: convexBridgeSecret,
      } as never)
      return jsonResponse({ status: 'ok', result }, 200)
    }

    const redemption = await convex.mutation(
      'bridge:redeemSocialGlowzActivationCodeByProviderAccount' as never,
      {
        providerAccountId: parsed.providerAccountId,
        email: parsed.email,
        sourceRef: parsed.sourceRef,
        environment,
        code: parsed.code,
        bridgeSecret: convexBridgeSecret,
      } as never
    )
    return jsonResponse({ status: 'ok', redemption }, 200)
  } catch (error) {
    const mappedError = mapBridgeError(error)
    const status = mappedError === 'bridge_secret_mismatch' ? 401 : 400
    return jsonResponse({ status: 'error', error: mappedError }, status)
  }
}
