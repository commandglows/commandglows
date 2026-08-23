import type { APIRoute } from 'astro'
import { ConvexHttpClient } from 'convex/browser'
import { getServerEnv } from '@/lib/serverEnv'
import {
  getConvexBridgeSecret,
  getCommunityGlowsBridgeSecret,
} from '@/lib/suiteBridge'
import { createCommerceCheckoutIdentityToken } from '@/lib/commerce/checkoutIdentity'
import { pseudonymizeCommunityTrialSignal } from '@/lib/trialSignals'
import {
  digestDeletedProviderAccountId,
  digestRetainedEmail,
} from '@/lib/accountRetention'

export const prerender = false

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const COMMUNITY_BRIDGE_SECRET_HEADER = 'x-communityglows-suite-secret'

type CommunityGlowsSnapshotRequest = {
  operation: 'snapshot' | 'restart_trial'
  providerAccountId: string
  email?: string
  sourceRef?: string
  installationHash?: string
  networkHash?: string
}

type CommunityGlowsRedeemRequest = {
  operation: 'redeem_code'
  providerAccountId: string
  code: string
  email?: string
  sourceRef?: string
}

type CommunityGlowsManualGrantRequest = {
  operation: 'manual_grant'
  providerAccountId: string
  plan: string
  source?: string
  email?: string
  sourceRef?: string
}

type CommunityGlowsRevokeRequest = {
  operation: 'revoke'
  providerAccountId: string
  reason?: string
  email?: string
  sourceRef?: string
}

type CommunityGlowsRefundRequest = {
  operation: 'refund'
  providerAccountId: string
  reason?: string
  email?: string
  sourceRef?: string
}

type CommunityGlowsUpsertCodeRequest = {
  operation: 'upsert_code'
  code: string
  plan: string
  source?: string
  status?: string
  sourceRef?: string
}

type CommunityGlowsDisableCodeRequest = {
  operation: 'disable_code'
  code: string
  sourceRef?: string
}

type CommunityGlowsPrepareDeletionRequest = {
  operation: 'prepare_account_deletion'
  providerAccountId: string
  email: string
}

type CommunityGlowsRelinkRequest = {
  operation: 'relink_account'
  providerAccountId: string
  email: string
}

type CommunityGlowsBridgeRequest =
  | CommunityGlowsSnapshotRequest
  | CommunityGlowsRedeemRequest
  | CommunityGlowsManualGrantRequest
  | CommunityGlowsRevokeRequest
  | CommunityGlowsRefundRequest
  | CommunityGlowsUpsertCodeRequest
  | CommunityGlowsDisableCodeRequest
  | CommunityGlowsPrepareDeletionRequest
  | CommunityGlowsRelinkRequest

function jsonResponse(payload: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS })
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseCommunityGlowsRequest(
  body: unknown
): CommunityGlowsBridgeRequest | null {
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

  if (
    operation === 'prepare_account_deletion' ||
    operation === 'relink_account'
  ) {
    const providerAccountId = asNonEmptyString(payload.providerAccountId)
    if (!providerAccountId || !email) return null
    return { operation, providerAccountId, email }
  }

  if (operation === 'snapshot' || operation === 'restart_trial') {
    const providerAccountId = asNonEmptyString(payload.providerAccountId)
    if (!providerAccountId) {
      return null
    }

    return {
      operation,
      providerAccountId,
      email,
      sourceRef,
      installationHash:
        asNonEmptyString(payload.installationHash) ?? undefined,
      networkHash: asNonEmptyString(payload.networkHash) ?? undefined,
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
  if (/account_email_mismatch/i.test(message)) return 'account_email_mismatch'
  if (/account_retention_not_found/i.test(message))
    return 'account_retention_not_found'
  if (/provider_account_deleted/i.test(message)) return 'provider_account_deleted'
  if (/provider_account_already_linked/i.test(message))
    return 'provider_account_already_linked'
  return 'bridge_operation_failed'
}

export const POST: APIRoute = async ({ request }) => {
  const env = getServerEnv()
  const endpointSecret = getCommunityGlowsBridgeSecret(env)
  const convexBridgeSecret = getConvexBridgeSecret(env)
  const convexUrl = env.PUBLIC_CONVEX_URL
  const trialSignalSecret = env.SUITE_TRIAL_SIGNAL_SECRET?.trim()
  const accountRetentionSecret =
    env.COMMUNITYGLOWS_ACCOUNT_RETENTION_SECRET?.trim()

  if (!endpointSecret || !convexBridgeSecret) {
    return jsonResponse(
      { status: 'unavailable', error: 'communityglows_bridge_not_configured' },
      503
    )
  }

  const incomingSecret =
    request.headers.get(COMMUNITY_BRIDGE_SECRET_HEADER)
  if (!incomingSecret || incomingSecret !== endpointSecret) {
    return jsonResponse(
      { status: 'unauthorized', error: 'invalid_communityglows_bridge_secret' },
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

  const parsed = parseCommunityGlowsRequest(body)
  if (!parsed) {
    return jsonResponse({ status: 'bad_request', error: 'invalid_payload' }, 400)
  }

  const convex = new ConvexHttpClient(convexUrl)
  const environment = env.VERCEL_ENV ?? env.NODE_ENV ?? 'production'

  try {
    if (
      parsed.operation === 'prepare_account_deletion' ||
      parsed.operation === 'relink_account'
    ) {
      if (!accountRetentionSecret) {
        return jsonResponse(
          { status: 'unavailable', error: 'account_retention_secret_not_configured' },
          503
        )
      }
      const emailDigest = digestRetainedEmail(
        parsed.email,
        accountRetentionSecret
      )
      const providerAccountDigest = digestDeletedProviderAccountId(
        parsed.providerAccountId,
        accountRetentionSecret
      )
      const mutationName =
        parsed.operation === 'prepare_account_deletion'
          ? 'bridge:prepareCommunityGlowsAccountDeletion'
          : 'bridge:relinkCommunityGlowsAccount'
      const result = await convex.mutation(mutationName as never, {
        providerAccountId: parsed.providerAccountId,
        ...(parsed.operation === 'prepare_account_deletion'
          ? { email: parsed.email }
          : {}),
        emailDigest,
        providerAccountDigest,
        environment,
        bridgeSecret: convexBridgeSecret,
      } as never)
      return jsonResponse({ status: 'ok', result }, 200)
    }

    if (
      parsed.operation === 'snapshot' ||
      parsed.operation === 'restart_trial'
    ) {
      if (!accountRetentionSecret) {
        return jsonResponse(
          { status: 'unavailable', error: 'account_retention_secret_not_configured' },
          503
        )
      }
      if (!trialSignalSecret) {
        return jsonResponse(
          { status: 'unavailable', error: 'trial_signal_secret_not_configured' },
          503
        )
      }
      if (!parsed.installationHash) {
        return jsonResponse(
          { status: 'bad_request', error: 'installation_signal_required' },
          400
        )
      }
      const installationHash = pseudonymizeCommunityTrialSignal(
        parsed.installationHash,
        trialSignalSecret,
        'installation'
      )
      const networkHash = parsed.networkHash
        ? pseudonymizeCommunityTrialSignal(
            parsed.networkHash,
            trialSignalSecret,
            'network'
          )
        : undefined
      const snapshot = await convex.mutation(
        'bridge:ensureCommunityGlowsEntitlementSnapshotByProviderAccount' as never,
        {
          providerAccountId: parsed.providerAccountId,
          providerAccountDigest: digestDeletedProviderAccountId(
            parsed.providerAccountId,
            accountRetentionSecret
          ),
          email: parsed.email,
          sourceRef: parsed.sourceRef,
          installationHash,
          networkHash,
          trialAction:
            parsed.operation === 'restart_trial' ? 'restart' : 'start',
          environment,
          bridgeSecret: convexBridgeSecret,
        } as never
      )
      const globalUserId =
        snapshot && typeof snapshot === 'object' &&
        typeof (snapshot as { globalUserId?: unknown }).globalUserId === 'string'
          ? (snapshot as { globalUserId: string }).globalUserId
          : null
      const checkoutIdentityToken =
        globalUserId && env.SUITE_COMMERCE_CHECKOUT_SECRET
          ? createCommerceCheckoutIdentityToken(
              globalUserId,
              'communityglows',
              environment,
              env.SUITE_COMMERCE_CHECKOUT_SECRET
            )
          : null
      return jsonResponse({
        status: 'ok',
        snapshot,
        ...(checkoutIdentityToken ? { checkoutIdentityToken } : {}),
      }, 200)
    }

    if (parsed.operation === 'manual_grant') {
      const result = await convex.mutation(
        'bridge:manualGrantCommunityGlowsAccess' as never,
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
        'bridge:revokeCommunityGlowsAccessByProviderAccount' as never,
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
        'bridge:refundCommunityGlowsAccessByProviderAccount' as never,
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

    if (parsed.operation === 'disable_code') {
      const result = await convex.mutation(
        'bridge:disableCommunityGlowsActivationCode' as never,
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
      const result = await convex.mutation('bridge:upsertCommunityGlowsActivationCode' as never, {
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

    if (parsed.operation === 'redeem_code') {
      if (!accountRetentionSecret) {
        return jsonResponse(
          { status: 'unavailable', error: 'account_retention_secret_not_configured' },
          503
        )
      }
      const redemption = await convex.mutation(
        'bridge:redeemCommunityGlowsActivationCodeByProviderAccount' as never,
        {
          providerAccountId: parsed.providerAccountId,
          providerAccountDigest: digestDeletedProviderAccountId(
            parsed.providerAccountId,
            accountRetentionSecret
          ),
          email: parsed.email,
          sourceRef: parsed.sourceRef,
          environment,
          code: parsed.code,
          bridgeSecret: convexBridgeSecret,
        } as never
      )
      return jsonResponse({ status: 'ok', redemption }, 200)
    }

    return jsonResponse({ status: 'bad_request', error: 'invalid_payload' }, 400)
  } catch (error) {
    const mappedError = mapBridgeError(error)
    const status = mappedError === 'bridge_secret_mismatch' ? 401 : 400
    return jsonResponse({ status: 'error', error: mappedError }, status)
  }
}
