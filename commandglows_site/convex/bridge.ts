import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import {
  REPLAYGLOWZ_PRODUCT_ID,
  COMMUNITYGLOWS_PRODUCT_ID,
  TEMU_SHOPPING_LISTS_PRODUCT_ID,
  COMMANDGLOWS_APP_PRODUCT_ID,
  CONTENTGLOWZ_PRODUCT_ID,
  normalizeSuiteProductId,
  SUITE_TRIAL_MAX_CYCLES,
  SUITE_TRIAL_SOURCE,
  SUITE_TRIAL_PLAN,
  getSuiteProductTrialPolicy,
  isActiveSuiteEntitlement,
  isAllowedSuiteProduct,
  selectPreferredActiveProductEntitlement,
} from './productEntitlementPolicies'

const COMMUNITYGLOWS_PROVIDER = 'communityglows_convex'
const COMMUNITYGLOWS_PROVIDER_ALIASES = [
  COMMUNITYGLOWS_PROVIDER,
  'socialglowz_convex',
] as const
const COMMUNITYGLOWS_BRIDGE_SOURCE = 'communityglows_bridge_api'
const COMMUNITYGLOWS_PLAN_ALLOWLIST = new Set([
  'lifetime_deal',
  'founder_ltd',
  'ltd',
])
const COMMUNITYGLOWS_SOURCE_ALLOWLIST = new Set([
  'manual',
  'partner',
  'appsumo',
  'direct',
  'legacy',
])
const COMMUNITYGLOWS_ACCESS_EVENT_SOURCE = 'communityglows_admin'
const COMMUNITYGLOWS_REVOKE_EVENT_SOURCE = 'communityglows_revoke'
const COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE = 'communityglows_commerce'
const COMMUNITYGLOWS_COMMERCE_GRANT_SOURCE = 'communityglows_commerce'
const COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE_PREFIX = 'communityglows:commerce'
const SUITE_COMMERCE_EVENT_SOURCE = 'suite_commerce'
const SUITE_COMMERCE_EVENT_SOURCE_PREFIX = 'suite:commerce'
const SUITE_TRIAL_NETWORK_WINDOW_MS = 24 * 60 * 60 * 1000
const SUITE_TRIAL_NETWORK_MAX_GRANTS = 3
const COMMANDGLOWS_APP_PLAN_ALLOWLIST = new Set([
  'focus',
  'power',
  'control',
  'command',
  'lifetime_deal',
])
const COMMANDGLOWS_FORMATION_PLAN_ALLOWLIST = new Set(['formation'])
const COMMANDGLOWS_APP_OFFER_PLAN_BY_ID = new Map([
  ['commandglows_app/focus', 'focus'],
  ['commandglows_app/power', 'power'],
  ['commandglows_app/control', 'control'],
  ['commandglows_app/command', 'command'],
])
const COMMANDGLOWS_FORMATION_OFFER_PLAN_BY_ID = new Map([
  ['commandglows_formation/full_course', 'formation'],
])
const TEMU_SHOPPING_LISTS_PROVIDER = 'temu_shopping_lists_convex'
const TEMU_SHOPPING_LISTS_BRIDGE_SOURCE = 'temu_shopping_lists_bridge_api'

type CommunityGlowsOperationResult = {
  status: 'ok' | 'already_active' | 'already_revoked'
  hasAccess: boolean
  globalUserId: string | null
  planId: string | null
  source: string | null
  reasonCode: string
  reason?: string
  alreadyGranted?: boolean
}

const COMMUNITYGLOWS_COMMERCE_STATUS_PRIORITY: Record<string, number> = {
  revoked: 40,
  granted: 30,
  pending_review: 20,
  ignored: 5,
}

type SuiteEntitlementLike = {
  productId: string
  status: string
  source?: string | null
  sourceRef?: string
  plan?: string
  trialStartedAt?: number | null
  trialExpiresAt?: number | null
  expiresAt?: number | null
  trialAttempt?: number
  updatedAt?: number
  grantedAt?: number
}

function isTrialEntitlementActive(
  entry: { status: string; trialExpiresAt?: number | null },
  now = Date.now()
) {
  return entry.status === 'trialing'
    ? typeof entry.trialExpiresAt === 'number' && entry.trialExpiresAt > now
    : false
}

function isActiveSuiteEntitlementWithExpiration(
  entry: SuiteEntitlementLike,
  now = Date.now()
) {
  return isActiveSuiteEntitlement(
    {
      ...entry,
      productId: entry.productId,
      expiresAt:
        typeof entry.expiresAt === 'number'
          ? entry.expiresAt
          : entry.trialExpiresAt,
    },
    now
  )
}

function nowMs() {
  return Date.now()
}

function buildProductTrialIdempotencyKey(
  productId: string,
  globalUserPublicId: string,
  attempt: number
) {
  return `${productId}_trial:${globalUserPublicId}:${attempt}`
}

function productTrials(
  entitlements: SuiteEntitlementLike[],
  productId: string
) {
  return entitlements.filter(
    (entry) =>
      entry.productId === productId && entry.source === SUITE_TRIAL_SOURCE
  )
}

function countProductTrials(
  entitlements: SuiteEntitlementLike[],
  productId: string
) {
  return productTrials(entitlements, productId).length
}

function hasActivePaidEntitlement(
  entitlements: SuiteEntitlementLike[],
  productId: string,
  now = nowMs()
) {
  return entitlements.some(
    (entry) =>
      entry.productId === productId &&
      isActiveSuiteEntitlementWithExpiration(entry, now) &&
      entry.status === 'active'
  )
}

function buildProductTrialDecision(
  entitlements: SuiteEntitlementLike[],
  productId: string,
  now: number,
  trialEligible: boolean
) {
  const trials = productTrials(entitlements, productId).sort(
    (left, right) => (right.trialAttempt ?? 0) - (left.trialAttempt ?? 0)
  )
  const latestTrial = trials[0]
  const activeTrial = trials.find((entry) =>
    isTrialEntitlementActive(entry, now)
  )
  const paidActive = hasActivePaidEntitlement(entitlements, productId, now)
  const trialRestartsRemaining = Math.max(
    0,
    SUITE_TRIAL_MAX_CYCLES - Math.max(1, trials.length)
  )
  const trialRestartEligible =
    trialEligible &&
    !paidActive &&
    !activeTrial &&
    trials.length > 0 &&
    trialRestartsRemaining > 0

  const accessState = paidActive
    ? ('paid_active' as const)
    : activeTrial
      ? ('trial_active' as const)
      : latestTrial && trialRestartsRemaining === 0
        ? ('trial_exhausted' as const)
        : latestTrial
          ? ('trial_expired' as const)
          : ('inactive' as const)

  return {
    accessState,
    trialAttempt: latestTrial?.trialAttempt ?? (trials.length || null),
    trialRestartsRemaining,
    trialRestartEligible,
  }
}

async function maybeStartProductTrialEntitlement(
  ctx: MutationCtx,
  args: {
    productId: string
    globalUserDocId: Id<'globalUsers'>
    globalUserPublicId: string
    sourceRef: string
    environment: string
    now: number
    allowRestart: boolean
    trialEligible: boolean
    networkHash?: string
    entitlements: SuiteEntitlementLike[]
  }
) {
  const policy = getSuiteProductTrialPolicy(args.productId)
  if (!policy) return false

  if (!args.trialEligible) {
    return false
  }

  if (hasActivePaidEntitlement(args.entitlements, args.productId, args.now)) {
    return false
  }

  const activeTrial = args.entitlements.find(
    (entry) =>
      entry.productId === args.productId &&
      isTrialEntitlementActive(entry, args.now)
  )
  if (activeTrial) {
    return true
  }

  const trialCount = countProductTrials(args.entitlements, args.productId)
  const maxAttemptsReached = trialCount >= policy.maxTrialCycles
  if (maxAttemptsReached) {
    return false
  }

  if (!args.allowRestart && trialCount > 0) {
    return false
  }

  if (args.networkHash) {
    const networkHash = args.networkHash
    const windowStartedAt =
      Math.floor(args.now / SUITE_TRIAL_NETWORK_WINDOW_MS) *
      SUITE_TRIAL_NETWORK_WINDOW_MS
    const existingRiskWindow = await ctx.db
      .query('productTrialRiskWindows')
      .withIndex('by_productEnvironmentNetworkWindow', (q) =>
        q
          .eq('productId', args.productId)
          .eq('environment', args.environment)
          .eq('networkHash', networkHash)
          .eq('windowStartedAt', windowStartedAt)
      )
      .first()

    if (
      existingRiskWindow &&
      existingRiskWindow.grantCount >= SUITE_TRIAL_NETWORK_MAX_GRANTS
    ) {
      return false
    }

    if (existingRiskWindow) {
      await ctx.db.patch(existingRiskWindow._id, {
        grantCount: existingRiskWindow.grantCount + 1,
        updatedAt: args.now,
      })
    } else {
      await ctx.db.insert('productTrialRiskWindows', {
        productId: args.productId,
        environment: args.environment,
        networkHash: args.networkHash,
        windowStartedAt,
        grantCount: 1,
        expiresAt: windowStartedAt + SUITE_TRIAL_NETWORK_WINDOW_MS,
        updatedAt: args.now,
      })
    }
  }

  const nextTrialAttempt = trialCount + 1
  const expiry = args.now + policy.trialDurationMs
  const trialIdempotencyKey = buildProductTrialIdempotencyKey(
    args.productId,
    args.globalUserPublicId,
    nextTrialAttempt
  )

  const existing = await ctx.db
    .query('productEntitlements')
    .withIndex('by_idempotencyKey', (q) =>
      q.eq('idempotencyKey', trialIdempotencyKey)
    )
    .first()

  if (existing) {
    return isTrialEntitlementActive(existing, args.now)
  }

  await ctx.db.insert('productEntitlements', {
    globalUserId: args.globalUserDocId,
    productId: args.productId,
    plan: SUITE_TRIAL_PLAN,
    status: 'trialing',
    source: SUITE_TRIAL_SOURCE,
    sourceRef: args.sourceRef,
    environment: args.environment,
    idempotencyKey: trialIdempotencyKey,
    trialStartedAt: args.now,
    trialExpiresAt: expiry,
    trialAttempt: nextTrialAttempt,
    grantedAt: args.now,
    createdAt: args.now,
    updatedAt: args.now,
  })

  await ctx.db.insert('productAccessEvents', {
    source: SUITE_TRIAL_SOURCE,
    eventType:
      nextTrialAttempt === 1
        ? 'product_trial.started'
        : 'product_trial.restarted',
    sourceRef: args.sourceRef,
    idempotencyKey: trialIdempotencyKey,
    environment: args.environment,
    productId: args.productId,
    globalUserId: args.globalUserDocId,
    status: 'granted',
    createdAt: args.now,
  })

  return true
}

async function registerProductTrialInstallation(
  ctx: MutationCtx,
  args: {
    productId: string
    globalUserDocId: Id<'globalUsers'>
    installationHash?: string
    environment: string
    now: number
  }
) {
  if (!args.installationHash) {
    return {
      eligible: false,
      installationId: null as Id<'productTrialInstallations'> | null,
    }
  }

  const existing = await ctx.db
    .query('productTrialInstallations')
    .withIndex('by_productEnvironmentInstallation', (q) =>
      q
        .eq('productId', args.productId)
        .eq('environment', args.environment)
        .eq('installationHash', args.installationHash!)
    )
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, { lastSeenAt: args.now })
    return {
      eligible: existing.globalUserId === args.globalUserDocId,
      installationId: existing._id,
    }
  }

  const installationId = await ctx.db.insert('productTrialInstallations', {
    productId: args.productId,
    environment: args.environment,
    installationHash: args.installationHash,
    globalUserId: args.globalUserDocId,
    firstSeenAt: args.now,
    lastSeenAt: args.now,
  })
  return { eligible: true, installationId }
}

async function markProductTrialInstallationConsumed(
  ctx: MutationCtx,
  installationId: Id<'productTrialInstallations'> | null,
  now: number
) {
  if (installationId) {
    await ctx.db.patch(installationId, {
      trialConsumedAt: now,
      lastSeenAt: now,
    })
  }
}

function normalizeBridgeEnvironment(value: unknown): string {
  if (value === 'development' || value === 'test' || value === 'production') {
    return value
  }

  if (value === 'preview' || value === 'staging') {
    return 'development'
  }

  return 'production'
}

function isAllowedCommerceEnvironment(
  incomingEnvironment: string,
  runtimeEnvironment: string
) {
  const normalizedIncoming = incomingEnvironment || 'production'
  if (runtimeEnvironment === 'production') {
    return normalizedIncoming === 'production'
  }
  return true
}

function resolveRuntimeBridgeEnvironment() {
  return normalizeBridgeEnvironment(
    process.env.SUITE_BRIDGE_ENVIRONMENT ||
      process.env.VERCEL_ENV ||
      process.env.NODE_ENV
  )
}

function buildCommerceAccessEventStatus(
  eventType: 'paid' | 'refunded' | 'revoked' | 'pending_review'
) {
  if (eventType === 'paid') return 'granted'
  if (eventType === 'pending_review') return 'pending_review'
  return 'revoked'
}

function buildCommerceEventReason(eventType: string, detail?: string) {
  if (detail) return detail
  if (eventType === 'paid') return 'commerce_paid'
  if (eventType === 'refunded') return 'order_refunded'
  if (eventType === 'revoked') return 'order_revoked'
  return 'commerce_pending_review'
}

function buildCommunityGlowsCommerceSourceRef(args: {
  sourceRef?: string
  providerOrderId: string
  providerSourceRef?: string
}) {
  return args.sourceRef || args.providerSourceRef || args.providerOrderId
}

function buildCommunityGlowsCommerceEventIdempotency(
  eventType: string,
  eventKey: string
) {
  const normalizedType = eventType === 'revoked' ? 'revoked' : eventType
  return `${COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE_PREFIX}:${normalizedType}:${eventKey}`
}

function normalizeCommerceEnvironment(
  rawEnvironment: string | undefined
): string {
  if (
    rawEnvironment === 'development' ||
    rawEnvironment === 'test' ||
    rawEnvironment === 'sandbox'
  ) {
    return 'sandbox'
  }

  if (rawEnvironment === 'production') {
    return 'production'
  }

  return 'production'
}

function resolveCommerceIdentityBySourceRef(
  ctx: MutationCtx,
  sourceRef: string | undefined
): Promise<Id<'globalUsers'> | null> {
  if (!sourceRef) {
    return Promise.resolve(null)
  }

  return (async () => {
    const suiteEvents = await ctx.db
      .query('productAccessEvents')
      .withIndex('by_sourceRef', (q) =>
        q.eq('source', SUITE_COMMERCE_EVENT_SOURCE).eq('sourceRef', sourceRef)
      )
      .collect()
    const suiteEvent = suiteEvents.find((entry) => entry.globalUserId) as
      | { globalUserId: Id<'globalUsers'> }
      | undefined

    if (suiteEvent?.globalUserId) {
      return suiteEvent.globalUserId
    }

    const sourceEvents = await ctx.db
      .query('productAccessEvents')
      .withIndex('by_sourceRef', (q) =>
        q
          .eq('source', COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE)
          .eq('sourceRef', sourceRef)
      )
      .collect()

    const event = sourceEvents.find((entry) => entry.globalUserId) as
      | { globalUserId: Id<'globalUsers'> }
      | undefined

    return event?.globalUserId ?? null
  })()
}

async function getClerkIdentityAccountIdForGlobalUser(
  ctx: MutationCtx,
  globalUserDocId: Id<'globalUsers'>
): Promise<string | null> {
  const accounts = await ctx.db
    .query('identityAccounts')
    .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
    .collect()

  const clerkAccount = accounts.find((account) => account.provider === 'clerk')
  return clerkAccount?.providerAccountId ?? null
}

async function upsertCommunityGlowsCommerceEntitlement(
  ctx: MutationCtx,
  args: {
    globalUserDocId: Id<'globalUsers'>
    plan: string
    source: string
    sourceRef: string
    environment: string
    idempotencyKey: string
  }
) {
  if (!isAllowedCommunityGlowsPlan(args.plan)) {
    throw new Error('plan_not_allowed')
  }

  const now = Date.now()
  const existing = await ctx.db
    .query('productEntitlements')
    .withIndex('by_idempotencyKey', (q) =>
      q.eq('idempotencyKey', args.idempotencyKey)
    )
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, {
      status: 'active',
      source: args.source,
      sourceRef: args.sourceRef ?? existing.sourceRef,
      plan: args.plan,
      environment: args.environment,
      grantedAt: existing.grantedAt ?? now,
      updatedAt: now,
    })
  } else {
    await ctx.db.insert('productEntitlements', {
      globalUserId: args.globalUserDocId,
      productId: COMMUNITYGLOWS_PRODUCT_ID,
      plan: args.plan,
      status: 'active',
      source: args.source,
      sourceRef: args.sourceRef,
      environment: args.environment,
      idempotencyKey: args.idempotencyKey,
      grantedAt: now,
      createdAt: now,
      updatedAt: now,
    })
  }

  const accessEventIdempotencyKey = buildCommerceEventIdempotencyKey(
    'suite',
    'granted',
    args.idempotencyKey,
    args.idempotencyKey
  )
  await upsertCommerceAccessEvent(ctx, {
    source: COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE,
    eventType: 'communityglows_access.granted',
    sourceRef: args.sourceRef,
    idempotencyKey: accessEventIdempotencyKey,
    environment: args.environment,
    productId: COMMUNITYGLOWS_PRODUCT_ID,
    globalUserDocId: args.globalUserDocId,
    status: 'granted',
    providerEventId: args.idempotencyKey,
  })

  const rawEntitlements = await ctx.db
    .query('productEntitlements')
    .withIndex('by_globalUserId', (q) =>
      q.eq('globalUserId', args.globalUserDocId)
    )
    .collect()

  return resolveCommunityGlowsAccess({
    globalUserId: await (async () => {
      const globalUser = await ctx.db.get(args.globalUserDocId)
      if (!globalUser) {
        throw new Error('global_user_not_found')
      }

      return globalUser.globalUserId
    })(),
    entitlements: rawEntitlements.map((entry) => ({
      productId: entry.productId,
      status: entry.status,
      plan: entry.plan,
      source: entry.source,
    })),
  })
}

async function buildCommerceAccessSnapshot(
  ctx: MutationCtx,
  globalUserDocId: Id<'globalUsers'>
) {
  const rawEntitlements = await ctx.db
    .query('productEntitlements')
    .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
    .collect()

  const globalUser = await ctx.db.get(globalUserDocId)
  if (!globalUser) {
    throw new Error('global_user_not_found')
  }

  return {
    ...resolveCommunityGlowsAccess({
      globalUserId: globalUser.globalUserId,
      entitlements: rawEntitlements.map((entry) => ({
        productId: entry.productId,
        status: entry.status,
        plan: entry.plan,
        source: entry.source,
      })),
    }),
  }
}

async function upsertCommunityGlowsCommerceAccessEvent(
  ctx: MutationCtx,
  params: {
    globalUserDocId?: Id<'globalUsers'>
    eventType: string
    environment: string
    sourceRef?: string
    idempotencyKey: string
    status: string
    customerEmail?: string
    providerCustomerId?: string
    providerEventId?: string
    reason?: string
  }
) {
  return upsertCommerceAccessEvent(ctx, {
    source: COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE,
    eventType: params.eventType,
    sourceRef: params.sourceRef ?? params.idempotencyKey,
    idempotencyKey: params.idempotencyKey,
    environment: params.environment,
    productId: COMMUNITYGLOWS_PRODUCT_ID,
    status: params.status,
    providerEventId: params.providerEventId ?? params.idempotencyKey,
    providerCustomerId: params.providerCustomerId,
    customerEmail: params.customerEmail,
    reason: params.reason,
    ...(params.globalUserDocId
      ? { globalUserDocId: params.globalUserDocId }
      : {}),
  })
}

function buildCommerceEventIdempotencyKey(
  provider: string,
  eventType: string,
  eventId: string,
  providerOrderId: string
) {
  if (eventId) {
    return `${COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE_PREFIX}:${provider}:${eventType}:${eventId}`
  }
  return `${COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE_PREFIX}:${provider}:${eventType}:${providerOrderId}`
}

function isSupportedCommerceStatus(
  status: string
): status is 'paid' | 'refunded' | 'revoked' | 'pending_review' {
  return (
    status === 'paid' ||
    status === 'refunded' ||
    status === 'revoked' ||
    status === 'pending_review'
  )
}

function isHigherPriorityStatus(incoming: string, existing: string) {
  const incomingPriority =
    COMMUNITYGLOWS_COMMERCE_STATUS_PRIORITY[incoming] ?? 0
  const existingPriority =
    COMMUNITYGLOWS_COMMERCE_STATUS_PRIORITY[existing] ?? 0
  return incomingPriority >= existingPriority
}

function createGlobalUserId() {
  return `gu_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined)
  ) as T
}

function resolveReplayGlowzAccess(args: {
  globalUserId: string | null
  entitlements: SuiteEntitlementLike[]
  accountExists: boolean
}) {
  if (!args.globalUserId) {
    return {
      hasAccess: false,
      globalUserId: null,
      matchedProductId: null,
      reasonCode: args.accountExists
        ? 'global_user_not_found'
        : 'account_not_found',
    }
  }

  const canonical = selectPreferredActiveProductEntitlement(
    args.entitlements,
    REPLAYGLOWZ_PRODUCT_ID
  )
  if (canonical) {
    return {
      hasAccess: true,
      globalUserId: args.globalUserId,
      matchedProductId: REPLAYGLOWZ_PRODUCT_ID,
      reasonCode: 'active_entitlement',
    }
  }

  return {
    hasAccess: false,
    globalUserId: args.globalUserId,
    matchedProductId: null,
    reasonCode: 'missing_product_entitlement',
  }
}

function requireBridgeSecret(providedSecret: string) {
  const configuredSecret = process.env.SUITE_BRIDGE_CONVEX_SECRET
  if (!configuredSecret) {
    throw new Error('bridge_secret_not_configured')
  }
  if (providedSecret !== configuredSecret) {
    throw new Error('bridge_secret_mismatch')
  }
}

export const getCheckoutIdentityByClerkAccount = query({
  args: {
    clerkId: v.string(),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)
    const identity = await ctx.db
      .query('identityAccounts')
      .withIndex('by_providerAccount', (q) =>
        q.eq('provider', 'clerk').eq('providerAccountId', args.clerkId)
      )
      .first()
    if (!identity) return null
    const globalUser = await ctx.db.get(identity.globalUserId)
    return globalUser ? { globalUserId: globalUser.globalUserId } : null
  },
})

function assertCheckoutHandoffContext(
  existing: {
    globalUserId: string
    productId: string
    offerId: string
    environment: string
  },
  incoming: {
    globalUserId: string
    productId: string
    offerId: string
    environment: string
  }
) {
  if (
    existing.globalUserId !== incoming.globalUserId ||
    existing.productId !== incoming.productId ||
    existing.offerId !== incoming.offerId ||
    existing.environment !== incoming.environment
  ) {
    throw new Error('checkout_handoff_context_mismatch')
  }
}

export const claimCommerceCheckoutHandoff = mutation({
  args: {
    jtiHash: v.string(),
    globalUserId: v.string(),
    productId: v.string(),
    offerId: v.string(),
    environment: v.string(),
    expiresAt: v.number(),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)
    const now = Date.now()
    const existing = await ctx.db
      .query('commerceCheckoutHandoffs')
      .withIndex('by_jtiHash', (q) => q.eq('jtiHash', args.jtiHash))
      .unique()
    if (existing) {
      assertCheckoutHandoffContext(existing, args)
      if (existing.expiresAt <= now) {
        throw new Error('checkout_handoff_expired')
      }
      return {
        status: existing.status,
        idempotencyKey: existing.idempotencyKey,
        checkoutUrl: existing.checkoutUrl ?? null,
        providerOrderId: existing.providerOrderId ?? null,
      }
    }
    if (args.expiresAt <= now) {
      throw new Error('checkout_handoff_expired')
    }

    const idempotencyKey = `suite-checkout:${args.jtiHash}`
    await ctx.db.insert('commerceCheckoutHandoffs', {
      jtiHash: args.jtiHash,
      globalUserId: args.globalUserId,
      productId: args.productId,
      offerId: args.offerId,
      environment: args.environment,
      status: 'claimed',
      idempotencyKey,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    return {
      status: 'claimed',
      idempotencyKey,
      checkoutUrl: null,
      providerOrderId: null,
    }
  },
})

export const completeCommerceCheckoutHandoff = mutation({
  args: {
    jtiHash: v.string(),
    globalUserId: v.string(),
    productId: v.string(),
    offerId: v.string(),
    environment: v.string(),
    checkoutUrl: v.string(),
    providerOrderId: v.string(),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)
    const existing = await ctx.db
      .query('commerceCheckoutHandoffs')
      .withIndex('by_jtiHash', (q) => q.eq('jtiHash', args.jtiHash))
      .unique()
    if (!existing) {
      throw new Error('checkout_handoff_not_claimed')
    }
    assertCheckoutHandoffContext(existing, args)
    if (existing.status === 'completed') {
      return {
        status: 'completed' as const,
        checkoutUrl: existing.checkoutUrl,
        providerOrderId: existing.providerOrderId,
      }
    }
    await ctx.db.patch(existing._id, {
      status: 'completed',
      checkoutUrl: args.checkoutUrl,
      providerOrderId: args.providerOrderId,
      updatedAt: Date.now(),
    })
    return {
      status: 'completed' as const,
      checkoutUrl: args.checkoutUrl,
      providerOrderId: args.providerOrderId,
    }
  },
})

function normalizeActivationCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '-')
}

async function findCommunityGlowsGlobalUserByGlobalUserId(
  ctx: MutationCtx,
  globalUserId: string
) {
  return await ctx.db
    .query('globalUsers')
    .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserId))
    .first()
}

async function findCommunityGlowsIdentityByProvider(
  ctx: MutationCtx,
  provider: string,
  providerAccountId: string
) {
  return await ctx.db
    .query('identityAccounts')
    .withIndex('by_providerAccount', (q) =>
      q.eq('provider', provider).eq('providerAccountId', providerAccountId)
    )
    .first()
}

async function upsertCommunityGlowsProviderIdentity(
  ctx: MutationCtx,
  args: {
    provider: string
    providerAccountId: string
    globalUserDocId: Id<'globalUsers'>
    sourceRef?: string
    environment: string
    email?: string
    source?: string
  }
) {
  if (!args.providerAccountId) return

  const now = Date.now()
  const identity = await findCommunityGlowsIdentityByProvider(
    ctx,
    args.provider,
    args.providerAccountId
  )

  if (identity) {
    if (identity.globalUserId !== args.globalUserDocId) {
      throw new Error('provider_identity_mismatch')
    }

    await ctx.db.patch(identity._id, {
      email: args.email ?? identity.email,
      environment: args.environment,
      sourceRef: args.sourceRef ?? identity.sourceRef,
      updatedAt: now,
    })
    return
  }

  await ctx.db.insert('identityAccounts', {
    globalUserId: args.globalUserDocId,
    provider: args.provider,
    providerAccountId: args.providerAccountId,
    email: args.email,
    source: args.source ?? COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE,
    sourceRef: args.sourceRef,
    environment: args.environment,
    createdAt: now,
    updatedAt: now,
  })
}

async function resolveVerifiedCommunityGlowsGlobalUser(
  ctx: MutationCtx,
  args: {
    globalUserId?: string
    provider?: string
    providerAccountId?: string
    email?: string
    environment: string
    sourceRef?: string
  }
): Promise<{ globalUserDocId: Id<'globalUsers'> } | null> {
  if (args.globalUserId) {
    const globalUserDoc = await findCommunityGlowsGlobalUserByGlobalUserId(
      ctx,
      args.globalUserId
    )
    if (!globalUserDoc) {
      return null
    }

    if (args.provider && args.providerAccountId) {
      await upsertCommunityGlowsProviderIdentity(ctx, {
        ...(args as {
          provider: string
          providerAccountId: string
          globalUserDocId: Id<'globalUsers'>
          sourceRef?: string
          environment: string
          email?: string
        }),
        globalUserDocId: globalUserDoc._id,
        source: `${COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE}:${args.provider}`,
      })
    }

    return { globalUserDocId: globalUserDoc._id }
  }

  if (args.provider && args.providerAccountId) {
    const identity = await findCommunityGlowsIdentityByProvider(
      ctx,
      args.provider,
      args.providerAccountId
    )
    return identity ? { globalUserDocId: identity.globalUserId } : null
  }

  return null
}

async function upsertCommerceAccessEvent(
  ctx: MutationCtx,
  params: {
    source: string
    eventType: string
    sourceRef: string
    idempotencyKey: string
    environment: string
    productId: string
    status: string
    providerEventId: string
    providerCustomerId?: string
    customerEmail?: string
    globalUserDocId?: Id<'globalUsers'>
    reason?: string
    metadata?: never
  }
) {
  const existing = await ctx.db
    .query('productAccessEvents')
    .withIndex('by_idempotencyKey', (q) =>
      q.eq('idempotencyKey', params.idempotencyKey)
    )
    .first()

  if (existing) {
    if (
      existing.status !== params.status &&
      isHigherPriorityStatus(params.status, existing.status)
    ) {
      await ctx.db.patch(existing._id, {
        status: params.status,
        reason: params.reason ?? existing.reason,
        source: params.source,
        eventType: params.eventType,
        eventId: params.providerEventId,
        customerId: params.providerCustomerId ?? existing.customerId,
        customerEmail: params.customerEmail ?? existing.customerEmail,
        sourceRef: params.sourceRef,
      })
    }
    return existing
  }

  return await ctx.db.insert('productAccessEvents', {
    source: params.source,
    eventType: params.eventType,
    eventId: params.providerEventId,
    sourceRef: params.sourceRef,
    idempotencyKey: params.idempotencyKey,
    environment: params.environment,
    productId: params.productId,
    customerId: params.providerCustomerId,
    customerEmail: params.customerEmail,
    status: params.status,
    reason: params.reason,
    createdAt: Date.now(),
    ...(params.globalUserDocId ? { globalUserId: params.globalUserDocId } : {}),
  } as never)
}

function isValidCommerceMetadataValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function sanitizeCommerceMetadata(
  metadata: Record<string, string> | undefined
): Record<string, string> {
  if (!metadata) return {}

  const safe: Record<string, string> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (!isValidCommerceMetadataValue(value)) continue
    if (key === 'customer_email') continue
    safe[key] = value.trim()
  }

  return safe
}

function isAllowedCommunityGlowsPlan(planId: string) {
  return COMMUNITYGLOWS_PLAN_ALLOWLIST.has(planId)
}

function isAllowedCommunityGlowsSource(source: string) {
  return COMMUNITYGLOWS_SOURCE_ALLOWLIST.has(source)
}

function isSupportedCommunityGlowsCommerceOffer(
  offerId: string,
  productId: string,
  plan: string
) {
  return (
    offerId === 'communityglows/lifetime_deal' &&
    productId === COMMUNITYGLOWS_PRODUCT_ID &&
    isAllowedCommunityGlowsPlan(plan)
  )
}

function isAllowedSuiteCommercePlan(productId: string, planId: string) {
  if (productId === COMMUNITYGLOWS_PRODUCT_ID) {
    return isAllowedCommunityGlowsPlan(planId)
  }
  if (productId === COMMANDGLOWS_APP_PRODUCT_ID) {
    return COMMANDGLOWS_APP_PLAN_ALLOWLIST.has(planId)
  }
  if (productId === 'commandglows_formation') {
    return COMMANDGLOWS_FORMATION_PLAN_ALLOWLIST.has(planId)
  }
  return false
}

function isSupportedSuiteCommerceOffer(
  offerId: string,
  productId: string,
  plan: string
) {
  if (isSupportedCommunityGlowsCommerceOffer(offerId, productId, plan)) {
    return true
  }
  if (productId === COMMANDGLOWS_APP_PRODUCT_ID) {
    return COMMANDGLOWS_APP_OFFER_PLAN_BY_ID.get(offerId) === plan
  }
  if (productId === 'commandglows_formation') {
    return COMMANDGLOWS_FORMATION_OFFER_PLAN_BY_ID.get(offerId) === plan
  }
  return false
}

function buildSuiteCommerceSourceRef(args: {
  sourceRef?: string
  providerOrderId: string
  providerSourceRef?: string
}) {
  return args.sourceRef || args.providerSourceRef || args.providerOrderId
}

function buildSuiteCommerceIdempotencyKey(eventType: string, eventKey: string) {
  return `${SUITE_COMMERCE_EVENT_SOURCE_PREFIX}:${eventType}:${eventKey}`
}

function normalizeCommerceMetadataSource(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? 'direct'
  return isAllowedCommunityGlowsSource(normalized) ? normalized : 'direct'
}

async function upsertSuiteCommerceEntitlement(
  ctx: MutationCtx,
  args: {
    globalUserDocId: Id<'globalUsers'>
    productId: string
    plan: string
    source: string
    sourceRef: string
    environment: string
    idempotencyKey: string
  }
) {
  if (!isAllowedSuiteProduct(args.productId)) {
    throw new Error('product_not_allowed')
  }
  if (!isAllowedSuiteCommercePlan(args.productId, args.plan)) {
    throw new Error('plan_not_allowed')
  }

  const now = Date.now()
  const existing = await ctx.db
    .query('productEntitlements')
    .withIndex('by_idempotencyKey', (q) =>
      q.eq('idempotencyKey', args.idempotencyKey)
    )
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, {
      status: 'active',
      source: args.source,
      sourceRef: args.sourceRef ?? existing.sourceRef,
      plan: args.plan,
      environment: args.environment,
      grantedAt: existing.grantedAt ?? now,
      updatedAt: now,
    })
    return existing._id
  }

  return await ctx.db.insert('productEntitlements', {
    globalUserId: args.globalUserDocId,
    productId: args.productId,
    plan: args.plan,
    status: 'active',
    source: args.source,
    sourceRef: args.sourceRef,
    environment: args.environment,
    idempotencyKey: args.idempotencyKey,
    grantedAt: now,
    createdAt: now,
    updatedAt: now,
  })
}

async function resolveVerifiedCommerceGlobalUser(
  ctx: MutationCtx,
  args: {
    globalUserId?: string
    provider?: string
    providerAccountId?: string
    email?: string
    environment: string
    sourceRef?: string
  }
): Promise<{ globalUserDocId: Id<'globalUsers'> } | null> {
  return resolveVerifiedCommunityGlowsGlobalUser(ctx, args)
}

async function buildSuiteCommerceAccessSnapshot(
  ctx: MutationCtx,
  globalUserDocId: Id<'globalUsers'>,
  productId: string
) {
  const rawEntitlements = await ctx.db
    .query('productEntitlements')
    .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
    .collect()

  const globalUser = await ctx.db.get(globalUserDocId)
  if (!globalUser) {
    throw new Error('global_user_not_found')
  }

  const entitlement = selectPreferredActiveProductEntitlement(
    rawEntitlements.map((entry) => ({
      productId: entry.productId,
      status: entry.status,
      plan: entry.plan,
      source: entry.source,
      expiresAt: entry.trialExpiresAt,
    })),
    productId
  )

  return {
    hasAccess: Boolean(entitlement),
    globalUserId: globalUser.globalUserId,
    productId,
    planId: entitlement?.plan ?? null,
    source: entitlement?.source ?? null,
    reasonCode: entitlement
      ? 'active_entitlement'
      : 'missing_product_entitlement',
  }
}

async function upsertSuiteCommerceAccessEvent(
  ctx: MutationCtx,
  params: {
    productId: string
    globalUserDocId?: Id<'globalUsers'>
    eventType: string
    environment: string
    sourceRef?: string
    idempotencyKey: string
    status: string
    customerEmail?: string
    providerCustomerId?: string
    providerEventId?: string
    reason?: string
  }
) {
  return upsertCommerceAccessEvent(ctx, {
    source: SUITE_COMMERCE_EVENT_SOURCE,
    eventType: params.eventType,
    sourceRef: params.sourceRef ?? params.idempotencyKey,
    idempotencyKey: params.idempotencyKey,
    environment: params.environment,
    productId: params.productId,
    status: params.status,
    providerEventId: params.providerEventId ?? params.idempotencyKey,
    providerCustomerId: params.providerCustomerId,
    customerEmail: params.customerEmail,
    reason: params.reason,
    ...(params.globalUserDocId
      ? { globalUserDocId: params.globalUserDocId }
      : {}),
  })
}

async function getOrCreateCommunityGlowsIdentity(
  ctx: MutationCtx,
  args: {
    provider?: string
    providerAccountId: string
    email?: string
    environment: string
    source?: string
    sourceRef?: string
  }
) {
  const now = Date.now()
  const provider = args.provider ?? COMMUNITYGLOWS_PROVIDER
  const source = args.source ?? COMMUNITYGLOWS_BRIDGE_SOURCE
  let identity = await ctx.db
    .query('identityAccounts')
    .withIndex('by_providerAccount', (q) =>
      q.eq('provider', provider).eq('providerAccountId', args.providerAccountId)
    )
    .first()

  let globalUserDocId = identity?.globalUserId
  if (!globalUserDocId) {
    globalUserDocId = await ctx.db.insert(
      'globalUsers',
      withoutUndefined({
        globalUserId: createGlobalUserId(),
        primaryEmail: args.email,
        createdAt: now,
        updatedAt: now,
      })
    )

    await ctx.db.insert(
      'identityAccounts',
      withoutUndefined({
        globalUserId: globalUserDocId,
        provider,
        providerAccountId: args.providerAccountId,
        email: args.email,
        source,
        sourceRef: args.sourceRef,
        environment: args.environment,
        createdAt: now,
        updatedAt: now,
      })
    )

    identity = await ctx.db
      .query('identityAccounts')
      .withIndex('by_providerAccount', (q) =>
        q
          .eq('provider', provider)
          .eq('providerAccountId', args.providerAccountId)
      )
      .first()
  } else if (identity) {
    await ctx.db.patch(
      identity._id,
      withoutUndefined({
        email: args.email,
        sourceRef: args.sourceRef,
        environment: args.environment,
        updatedAt: now,
      })
    )
  }

  if (!identity) {
    throw new Error('social_identity_link_failed')
  }

  const globalUser = await ctx.db.get(globalUserDocId as Id<'globalUsers'>)
  if (!globalUser) {
    throw new Error('global_user_not_found')
  }

  await ctx.db.patch(
    globalUser._id,
    withoutUndefined({
      primaryEmail: globalUser.primaryEmail ?? args.email,
      updatedAt: now,
    })
  )

  return { identity, globalUserDocId: globalUser._id, globalUser }
}

async function upsertCommunityGlowsAccessEvent(
  ctx: MutationCtx,
  params: {
    source: string
    eventType: string
    sourceRef?: string
    eventIdempotencyKey: string
    environment: string
    globalUserDocId?: Id<'globalUsers'>
    status: string
  }
) {
  const existing = await ctx.db
    .query('productAccessEvents')
    .withIndex('by_idempotencyKey', (q) =>
      q.eq('idempotencyKey', params.eventIdempotencyKey)
    )
    .first()

  if (existing) {
    return
  }

  await ctx.db.insert('productAccessEvents', {
    source: params.source,
    eventType: params.eventType,
    sourceRef: params.sourceRef,
    idempotencyKey: params.eventIdempotencyKey,
    environment: params.environment,
    productId: COMMUNITYGLOWS_PRODUCT_ID,
    ...(params.globalUserDocId ? { globalUserId: params.globalUserDocId } : {}),
    status: params.status,
    createdAt: Date.now(),
  })
}

function buildCommunityGlowsIdempotencyKey(...parts: Array<string>): string {
  return `communityglows:${parts.join(':')}`
}

async function revokeCommunityGlowsEntitlementsByProviderId(
  ctx: MutationCtx,
  args: {
    providerAccountId: string
    status: string
    sourceRef?: string
    environment: string
    reason?: string
  }
) {
  const { globalUserDocId, globalUser } =
    await getOrCreateCommunityGlowsIdentity(ctx, {
      providerAccountId: args.providerAccountId,
      sourceRef: args.sourceRef,
      environment: args.environment,
    })

  const entitlements = await ctx.db
    .query('productEntitlements')
    .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
    .collect()

  const activeEntitlement = entitlements.find(
    (entry) =>
      entry.productId === COMMUNITYGLOWS_PRODUCT_ID &&
      isActiveSuiteEntitlementWithExpiration(entry)
  )

  if (!activeEntitlement) {
    return {
      ...resolveCommunityGlowsAccess({
        globalUserId: globalUser.globalUserId,
        entitlements,
      }),
      status: 'already_revoked' as const,
    }
  }

  const now = Date.now()
  await ctx.db.patch(activeEntitlement._id, {
    status: args.status,
    updatedAt: now,
    sourceRef: args.sourceRef ?? activeEntitlement.sourceRef,
    source: activeEntitlement.source,
  })

  await upsertCommunityGlowsAccessEvent(ctx, {
    source: COMMUNITYGLOWS_REVOKE_EVENT_SOURCE,
    eventType: 'communityglows_access.revoked',
    sourceRef: args.sourceRef,
    eventIdempotencyKey: buildCommunityGlowsIdempotencyKey(
      'revoke',
      globalUser.globalUserId,
      activeEntitlement._id
    ),
    environment: args.environment,
    globalUserDocId,
    status: args.status,
  })

  const nowEntitlements = await ctx.db
    .query('productEntitlements')
    .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
    .collect()

  return {
    ...resolveCommunityGlowsAccess({
      globalUserId: globalUser.globalUserId,
      entitlements: nowEntitlements,
    }),
    status: 'ok' as const,
    reason: args.reason,
  }
}

async function runManualGrantCommunityGlowsAccess(
  ctx: MutationCtx,
  args: {
    providerAccountId: string
    plan: string
    source: string
    sourceRef?: string
    environment: string
  }
) {
  if (!isAllowedCommunityGlowsPlan(args.plan)) {
    throw new Error('plan_not_allowed')
  }

  if (!isAllowedCommunityGlowsSource(args.source)) {
    throw new Error('source_not_allowed')
  }

  const { globalUserDocId, globalUser } =
    await getOrCreateCommunityGlowsIdentity(ctx, {
      providerAccountId: args.providerAccountId,
      sourceRef: args.sourceRef,
      environment: args.environment,
    })

  const now = Date.now()
  const idempotencyKey = buildCommunityGlowsIdempotencyKey(
    'manual',
    globalUser.globalUserId,
    args.plan,
    args.source
  )

  const existing = await ctx.db
    .query('productEntitlements')
    .withIndex('by_idempotencyKey', (q) =>
      q.eq('idempotencyKey', idempotencyKey)
    )
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, {
      status: 'active',
      source: args.source,
      sourceRef: args.sourceRef ?? existing.sourceRef,
      grantedAt: existing.grantedAt ?? now,
      updatedAt: now,
      plan: args.plan,
      environment: args.environment,
    })

    const rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', globalUserDocId)
      )
      .collect()

    return {
      ...resolveCommunityGlowsAccess({
        globalUserId: globalUser.globalUserId,
        entitlements: rawEntitlements,
      }),
      status: 'already_active' as const,
      alreadyGranted: true,
    }
  }

  await ctx.db.insert('productEntitlements', {
    globalUserId: globalUserDocId,
    productId: COMMUNITYGLOWS_PRODUCT_ID,
    plan: args.plan,
    status: 'active',
    source: args.source,
    sourceRef: args.sourceRef,
    environment: args.environment,
    idempotencyKey,
    grantedAt: now,
    createdAt: now,
    updatedAt: now,
  })

  await upsertCommunityGlowsAccessEvent(ctx, {
    source: args.source,
    eventType: 'communityglows_access.granted',
    sourceRef: args.sourceRef,
    eventIdempotencyKey: buildCommunityGlowsIdempotencyKey(
      'manual_grant',
      globalUser.globalUserId,
      args.plan
    ),
    environment: args.environment,
    globalUserDocId,
    status: 'granted',
  })

  const rawEntitlements = await ctx.db
    .query('productEntitlements')
    .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
    .collect()

  return {
    ...resolveCommunityGlowsAccess({
      globalUserId: globalUser.globalUserId,
      entitlements: rawEntitlements,
    }),
    status: 'ok' as const,
    alreadyGranted: false,
  }
}

function resolveCommunityGlowsAccess(args: {
  globalUserId: string
  entitlements: {
    productId: string
    status: string
    plan: string
    source: string
    grantedAt?: number
    createdAt?: number
    updatedAt?: number
    trialStartedAt?: number
    trialExpiresAt?: number
    trialAttempt?: number
  }[]
  now?: number
  trialEligible?: boolean
  knownInstallationCount?: number
}) {
  const now = args.now ?? Date.now()
  const activeEntitlements = args.entitlements.filter(
    (entry) =>
      entry.productId === COMMUNITYGLOWS_PRODUCT_ID &&
      isActiveSuiteEntitlement(
        { ...entry, expiresAt: entry.trialExpiresAt },
        now
      )
  )
  const paidEntitlement = activeEntitlements.find(
    (entry) => entry.status === 'active' && entry.source !== 'product_default'
  )
  const activeTrial = activeEntitlements.find(
    (entry) => entry.status === 'trialing'
  )
  const trials = productTrials(
    args.entitlements,
    COMMUNITYGLOWS_PRODUCT_ID
  ).sort((left, right) => (right.trialAttempt ?? 0) - (left.trialAttempt ?? 0))
  const latestTrial = trials[0]
  const trialRestartsRemaining = Math.max(
    0,
    SUITE_TRIAL_MAX_CYCLES - Math.max(1, trials.length)
  )
  const trialRestartEligible =
    args.trialEligible === true &&
    !paidEntitlement &&
    !activeTrial &&
    trials.length > 0 &&
    trialRestartsRemaining > 0
  const entitlement = paidEntitlement ?? activeTrial

  if (!entitlement) {
    if (latestTrial) {
      const exhausted = trialRestartsRemaining === 0
      return {
        hasAccess: false,
        accessState: exhausted
          ? ('trial_exhausted' as const)
          : ('trial_expired' as const),
        globalUserId: args.globalUserId,
        planId: latestTrial.plan,
        source: latestTrial.source,
        trialStartedAt: latestTrial.trialStartedAt ?? null,
        trialEndsAt: latestTrial.trialExpiresAt ?? null,
        trialExpiresAt: latestTrial.trialExpiresAt ?? null,
        trialAttempt: latestTrial.trialAttempt ?? trials.length,
        trialRestartsRemaining,
        trialRestartEligible,
        entitlementGrantedAt: null,
        entitlementUpdatedAt: latestTrial.updatedAt ?? null,
        knownInstallationCount: args.knownInstallationCount ?? 0,
        includedAccess: [],
        reasonCode: exhausted
          ? ('trial_exhausted' as const)
          : ('trial_expired' as const),
      }
    }
    return {
      hasAccess: false,
      accessState: 'inactive' as const,
      globalUserId: args.globalUserId,
      planId: null,
      source: null,
      trialStartedAt: null,
      trialEndsAt: null,
      trialExpiresAt: null,
      trialAttempt: null,
      trialRestartsRemaining: SUITE_TRIAL_MAX_CYCLES - 1,
      trialRestartEligible: false,
      entitlementGrantedAt: null,
      entitlementUpdatedAt: null,
      knownInstallationCount: args.knownInstallationCount ?? 0,
      includedAccess: [],
      reasonCode: 'missing_product_entitlement' as const,
    }
  }

  const isTrial = entitlement.status === 'trialing'
  return {
    hasAccess: true,
    accessState: isTrial
      ? ('trial_active' as const)
      : ('lifetime_active' as const),
    globalUserId: args.globalUserId,
    planId: entitlement.plan,
    source: entitlement.source,
    trialStartedAt: isTrial ? (entitlement.trialStartedAt ?? null) : null,
    trialEndsAt: isTrial ? (entitlement.trialExpiresAt ?? null) : null,
    trialExpiresAt: isTrial ? (entitlement.trialExpiresAt ?? null) : null,
    trialAttempt: isTrial ? (entitlement.trialAttempt ?? trials.length) : null,
    trialRestartsRemaining,
    trialRestartEligible: false,
    entitlementGrantedAt: isTrial
      ? null
      : (entitlement.grantedAt ?? entitlement.createdAt ?? null),
    entitlementUpdatedAt: entitlement.updatedAt ?? null,
    knownInstallationCount: args.knownInstallationCount ?? 0,
    includedAccess: ['communityglows_protected_features'] as const,
    reasonCode: 'active_entitlement' as const,
  }
}

function resolveTemuShoppingListsAccess(args: {
  globalUserId: string
  entitlements: SuiteEntitlementLike[]
  now?: number
  trialEligible?: boolean
}) {
  const now = args.now ?? Date.now()
  const decision = buildProductTrialDecision(
    args.entitlements,
    TEMU_SHOPPING_LISTS_PRODUCT_ID,
    now,
    args.trialEligible === true
  )
  const entitlement = selectPreferredActiveProductEntitlement(
    args.entitlements,
    TEMU_SHOPPING_LISTS_PRODUCT_ID,
    now
  )

  if (!entitlement) {
    return {
      hasAccess: false,
      globalUserId: args.globalUserId,
      planId: null,
      source: null,
      ...decision,
      reasonCode: 'missing_product_entitlement' as const,
    }
  }

  return {
    hasAccess: true,
    globalUserId: args.globalUserId,
    planId: entitlement.plan,
    source: entitlement.source,
    ...decision,
    reasonCode: 'active_entitlement' as const,
  }
}

function maskProviderAccountId(value: string): string {
  if (value.length <= 6) {
    return `${value[0] ?? ''}***${value[value.length - 1] ?? ''}`
  }

  return `${value.slice(0, 3)}***${value.slice(-3)}`
}

export const upsertFirebaseIdentity = mutation({
  args: {
    firebaseUid: v.string(),
    firebaseEmail: v.optional(v.string()),
    environment: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    installationHash: v.optional(v.string()),
    networkHash: v.optional(v.string()),
    trialAction: v.optional(v.union(v.literal('start'), v.literal('restart'))),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const configuredSecret = process.env.SUITE_BRIDGE_CONVEX_SECRET
    if (!configuredSecret) {
      throw new Error('bridge_secret_not_configured')
    }

    if (args.bridgeSecret !== configuredSecret) {
      throw new Error('bridge_secret_mismatch')
    }

    const now = Date.now()
    const environment = args.environment ?? 'production'

    let identity = await ctx.db
      .query('identityAccounts')
      .withIndex('by_providerAccount', (q) =>
        q.eq('provider', 'firebase').eq('providerAccountId', args.firebaseUid)
      )
      .first()

    let globalUserDocId = identity?.globalUserId

    if (!globalUserDocId) {
      globalUserDocId = await ctx.db.insert(
        'globalUsers',
        withoutUndefined({
          globalUserId: createGlobalUserId(),
          primaryEmail: args.firebaseEmail,
          createdAt: now,
          updatedAt: now,
        })
      )

      await ctx.db.insert(
        'identityAccounts',
        withoutUndefined({
          globalUserId: globalUserDocId,
          provider: 'firebase',
          providerAccountId: args.firebaseUid,
          email: args.firebaseEmail,
          source: 'firebase_bridge_api',
          sourceRef: args.sourceRef,
          environment,
          createdAt: now,
          updatedAt: now,
        })
      )
    } else if (identity) {
      await ctx.db.patch(
        identity._id,
        withoutUndefined({
          email: args.firebaseEmail,
          environment,
          sourceRef: args.sourceRef,
          updatedAt: now,
        })
      )
    }

    identity = await ctx.db
      .query('identityAccounts')
      .withIndex('by_providerAccount', (q) =>
        q.eq('provider', 'firebase').eq('providerAccountId', args.firebaseUid)
      )
      .first()

    if (!identity) {
      throw new Error('firebase_identity_link_failed')
    }

    const globalUser = await ctx.db.get(identity.globalUserId)
    if (!globalUser) {
      throw new Error('global_user_not_found')
    }

    if (args.firebaseEmail && !globalUser.primaryEmail) {
      await ctx.db.patch(globalUser._id, {
        primaryEmail: args.firebaseEmail,
        updatedAt: now,
      })
    } else {
      await ctx.db.patch(globalUser._id, {
        updatedAt: now,
      })
    }

    let rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', identity.globalUserId)
      )
      .collect()

    const installation = await registerProductTrialInstallation(ctx, {
      productId: COMMANDGLOWS_APP_PRODUCT_ID,
      globalUserDocId: identity.globalUserId,
      installationHash: args.installationHash,
      environment,
      now,
    })
    const didStartCommandGlowsTrial = await maybeStartProductTrialEntitlement(
      ctx,
      {
        productId: COMMANDGLOWS_APP_PRODUCT_ID,
        globalUserDocId: identity.globalUserId,
        globalUserPublicId: globalUser.globalUserId,
        sourceRef: args.sourceRef ?? args.firebaseUid,
        environment,
        now,
        allowRestart: args.trialAction === 'restart',
        trialEligible: installation.eligible,
        networkHash: args.networkHash,
        entitlements: rawEntitlements.map((entry) => ({
          productId: entry.productId,
          status: entry.status,
          plan: entry.plan,
          source: entry.source,
          sourceRef: entry.sourceRef,
          trialStartedAt: entry.trialStartedAt,
          trialExpiresAt: entry.trialExpiresAt,
          trialAttempt: entry.trialAttempt,
        })),
      }
    )

    if (didStartCommandGlowsTrial) {
      await markProductTrialInstallationConsumed(
        ctx,
        installation.installationId,
        now
      )
    }

    rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', identity.globalUserId)
      )
      .collect()

    const commandGlowsTrialCount = countProductTrials(
      rawEntitlements,
      COMMANDGLOWS_APP_PRODUCT_ID
    )
    const commandGlowsTrialRestartsRemaining = Math.max(
      0,
      SUITE_TRIAL_MAX_CYCLES - commandGlowsTrialCount
    )
    const commandGlowsHasActiveTrial = rawEntitlements.some(
      (entry) =>
        entry.productId === COMMANDGLOWS_APP_PRODUCT_ID &&
        entry.status === 'trialing' &&
        typeof entry.trialExpiresAt === 'number' &&
        entry.trialExpiresAt > now
    )
    const commandGlowsHasPaidAccess = hasActivePaidEntitlement(
      rawEntitlements,
      COMMANDGLOWS_APP_PRODUCT_ID,
      now
    )
    const commandGlowsTrialRestartEligible =
      installation.eligible &&
      !commandGlowsHasPaidAccess &&
      !commandGlowsHasActiveTrial &&
      commandGlowsTrialCount > 0 &&
      commandGlowsTrialRestartsRemaining > 0
    const commandGlowsTrialDecision = buildProductTrialDecision(
      rawEntitlements,
      COMMANDGLOWS_APP_PRODUCT_ID,
      now,
      installation.eligible
    )

    const entitlements = rawEntitlements
      .filter((entry) => isAllowedSuiteProduct(entry.productId))
      .filter(
        (entry) =>
          entry.source !== 'product_default' &&
          !(entry.status === 'active' && entry.plan === 'free')
      )
      .map((entry) => ({
        productId: entry.productId,
        status: entry.status,
        plan: entry.plan,
        source: entry.source,
        sourceRef: entry.sourceRef,
        trialStartedAt: entry.trialStartedAt,
        trialExpiresAt: entry.trialExpiresAt,
        ...(entry.productId === COMMANDGLOWS_APP_PRODUCT_ID
          ? {
              trialAttempt: entry.trialAttempt,
              trialRestartsRemaining: commandGlowsTrialRestartsRemaining,
              trialRestartEligible: commandGlowsTrialRestartEligible,
              accessState: commandGlowsTrialDecision.accessState,
            }
          : {}),
      }))

    const replayGlowzProductUserId =
      (await getClerkIdentityAccountIdForGlobalUser(ctx, globalUserDocId)) ??
      null

    return {
      status: 'ok' as const,
      globalUserId: globalUser.globalUserId,
      accounts: [
        {
          provider: 'firebase' as const,
          providerAccountIdMasked: maskProviderAccountId(
            identity.providerAccountId
          ),
        },
      ],
      replayGlowzProductUserId,
      replayGlowzProductUserIdSource: replayGlowzProductUserId
        ? ('clerk' as const)
        : null,
      entitlements,
    }
  },
})

/**
 * Links a verified Auth0 subject to the provider-neutral suite identity.
 * Email is metadata only: identities are never merged by email.
 */
export const upsertContentGlowsAuth0Identity = mutation({
  args: {
    auth0Subject: v.string(),
    auth0Email: v.optional(v.string()),
    environment: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const providerAccountId = args.auth0Subject.trim()
    if (!providerAccountId) {
      throw new Error('provider_account_id_required')
    }

    const now = Date.now()
    const environment = args.environment ?? 'production'
    let identity = await ctx.db
      .query('identityAccounts')
      .withIndex('by_providerAccount', (q) =>
        q.eq('provider', 'auth0').eq('providerAccountId', providerAccountId)
      )
      .first()

    if (!identity) {
      const globalUserDocId = await ctx.db.insert(
        'globalUsers',
        withoutUndefined({
          globalUserId: createGlobalUserId(),
          primaryEmail: args.auth0Email,
          createdAt: now,
          updatedAt: now,
        })
      )
      await ctx.db.insert(
        'identityAccounts',
        withoutUndefined({
          globalUserId: globalUserDocId,
          provider: 'auth0',
          providerAccountId,
          email: args.auth0Email,
          source: 'contentglows_auth0_bridge_api',
          sourceRef: args.sourceRef,
          environment,
          createdAt: now,
          updatedAt: now,
        })
      )
      identity = await ctx.db
        .query('identityAccounts')
        .withIndex('by_providerAccount', (q) =>
          q.eq('provider', 'auth0').eq('providerAccountId', providerAccountId)
        )
        .first()
    } else {
      await ctx.db.patch(
        identity._id,
        withoutUndefined({
          email: args.auth0Email,
          sourceRef: args.sourceRef,
          environment,
          updatedAt: now,
        })
      )
    }

    if (!identity) {
      throw new Error('auth0_identity_link_failed')
    }

    const globalUser = await ctx.db.get(identity.globalUserId)
    if (!globalUser) {
      throw new Error('global_user_not_found')
    }
    if (args.auth0Email && !globalUser.primaryEmail) {
      await ctx.db.patch(globalUser._id, {
        primaryEmail: args.auth0Email,
        updatedAt: now,
      })
    }

    const entitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', identity.globalUserId)
      )
      .collect()
    const contentGlowsEntitlements = entitlements
      .filter(
        (entry) =>
          normalizeSuiteProductId(entry.productId) === CONTENTGLOWZ_PRODUCT_ID
      )
      .map((entry) => ({
        productId: entry.productId,
        status: entry.status,
        plan: entry.plan,
        source: entry.source,
        sourceRef: entry.sourceRef,
        trialStartedAt: entry.trialStartedAt,
        trialExpiresAt: entry.trialExpiresAt,
        trialAttempt: entry.trialAttempt,
      }))
    const activeEntitlement = selectPreferredActiveProductEntitlement(
      contentGlowsEntitlements,
      CONTENTGLOWZ_PRODUCT_ID,
      now
    )

    return {
      status: 'ok' as const,
      globalUserId: globalUser.globalUserId,
      identity: {
        provider: 'auth0' as const,
        providerAccountIdMasked: maskProviderAccountId(providerAccountId),
      },
      entitlement: {
        productId: CONTENTGLOWZ_PRODUCT_ID,
        hasAccess: Boolean(activeEntitlement),
        status: activeEntitlement?.status ?? 'inactive',
        plan: activeEntitlement?.plan ?? null,
      },
      entitlements: contentGlowsEntitlements,
    }
  },
})

export const getEntitlementSnapshotByGlobalUser = query({
  args: {
    globalUserId: v.string(),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const configuredSecret = process.env.SUITE_BRIDGE_CONVEX_SECRET
    if (!configuredSecret) {
      throw new Error('bridge_secret_not_configured')
    }

    if (args.bridgeSecret !== configuredSecret) {
      throw new Error('bridge_secret_mismatch')
    }

    const globalUser = await ctx.db
      .query('globalUsers')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', args.globalUserId)
      )
      .first()

    if (!globalUser) {
      throw new Error('global_user_not_found')
    }

    const accounts = await ctx.db
      .query('identityAccounts')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUser._id))
      .collect()

    const firebaseUids = [
      ...new Set(
        accounts
          .filter((entry) => entry.provider === 'firebase')
          .map((entry) => entry.providerAccountId)
      ),
    ]

    const rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUser._id))
      .collect()

    const entitlements = rawEntitlements
      .filter((entry) => isAllowedSuiteProduct(entry.productId))
      .filter(
        (entry) =>
          entry.source !== 'product_default' &&
          !(entry.status === 'active' && entry.plan === 'free')
      )
      .map((entry) => {
        const decision = buildProductTrialDecision(
          rawEntitlements,
          entry.productId,
          Date.now(),
          false
        )
        return {
          productId: entry.productId,
          status: entry.status,
          plan: entry.plan,
          source: entry.source,
          sourceRef: entry.sourceRef,
          trialStartedAt: entry.trialStartedAt,
          trialExpiresAt: entry.trialExpiresAt,
          trialAttempt: entry.trialAttempt,
          trialRestartsRemaining: decision.trialRestartsRemaining,
          trialRestartEligible: decision.trialRestartEligible,
          accessState: decision.accessState,
        }
      })

    return {
      status: 'ok' as const,
      globalUserId: globalUser.globalUserId,
      firebaseUids,
      entitlements,
    }
  },
})

/**
 * Generic server-to-server entrypoint for suite products that do not yet own a
 * dedicated client bridge. Product clients may wrap this mutation later, but
 * they must not duplicate trial state or policy locally.
 */
export const ensureSuiteProductTrialByGlobalUserId = mutation({
  args: {
    globalUserId: v.string(),
    productId: v.string(),
    installationHash: v.string(),
    networkHash: v.optional(v.string()),
    trialAction: v.optional(v.union(v.literal('start'), v.literal('restart'))),
    sourceRef: v.optional(v.string()),
    environment: v.optional(v.string()),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const productId = normalizeSuiteProductId(args.productId.trim())
    if (!isAllowedSuiteProduct(productId)) {
      throw new Error('product_not_allowed')
    }
    if (!args.installationHash.trim()) {
      throw new Error('installation_hash_required')
    }

    const globalUser = await ctx.db
      .query('globalUsers')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', args.globalUserId)
      )
      .first()
    if (!globalUser) {
      throw new Error('global_user_not_found')
    }

    const now = Date.now()
    const environment = args.environment ?? 'production'
    let entitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUser._id))
      .collect()
    const installation = await registerProductTrialInstallation(ctx, {
      productId,
      globalUserDocId: globalUser._id,
      installationHash: args.installationHash.trim(),
      environment,
      now,
    })
    const didEnsureTrial = await maybeStartProductTrialEntitlement(ctx, {
      productId,
      globalUserDocId: globalUser._id,
      globalUserPublicId: globalUser.globalUserId,
      sourceRef: args.sourceRef ?? `${productId}:${globalUser.globalUserId}`,
      environment,
      now,
      allowRestart: args.trialAction === 'restart',
      trialEligible: installation.eligible,
      networkHash: args.networkHash,
      entitlements,
    })
    if (didEnsureTrial) {
      await markProductTrialInstallationConsumed(
        ctx,
        installation.installationId,
        now
      )
      entitlements = await ctx.db
        .query('productEntitlements')
        .withIndex('by_globalUserId', (q) =>
          q.eq('globalUserId', globalUser._id)
        )
        .collect()
    }

    const decision = buildProductTrialDecision(
      entitlements,
      productId,
      now,
      installation.eligible
    )
    const entitlement = selectPreferredActiveProductEntitlement(
      entitlements,
      productId,
      now
    )

    return {
      status: 'ok' as const,
      productId,
      globalUserId: globalUser.globalUserId,
      hasAccess: Boolean(entitlement),
      planId: entitlement?.plan ?? null,
      source: entitlement?.source ?? null,
      ...decision,
      reasonCode: entitlement
        ? ('active_entitlement' as const)
        : ('missing_product_entitlement' as const),
    }
  },
})

export const restartCommandGlowsTrialByGlobalUserId = mutation({
  args: {
    globalUserId: v.string(),
    bridgeSecret: v.string(),
    sourceRef: v.optional(v.string()),
    forceRestart: v.optional(v.boolean()),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const globalUser = await ctx.db
      .query('globalUsers')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', args.globalUserId)
      )
      .first()

    if (!globalUser) {
      throw new Error('global_user_not_found')
    }

    const now = Date.now()
    const environment = args.environment ?? 'production'
    const rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUser._id))
      .collect()
    const trialCount = countProductTrials(
      rawEntitlements.map((entry) => ({
        productId: entry.productId,
        status: entry.status,
        source: entry.source,
        trialAttempt: entry.trialAttempt,
        trialStartedAt: entry.trialStartedAt,
        trialExpiresAt: entry.trialExpiresAt,
      })),
      COMMANDGLOWS_APP_PRODUCT_ID
    )

    const didStartTrial = await maybeStartProductTrialEntitlement(ctx, {
      productId: COMMANDGLOWS_APP_PRODUCT_ID,
      globalUserDocId: globalUser._id,
      globalUserPublicId: globalUser.globalUserId,
      sourceRef: args.sourceRef ?? globalUser.globalUserId,
      environment,
      now,
      allowRestart: args.forceRestart ?? true,
      // This mutation is restricted to the server-to-server bridge secret and
      // is the audited support exception; customer trial requests go through
      // the Firebase bridge with a recognized installation.
      trialEligible: true,
      entitlements: rawEntitlements.map((entry) => ({
        productId: entry.productId,
        status: entry.status,
        plan: entry.plan,
        source: entry.source,
        sourceRef: entry.sourceRef,
        trialStartedAt: entry.trialStartedAt,
        trialExpiresAt: entry.trialExpiresAt,
        trialAttempt: entry.trialAttempt,
      })),
    })

    return {
      status: didStartTrial ? 'trial_started' : 'trial_not_started',
      globalUserId: globalUser.globalUserId,
      activeTrialCount: trialCount,
      nextTrialCount: didStartTrial ? trialCount + 1 : trialCount,
      canRetry:
        (didStartTrial ? trialCount + 1 : trialCount) < SUITE_TRIAL_MAX_CYCLES,
    }
  },
})

export const getReplayGlowzEntitlementSnapshotByClerkId = query({
  args: {
    clerkId: v.string(),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    const configuredSecret = process.env.SUITE_BRIDGE_CONVEX_SECRET
    if (!configuredSecret) {
      throw new Error('bridge_secret_not_configured')
    }

    if (args.bridgeSecret !== configuredSecret) {
      throw new Error('bridge_secret_mismatch')
    }

    const identity = await ctx.db
      .query('identityAccounts')
      .withIndex('by_providerAccount', (q) =>
        q.eq('provider', 'clerk').eq('providerAccountId', args.clerkId)
      )
      .first()

    const compatibilityUser = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .first()

    const globalUserDocId =
      identity?.globalUserId ?? compatibilityUser?.globalUserId
    if (!globalUserDocId) {
      return resolveReplayGlowzAccess({
        globalUserId: null,
        entitlements: [],
        accountExists: Boolean(identity || compatibilityUser),
      })
    }

    const globalUser = await ctx.db.get(globalUserDocId)
    if (!globalUser) {
      return resolveReplayGlowzAccess({
        globalUserId: null,
        entitlements: [],
        accountExists: true,
      })
    }

    const rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', globalUserDocId)
      )
      .collect()

    return resolveReplayGlowzAccess({
      globalUserId: globalUser.globalUserId,
      entitlements: rawEntitlements,
      accountExists: true,
    })
  },
})

export const ensureReplayGlowzEntitlementSnapshotByClerkId = mutation({
  args: {
    clerkId: v.string(),
    bridgeSecret: v.string(),
    environment: v.optional(v.string()),
    installationHash: v.optional(v.string()),
    networkHash: v.optional(v.string()),
    trialAction: v.optional(v.union(v.literal('start'), v.literal('restart'))),
  },
  handler: async (ctx, args) => {
    const configuredSecret = process.env.SUITE_BRIDGE_CONVEX_SECRET
    if (!configuredSecret) {
      throw new Error('bridge_secret_not_configured')
    }

    if (args.bridgeSecret !== configuredSecret) {
      throw new Error('bridge_secret_mismatch')
    }

    const identity = await ctx.db
      .query('identityAccounts')
      .withIndex('by_providerAccount', (q) =>
        q.eq('provider', 'clerk').eq('providerAccountId', args.clerkId)
      )
      .first()

    const compatibilityUser = await ctx.db
      .query('users')
      .withIndex('by_clerkId', (q) => q.eq('clerkId', args.clerkId))
      .first()

    const globalUserDocId =
      identity?.globalUserId ?? compatibilityUser?.globalUserId
    if (!globalUserDocId) {
      return resolveReplayGlowzAccess({
        globalUserId: null,
        entitlements: [],
        accountExists: Boolean(identity || compatibilityUser),
      })
    }

    const globalUser = await ctx.db.get(globalUserDocId)
    if (!globalUser) {
      return resolveReplayGlowzAccess({
        globalUserId: null,
        entitlements: [],
        accountExists: true,
      })
    }

    const rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', globalUserDocId)
      )
      .collect()

    const now = Date.now()
    const environment = args.environment ?? 'production'
    const installation = await registerProductTrialInstallation(ctx, {
      productId: REPLAYGLOWZ_PRODUCT_ID,
      globalUserDocId,
      installationHash: args.installationHash,
      environment,
      now,
    })
    const didStartTrial = await maybeStartProductTrialEntitlement(ctx, {
      productId: REPLAYGLOWZ_PRODUCT_ID,
      globalUserDocId,
      globalUserPublicId: globalUser.globalUserId,
      sourceRef: args.clerkId,
      environment,
      now,
      allowRestart: args.trialAction === 'restart',
      trialEligible: installation.eligible,
      networkHash: args.networkHash,
      entitlements: rawEntitlements,
    })
    if (didStartTrial) {
      await markProductTrialInstallationConsumed(
        ctx,
        installation.installationId,
        now
      )
    }

    const updatedEntitlements = didStartTrial
      ? await ctx.db
          .query('productEntitlements')
          .withIndex('by_globalUserId', (q) =>
            q.eq('globalUserId', globalUserDocId)
          )
          .collect()
      : rawEntitlements

    return resolveReplayGlowzAccess({
      globalUserId: globalUser.globalUserId,
      entitlements: updatedEntitlements,
      accountExists: true,
    })
  },
})

export const prepareCommunityGlowsAccountDeletion = mutation({
  args: {
    providerAccountId: v.string(),
    email: v.string(),
    emailDigest: v.string(),
    providerAccountDigest: v.string(),
    environment: v.optional(v.string()),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)
    const providerAccountId = args.providerAccountId.trim()
    const email = args.email.trim().toLowerCase()
    const environment = args.environment ?? 'production'
    if (
      !providerAccountId ||
      !email ||
      !args.emailDigest ||
      !args.providerAccountDigest
    ) {
      throw new Error('invalid_payload')
    }

    const previous = await ctx.db
      .query('communityGlowsAccountRetentions')
      .withIndex('by_deletedProviderEnvironment', (q) =>
        q
          .eq('deletedProviderAccountDigest', args.providerAccountDigest)
          .eq('environment', environment)
      )
      .first()
    if (previous) {
      return { status: 'already_prepared', retained: true }
    }

    let identity = null
    for (const provider of COMMUNITYGLOWS_PROVIDER_ALIASES) {
      identity = await ctx.db
        .query('identityAccounts')
        .withIndex('by_providerAccount', (q) =>
          q.eq('provider', provider).eq('providerAccountId', providerAccountId)
        )
        .first()
      if (identity) break
    }
    if (!identity) throw new Error('account_not_found')

    const globalUser = await ctx.db.get(identity.globalUserId)
    if (!globalUser) throw new Error('global_user_not_found')
    const knownEmail = (identity.email ?? globalUser.primaryEmail ?? '')
      .trim()
      .toLowerCase()
    if (!knownEmail || knownEmail !== email) {
      throw new Error('account_email_mismatch')
    }

    const entitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUser._id))
      .collect()
    const communityEntitlements = entitlements.filter(
      (entry) => entry.productId === COMMUNITYGLOWS_PRODUCT_ID
    )
    const trialAttempts = communityEntitlements.reduce(
      (maximum, entry) => Math.max(maximum, entry.trialAttempt ?? 0),
      0
    )
    const now = Date.now()

    await ctx.db.insert('communityGlowsAccountRetentions', {
      emailDigest: args.emailDigest,
      deletedProviderAccountDigest: args.providerAccountDigest,
      globalUserId: globalUser._id,
      environment,
      trialAttempts,
      retainedEntitlementIds: communityEntitlements.map((entry) => entry._id),
      status: 'retained',
      deletedAt: now,
      createdAt: now,
      updatedAt: now,
    })

    const accessEvents = await ctx.db
      .query('productAccessEvents')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUser._id))
      .collect()
    for (const event of accessEvents) {
      if (
        event.productId === COMMUNITYGLOWS_PRODUCT_ID &&
        event.customerEmail
      ) {
        await ctx.db.patch(event._id, { customerEmail: undefined })
      }
    }
    const providerIdentities = await ctx.db
      .query('identityAccounts')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUser._id))
      .collect()
    for (const providerIdentity of providerIdentities) {
      if (
        COMMUNITYGLOWS_PROVIDER_ALIASES.includes(
          providerIdentity.provider as (typeof COMMUNITYGLOWS_PROVIDER_ALIASES)[number]
        )
      ) {
        await ctx.db.patch(providerIdentity._id, {
          providerAccountId: `deleted:${providerIdentity._id}`,
          email: undefined,
          sourceRef: undefined,
          updatedAt: now,
        })
      }
    }
    const hasAnotherActiveProvider = providerIdentities.some(
      (providerIdentity) =>
        !COMMUNITYGLOWS_PROVIDER_ALIASES.includes(
          providerIdentity.provider as (typeof COMMUNITYGLOWS_PROVIDER_ALIASES)[number]
        )
    )
    await ctx.db.patch(
      globalUser._id,
      hasAnotherActiveProvider
        ? { updatedAt: now }
        : {
            primaryEmail: undefined,
            name: undefined,
            imageUrl: undefined,
            updatedAt: now,
          }
    )

    return {
      status: 'prepared',
      retained: true,
      paidEntitlementRetained: communityEntitlements.some(
        (entry) => entry.status === 'active'
      ),
    }
  },
})

export const relinkCommunityGlowsAccount = mutation({
  args: {
    providerAccountId: v.string(),
    emailDigest: v.string(),
    providerAccountDigest: v.string(),
    environment: v.optional(v.string()),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)
    const providerAccountId = args.providerAccountId.trim()
    const environment = args.environment ?? 'production'
    if (
      !providerAccountId ||
      !args.emailDigest ||
      !args.providerAccountDigest
    ) {
      throw new Error('invalid_payload')
    }

    const existingIdentity = await ctx.db
      .query('identityAccounts')
      .withIndex('by_providerAccount', (q) =>
        q
          .eq('provider', COMMUNITYGLOWS_PROVIDER)
          .eq('providerAccountId', providerAccountId)
      )
      .first()
    const retention = await ctx.db
      .query('communityGlowsAccountRetentions')
      .withIndex('by_emailEnvironment', (q) =>
        q.eq('emailDigest', args.emailDigest).eq('environment', environment)
      )
      .order('desc')
      .first()
    if (!retention) throw new Error('account_retention_not_found')
    if (existingIdentity) {
      if (existingIdentity.globalUserId !== retention.globalUserId) {
        throw new Error('provider_account_already_linked')
      }
      return { status: 'already_relinked' }
    }

    const deletedProvider = await ctx.db
      .query('communityGlowsAccountRetentions')
      .withIndex('by_deletedProviderEnvironment', (q) =>
        q
          .eq('deletedProviderAccountDigest', args.providerAccountDigest)
          .eq('environment', environment)
      )
      .first()
    if (deletedProvider) throw new Error('provider_account_deleted')

    const now = Date.now()
    await ctx.db.insert('identityAccounts', {
      globalUserId: retention.globalUserId,
      provider: COMMUNITYGLOWS_PROVIDER,
      providerAccountId,
      source: COMMUNITYGLOWS_BRIDGE_SOURCE,
      environment,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.patch(retention._id, {
      status: 'relinked',
      relinkedAt: now,
      updatedAt: now,
    })

    const entitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', retention.globalUserId)
      )
      .collect()
    const activeEntitlement = selectPreferredActiveProductEntitlement(
      entitlements.filter(
        (entry) => entry.productId === COMMUNITYGLOWS_PRODUCT_ID
      ),
      COMMUNITYGLOWS_PRODUCT_ID
    )
    return {
      status: 'relinked',
      hasAccess: Boolean(activeEntitlement),
      planId: activeEntitlement?.plan ?? null,
      trialAttempts: retention.trialAttempts,
    }
  },
})

export const ensureCommunityGlowsEntitlementSnapshotByProviderAccount =
  mutation({
    args: {
      providerAccountId: v.string(),
      providerAccountDigest: v.optional(v.string()),
      email: v.optional(v.string()),
      environment: v.optional(v.string()),
      sourceRef: v.optional(v.string()),
      installationHash: v.optional(v.string()),
      networkHash: v.optional(v.string()),
      trialAction: v.optional(
        v.union(v.literal('start'), v.literal('restart'))
      ),
      bridgeSecret: v.string(),
    },
    handler: async (ctx, args) => {
      requireBridgeSecret(args.bridgeSecret)

      const environment = args.environment ?? 'production'
      const providerAccountId = args.providerAccountId.trim()
      if (!providerAccountId) {
        throw new Error('provider_account_id_required')
      }
      if (args.providerAccountDigest) {
        const deletedProvider = await ctx.db
          .query('communityGlowsAccountRetentions')
          .withIndex('by_deletedProviderEnvironment', (q) =>
            q
              .eq('deletedProviderAccountDigest', args.providerAccountDigest!)
              .eq('environment', environment)
          )
          .first()
        if (deletedProvider) throw new Error('provider_account_deleted')
      }

      const { globalUser, globalUserDocId } =
        await getOrCreateCommunityGlowsIdentity(ctx, {
          providerAccountId,
          email: args.email,
          environment,
          sourceRef: args.sourceRef,
        })

      let rawEntitlements = await ctx.db
        .query('productEntitlements')
        .withIndex('by_globalUserId', (q) =>
          q.eq('globalUserId', globalUserDocId)
        )
        .collect()

      const now = Date.now()
      const installation = await registerProductTrialInstallation(ctx, {
        productId: COMMUNITYGLOWS_PRODUCT_ID,
        globalUserDocId,
        installationHash: args.installationHash,
        environment,
        now,
      })
      const didEnsureTrialEntitlement = await maybeStartProductTrialEntitlement(
        ctx,
        {
          productId: COMMUNITYGLOWS_PRODUCT_ID,
          entitlements: rawEntitlements,
          globalUserDocId,
          globalUserPublicId: globalUser.globalUserId,
          sourceRef: args.sourceRef ?? providerAccountId,
          environment,
          now,
          allowRestart: args.trialAction === 'restart',
          trialEligible: installation.eligible,
          networkHash: args.networkHash,
        }
      )

      if (didEnsureTrialEntitlement) {
        await markProductTrialInstallationConsumed(
          ctx,
          installation.installationId,
          now
        )
      }

      if (didEnsureTrialEntitlement) {
        rawEntitlements = await ctx.db
          .query('productEntitlements')
          .withIndex('by_globalUserId', (q) =>
            q.eq('globalUserId', globalUserDocId)
          )
          .collect()
      }

      const knownInstallations = await ctx.db
        .query('productTrialInstallations')
        .withIndex('by_globalUserProduct', (q) =>
          q
            .eq('globalUserId', globalUserDocId)
            .eq('productId', COMMUNITYGLOWS_PRODUCT_ID)
        )
        .collect()

      return resolveCommunityGlowsAccess({
        globalUserId: globalUser.globalUserId,
        entitlements: rawEntitlements,
        now,
        trialEligible: installation.eligible,
        knownInstallationCount: knownInstallations.filter(
          (entry) => entry.environment === environment
        ).length,
      })
    },
  })

export const ensureTemuShoppingListsEntitlementSnapshotByProviderAccount =
  mutation({
    args: {
      providerAccountId: v.string(),
      email: v.optional(v.string()),
      environment: v.optional(v.string()),
      sourceRef: v.optional(v.string()),
      installationHash: v.optional(v.string()),
      networkHash: v.optional(v.string()),
      trialAction: v.optional(
        v.union(v.literal('start'), v.literal('restart'))
      ),
      bridgeSecret: v.string(),
    },
    handler: async (ctx, args) => {
      requireBridgeSecret(args.bridgeSecret)

      const environment = args.environment ?? 'production'
      const providerAccountId = args.providerAccountId.trim()
      if (!providerAccountId) {
        throw new Error('provider_account_id_required')
      }

      const { globalUser, globalUserDocId } =
        await getOrCreateCommunityGlowsIdentity(ctx, {
          provider: TEMU_SHOPPING_LISTS_PROVIDER,
          providerAccountId,
          email: args.email,
          environment,
          sourceRef: args.sourceRef,
          source: TEMU_SHOPPING_LISTS_BRIDGE_SOURCE,
        })

      let rawEntitlements = await ctx.db
        .query('productEntitlements')
        .withIndex('by_globalUserId', (q) =>
          q.eq('globalUserId', globalUserDocId)
        )
        .collect()

      const now = Date.now()
      const installation = await registerProductTrialInstallation(ctx, {
        productId: TEMU_SHOPPING_LISTS_PRODUCT_ID,
        globalUserDocId,
        installationHash: args.installationHash,
        environment,
        now,
      })
      const didEnsureTrialEntitlement = await maybeStartProductTrialEntitlement(
        ctx,
        {
          productId: TEMU_SHOPPING_LISTS_PRODUCT_ID,
          entitlements: rawEntitlements,
          globalUserDocId,
          globalUserPublicId: globalUser.globalUserId,
          sourceRef: args.sourceRef ?? providerAccountId,
          environment,
          now,
          allowRestart: args.trialAction === 'restart',
          trialEligible: installation.eligible,
          networkHash: args.networkHash,
        }
      )

      if (didEnsureTrialEntitlement) {
        await markProductTrialInstallationConsumed(
          ctx,
          installation.installationId,
          now
        )
        rawEntitlements = await ctx.db
          .query('productEntitlements')
          .withIndex('by_globalUserId', (q) =>
            q.eq('globalUserId', globalUserDocId)
          )
          .collect()
      }

      return resolveTemuShoppingListsAccess({
        globalUserId: globalUser.globalUserId,
        entitlements: rawEntitlements,
        now,
        trialEligible: installation.eligible,
      })
    },
  })

export const upsertCommunityGlowsActivationCode = mutation({
  args: {
    bridgeSecret: v.string(),
    code: v.string(),
    plan: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.optional(v.union(v.literal('available'), v.literal('disabled'))),
    sourceRef: v.optional(v.string()),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const codeNormalized = normalizeActivationCode(args.code)
    if (!codeNormalized) {
      throw new Error('code_required')
    }

    const plan = args.plan ?? 'lifetime_deal'
    if (!isAllowedCommunityGlowsPlan(plan)) {
      throw new Error('plan_not_allowed')
    }

    const source = args.source ?? 'manual'
    if (!isAllowedCommunityGlowsSource(source)) {
      throw new Error('source_not_allowed')
    }

    const now = Date.now()
    const environment = args.environment ?? 'production'
    const idempotencyKey = `communityglows_code:${codeNormalized}`
    const existing = await ctx.db
      .query('productActivationCodes')
      .withIndex('by_codeNormalized', (q) =>
        q.eq('codeNormalized', codeNormalized)
      )
      .unique()

    if (existing?.status === 'redeemed') {
      throw new Error('code_already_redeemed')
    }

    const payload = withoutUndefined({
      codeNormalized,
      productId: COMMUNITYGLOWS_PRODUCT_ID,
      plan,
      source,
      status: args.status ?? 'available',
      sourceRef: args.sourceRef,
      environment,
      idempotencyKey,
      updatedAt: now,
    })

    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return { created: false, codeId: existing._id }
    }

    const codeId = await ctx.db.insert('productActivationCodes', {
      ...payload,
      createdAt: now,
    })

    return { created: true, codeId }
  },
})

export const redeemCommunityGlowsActivationCodeByProviderAccount = mutation({
  args: {
    providerAccountId: v.string(),
    providerAccountDigest: v.optional(v.string()),
    email: v.optional(v.string()),
    code: v.string(),
    bridgeSecret: v.string(),
    environment: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const providerAccountId = args.providerAccountId.trim()
    if (!providerAccountId) {
      throw new Error('provider_account_id_required')
    }

    const codeNormalized = normalizeActivationCode(args.code)
    if (!codeNormalized) {
      throw new Error('code_required')
    }

    const environment = args.environment ?? 'production'
    if (args.providerAccountDigest) {
      const deletedProvider = await ctx.db
        .query('communityGlowsAccountRetentions')
        .withIndex('by_deletedProviderEnvironment', (q) =>
          q
            .eq('deletedProviderAccountDigest', args.providerAccountDigest!)
            .eq('environment', environment)
        )
        .first()
      if (deletedProvider) throw new Error('provider_account_deleted')
    }
    const { globalUser, globalUserDocId } =
      await getOrCreateCommunityGlowsIdentity(ctx, {
        providerAccountId,
        email: args.email,
        environment,
        sourceRef: args.sourceRef,
      })

    const codeDoc = await ctx.db
      .query('productActivationCodes')
      .withIndex('by_codeNormalized', (q) =>
        q.eq('codeNormalized', codeNormalized)
      )
      .unique()
    if (!codeDoc) {
      throw new Error('code_not_found')
    }
    if (codeDoc.productId !== COMMUNITYGLOWS_PRODUCT_ID) {
      throw new Error('product_not_allowed')
    }
    if (!isAllowedCommunityGlowsPlan(codeDoc.plan)) {
      throw new Error('plan_not_allowed')
    }
    if (!isAllowedCommunityGlowsSource(codeDoc.source)) {
      throw new Error('source_not_allowed')
    }
    if (codeDoc.status === 'disabled') {
      throw new Error('code_disabled')
    }

    const now = Date.now()
    const sameUserCode =
      codeDoc.status === 'redeemed' &&
      codeDoc.redeemedByGlobalUserId === globalUserDocId
    if (codeDoc.status === 'redeemed' && !sameUserCode) {
      throw new Error('code_already_used')
    }

    const entitlementIdempotencyKey = `communityglows_redeem:${globalUser.globalUserId}:${codeNormalized}`
    const existingEntitlement = await ctx.db
      .query('productEntitlements')
      .withIndex('by_idempotencyKey', (q) =>
        q.eq('idempotencyKey', entitlementIdempotencyKey)
      )
      .first()

    let entitlementId = existingEntitlement?._id
    if (!existingEntitlement) {
      entitlementId = await ctx.db.insert('productEntitlements', {
        globalUserId: globalUserDocId,
        productId: COMMUNITYGLOWS_PRODUCT_ID,
        plan: codeDoc.plan,
        status: 'active',
        source: codeDoc.source,
        sourceRef:
          args.sourceRef ?? codeDoc.sourceRef ?? codeDoc.codeNormalized,
        environment,
        idempotencyKey: entitlementIdempotencyKey,
        grantedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await ctx.db.patch(existingEntitlement._id, {
        productId: COMMUNITYGLOWS_PRODUCT_ID,
        plan: codeDoc.plan,
        status: 'active',
        source: codeDoc.source,
        sourceRef:
          args.sourceRef ?? codeDoc.sourceRef ?? existingEntitlement.sourceRef,
        environment,
        grantedAt: existingEntitlement.grantedAt ?? now,
        updatedAt: now,
      })
    }

    if (!sameUserCode) {
      await ctx.db.patch(codeDoc._id, {
        status: 'redeemed',
        redeemedByGlobalUserId: globalUserDocId,
        redeemedEntitlementId: entitlementId,
        redeemedAt: now,
        updatedAt: now,
      })
    }

    const accessEventIdempotencyKey = `communityglows_redeem_event:${globalUser.globalUserId}:${codeNormalized}`
    const existingEvent = await ctx.db
      .query('productAccessEvents')
      .withIndex('by_idempotencyKey', (q) =>
        q.eq('idempotencyKey', accessEventIdempotencyKey)
      )
      .first()

    if (!existingEvent) {
      await ctx.db.insert('productAccessEvents', {
        source: codeDoc.source,
        eventType: 'activation_code.redeemed',
        sourceRef:
          args.sourceRef ?? codeDoc.sourceRef ?? codeDoc.codeNormalized,
        idempotencyKey: accessEventIdempotencyKey,
        environment,
        productId: COMMUNITYGLOWS_PRODUCT_ID,
        globalUserId: globalUserDocId,
        status: 'granted',
        createdAt: now,
      })
    }

    const rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', globalUserDocId)
      )
      .collect()

    return {
      ...resolveCommunityGlowsAccess({
        globalUserId: globalUser.globalUserId,
        entitlements: rawEntitlements,
      }),
      alreadyRedeemed: sameUserCode,
      codeStatus: sameUserCode ? 'already_redeemed' : 'redeemed',
    }
  },
})

export const disableCommunityGlowsActivationCode = mutation({
  args: {
    code: v.string(),
    bridgeSecret: v.string(),
    environment: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const codeNormalized = normalizeActivationCode(args.code)
    if (!codeNormalized) {
      throw new Error('code_required')
    }

    const existing = await ctx.db
      .query('productActivationCodes')
      .withIndex('by_codeNormalized', (q) =>
        q.eq('codeNormalized', codeNormalized)
      )
      .unique()

    if (!existing) {
      throw new Error('code_not_found')
    }

    if (existing.status === 'disabled') {
      return {
        code: codeNormalized,
        status: 'already_disabled',
        updatedAt: existing.updatedAt,
      }
    }

    if (existing.productId !== COMMUNITYGLOWS_PRODUCT_ID) {
      throw new Error('product_not_allowed')
    }

    await ctx.db.patch(existing._id, {
      status: 'disabled',
      updatedAt: Date.now(),
      sourceRef: args.sourceRef ?? existing.sourceRef,
    })

    await upsertCommunityGlowsAccessEvent(ctx, {
      source: COMMUNITYGLOWS_ACCESS_EVENT_SOURCE,
      eventType: 'activation_code.disabled',
      sourceRef: args.sourceRef ?? existing.sourceRef,
      eventIdempotencyKey: buildCommunityGlowsIdempotencyKey(
        'disable_code',
        codeNormalized
      ),
      environment: args.environment ?? 'production',
      globalUserDocId: existing.redeemedByGlobalUserId,
      status: 'disabled',
    })

    return {
      code: codeNormalized,
      status: 'disabled',
      updatedAt: Date.now(),
    }
  },
})

export const manualGrantCommunityGlowsAccess = mutation({
  args: {
    providerAccountId: v.string(),
    plan: v.string(),
    source: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    bridgeSecret: v.string(),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)
    const providerAccountId = args.providerAccountId.trim()
    if (!providerAccountId) {
      throw new Error('provider_account_id_required')
    }

    return runManualGrantCommunityGlowsAccess(ctx, {
      providerAccountId,
      plan: args.plan,
      source: args.source ?? 'manual',
      sourceRef: args.sourceRef,
      environment: args.environment ?? 'production',
    })
  },
})

export const revokeCommunityGlowsAccessByProviderAccount = mutation({
  args: {
    providerAccountId: v.string(),
    reason: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    bridgeSecret: v.string(),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)
    const providerAccountId = args.providerAccountId.trim()
    if (!providerAccountId) {
      throw new Error('provider_account_id_required')
    }

    const environment = args.environment ?? 'production'

    const result = await revokeCommunityGlowsEntitlementsByProviderId(ctx, {
      providerAccountId,
      status: 'revoked',
      sourceRef: args.sourceRef,
      environment,
      reason: args.reason,
    })

    return {
      ...result,
      reason: args.reason ?? 'revoked',
    }
  },
})

export const refundCommunityGlowsAccessByProviderAccount = mutation({
  args: {
    providerAccountId: v.string(),
    reason: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    bridgeSecret: v.string(),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)
    const providerAccountId = args.providerAccountId.trim()
    if (!providerAccountId) {
      throw new Error('provider_account_id_required')
    }

    const environment = args.environment ?? 'production'

    const result = await revokeCommunityGlowsEntitlementsByProviderId(ctx, {
      providerAccountId,
      status: 'refunded',
      sourceRef: args.sourceRef,
      environment,
      reason: args.reason,
    })

    return {
      ...result,
      reason: args.reason ?? 'refunded',
    }
  },
})

export const processCommerceEvent = mutation({
  args: {
    provider: v.string(),
    offerId: v.string(),
    productId: v.string(),
    plan: v.string(),
    eventType: v.union(
      v.literal('paid'),
      v.literal('refunded'),
      v.literal('revoked'),
      v.literal('pending_review')
    ),
    environment: v.string(),
    providerEventId: v.string(),
    providerOrderId: v.string(),
    idempotencyKey: v.string(),
    status: v.union(
      v.literal('applied'),
      v.literal('pending_review'),
      v.literal('ignored')
    ),
    customerEmail: v.optional(v.string()),
    providerCustomerId: v.optional(v.string()),
    globalUserId: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    providerSourceRef: v.optional(v.string()),
    providerInvoiceId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.string())),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const incomingEnvironment = normalizeCommerceEnvironment(args.environment)
    const runtimeEnvironment = resolveRuntimeBridgeEnvironment()
    const sourceRef = buildSuiteCommerceSourceRef({
      sourceRef: args.sourceRef,
      providerOrderId: args.providerOrderId,
      providerSourceRef: args.providerSourceRef,
    })
    const metadataSource = normalizeCommerceMetadataSource(
      args.metadata?.source
    )
    const eventSourceRef = `${args.productId}:${sourceRef}`

    if (args.provider !== 'stripe') {
      await upsertSuiteCommerceAccessEvent(ctx, {
        productId: args.productId,
        environment: incomingEnvironment,
        sourceRef: eventSourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'pending_review',
        eventType: 'suite_commerce.provider_rejected',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: `provider_not_allowed:${args.provider}`,
      })
      return {
        ok: false,
        status: 'pending_review',
        alreadyProcessed: false,
        reason: 'provider_not_allowed',
      }
    }

    if (
      !isAllowedCommerceEnvironment(incomingEnvironment, runtimeEnvironment)
    ) {
      await upsertSuiteCommerceAccessEvent(ctx, {
        productId: args.productId,
        environment: runtimeEnvironment,
        sourceRef: eventSourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'pending_review',
        eventType: 'suite_commerce.environment_mismatch',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: `commerce_environment_mismatch:${incomingEnvironment}`,
      })
      return {
        ok: false,
        status: 'pending_review',
        alreadyProcessed: false,
        reason: 'environment_mismatch',
      }
    }

    if (
      !isSupportedSuiteCommerceOffer(args.offerId, args.productId, args.plan)
    ) {
      await upsertSuiteCommerceAccessEvent(ctx, {
        productId: args.productId,
        environment: incomingEnvironment,
        sourceRef: eventSourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'pending_review',
        eventType: 'suite_commerce.unsupported_offer',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: `unsupported_offer:${args.offerId}`,
      })
      return {
        ok: false,
        status: 'pending_review',
        alreadyProcessed: false,
        reason: 'unsupported_offer',
      }
    }

    if (args.status === 'ignored') {
      await upsertSuiteCommerceAccessEvent(ctx, {
        productId: args.productId,
        environment: incomingEnvironment,
        sourceRef: eventSourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'ignored',
        eventType: 'suite_commerce.ignored',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: 'ignored_webhook_event',
      })
      return {
        ok: true,
        status: 'ignored',
        alreadyProcessed: false,
        reason: 'ignored_webhook_event',
      }
    }

    const existingEvent = await ctx.db
      .query('productAccessEvents')
      .withIndex('by_idempotencyKey', (q) =>
        q.eq('idempotencyKey', args.idempotencyKey)
      )
      .first()
    if (existingEvent) {
      return {
        ok: true,
        status: existingEvent.status,
        alreadyProcessed: true,
        reason: existingEvent.reason ?? 'already_processed',
      }
    }

    const resolvedByProvided = await resolveVerifiedCommerceGlobalUser(ctx, {
      globalUserId: args.globalUserId,
      provider: args.provider,
      providerAccountId: args.providerCustomerId,
      email: args.customerEmail,
      environment: incomingEnvironment,
      sourceRef: eventSourceRef,
    })
    const globalUserDocId =
      resolvedByProvided?.globalUserDocId ??
      (await resolveCommerceIdentityBySourceRef(ctx, eventSourceRef))

    if (args.eventType === 'paid') {
      if (!globalUserDocId) {
        await upsertSuiteCommerceAccessEvent(ctx, {
          productId: args.productId,
          environment: incomingEnvironment,
          sourceRef: eventSourceRef,
          idempotencyKey: args.idempotencyKey,
          status: 'pending_review',
          eventType: 'suite_commerce.pending_review',
          customerEmail: args.customerEmail,
          providerCustomerId: args.providerCustomerId,
          providerEventId: args.providerEventId,
          reason: `missing_global_user:${args.providerCustomerId ?? 'none'}`,
        })
        return {
          ok: false,
          status: 'pending_review',
          alreadyProcessed: false,
          reason: 'missing_global_user',
        }
      }

      await upsertSuiteCommerceEntitlement(ctx, {
        globalUserDocId,
        productId: args.productId,
        plan: args.plan,
        source: metadataSource,
        sourceRef: eventSourceRef,
        environment: incomingEnvironment,
        idempotencyKey: buildSuiteCommerceIdempotencyKey(
          'grant',
          `${args.productId}:${args.providerOrderId}:${metadataSource}`
        ),
      })

      await upsertSuiteCommerceAccessEvent(ctx, {
        productId: args.productId,
        environment: incomingEnvironment,
        sourceRef: eventSourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'granted',
        eventType: `${args.productId}_access.granted`,
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: buildCommerceEventReason('paid'),
        globalUserDocId,
      })

      const snapshot = await buildSuiteCommerceAccessSnapshot(
        ctx,
        globalUserDocId,
        args.productId
      )
      return {
        ok: true,
        status: 'granted',
        alreadyProcessed: false,
        snapshot,
      }
    }

    if (!globalUserDocId) {
      await upsertSuiteCommerceAccessEvent(ctx, {
        productId: args.productId,
        environment: incomingEnvironment,
        sourceRef: eventSourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'pending_review',
        eventType: 'suite_commerce.pending_review',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: 'missing_global_user_for_revoke',
      })
      return {
        ok: false,
        status: 'pending_review',
        alreadyProcessed: false,
        reason: 'missing_global_user',
      }
    }

    const now = Date.now()
    const rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', globalUserDocId)
      )
      .collect()

    const activeEntitlement = rawEntitlements.find(
      (entry) =>
        entry.productId === args.productId &&
        isActiveSuiteEntitlementWithExpiration(entry)
    )

    if (activeEntitlement) {
      await ctx.db.patch(activeEntitlement._id, {
        status: 'revoked',
        source: activeEntitlement.source ?? SUITE_COMMERCE_EVENT_SOURCE,
        sourceRef: eventSourceRef,
        environment: incomingEnvironment,
        updatedAt: now,
      })
    }

    const snapshot = await buildSuiteCommerceAccessSnapshot(
      ctx,
      globalUserDocId,
      args.productId
    )
    await upsertSuiteCommerceAccessEvent(ctx, {
      productId: args.productId,
      environment: incomingEnvironment,
      sourceRef: eventSourceRef,
      idempotencyKey: args.idempotencyKey,
      status: 'revoked',
      eventType:
        args.eventType === 'revoked'
          ? `${args.productId}_access.revoked`
          : `${args.productId}_access.refunded`,
      customerEmail: args.customerEmail,
      providerCustomerId: args.providerCustomerId,
      providerEventId: args.providerEventId,
      reason: buildCommerceEventReason(args.eventType),
      globalUserDocId,
    })

    return {
      ok: true,
      status: 'revoked',
      alreadyProcessed: false,
      reason: buildCommerceEventReason(args.eventType),
      snapshot,
    }
  },
})

export const processCommunityGlowsCommerceEvent = mutation({
  args: {
    provider: v.string(),
    offerId: v.string(),
    productId: v.string(),
    plan: v.string(),
    eventType: v.union(
      v.literal('paid'),
      v.literal('refunded'),
      v.literal('revoked'),
      v.literal('pending_review')
    ),
    environment: v.string(),
    providerEventId: v.string(),
    providerOrderId: v.string(),
    idempotencyKey: v.string(),
    status: v.union(
      v.literal('applied'),
      v.literal('pending_review'),
      v.literal('ignored')
    ),
    customerEmail: v.optional(v.string()),
    providerCustomerId: v.optional(v.string()),
    globalUserId: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    providerSourceRef: v.optional(v.string()),
    providerInvoiceId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.string())),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const incomingEnvironment = normalizeCommerceEnvironment(args.environment)
    const runtimeEnvironment = resolveRuntimeBridgeEnvironment()

    const sourceRef = buildCommunityGlowsCommerceSourceRef({
      sourceRef: args.sourceRef,
      providerOrderId: args.providerOrderId,
      providerSourceRef: args.providerSourceRef,
    })

    const metadataSource = normalizeCommerceMetadataSource(
      args.metadata?.source
    )
    if (args.provider !== 'stripe') {
      await upsertCommunityGlowsCommerceAccessEvent(ctx, {
        environment: incomingEnvironment,
        sourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'pending_review',
        eventType: 'communityglows_commerce.provider_rejected',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: `provider_not_allowed:${args.provider}`,
      })
      return {
        ok: false,
        status: 'pending_review',
        alreadyProcessed: false,
        reason: 'provider_not_allowed',
      }
    }
    if (
      !isAllowedCommerceEnvironment(incomingEnvironment, runtimeEnvironment)
    ) {
      await upsertCommunityGlowsCommerceAccessEvent(ctx, {
        environment: runtimeEnvironment,
        sourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'pending_review',
        eventType: 'communityglows_commerce.environment_mismatch',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: `commerce_environment_mismatch:${incomingEnvironment}`,
      })
      return {
        ok: false,
        status: 'pending_review',
        alreadyProcessed: false,
        reason: 'environment_mismatch',
      }
    }

    if (
      !isSupportedCommunityGlowsCommerceOffer(
        args.offerId,
        args.productId,
        args.plan
      )
    ) {
      await upsertCommunityGlowsCommerceAccessEvent(ctx, {
        environment: incomingEnvironment,
        sourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'pending_review',
        eventType: 'communityglows_commerce.unsupported_offer',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: `unsupported_offer:${args.offerId}`,
      })
      return {
        ok: false,
        status: 'pending_review',
        alreadyProcessed: false,
        reason: 'unsupported_offer',
      }
    }

    if (args.status === 'ignored') {
      await upsertCommunityGlowsCommerceAccessEvent(ctx, {
        environment: incomingEnvironment,
        sourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'ignored',
        eventType: 'communityglows_commerce.ignored',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: 'ignored_webhook_event',
      })
      return {
        ok: true,
        status: 'ignored',
        alreadyProcessed: false,
        reason: 'ignored_webhook_event',
      }
    }

    const existingEvent = await ctx.db
      .query('productAccessEvents')
      .withIndex('by_idempotencyKey', (q) =>
        q.eq('idempotencyKey', args.idempotencyKey)
      )
      .first()
    if (existingEvent) {
      return {
        ok: true,
        status: existingEvent.status,
        alreadyProcessed: true,
        reason: existingEvent.reason ?? 'already_processed',
      }
    }

    const resolvedByProvided = await resolveVerifiedCommunityGlowsGlobalUser(
      ctx,
      {
        globalUserId: args.globalUserId,
        provider: args.provider,
        providerAccountId: args.providerCustomerId,
        email: args.customerEmail,
        environment: incomingEnvironment,
        sourceRef,
      }
    )

    const globalUserDocId =
      resolvedByProvided?.globalUserDocId ??
      (await resolveCommerceIdentityBySourceRef(ctx, sourceRef))

    if (args.eventType === 'paid') {
      if (!globalUserDocId) {
        await upsertCommunityGlowsCommerceAccessEvent(ctx, {
          environment: incomingEnvironment,
          sourceRef,
          idempotencyKey: args.idempotencyKey,
          status: 'pending_review',
          eventType: 'communityglows_commerce.pending_review',
          customerEmail: args.customerEmail,
          providerCustomerId: args.providerCustomerId,
          providerEventId: args.providerEventId,
          reason: `missing_global_user:${args.providerCustomerId ?? 'none'}`,
        })
        return {
          ok: false,
          status: 'pending_review',
          alreadyProcessed: false,
          reason: 'missing_global_user',
        }
      }

      await upsertCommunityGlowsCommerceEntitlement(ctx, {
        globalUserDocId,
        plan: args.plan,
        source: metadataSource,
        sourceRef,
        environment: incomingEnvironment,
        idempotencyKey: buildCommunityGlowsIdempotencyKey(
          'commerce',
          args.providerOrderId,
          metadataSource
        ),
      })

      const accessEventId = buildCommunityGlowsIdempotencyKey(
        'commerce_access',
        args.providerOrderId
      )
      await upsertCommunityGlowsCommerceAccessEvent(ctx, {
        environment: incomingEnvironment,
        sourceRef,
        idempotencyKey: accessEventId,
        status: 'granted',
        eventType: 'communityglows_access.granted',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: buildCommerceEventReason('paid'),
        globalUserDocId,
      })

      const snapshot = await buildCommerceAccessSnapshot(ctx, globalUserDocId)
      return {
        ok: true,
        status: 'granted',
        alreadyProcessed: false,
        snapshot,
      }
    }

    if (!globalUserDocId) {
      await upsertCommunityGlowsCommerceAccessEvent(ctx, {
        environment: incomingEnvironment,
        sourceRef,
        idempotencyKey: args.idempotencyKey,
        status: 'pending_review',
        eventType: 'communityglows_commerce.pending_review',
        customerEmail: args.customerEmail,
        providerCustomerId: args.providerCustomerId,
        providerEventId: args.providerEventId,
        reason: 'missing_global_user_for_revoke',
      })
      return {
        ok: false,
        status: 'pending_review',
        alreadyProcessed: false,
        reason: 'missing_global_user',
      }
    }

    const now = Date.now()
    const rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', globalUserDocId)
      )
      .collect()

    const activeEntitlement = rawEntitlements.find(
      (entry) =>
        entry.productId === COMMUNITYGLOWS_PRODUCT_ID &&
        isActiveSuiteEntitlementWithExpiration(entry)
    )

    if (activeEntitlement) {
      await ctx.db.patch(activeEntitlement._id, {
        status: 'revoked',
        source:
          activeEntitlement.source ?? COMMUNITYGLOWS_COMMERCE_GRANT_SOURCE,
        sourceRef,
        environment: incomingEnvironment,
        updatedAt: now,
      })
    }

    const snapshot = await buildCommerceAccessSnapshot(ctx, globalUserDocId)
    await upsertCommunityGlowsCommerceAccessEvent(ctx, {
      environment: incomingEnvironment,
      sourceRef,
      idempotencyKey: args.idempotencyKey,
      status: 'revoked',
      eventType:
        args.eventType === 'revoked'
          ? 'communityglows_access.revoked'
          : 'communityglows_access.refunded',
      customerEmail: args.customerEmail,
      providerCustomerId: args.providerCustomerId,
      providerEventId: args.providerEventId,
      reason: buildCommerceEventReason(args.eventType),
      globalUserDocId,
    })

    return {
      ok: true,
      status: 'revoked',
      alreadyProcessed: false,
      reason: buildCommerceEventReason(args.eventType),
      snapshot,
    }
  },
})
