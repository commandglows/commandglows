import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { v } from 'convex/values'
import {
  COMMANDGLOWS_APP_PRODUCT_ID,
  COMMANDGLOWS_FORMATION_PRODUCT_ID,
  COMMUNITYGLOWS_PRODUCT_ID,
  SUITE_PRODUCT_IDS,
  isActiveSuiteEntitlement,
  normalizeSuiteProductId,
} from './productEntitlementPolicies'

const SEARCH_RESULT_LIMIT = 20
const PROVIDER_REFERENCE_SCAN_LIMIT = 200
const EVENT_RESULT_LIMIT = 50
const SEARCH_MAX_LENGTH = 160
const REASON_MAX_LENGTH = 500
const SUPPORT_SOURCE = 'license_support'

const SUPPORT_PLAN_ALLOWLIST = new Map<string, ReadonlySet<string>>([
  [
    COMMANDGLOWS_APP_PRODUCT_ID,
    new Set(['focus', 'power', 'control', 'command', 'lifetime_deal']),
  ],
  [COMMANDGLOWS_FORMATION_PRODUCT_ID, new Set(['formation'])],
  [COMMUNITYGLOWS_PRODUCT_ID, new Set(['lifetime_deal', 'founder_ltd', 'ltd'])],
  ['gocharbon', new Set(['pro', 'lifetime_deal'])],
  ['contentglowz', new Set(['pro', 'lifetime_deal'])],
  ['shipglows', new Set(['pro', 'lifetime_deal'])],
  ['replayglowz', new Set(['pro', 'lifetime_deal'])],
  ['temu_shopping_lists', new Set(['pro', 'lifetime_deal'])],
])

type LicenseCtx = QueryCtx | MutationCtx

function requireBridgeSecret(providedSecret: string) {
  const configuredSecret = process.env.SUITE_BRIDGE_CONVEX_SECRET
  if (!configuredSecret) throw new Error('bridge_secret_not_configured')
  if (providedSecret !== configuredSecret)
    throw new Error('bridge_secret_mismatch')
}

async function requireAdmin(
  ctx: LicenseCtx,
  clerkId: string,
  bridgeSecret: string
) {
  requireBridgeSecret(bridgeSecret)
  const normalizedClerkId = clerkId.trim()
  if (!normalizedClerkId) throw new Error('admin_identity_required')

  const admin = await ctx.db
    .query('users')
    .withIndex('by_clerkId', (q) => q.eq('clerkId', normalizedClerkId))
    .unique()
  if (!admin || admin.role !== 'admin') throw new Error('admin_forbidden')
  return admin
}

function normalizeSearch(raw: string) {
  const trimmed = raw.trim()
  const value = trimmed.toLowerCase()
  const isRedactedProviderReference = /^\*{3}[a-z0-9_-]{4}$/i.test(trimmed)
  if (!value || value.length > SEARCH_MAX_LENGTH)
    throw new Error('search_invalid')
  if (!isRedactedProviderReference && /[?*%]/.test(value))
    throw new Error('search_wildcards_forbidden')
  if (!value.includes('@') && !value.startsWith('gu_') && value.length < 6) {
    throw new Error('search_too_broad')
  }
  return {
    kind: value.startsWith('gu_')
      ? ('global_user' as const)
      : value.includes('@')
        ? ('email' as const)
        : isRedactedProviderReference
          ? ('redacted_provider_reference' as const)
          : ('provider_reference' as const),
    value: value.includes('@') || value.startsWith('gu_') ? value : trimmed,
  }
}

function normalizeReason(raw: string) {
  const reason = raw.trim()
  if (!reason) throw new Error('reason_required')
  if (reason.length > REASON_MAX_LENGTH) throw new Error('reason_too_long')
  return reason
}

function normalizeProductAndPlan(productId: string, plan: string) {
  const product = normalizeSuiteProductId(productId.trim().toLowerCase())
  const normalizedPlan = plan.trim().toLowerCase()
  if (
    !SUITE_PRODUCT_IDS.includes(product as (typeof SUITE_PRODUCT_IDS)[number])
  ) {
    throw new Error('product_not_allowed')
  }
  if (!SUPPORT_PLAN_ALLOWLIST.get(product)?.has(normalizedPlan)) {
    throw new Error('plan_not_allowed')
  }
  return { productId: product, plan: normalizedPlan }
}

function normalizeEnvironment(
  raw: string | undefined,
  fallback = 'production'
) {
  const environment = raw?.trim().toLowerCase() || fallback
  if (
    !new Set(['development', 'preview', 'staging', 'test', 'production']).has(
      environment
    )
  ) {
    throw new Error('environment_not_allowed')
  }
  return environment
}

function maskEmail(email: string | undefined) {
  if (!email) return null
  const [local, domain] = email.toLowerCase().split('@')
  if (!local || !domain) return null
  return `${local.slice(0, 1)}***@${domain}`
}

function redactReference(value: string) {
  const trimmed = value.trim()
  if (trimmed.length <= 4) return '****'
  return `***${trimmed.slice(-4)}`
}

async function getGlobalUserByPublicId(ctx: LicenseCtx, globalUserId: string) {
  const user = await ctx.db
    .query('globalUsers')
    .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUserId))
    .unique()
  if (!user) throw new Error('global_user_not_found')
  return user
}

async function summarizeUser(ctx: QueryCtx, userId: Id<'globalUsers'>) {
  const user = await ctx.db.get(userId)
  if (!user) return null
  const [entitlements, installations] = await Promise.all([
    ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', userId))
      .collect(),
    ctx.db
      .query('productTrialInstallations')
      .withIndex('by_globalUserProduct', (q) => q.eq('globalUserId', userId))
      .collect(),
  ])
  return {
    globalUserId: user.globalUserId,
    email: maskEmail(user.primaryEmail),
    entitlementCount: entitlements.length,
    activeEntitlementCount: entitlements.filter((entry) =>
      isActiveSuiteEntitlement(entry)
    ).length,
    recognizedInstallationCount: installations.length,
    updatedAt: user.updatedAt,
  }
}

export const searchLicenses = query({
  args: { clerkId: v.string(), bridgeSecret: v.string(), search: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId, args.bridgeSecret)
    const search = normalizeSearch(args.search)
    const ids = new Set<Id<'globalUsers'>>()
    let sourceTruncated = false

    if (search.kind === 'global_user') {
      const user = await ctx.db
        .query('globalUsers')
        .withIndex('by_globalUserId', (q) => q.eq('globalUserId', search.value))
        .unique()
      if (user) ids.add(user._id)
    } else if (search.kind === 'email') {
      const [primaryUsers, identities] = await Promise.all([
        ctx.db
          .query('globalUsers')
          .withIndex('by_primaryEmail', (q) =>
            q.eq('primaryEmail', search.value)
          )
          .take(SEARCH_RESULT_LIMIT + 1),
        ctx.db
          .query('identityAccounts')
          .withIndex('by_email', (q) => q.eq('email', search.value))
          .take(SEARCH_RESULT_LIMIT + 1),
      ])
      primaryUsers.forEach((entry) => ids.add(entry._id))
      identities.forEach((entry) => ids.add(entry.globalUserId))
    } else if (search.kind === 'redacted_provider_reference') {
      const identities = await ctx.db
        .query('identityAccounts')
        .take(PROVIDER_REFERENCE_SCAN_LIMIT + 1)
      sourceTruncated = identities.length > PROVIDER_REFERENCE_SCAN_LIMIT
      const suffix = search.value.slice(3).toLowerCase()
      identities
        .slice(0, PROVIDER_REFERENCE_SCAN_LIMIT)
        .filter((entry) =>
          entry.providerAccountId.toLowerCase().endsWith(suffix)
        )
        .forEach((entry) => ids.add(entry.globalUserId))
    } else {
      const identities = await ctx.db
        .query('identityAccounts')
        .withIndex('by_providerAccountId', (q) =>
          q.eq('providerAccountId', search.value)
        )
        .take(SEARCH_RESULT_LIMIT + 1)
      identities.forEach((entry) => ids.add(entry.globalUserId))
    }

    const boundedIds = [...ids].slice(0, SEARCH_RESULT_LIMIT)
    const results = (
      await Promise.all(boundedIds.map((id) => summarizeUser(ctx, id)))
    ).filter(Boolean)
    return {
      results,
      ambiguous: ids.size > 1,
      truncated: sourceTruncated || ids.size > SEARCH_RESULT_LIMIT,
    }
  },
})

export const getLicenseDetail = query({
  args: {
    clerkId: v.string(),
    bridgeSecret: v.string(),
    globalUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId, args.bridgeSecret)
    const globalUser = await getGlobalUserByPublicId(
      ctx,
      args.globalUserId.trim()
    )
    const [identities, entitlements, events, installations] = await Promise.all(
      [
        ctx.db
          .query('identityAccounts')
          .withIndex('by_globalUserId', (q) =>
            q.eq('globalUserId', globalUser._id)
          )
          .collect(),
        ctx.db
          .query('productEntitlements')
          .withIndex('by_globalUserId', (q) =>
            q.eq('globalUserId', globalUser._id)
          )
          .collect(),
        ctx.db
          .query('productAccessEvents')
          .withIndex('by_globalUserId', (q) =>
            q.eq('globalUserId', globalUser._id)
          )
          .order('desc')
          .take(EVENT_RESULT_LIMIT),
        ctx.db
          .query('productTrialInstallations')
          .withIndex('by_globalUserProduct', (q) =>
            q.eq('globalUserId', globalUser._id)
          )
          .collect(),
      ]
    )

    return {
      account: {
        globalUserId: globalUser.globalUserId,
        email: maskEmail(globalUser.primaryEmail),
        createdAt: globalUser.createdAt,
        updatedAt: globalUser.updatedAt,
      },
      identities: identities.map((entry) => ({
        provider: entry.provider,
        providerReference: redactReference(entry.providerAccountId),
        email: maskEmail(entry.email),
        environment: entry.environment ?? null,
      })),
      entitlements: entitlements.map((entry) => ({
        productId: normalizeSuiteProductId(entry.productId),
        plan: entry.plan,
        status: entry.status,
        source: entry.source,
        environment: entry.environment,
        grantedAt: entry.grantedAt ?? null,
        trialStartedAt: entry.trialStartedAt ?? null,
        trialExpiresAt: entry.trialExpiresAt ?? null,
        trialAttempt: entry.trialAttempt ?? null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
      events: events.map((entry) => ({
        source: entry.source,
        eventType: entry.eventType,
        productId: entry.productId ?? null,
        status: entry.status,
        reason: entry.reason ?? null,
        environment: entry.environment,
        createdAt: entry.createdAt,
      })),
      recognizedInstallationCount: installations.length,
      eventHistoryTruncated: events.length === EVENT_RESULT_LIMIT,
    }
  },
})

export const manualGrant = mutation({
  args: {
    clerkId: v.string(),
    bridgeSecret: v.string(),
    globalUserId: v.string(),
    productId: v.string(),
    plan: v.string(),
    reason: v.string(),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId, args.bridgeSecret)
    const reason = normalizeReason(args.reason)
    const { productId, plan } = normalizeProductAndPlan(
      args.productId,
      args.plan
    )
    const globalUser = await getGlobalUserByPublicId(
      ctx,
      args.globalUserId.trim()
    )
    const environment = normalizeEnvironment(args.environment)
    const existingRows = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUser._id))
      .collect()
    const activeEntitlement = existingRows.find(
      (entry) =>
        normalizeSuiteProductId(entry.productId) === productId &&
        entry.plan === plan &&
        isActiveSuiteEntitlement(entry)
    )
    if (activeEntitlement) {
      return {
        status: 'already_active' as const,
        entitlementId: activeEntitlement._id,
      }
    }
    const existing = existingRows.find(
      (entry) =>
        normalizeSuiteProductId(entry.productId) === productId &&
        entry.plan === plan &&
        entry.source === SUPPORT_SOURCE
    )

    const now = Date.now()
    const entitlementId = existing
      ? (await ctx.db.patch(existing._id, {
          status: 'active',
          environment,
          grantedAt: now,
          updatedAt: now,
        }),
        existing._id)
      : await ctx.db.insert('productEntitlements', {
          globalUserId: globalUser._id,
          productId,
          plan,
          status: 'active',
          source: SUPPORT_SOURCE,
          environment,
          idempotencyKey: `support:${globalUser.globalUserId}:${productId}:${plan}`,
          grantedAt: now,
          createdAt: now,
          updatedAt: now,
        })
    await ctx.db.insert('productAccessEvents', {
      source: SUPPORT_SOURCE,
      eventType: 'license_support.granted',
      sourceRef: `admin:${admin._id}`,
      idempotencyKey: `support:grant:${entitlementId}:${now}`,
      environment,
      productId,
      globalUserId: globalUser._id,
      status: 'granted',
      reason,
      createdAt: now,
    })
    return { status: 'granted' as const, entitlementId }
  },
})

export const manualRevoke = mutation({
  args: {
    clerkId: v.string(),
    bridgeSecret: v.string(),
    globalUserId: v.string(),
    productId: v.string(),
    plan: v.string(),
    reason: v.string(),
    environment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.clerkId, args.bridgeSecret)
    const reason = normalizeReason(args.reason)
    const { productId, plan } = normalizeProductAndPlan(
      args.productId,
      args.plan
    )
    const globalUser = await getGlobalUserByPublicId(
      ctx,
      args.globalUserId.trim()
    )
    const rows = await ctx.db
      .query('productEntitlements')
      .withIndex('by_globalUserId', (q) => q.eq('globalUserId', globalUser._id))
      .collect()
    const active = rows.filter(
      (entry) =>
        normalizeSuiteProductId(entry.productId) === productId &&
        entry.plan === plan &&
        isActiveSuiteEntitlement(entry)
    )
    if (active.length === 0) return { status: 'already_revoked' as const }

    const now = Date.now()
    const environment = normalizeEnvironment(
      args.environment,
      active[0].environment
    )
    await Promise.all(
      active.map((entry) =>
        ctx.db.patch(entry._id, { status: 'revoked', updatedAt: now })
      )
    )
    await ctx.db.insert('productAccessEvents', {
      source: SUPPORT_SOURCE,
      eventType: 'license_support.revoked',
      sourceRef: `admin:${admin._id}`,
      idempotencyKey: `support:revoke:${globalUser.globalUserId}:${productId}:${plan}:${now}`,
      environment,
      productId,
      globalUserId: globalUser._id,
      status: 'revoked',
      reason,
      createdAt: now,
    })
    return {
      status: 'revoked' as const,
      entitlementIds: active.map((entry) => entry._id),
    }
  },
})
