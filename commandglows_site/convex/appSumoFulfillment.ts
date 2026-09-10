import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { commerceEnvironment } from './commerceEventContract'

type AppSumoLicenseEvent = 'purchase' | 'activate' | 'upgrade' | 'downgrade' | 'deactivate'
type AppSumoDesiredStatus = 'inactive' | 'active' | 'deactivated'

type Dependencies = {
  supportsOffer: (offer: string, product: string, plan: string) => boolean
}

type AppSumoInput = {
  licenseKey: string
  previousLicenseKey?: string
  event: AppSumoLicenseEvent
  eventTimestamp: number
  tier?: number
  test: boolean
  desiredStatus: AppSumoDesiredStatus
  environment: string
  providerEventId: string
  productId?: string
  offerId?: string
  plan?: string
  globalUserId?: string
}

type AppSumoResult = {
  ok: boolean
  status: string
  reason?: string
  licenseId?: Id<'appSumoLicenses'>
  entitlementId?: Id<'productEntitlements'>
  alreadyProcessed?: boolean
  globalUserDocId?: Id<'globalUsers'>
}

const pending = (reason: string): AppSumoResult => ({ ok: false, status: 'pending_review', reason })

function runtimeEnvironment() {
  return commerceEnvironment(process.env.SUITE_BRIDGE_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || '')
}

function normalizeLicenseKey(value: string) {
  const key = value.trim().toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key)) {
    throw new Error('appsumo_license_key_invalid')
  }
  return key
}

function validateProviderEventId(value: string) {
  const eventId = value.trim()
  if (!eventId || eventId !== value || eventId.length > 512) throw new Error('appsumo_event_id_invalid')
  return eventId
}

function validateEventTimestamp(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('appsumo_event_timestamp_invalid')
}

async function findLicense(ctx: MutationCtx, licenseKey: string, environment: string) {
  return ctx.db.query('appSumoLicenses').withIndex('by_licenseEnvironment',
    (q) => q.eq('licenseKey', licenseKey).eq('environment', environment)).unique()
}

async function findOwner(ctx: MutationCtx, globalUserId: string | undefined) {
  if (!globalUserId?.trim()) return null
  return ctx.db.query('globalUsers').withIndex('by_globalUserId',
    (q) => q.eq('globalUserId', globalUserId)).unique()
}

function assertMapping(input: AppSumoInput, dependencies: Dependencies) {
  if (!input.productId?.trim() || !input.offerId?.trim() || !input.plan?.trim()) {
    return 'appsumo_mapping_required'
  }
  if (!dependencies.supportsOffer(input.offerId, input.productId, input.plan)) {
    return 'unsupported_appsumo_offer'
  }
  return null
}

async function insertReceipt(ctx: MutationCtx, args: {
  input: AppSumoInput
  licenseKey: string
  previousLicenseKey?: string
  environment: string
  status: string
  reason?: string
  globalUserDocId?: Id<'globalUsers'>
}) {
  await ctx.db.insert('productAccessEvents', {
    source: 'appsumo',
    eventType: `appsumo.${args.input.event}`,
    eventId: args.input.providerEventId,
    sourceRef: args.licenseKey,
    idempotencyKey: `appsumo:event:${args.environment}:${args.input.providerEventId}`,
    environment: args.environment,
    productId: args.input.productId,
    globalUserId: args.globalUserDocId,
    status: args.status,
    reason: args.reason,
    createdAt: Date.now(),
  })
}

async function revokeEntitlement(ctx: MutationCtx, entitlementId: Id<'productEntitlements'> | undefined, now: number) {
  if (!entitlementId) return
  const entitlement = await ctx.db.get(entitlementId)
  if (!entitlement || entitlement.source !== 'appsumo' || entitlement.status !== 'active') return
  await ctx.db.patch(entitlement._id, { status: 'revoked', commerceManagedStatus: 'revoked', updatedAt: now })
}

async function ensureEntitlement(ctx: MutationCtx, args: {
  input: AppSumoInput
  licenseKey: string
  environment: string
  owner: Doc<'globalUsers'>
  existing: Doc<'appSumoLicenses'> | null
  now: number
}) {
  const idempotencyKey = `appsumo:grant:${args.environment}:${args.licenseKey}`
  const current = args.existing?.currentEntitlementId
    ? await ctx.db.get(args.existing.currentEntitlementId)
    : null
  if (current) {
    if (current.globalUserId !== args.owner._id || current.productId !== args.input.productId ||
      current.plan !== args.input.plan || current.environment !== args.environment) {
      throw new Error('appsumo_entitlement_binding_conflict')
    }
    if (current.status !== 'active') {
      await ctx.db.patch(current._id, { status: 'active', commerceManagedStatus: 'active', updatedAt: args.now })
    }
    return current._id
  }
  const duplicate = await ctx.db.query('productEntitlements').withIndex('by_idempotencyKey',
    (q) => q.eq('idempotencyKey', idempotencyKey)).unique()
  if (duplicate) {
    if (duplicate.globalUserId !== args.owner._id || duplicate.productId !== args.input.productId ||
      duplicate.plan !== args.input.plan || duplicate.environment !== args.environment) {
      throw new Error('appsumo_entitlement_binding_conflict')
    }
    if (duplicate.status !== 'active') {
      await ctx.db.patch(duplicate._id, { status: 'active', commerceManagedStatus: 'active', updatedAt: args.now })
    }
    return duplicate._id
  }
  return ctx.db.insert('productEntitlements', {
    globalUserId: args.owner._id,
    productId: args.input.productId!,
    plan: args.input.plan!,
    status: 'active',
    commerceManagedStatus: 'active',
    source: 'appsumo',
    sourceRef: args.licenseKey,
    environment: args.environment,
    idempotencyKey,
    grantedAt: args.now,
    createdAt: args.now,
    updatedAt: args.now,
  })
}

export async function receiveAppSumoLicenseEvent(ctx: MutationCtx, input: AppSumoInput, dependencies: Dependencies): Promise<AppSumoResult> {
  const environment = commerceEnvironment(input.environment)
  if (!environment || environment !== runtimeEnvironment()) return pending('environment_mismatch')
  const licenseKey = normalizeLicenseKey(input.licenseKey)
  const previousLicenseKey = input.previousLicenseKey ? normalizeLicenseKey(input.previousLicenseKey) : undefined
  if (previousLicenseKey === licenseKey) throw new Error('appsumo_lineage_invalid')
  validateEventTimestamp(input.eventTimestamp)
  const providerEventId = validateProviderEventId(input.providerEventId)
  if (input.test) {
    await insertReceipt(ctx, { input: { ...input, providerEventId }, licenseKey, previousLicenseKey, environment,
      status: 'ignored', reason: 'appsumo_test_event' })
    return { ok: true, status: 'ignored', reason: 'appsumo_test_event' }
  }

  const existing = await findLicense(ctx, licenseKey, environment)
  if (existing?.lastEventId === providerEventId) {
    return { ok: existing.status !== 'pending_review', status: existing.status,
      reason: existing.status === 'pending_review' ? 'previous_pending_review' : undefined,
      licenseId: existing._id, entitlementId: existing.currentEntitlementId, alreadyProcessed: true }
  }
  if (existing && input.eventTimestamp < existing.lastEventTimestamp) {
    await insertReceipt(ctx, { input: { ...input, providerEventId }, licenseKey, previousLicenseKey, environment,
      status: 'ignored', reason: 'stale_appsumo_event', globalUserDocId: existing.globalUserId })
    return { ok: true, status: 'ignored', reason: 'stale_appsumo_event', licenseId: existing._id }
  }

  const now = Date.now()
  const owner = await findOwner(ctx, input.globalUserId)
  const mappingReason = input.desiredStatus === 'active' ? assertMapping(input, dependencies) : null
  const reviewReason = input.desiredStatus === 'active' && !owner
    ? 'appsumo_owner_required'
    : mappingReason
  let entitlementId = existing?.currentEntitlementId
  if (!reviewReason && input.desiredStatus === 'active') {
    entitlementId = await ensureEntitlement(ctx, { input, licenseKey, environment, owner: owner!, existing, now })
  } else if (input.desiredStatus === 'deactivated') {
    await revokeEntitlement(ctx, existing?.currentEntitlementId, now)
  }

  if (previousLicenseKey && input.desiredStatus === 'active') {
    const previous = await findLicense(ctx, previousLicenseKey, environment)
    if (previous && previous.currentEntitlementId !== entitlementId) {
      await revokeEntitlement(ctx, previous.currentEntitlementId, now)
      await ctx.db.patch(previous._id, { status: 'replaced', currentEntitlementId: undefined,
        lastEventId: providerEventId, lastEventType: input.event, lastEventTimestamp: input.eventTimestamp, updatedAt: now })
    }
  }

  const status = reviewReason ? 'pending_review' : input.desiredStatus === 'active' ? 'active' : input.desiredStatus
  const patch = {
    status,
    productId: input.productId,
    offerId: input.offerId,
    plan: input.plan,
    tier: input.tier,
    globalUserId: owner?._id,
    currentEntitlementId: entitlementId,
    previousLicenseKey,
    lastEventId: providerEventId,
    lastEventType: input.event,
    lastEventTimestamp: input.eventTimestamp,
    test: false,
    updatedAt: now,
  }
  const licenseId = existing
    ? (await ctx.db.patch(existing._id, patch), existing._id)
    : await ctx.db.insert('appSumoLicenses', { licenseKey, environment, ...patch, createdAt: now })
  await insertReceipt(ctx, { input: { ...input, providerEventId }, licenseKey, previousLicenseKey, environment,
    status, reason: reviewReason ?? undefined, globalUserDocId: owner?._id })
  return { ok: !reviewReason, status, reason: reviewReason ?? undefined, licenseId, entitlementId,
    globalUserDocId: owner?._id }
}
