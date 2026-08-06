import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

export const COMMANDGLOWS_APP_PRODUCT_ID = 'commandglows_app'
export const COMMANDGLOWS_FORMATION_PRODUCT_ID = 'commandglows_formation'
export const GOCHARBON_PRODUCT_ID = 'gocharbon'
export const CONTENTGLOWZ_PRODUCT_ID = 'contentglowz'
export const SHIPGLOWS_PRODUCT_ID = 'shipglows'
export const LEGACY_SHIPGLOWZ_PRODUCT_ID = 'shipglowz'
export const REPLAYGLOWZ_PRODUCT_ID = 'replayglowz'
export const COMMUNITYGLOWS_PRODUCT_ID = 'communityglows'
export const TEMU_SHOPPING_LISTS_PRODUCT_ID = 'temu_shopping_lists'

export const SUITE_PRODUCT_IDS = [
  COMMANDGLOWS_APP_PRODUCT_ID,
  COMMANDGLOWS_FORMATION_PRODUCT_ID,
  GOCHARBON_PRODUCT_ID,
  CONTENTGLOWZ_PRODUCT_ID,
  SHIPGLOWS_PRODUCT_ID,
  REPLAYGLOWZ_PRODUCT_ID,
  COMMUNITYGLOWS_PRODUCT_ID,
  TEMU_SHOPPING_LISTS_PRODUCT_ID,
] as const

export const DEFAULT_FREE_ENTITLEMENT_POLICIES = [
  {
    productId: COMMANDGLOWS_FORMATION_PRODUCT_ID,
    plan: 'free',
    source: 'product_default',
  },
  {
    productId: GOCHARBON_PRODUCT_ID,
    plan: 'free',
    source: 'product_default',
  },
  {
    productId: CONTENTGLOWZ_PRODUCT_ID,
    plan: 'free',
    source: 'product_default',
  },
  {
    productId: SHIPGLOWS_PRODUCT_ID,
    plan: 'free',
    source: 'product_default',
  },
  {
    productId: REPLAYGLOWZ_PRODUCT_ID,
    plan: 'free',
    source: 'product_default',
  },
  {
    productId: COMMUNITYGLOWS_PRODUCT_ID,
    plan: 'free',
    source: 'product_default',
  },
  {
    productId: TEMU_SHOPPING_LISTS_PRODUCT_ID,
    plan: 'free',
    source: 'product_default',
  },
] as const

export const COMMANDGLOWS_TRIAL_PRODUCT_ID = COMMANDGLOWS_APP_PRODUCT_ID
export const COMMANDGLOWS_TRIAL_PLAN = 'free'
export const COMMANDGLOWS_TRIAL_SOURCE = 'product_trial'
export const COMMANDGLOWS_TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000
export const COMMANDGLOWS_TRIAL_MAX_RESTARTS = 2
export const COMMANDGLOWS_TRIAL_MAX_CYCLES = COMMANDGLOWS_TRIAL_MAX_RESTARTS + 1

export const DEFAULT_FREE_PRODUCT_IDS = DEFAULT_FREE_ENTITLEMENT_POLICIES.map(
  (policy) => policy.productId
)

const SUITE_PRODUCT_ALLOWLIST = new Set<string>(SUITE_PRODUCT_IDS)
const ACTIVE_ENTITLEMENT_STATUSES = new Set(['active', 'trialing'])

type RawEntitlement = {
  productId: string
  status: string
  plan?: string
  source?: string | null
  expiresAt?: number | null
  trialExpiresAt?: number | null
}

function isExpiredTrialEntitlement(entry: RawEntitlement, now: number) {
  return (
    entry.status === 'trialing' &&
    (typeof entry.expiresAt === 'number'
      ? entry.expiresAt <= now
      : typeof entry.trialExpiresAt === 'number'
        ? entry.trialExpiresAt <= now
        : true)
  )
}

export function isActiveSuiteEntitlement(
  entry: RawEntitlement,
  now: number = Date.now()
) {
  if (entry.status === 'trialing') {
    return !isExpiredTrialEntitlement(entry, now)
  }

  return ACTIVE_ENTITLEMENT_STATUSES.has(entry.status)
}

export function normalizeSuiteProductId(productId: string): string {
  return productId === LEGACY_SHIPGLOWZ_PRODUCT_ID
    ? SHIPGLOWS_PRODUCT_ID
    : productId
}

export function isAllowedSuiteProduct(productId: string): boolean {
  return SUITE_PRODUCT_ALLOWLIST.has(normalizeSuiteProductId(productId))
}

export function isActiveAccessStatus(status: string): boolean {
  return ACTIVE_ENTITLEMENT_STATUSES.has(status)
}

export function selectPreferredActiveProductEntitlement<T extends RawEntitlement>(
  entitlements: T[],
  productId: string,
  now: number = Date.now()
): T | undefined {
  const activeEntitlements = entitlements.filter(
    (entry) =>
      normalizeSuiteProductId(entry.productId) === normalizeSuiteProductId(productId) &&
      isActiveSuiteEntitlement(entry, now)
  )
  return (
    activeEntitlements.find((entry) => entry.plan !== 'free') ??
    activeEntitlements[0]
  )
}

function getDefaultFreeEntitlementPolicy(productId: string) {
  const canonicalProductId = normalizeSuiteProductId(productId)
  return (
    DEFAULT_FREE_ENTITLEMENT_POLICIES.find(
      (policy) => policy.productId === canonicalProductId
    ) ?? null
  )
}

function defaultFreeIdempotencyKey(productId: string, globalUserId: string) {
  const policy = getDefaultFreeEntitlementPolicy(productId)
  if (!policy) {
    throw new Error('default_free_product_not_supported')
  }
  return `${policy.source}:${productId}:${globalUserId}`
}

export async function ensureDefaultFreeEntitlement(
  ctx: MutationCtx,
  args: {
    productId: string
    globalUserDocId: Id<'globalUsers'>
    globalUserPublicId: string
    sourceRef: string
    environment: string
    now: number
  }
) {
  const policy = getDefaultFreeEntitlementPolicy(args.productId)
  if (!policy) {
    throw new Error('default_free_product_not_supported')
  }

  const idempotencyKey = defaultFreeIdempotencyKey(
    policy.productId,
    args.globalUserPublicId
  )
  const existingDefaultEntitlement = await ctx.db
    .query('productEntitlements')
    .withIndex('by_idempotencyKey', (q) =>
      q.eq('idempotencyKey', idempotencyKey)
    )
    .first()

  const legacyIdempotencyKey =
    policy.productId === SHIPGLOWS_PRODUCT_ID
      ? `${policy.source}:${LEGACY_SHIPGLOWZ_PRODUCT_ID}:${args.globalUserPublicId}`
      : null
  const existingLegacyEntitlement = legacyIdempotencyKey
    ? await ctx.db
        .query('productEntitlements')
        .withIndex('by_idempotencyKey', (q) =>
          q.eq('idempotencyKey', legacyIdempotencyKey)
        )
        .first()
    : null
  const entitlementToReuse = existingDefaultEntitlement ?? existingLegacyEntitlement

  if (entitlementToReuse) {
    if (
      entitlementToReuse.productId !== policy.productId ||
      entitlementToReuse.status !== 'active' ||
      entitlementToReuse.plan !== policy.plan ||
      entitlementToReuse.source !== policy.source ||
      entitlementToReuse.idempotencyKey !== idempotencyKey
    ) {
      await ctx.db.patch(entitlementToReuse._id, {
        productId: policy.productId,
        plan: policy.plan,
        status: 'active',
        source: policy.source,
        sourceRef: args.sourceRef,
        environment: args.environment,
        idempotencyKey,
        grantedAt: entitlementToReuse.grantedAt ?? args.now,
        updatedAt: args.now,
      })
    }
  } else {
    await ctx.db.insert('productEntitlements', {
      globalUserId: args.globalUserDocId,
      productId: policy.productId,
      plan: policy.plan,
      status: 'active',
      source: policy.source,
      sourceRef: args.sourceRef,
      environment: args.environment,
      idempotencyKey,
      grantedAt: args.now,
      createdAt: args.now,
      updatedAt: args.now,
    })
  }

  const existingGrantEvent = await ctx.db
    .query('productAccessEvents')
    .withIndex('by_idempotencyKey', (q) =>
      q.eq('idempotencyKey', idempotencyKey)
    )
    .first()
  if (!existingGrantEvent) {
    await ctx.db.insert('productAccessEvents', {
      source: policy.source,
      eventType: 'default_free.granted',
      sourceRef: args.sourceRef,
      idempotencyKey,
      environment: args.environment,
      productId: policy.productId,
      globalUserId: args.globalUserDocId,
      status: 'granted',
      createdAt: args.now,
    })
  }
}

export async function ensureMissingDefaultFreeEntitlements(
  ctx: MutationCtx,
  args: {
    rawEntitlements: RawEntitlement[]
    productIds: readonly string[]
    globalUserDocId: Id<'globalUsers'>
    globalUserPublicId: string
    sourceRef: string
    environment: string
    now: number
  }
) {
  let didWrite = false
  for (const productId of args.productIds) {
    if (selectPreferredActiveProductEntitlement(args.rawEntitlements, productId)) {
      continue
    }

    await ensureDefaultFreeEntitlement(ctx, {
      productId,
      globalUserDocId: args.globalUserDocId,
      globalUserPublicId: args.globalUserPublicId,
      sourceRef: args.sourceRef,
      environment: args.environment,
      now: args.now,
    })
    didWrite = true
  }
  return didWrite
}
