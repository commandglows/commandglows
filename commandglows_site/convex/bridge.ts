import { mutation, query } from './_generated/server'
import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import {
  DEFAULT_FREE_ENTITLEMENT_POLICIES,
  REPLAYGLOWZ_PRODUCT_ID,
  COMMUNITYGLOWS_PRODUCT_ID,
  TEMU_SHOPPING_LISTS_PRODUCT_ID,
  COMMANDGLOWS_APP_PRODUCT_ID,
  COMMANDGLOWS_TRIAL_MAX_CYCLES,
  COMMANDGLOWS_TRIAL_SOURCE,
  COMMANDGLOWS_TRIAL_PLAN,
  ensureDefaultFreeEntitlement,
  ensureMissingDefaultFreeEntitlements,
  COMMANDGLOWS_TRIAL_DURATION_MS,
  isActiveSuiteEntitlement,
  isAllowedSuiteProduct,
  selectPreferredActiveProductEntitlement,
} from './defaultFreeEntitlements'

const COMMUNITYGLOWS_PROVIDER = 'communityglows_convex'
const COMMUNITYGLOWS_BRIDGE_SOURCE = 'communityglows_bridge_api'
const COMMUNITYGLOWS_PLAN_ALLOWLIST = new Set(['free', 'lifetime_deal', 'founder_ltd', 'ltd'])
const COMMUNITYGLOWS_SOURCE_ALLOWLIST = new Set([
  'product_default',
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
const COMMUNITYGLOWS_TRIAL_SOURCE = 'product_trial'
const COMMUNITYGLOWS_TRIAL_PLAN = 'free'
const COMMUNITYGLOWS_TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000
const COMMUNITYGLOWS_TRIAL_IDEMPOTENCY_PREFIX = 'communityglows_product_trial'
const SUITE_COMMERCE_EVENT_SOURCE = 'suite_commerce'
const SUITE_COMMERCE_EVENT_SOURCE_PREFIX = 'suite:commerce'
const COMMANDGLOWS_TRIAL_IDEMPOTENCY_PREFIX = 'commandglows_app_trial'
const COMMANDGLOWS_APP_PLAN_ALLOWLIST = new Set([
  'free',
  'focus',
  'power',
  'control',
  'command',
  'lifetime_deal',
])
const COMMANDGLOWS_APP_OFFER_PLAN_BY_ID = new Map([
  ['commandglows_app/focus', 'focus'],
  ['commandglows_app/power', 'power'],
  ['commandglows_app/control', 'control'],
  ['commandglows_app/command', 'command'],
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

function isTrialEntitlementActive(entry: { status: string; trialExpiresAt?: number | null }) {
  return entry.status === 'trialing'
    ? typeof entry.trialExpiresAt === 'number' && entry.trialExpiresAt > Date.now()
    : false
}

function isActiveSuiteEntitlementWithExpiration(entry: SuiteEntitlementLike) {
  return isActiveSuiteEntitlement(
    {
      ...entry,
      productId: entry.productId,
      expiresAt:
        typeof entry.expiresAt === 'number'
          ? entry.expiresAt
          : entry.trialExpiresAt,
    },
    Date.now()
  )
}

function nowMs() {
  return Date.now()
}

function buildCommandGlowsTrialIdempotencyKey(globalUserPublicId: string, attempt: number) {
  return `${COMMANDGLOWS_TRIAL_IDEMPOTENCY_PREFIX}:${globalUserPublicId}:${attempt}`
}

function countCommandGlowsTrials(entitlements: SuiteEntitlementLike[]) {
  return entitlements.filter(
    (entry) =>
      entry.productId === COMMANDGLOWS_APP_PRODUCT_ID &&
      entry.source === COMMANDGLOWS_TRIAL_SOURCE
  ).length
}

function hasActiveCommandGlowsPaidEntitlement(
  entitlements: SuiteEntitlementLike[],
  now = nowMs()
) {
  return entitlements.some(
    (entry) =>
      entry.productId === COMMANDGLOWS_APP_PRODUCT_ID &&
      isActiveSuiteEntitlementWithExpiration(entry) &&
      entry.status === 'active'
  )
}

async function maybeStartCommandGlowsTrialEntitlement(
  ctx: MutationCtx,
  args: {
    globalUserDocId: Id<'globalUsers'>
    globalUserPublicId: string
    sourceRef: string
    environment: string
    now: number
    forceRestart: boolean
    entitlements: SuiteEntitlementLike[]
  }
) {
  if (hasActiveCommandGlowsPaidEntitlement(args.entitlements, args.now)) {
    return false
  }

  const activeTrial = args.entitlements.find(
    (entry) =>
      entry.productId === COMMANDGLOWS_APP_PRODUCT_ID &&
      isTrialEntitlementActive(entry)
  )
  if (activeTrial) {
    return true
  }

  const trialCount = countCommandGlowsTrials(args.entitlements)
  const maxAttemptsReached = trialCount >= COMMANDGLOWS_TRIAL_MAX_CYCLES
  if (maxAttemptsReached && !args.forceRestart) {
    return false
  }

  if (!args.forceRestart && trialCount > 0) {
    return false
  }

  if (maxAttemptsReached && args.forceRestart) {
    return false
  }

  const nextTrialAttempt = trialCount + 1
  const expiry = args.now + COMMANDGLOWS_TRIAL_DURATION_MS
  const trialIdempotencyKey = buildCommandGlowsTrialIdempotencyKey(
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
    await ctx.db.patch(existing._id, {
      status: 'trialing',
      source: COMMANDGLOWS_TRIAL_SOURCE,
      sourceRef: args.sourceRef,
      plan: COMMANDGLOWS_TRIAL_PLAN,
      environment: args.environment,
      trialStartedAt: args.now,
      trialExpiresAt: expiry,
      trialAttempt: nextTrialAttempt,
      grantedAt: existing.grantedAt ?? args.now,
      updatedAt: args.now,
    })
    return true
  }

  await ctx.db.insert('productEntitlements', {
    globalUserId: args.globalUserDocId,
    productId: COMMANDGLOWS_APP_PRODUCT_ID,
    plan: COMMANDGLOWS_TRIAL_PLAN,
    status: 'trialing',
    source: COMMANDGLOWS_TRIAL_SOURCE,
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

  return true
}

function normalizeBridgeEnvironment(value: unknown): string {
  if (value === 'development' || value === 'test' || value === 'production') {
    return value
  }

  if (value === 'preview' || value === 'staging') {
    return 'production'
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
    process.env.VERCEL_ENV || process.env.NODE_ENV
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

function buildCommunityGlowsCommerceEventIdempotency(eventType: string, eventKey: string) {
  const normalizedType = eventType === 'revoked' ? 'revoked' : eventType
  return `${COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE_PREFIX}:${normalizedType}:${eventKey}`
}

function normalizeCommerceEnvironment(rawEnvironment: string | undefined): string {
  if (rawEnvironment === 'development' || rawEnvironment === 'test' || rawEnvironment === 'sandbox') {
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
        q.eq('source', COMMUNITYGLOWS_COMMERCE_EVENT_SOURCE).eq('sourceRef', sourceRef)
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
    .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', args.idempotencyKey))
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
    .withIndex('by_globalUserId', (q) => q.eq('globalUserId', args.globalUserDocId))
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
    ...(params.globalUserDocId ? { globalUserDocId: params.globalUserDocId } : {}),
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

function isSupportedCommerceStatus(status: string): status is 'paid' | 'refunded' | 'revoked' | 'pending_review' {
  return (
    status === 'paid' ||
    status === 'refunded' ||
    status === 'revoked' ||
    status === 'pending_review'
  )
}

function isHigherPriorityStatus(
  incoming: string,
  existing: string
) {
  const incomingPriority = COMMUNITYGLOWS_COMMERCE_STATUS_PRIORITY[incoming] ?? 0
  const existingPriority = COMMUNITYGLOWS_COMMERCE_STATUS_PRIORITY[existing] ?? 0
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
  entitlements: { productId: string; status: string }[]
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

  const canonical = args.entitlements.find(
    (entry) =>
      entry.productId === REPLAYGLOWZ_PRODUCT_ID &&
      isActiveAccessStatus(entry.status)
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
    hasAccess: true,
    globalUserId: args.globalUserId,
    matchedProductId: REPLAYGLOWZ_PRODUCT_ID,
    reasonCode: 'default_free_entitlement',
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
    .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', params.idempotencyKey))
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
    ...(params.globalUserDocId
      ? { globalUserId: params.globalUserDocId }
      : {}),
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
  if (productId !== COMMANDGLOWS_APP_PRODUCT_ID) {
    return false
  }
  return COMMANDGLOWS_APP_OFFER_PLAN_BY_ID.get(offerId) === plan
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
    .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', args.idempotencyKey))
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
    reasonCode: entitlement ? 'active_entitlement' : 'missing_product_entitlement',
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
    ...(params.globalUserDocId ? { globalUserDocId: params.globalUserDocId } : {}),
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
      q
        .eq('provider', provider)
        .eq('providerAccountId', args.providerAccountId)
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

async function revokeCommunityGlowsEntitlementsByProviderId(ctx: MutationCtx, args: {
  providerAccountId: string
  status: string
  sourceRef?: string
  environment: string
  reason?: string
}) {
  const { globalUserDocId, globalUser } = await getOrCreateCommunityGlowsIdentity(ctx, {
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

async function runManualGrantCommunityGlowsAccess(ctx: MutationCtx, args: {
  providerAccountId: string
  plan: string
  source: string
  sourceRef?: string
  environment: string
}) {
  if (!isAllowedCommunityGlowsPlan(args.plan)) {
    throw new Error('plan_not_allowed')
  }

  if (!isAllowedCommunityGlowsSource(args.source)) {
    throw new Error('source_not_allowed')
  }

  const { globalUserDocId, globalUser } = await getOrCreateCommunityGlowsIdentity(ctx, {
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
    .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', idempotencyKey))
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
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
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
    trialStartedAt?: number
    trialExpiresAt?: number
  }[]
  now?: number
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
  const activeTrial = activeEntitlements.find((entry) => entry.status === 'trialing')
  const expiredTrial = args.entitlements.find(
    (entry) =>
      entry.productId === COMMUNITYGLOWS_PRODUCT_ID &&
      entry.status === 'trialing' &&
      typeof entry.trialExpiresAt === 'number' &&
      entry.trialExpiresAt <= now
  )
  const defaultActiveEntitlement = activeEntitlements.find(
    (entry) => entry.status === 'active'
  )
  const entitlement = paidEntitlement ?? activeTrial ?? defaultActiveEntitlement

  if (!entitlement) {
    if (expiredTrial) {
      return {
        hasAccess: false,
        accessState: 'trial_expired' as const,
        globalUserId: args.globalUserId,
        planId: expiredTrial.plan,
        source: expiredTrial.source,
        trialStartedAt: expiredTrial.trialStartedAt ?? null,
        trialEndsAt: expiredTrial.trialExpiresAt ?? null,
        trialExpiresAt: expiredTrial.trialExpiresAt ?? null,
        reasonCode: 'trial_expired' as const,
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
      reasonCode: 'missing_product_entitlement' as const,
    }
  }

  const isTrial = entitlement.status === 'trialing'
  return {
    hasAccess: true,
    accessState: isTrial ? ('trial_active' as const) : ('lifetime_active' as const),
    globalUserId: args.globalUserId,
    planId: entitlement.plan,
    source: entitlement.source,
    trialStartedAt: isTrial ? (entitlement.trialStartedAt ?? null) : null,
    trialEndsAt: isTrial ? (entitlement.trialExpiresAt ?? null) : null,
    trialExpiresAt: isTrial ? (entitlement.trialExpiresAt ?? null) : null,
    reasonCode: 'active_entitlement' as const,
  }
}

async function ensureCommunityGlowsTrialEntitlement(
  ctx: MutationCtx,
  args: {
    globalUserDocId: Id<'globalUsers'>
    globalUserPublicId: string
    sourceRef: string
    environment: string
    now: number
    entitlements: SuiteEntitlementLike[]
  }
) {
  const hasPaidAccess = args.entitlements.some(
    (entry) =>
      entry.productId === COMMUNITYGLOWS_PRODUCT_ID &&
      entry.status === 'active' &&
      entry.source !== 'product_default' &&
      entry.source !== COMMUNITYGLOWS_TRIAL_SOURCE
  )
  if (hasPaidAccess) return false

  const idempotencyKey = `${COMMUNITYGLOWS_TRIAL_IDEMPOTENCY_PREFIX}:${args.globalUserPublicId}`
  const existing = await ctx.db
    .query('productEntitlements')
    .withIndex('by_idempotencyKey', (q) =>
      q.eq('idempotencyKey', idempotencyKey)
    )
    .first()
  if (existing) return false

  const trialExpiresAt = args.now + COMMUNITYGLOWS_TRIAL_DURATION_MS
  await ctx.db.insert('productEntitlements', {
    globalUserId: args.globalUserDocId,
    productId: COMMUNITYGLOWS_PRODUCT_ID,
    plan: COMMUNITYGLOWS_TRIAL_PLAN,
    status: 'trialing',
    source: COMMUNITYGLOWS_TRIAL_SOURCE,
    sourceRef: args.sourceRef,
    environment: args.environment,
    idempotencyKey,
    trialStartedAt: args.now,
    trialExpiresAt,
    trialAttempt: 1,
    grantedAt: args.now,
    createdAt: args.now,
    updatedAt: args.now,
  })

  await ctx.db.insert('productAccessEvents', {
    source: COMMUNITYGLOWS_TRIAL_SOURCE,
    eventType: 'communityglows_trial.started',
    sourceRef: args.sourceRef,
    idempotencyKey,
    environment: args.environment,
    productId: COMMUNITYGLOWS_PRODUCT_ID,
    globalUserId: args.globalUserDocId,
    status: 'granted',
    createdAt: args.now,
  })
  return true
}

function resolveTemuShoppingListsAccess(args: {
  globalUserId: string
  entitlements: { productId: string; status: string; plan: string; source: string }[]
}) {
  const entitlement = selectPreferredActiveProductEntitlement(
    args.entitlements,
    TEMU_SHOPPING_LISTS_PRODUCT_ID
  )

  if (!entitlement) {
    return {
      hasAccess: false,
      globalUserId: args.globalUserId,
      planId: null,
      source: null,
      reasonCode: 'missing_product_entitlement' as const,
    }
  }

  return {
    hasAccess: true,
    globalUserId: args.globalUserId,
    planId: entitlement.plan,
    source: entitlement.source,
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

    const didEnsureDefaultFreeEntitlements =
      await ensureMissingDefaultFreeEntitlements(ctx, {
        rawEntitlements,
        productIds: DEFAULT_FREE_ENTITLEMENT_POLICIES.map(
          (policy) => policy.productId
        ),
        globalUserDocId: identity.globalUserId,
        globalUserPublicId: globalUser.globalUserId,
        sourceRef: args.firebaseUid,
        environment,
        now,
      })

    if (didEnsureDefaultFreeEntitlements) {
      rawEntitlements = await ctx.db
        .query('productEntitlements')
        .withIndex('by_globalUserId', (q) =>
          q.eq('globalUserId', identity.globalUserId)
        )
        .collect()
    }

    await maybeStartCommandGlowsTrialEntitlement(ctx, {
      globalUserDocId: identity.globalUserId,
      globalUserPublicId: globalUser.globalUserId,
      sourceRef: args.sourceRef ?? args.firebaseUid,
      environment,
      now,
      forceRestart: false,
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

    rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', identity.globalUserId)
      )
      .collect()

    const entitlements = rawEntitlements
      .filter((entry) => isAllowedSuiteProduct(entry.productId))
      .filter((entry) => isActiveSuiteEntitlementWithExpiration(entry))
      .map((entry) => ({
        productId: entry.productId,
        status: entry.status,
        plan: entry.plan,
        source: entry.source,
        sourceRef: entry.sourceRef,
        trialStartedAt: entry.trialStartedAt,
        trialExpiresAt: entry.trialExpiresAt,
      }))

    const replayGlowzProductUserId =
      (await getClerkIdentityAccountIdForGlobalUser(ctx, globalUserDocId)) ?? null

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
      replayGlowzProductUserIdSource:
        replayGlowzProductUserId ? ('clerk' as const) : null,
      entitlements,
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
      .filter((entry) => isActiveSuiteEntitlementWithExpiration(entry))
      .map((entry) => ({
        productId: entry.productId,
        status: entry.status,
        plan: entry.plan,
        source: entry.source,
        sourceRef: entry.sourceRef,
        trialStartedAt: entry.trialStartedAt,
        trialExpiresAt: entry.trialExpiresAt,
      }))

    return {
      status: 'ok' as const,
      globalUserId: globalUser.globalUserId,
      firebaseUids,
      entitlements,
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
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', args.globalUserId))
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
    const trialCount = countCommandGlowsTrials(
      rawEntitlements.map((entry) => ({
        productId: entry.productId,
        status: entry.status,
        source: entry.source,
        trialAttempt: entry.trialAttempt,
        trialStartedAt: entry.trialStartedAt,
        trialExpiresAt: entry.trialExpiresAt,
      }))
    )

    const didStartTrial = await maybeStartCommandGlowsTrialEntitlement(ctx, {
      globalUserDocId: globalUser._id,
      globalUserPublicId: globalUser.globalUserId,
      sourceRef: args.sourceRef ?? globalUser.globalUserId,
      environment,
      now,
      forceRestart: args.forceRestart ?? true,
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
      canRetry: (didStartTrial ? trialCount + 1 : trialCount) < COMMANDGLOWS_TRIAL_MAX_CYCLES,
    }
  },
})

export const backfillDefaultFreeEntitlements = mutation({
  args: {
    bridgeSecret: v.string(),
    environment: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const now = Date.now()
    const environment = args.environment ?? 'production'
    const result = await ctx.db
      .query('globalUsers')
      .order('asc')
      .paginate(args.paginationOpts)

    let updatedUsers = 0
    for (const globalUser of result.page) {
      const rawEntitlements = await ctx.db
        .query('productEntitlements')
        .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUser._id))
        .collect()

      const didEnsureDefaultFreeEntitlements =
        await ensureMissingDefaultFreeEntitlements(ctx, {
          rawEntitlements,
          productIds: DEFAULT_FREE_ENTITLEMENT_POLICIES.map(
            (policy) => policy.productId
          ),
          globalUserDocId: globalUser._id,
          globalUserPublicId: globalUser.globalUserId,
          sourceRef: `backfill:${globalUser.globalUserId}`,
          environment,
          now,
        })

      if (didEnsureDefaultFreeEntitlements) {
        updatedUsers += 1
      }
    }

    return {
      status: 'ok' as const,
      scannedUsers: result.page.length,
      updatedUsers,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
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

    const currentSnapshot = resolveReplayGlowzAccess({
      globalUserId: globalUser.globalUserId,
      entitlements: rawEntitlements,
      accountExists: true,
    })
    if (currentSnapshot.reasonCode !== 'default_free_entitlement') {
      return currentSnapshot
    }

    const now = Date.now()
    const environment = args.environment ?? 'production'
    await ensureDefaultFreeEntitlement(ctx, {
      productId: REPLAYGLOWZ_PRODUCT_ID,
      globalUserDocId,
      globalUserPublicId: globalUser.globalUserId,
      sourceRef: args.clerkId,
      environment,
      now,
    })

    return {
      hasAccess: true,
      globalUserId: globalUser.globalUserId,
      matchedProductId: REPLAYGLOWZ_PRODUCT_ID,
      reasonCode: 'default_free_entitlement',
    }
  },
})

export const ensureCommunityGlowsEntitlementSnapshotByProviderAccount = mutation({
  args: {
    providerAccountId: v.string(),
    email: v.optional(v.string()),
    environment: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const environment = args.environment ?? 'production'
    const providerAccountId = args.providerAccountId.trim()
    if (!providerAccountId) {
      throw new Error('provider_account_id_required')
    }

    const { globalUser, globalUserDocId } = await getOrCreateCommunityGlowsIdentity(
      ctx,
      {
        providerAccountId,
        email: args.email,
        environment,
        sourceRef: args.sourceRef,
      }
    )

    let rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
      .collect()

    const now = Date.now()
    const didEnsureTrialEntitlement = await ensureCommunityGlowsTrialEntitlement(
      ctx,
      {
        entitlements: rawEntitlements,
        globalUserDocId,
        globalUserPublicId: globalUser.globalUserId,
        sourceRef: args.sourceRef ?? providerAccountId,
        environment,
        now,
      }
    )

    if (didEnsureTrialEntitlement) {
      rawEntitlements = await ctx.db
        .query('productEntitlements')
        .withIndex('by_globalUserId', (q) =>
          q.eq('globalUserId', globalUserDocId)
        )
        .collect()
    }

    return resolveCommunityGlowsAccess({
      globalUserId: globalUser.globalUserId,
      entitlements: rawEntitlements,
      now,
    })
  },
})

export const ensureTemuShoppingListsEntitlementSnapshotByProviderAccount = mutation({
  args: {
    providerAccountId: v.string(),
    email: v.optional(v.string()),
    environment: v.optional(v.string()),
    sourceRef: v.optional(v.string()),
    bridgeSecret: v.string(),
  },
  handler: async (ctx, args) => {
    requireBridgeSecret(args.bridgeSecret)

    const environment = args.environment ?? 'production'
    const providerAccountId = args.providerAccountId.trim()
    if (!providerAccountId) {
      throw new Error('provider_account_id_required')
    }

    const { globalUser, globalUserDocId } = await getOrCreateCommunityGlowsIdentity(
      ctx,
      {
        provider: TEMU_SHOPPING_LISTS_PROVIDER,
        providerAccountId,
        email: args.email,
        environment,
        sourceRef: args.sourceRef,
        source: TEMU_SHOPPING_LISTS_BRIDGE_SOURCE,
      }
    )

    let rawEntitlements = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
      .collect()

    const didEnsureDefaultFreeEntitlement =
      await ensureMissingDefaultFreeEntitlements(ctx, {
        rawEntitlements,
        productIds: [TEMU_SHOPPING_LISTS_PRODUCT_ID],
        globalUserDocId,
        globalUserPublicId: globalUser.globalUserId,
        sourceRef: args.sourceRef ?? providerAccountId,
        environment,
        now: Date.now(),
      })

    if (didEnsureDefaultFreeEntitlement) {
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
      .withIndex('by_codeNormalized', (q) => q.eq('codeNormalized', codeNormalized))
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
    const { globalUser, globalUserDocId } = await getOrCreateCommunityGlowsIdentity(
      ctx,
      {
        providerAccountId,
        email: args.email,
        environment,
        sourceRef: args.sourceRef,
      }
    )

    const codeDoc = await ctx.db
      .query('productActivationCodes')
      .withIndex('by_codeNormalized', (q) => q.eq('codeNormalized', codeNormalized))
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
      codeDoc.status === 'redeemed' && codeDoc.redeemedByGlobalUserId === globalUserDocId
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
        sourceRef: args.sourceRef ?? codeDoc.sourceRef ?? codeDoc.codeNormalized,
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
        sourceRef: args.sourceRef ?? codeDoc.sourceRef ?? existingEntitlement.sourceRef,
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
        sourceRef: args.sourceRef ?? codeDoc.sourceRef ?? codeDoc.codeNormalized,
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
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
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
    status: v.union(v.literal('applied'), v.literal('pending_review'), v.literal('ignored')),
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
    const metadataSource = normalizeCommerceMetadataSource(args.metadata?.source)
    const eventSourceRef = `${args.productId}:${sourceRef}`

    if (!isAllowedCommerceEnvironment(incomingEnvironment, runtimeEnvironment)) {
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

    if (!isSupportedSuiteCommerceOffer(args.offerId, args.productId, args.plan)) {
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
      .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', args.idempotencyKey))
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
      resolvedByProvided?.globalUserDocId ?? (await resolveCommerceIdentityBySourceRef(ctx, eventSourceRef))

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
        idempotencyKey: buildSuiteCommerceIdempotencyKey(
          'access',
          `${args.productId}:${args.providerOrderId}`
        ),
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
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
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
    status: v.union(v.literal('applied'), v.literal('pending_review'), v.literal('ignored')),
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

    const metadataSource = normalizeCommerceMetadataSource(args.metadata?.source)
    if (!isAllowedCommerceEnvironment(incomingEnvironment, runtimeEnvironment)) {
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

    if (!isSupportedCommunityGlowsCommerceOffer(args.offerId, args.productId, args.plan)) {
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
      .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', args.idempotencyKey))
      .first()
    if (existingEvent) {
      return {
        ok: true,
        status: existingEvent.status,
        alreadyProcessed: true,
        reason: existingEvent.reason ?? 'already_processed',
      }
    }

    const resolvedByProvided = await resolveVerifiedCommunityGlowsGlobalUser(ctx, {
      globalUserId: args.globalUserId,
      provider: args.provider,
      providerAccountId: args.providerCustomerId,
      email: args.customerEmail,
      environment: incomingEnvironment,
      sourceRef,
    })

    const globalUserDocId =
      resolvedByProvided?.globalUserDocId ?? (await resolveCommerceIdentityBySourceRef(ctx, sourceRef))

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
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserDocId))
      .collect()

    const activeEntitlement = rawEntitlements.find(
      (entry) =>
        entry.productId === COMMUNITYGLOWS_PRODUCT_ID &&
        isActiveSuiteEntitlementWithExpiration(entry)
    )

    if (activeEntitlement) {
      await ctx.db.patch(activeEntitlement._id, {
        status: 'revoked',
        source: activeEntitlement.source ?? COMMUNITYGLOWS_COMMERCE_GRANT_SOURCE,
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
