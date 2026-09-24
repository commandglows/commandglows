import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { fail } from './emailConfig'

export type ExecutionPolicy = {
  campaignUniqueRecipientLimit: number
  campaignAttemptLimit: number
  businessAttemptWindowLimit: number
  identityAttemptWindowLimit: number
  contactAttemptWindowLimit: number
  businessAttemptWindowMs: number
  identityAttemptWindowMs: number
  contactAttemptWindowMs: number
  firstLotLimit?: number
}

const positive = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

/** A policy is opt-in for legacy sandbox fixtures, never implicit in production. */
export function executionPolicy(record: any): ExecutionPolicy | null {
  const value = record?.executionLimits
  const keys = [
    'campaignUniqueRecipientLimit',
    'campaignAttemptLimit',
    'businessAttemptWindowLimit',
    'identityAttemptWindowLimit',
    'contactAttemptWindowLimit',
    'businessAttemptWindowMs',
    'identityAttemptWindowMs',
    'contactAttemptWindowMs',
  ] as const
  if (!value || keys.some((key) => !positive(value[key]))) return null
  if (value.firstLotLimit !== undefined && !positive(value.firstLotLimit))
    return null
  return value as ExecutionPolicy
}

export function firstLotExhausted(
  policy: ExecutionPolicy | null,
  queued: number
) {
  return Boolean(policy?.firstLotLimit && queued >= policy.firstLotLimit)
}

export async function currentExecutionPolicy(
  ctx: QueryCtx | MutationCtx,
  businessId: string,
  identityKey: string
) {
  const record = await ctx.db
    .query('emailCampaignPolicies')
    .withIndex('approved_scope', (q: any) =>
      q
        .eq('status', 'approved')
        .eq('businessId', businessId)
        .eq('identityKey', identityKey)
    )
    .order('desc')
    .first()
  return { record, limits: executionPolicy(record) }
}

export async function ledgerForContact(
  ctx: MutationCtx,
  input: {
    businessId: string
    campaignId: Id<'emailCampaigns'>
    canonicalContactKey: string
    planRevision: number
  }
) {
  const existing = await ctx.db
    .query('emailCampaignRecipientLedger')
    .withIndex('campaign_contact', (q: any) =>
      q
        .eq('campaignId', input.campaignId)
        .eq('canonicalContactKey', input.canonicalContactKey)
    )
    .unique()
  if (existing) return existing
  const id = await ctx.db.insert('emailCampaignRecipientLedger', {
    ...input,
    state: 'eligible',
    updatedAt: Date.now(),
  })
  return (await ctx.db.get(id))!
}

const scopeKey = (...parts: string[]) => JSON.stringify(parts)

const MAX_TIME_INDEX = BigInt(Number.MAX_SAFE_INTEGER)

async function fenwickPrefix(
  ctx: QueryCtx | MutationCtx,
  dimension: string,
  key: string,
  timestamp: number
) {
  let node = BigInt(Math.floor(timestamp)) + 1n
  let total = 0
  while (node > 0n) {
    const row = await ctx.db
      .query('emailCampaignQuotaTree')
      .withIndex('node', (q: any) =>
        q
          .eq('dimension', dimension)
          .eq('scopeKey', key)
          .eq('node', node.toString())
      )
      .unique()
    total += row?.count ?? 0
    node -= node & -node
  }
  return total
}

async function adjustFenwick(
  ctx: MutationCtx,
  dimension: string,
  key: string,
  timestamp: number,
  delta: 1 | -1
) {
  let node = BigInt(Math.floor(timestamp)) + 1n
  while (node <= MAX_TIME_INDEX) {
    const nodeKey = node.toString()
    const row = await ctx.db
      .query('emailCampaignQuotaTree')
      .withIndex('node', (q: any) =>
        q.eq('dimension', dimension).eq('scopeKey', key).eq('node', nodeKey)
      )
      .unique()
    if (row) {
      const next = row.count + delta
      if (next < 0) fail('quota_ledger_inconsistent')
      if (next === 0) await ctx.db.delete(row._id)
      else await ctx.db.patch(row._id, { count: next })
    } else if (delta < 0) fail('quota_ledger_inconsistent')
    else
      await ctx.db.insert('emailCampaignQuotaTree', {
        dimension,
        scopeKey: key,
        node: nodeKey,
        count: 1,
      })
    node += node & -node
  }
}

async function adjustActive(
  ctx: MutationCtx,
  dimension: string,
  key: string,
  delta: 1 | -1
) {
  const aggregate = await ctx.db
    .query('emailCampaignQuotaAggregates')
    .withIndex('scope', (q: any) =>
      q.eq('dimension', dimension).eq('scopeKey', key)
    )
    .unique()
  const next = (aggregate?.activeReservations ?? 0) + delta
  if (next < 0) fail('quota_ledger_inconsistent')
  if (aggregate) await ctx.db.patch(aggregate._id, { activeReservations: next })
  else if (delta > 0)
    await ctx.db.insert('emailCampaignQuotaAggregates', {
      dimension,
      scopeKey: key,
      activeReservations: next,
    })
  else fail('quota_ledger_inconsistent')
}

async function ensureQuotaAggregate(
  ctx: MutationCtx,
  dimension: string,
  key: string,
  businessId: string,
  identityKey: string,
  contactKey: string
) {
  const existing = await ctx.db
    .query('emailCampaignQuotaAggregates')
    .withIndex('scope', (q: any) =>
      q.eq('dimension', dimension).eq('scopeKey', key)
    )
    .unique()
  if (existing) return

  const existingSlots = await ctx.db
    .query('emailCampaignQuotaSlots')
    .withIndex('scope_time', (q: any) =>
      q.eq('dimension', dimension).eq('scopeKey', key)
    )
    .take(1)
  if (existingSlots.length) fail('campaign_quota_backfill_required')

  // Older campaign test attempts may not have carried campaignId. Detect
  // those in a bounded tenant-scoped scan so they cannot silently escape the
  // shared rolling limits. If the history is too large to classify safely,
  // require the explicit campaign quota backfill.
  const legacyAttempts = await ctx.db
    .query('emailAttempts')
    .withIndex('quota_campaign_business', (q: any) =>
      q.eq('businessId', businessId).eq('campaignId', undefined)
    )
    .take(257)
  if (legacyAttempts.length > 256) fail('campaign_quota_backfill_required')
  for (const attempt of legacyAttempts) {
    if (attempt.releasedAt !== undefined) continue
    const message = (await ctx.db.get(
      attempt.messageId
    )) as Doc<'emailMessages'> | null
    if (!message) fail('campaign_quota_backfill_required')
    if (['broadcast', 'broadcast_test'].includes(message.kind))
      fail('campaign_quota_backfill_required')
  }

  if (dimension === 'identity') {
    const unlinkedByRoute = await ctx.db
      .query('emailAttempts')
      .withIndex('quota_route_campaign', (q: any) =>
        q.eq('route', identityKey).eq('campaignId', undefined)
      )
      .take(257)
    if (unlinkedByRoute.length > 256) fail('campaign_quota_backfill_required')
    for (const attempt of unlinkedByRoute) {
      if (attempt.releasedAt !== undefined) continue
      const message = (await ctx.db.get(
        attempt.messageId
      )) as Doc<'emailMessages'> | null
      if (!message) fail('campaign_quota_backfill_required')
      if (['broadcast', 'broadcast_test'].includes(message.kind))
        fail('campaign_quota_backfill_required')
    }
  }

  // Scope-check a bounded sample, then classify each attempt by its immutable
  // message kind. Transactional confirmation history is not campaign quota.
  // Any unaggregated Broadcast attempt requires the campaign migration owner
  // to backfill before new reservations proceed.
  let historical: any[]
  if (dimension === 'business') {
    historical = await ctx.db
      .query('emailAttempts')
      .withIndex('quota_campaign_business', (q) =>
        q.eq('businessId', businessId).gt('campaignId', undefined)
      )
      .take(257)
  } else if (dimension === 'identity') {
    historical = await ctx.db
      .query('emailAttempts')
      .withIndex('quota_campaign_identity', (q) =>
        q.eq('identityKey', identityKey).gt('campaignId', undefined)
      )
      .take(257)
  } else {
    historical = await ctx.db
      .query('emailAttempts')
      .withIndex('quota_campaign_contact', (q) =>
        q
          .eq('businessId', businessId)
          .eq('canonicalContactKey', contactKey)
          .gt('campaignId', undefined)
      )
      .take(257)
  }
  if (historical.length > 256) fail('campaign_quota_backfill_required')
  for (const attempt of historical) {
    if (attempt.releasedAt !== undefined) continue
    const message = (await ctx.db.get(
      attempt.messageId
    )) as Doc<'emailMessages'> | null
    if (!message) fail('campaign_quota_backfill_required')
    if (!['broadcast', 'broadcast_test'].includes(message.kind)) continue
    const matchesScope =
      dimension === 'business' ||
      (dimension === 'identity' &&
        (!attempt.identityKey || attempt.identityKey === identityKey)) ||
      (dimension === 'contact' &&
        (!attempt.canonicalContactKey ||
          attempt.canonicalContactKey === contactKey))
    if (!matchesScope) continue
    if (attempt.campaignLedgerId) {
      const slots = await ctx.db
        .query('emailCampaignQuotaSlots')
        .withIndex('ledger_dimension', (q: any) =>
          q.eq('ledgerId', attempt.campaignLedgerId!).eq('dimension', dimension)
        )
        .take(1)
      if (slots.some((slot: any) => slot.scopeKey === key))
        fail('campaign_quota_backfill_required')
    }
    fail('campaign_quota_backfill_required')
  }
  await ctx.db.insert('emailCampaignQuotaAggregates', {
    dimension,
    scopeKey: key,
    activeReservations: 0,
  })
}

async function quotaUse(
  ctx: QueryCtx | MutationCtx,
  dimension: string,
  key: string,
  now: number,
  duration: number
) {
  const aggregate = await ctx.db
    .query('emailCampaignQuotaAggregates')
    .withIndex('scope', (q: any) =>
      q.eq('dimension', dimension).eq('scopeKey', key)
    )
    .unique()
  const throughNow = await fenwickPrefix(ctx, dimension, key, now)
  const throughLowerBound = await fenwickPrefix(
    ctx,
    dimension,
    key,
    now - duration
  )
  return (aggregate?.activeReservations ?? 0) + throughNow - throughLowerBound
}

async function setLedgerSlots(
  ctx: MutationCtx,
  ledgerId: Id<'emailCampaignRecipientLedger'>,
  state: 'authorized' | 'released',
  now: number
) {
  const slots = await ctx.db
    .query('emailCampaignQuotaSlots')
    .withIndex('ledger_dimension', (q: any) => q.eq('ledgerId', ledgerId))
    .take(3)
  for (const slot of slots) {
    if (state === 'released') {
      if (slot.state === 'reserved')
        await adjustActive(ctx, slot.dimension, slot.scopeKey, -1)
      else if (slot.state === 'authorized' && slot.authorizedAt !== undefined)
        await adjustFenwick(
          ctx,
          slot.dimension,
          slot.scopeKey,
          slot.authorizedAt,
          -1
        )
      await ctx.db.delete(slot._id)
    } else if (slot.state === 'reserved') {
      await adjustActive(ctx, slot.dimension, slot.scopeKey, -1)
      await adjustFenwick(ctx, slot.dimension, slot.scopeKey, now, 1)
      await ctx.db.patch(slot._id, {
        state,
        reservedAt: now,
        authorizedAt: now,
      })
    }
  }
}

/**
 * Checks all quota buckets in the same Convex mutation that creates the
 * reservation. Convex serializes mutations, so a concurrent worker observes
 * the earlier reservation rather than both independently accepting capacity.
 */
export async function reserveCampaignAttempt(
  ctx: MutationCtx,
  input: {
    campaign: Doc<'emailCampaigns'>
    ledger: Doc<'emailCampaignRecipientLedger'>
    identityKey: string
    canonicalContactKey: string
    policy: ExecutionPolicy | null
    now: number
    production: boolean
  }
) {
  if (input.ledger.state !== 'eligible') return false
  if (!input.policy) {
    if (input.production) fail('policy_unavailable')
    return true
  }
  if (
    input.campaign.campaignAttemptCount === undefined ||
    input.campaign.campaignUniqueRecipientCount === undefined
  ) {
    const legacyCampaignAttempts = await ctx.db
      .query('emailAttempts')
      .withIndex('campaign', (q: any) => q.eq('campaignId', input.campaign._id))
      .take(1)
    if (legacyCampaignAttempts.length) fail('quota_ledger_uninitialized')
    await ctx.db.patch(input.campaign._id, {
      campaignAttemptCount: 0,
      campaignUniqueRecipientCount: 0,
    })
  }
  const campaignAttempts = input.campaign.campaignAttemptCount ?? 0
  const unique = input.campaign.campaignUniqueRecipientCount ?? 0
  if (
    unique >= input.policy.campaignUniqueRecipientLimit ||
    campaignAttempts >= input.policy.campaignAttemptLimit
  )
    return false
  const windows = [
    [
      'business',
      scopeKey(input.campaign.businessId),
      input.policy.businessAttemptWindowLimit,
      input.policy.businessAttemptWindowMs,
    ],
    [
      'identity',
      scopeKey(input.identityKey),
      input.policy.identityAttemptWindowLimit,
      input.policy.identityAttemptWindowMs,
    ],
    [
      'contact',
      scopeKey(input.campaign.businessId, input.canonicalContactKey),
      input.policy.contactAttemptWindowLimit,
      input.policy.contactAttemptWindowMs,
    ],
  ] as const
  for (const [dimension, key] of windows) {
    await ensureQuotaAggregate(
      ctx,
      dimension,
      key,
      input.campaign.businessId,
      input.identityKey,
      input.canonicalContactKey
    )
  }
  for (const [dimension, key, limit, duration] of windows) {
    if ((await quotaUse(ctx, dimension, key, input.now, duration)) >= limit)
      return false
  }
  for (const [dimension, key] of windows) {
    await adjustActive(ctx, dimension, key, 1)
    await ctx.db.insert('emailCampaignQuotaSlots', {
      dimension,
      scopeKey: key,
      ledgerId: input.ledger._id,
      campaignId: input.campaign._id,
      state: 'reserved',
      reservedAt: input.now,
    })
  }
  await ctx.db.patch(input.campaign._id, {
    campaignAttemptCount: campaignAttempts + 1,
    campaignUniqueRecipientCount: input.ledger.everAuthorized
      ? unique
      : unique + 1,
  })
  return true
}

export async function validateAndAuthorizeCampaignDeparture(
  ctx: MutationCtx,
  input: {
    attempt: Doc<'emailAttempts'>
    campaign: Doc<'emailCampaigns'>
    ledger: Doc<'emailCampaignRecipientLedger'>
    versionId: Id<'emailCampaignVersions'>
    expectedScopeDigest: string
    identityKey: string
    now: number
  }
): Promise<
  | { authorized: true }
  | {
      authorized: false
      reason: string
      suspendCampaign: boolean
      dispatchEpoch?: number
    }
> {
  const campaign = await ctx.db.get(input.campaign._id)
  if (!campaign || !['sending', 'fanout_complete'].includes(campaign.state))
    return {
      authorized: false,
      reason: 'campaign_stopped',
      suspendCampaign: false,
    }
  const revision = campaign.revision ?? 0
  const suspend = async (reason: string) => {
    const latest = await ctx.db.get(campaign._id)
    if (!latest || !['sending', 'fanout_complete'].includes(latest.state))
      return {
        authorized: false as const,
        reason: 'campaign_stopped',
        suspendCampaign: false,
      }
    const nextEpoch = (latest.dispatchEpoch ?? 0) + 1
    await ctx.db.patch(latest._id, {
      state: 'suspended',
      resumeState: latest.resumeState ?? latest.state,
      blockReason: reason,
      pausedAt: input.now,
      dispatchEpoch: nextEpoch,
      updatedAt: input.now,
    })
    return {
      authorized: false as const,
      reason,
      suspendCampaign: true,
      dispatchEpoch: nextEpoch,
    }
  }
  const { record, limits } = await currentExecutionPolicy(
    ctx,
    campaign.businessId,
    input.identityKey
  )
  const report = await ctx.db
    .query('emailCampaignReports')
    .withIndex('campaign', (q: any) =>
      q.eq('campaignId', campaign._id).eq('revision', revision)
    )
    .order('desc')
    .first()
  if (campaign.approvedVersionId !== input.versionId)
    return suspend('approval_version_changed')
  if (!record || !limits) return suspend('execution_policy_unavailable')
  if (
    campaign.campaignAttemptCount === undefined ||
    campaign.campaignUniqueRecipientCount === undefined
  )
    return suspend('quota_ledger_uninitialized')
  if (
    !report ||
    report.versionId !== input.versionId ||
    report.revision !== revision
  )
    return suspend('approved_report_missing')
  if (report.status !== 'valid' || report.expiresAt <= input.now)
    return suspend('approved_report_expired')
  if (
    report.scopeDigest !== input.expectedScopeDigest ||
    report.policyRevision !== record.revision
  )
    return suspend('approved_report_scope_or_policy_changed')
  if (
    (campaign.campaignAttemptCount ?? 0) > limits.campaignAttemptLimit ||
    (campaign.campaignUniqueRecipientCount ?? 0) >
      limits.campaignUniqueRecipientLimit
  )
    return suspend('campaign_quota_exceeded')

  const windows = [
    [
      'business',
      scopeKey(campaign.businessId),
      limits.businessAttemptWindowLimit,
      limits.businessAttemptWindowMs,
    ],
    [
      'identity',
      scopeKey(input.identityKey),
      limits.identityAttemptWindowLimit,
      limits.identityAttemptWindowMs,
    ],
    [
      'contact',
      scopeKey(campaign.businessId, input.attempt.canonicalContactKey ?? ''),
      limits.contactAttemptWindowLimit,
      limits.contactAttemptWindowMs,
    ],
  ] as const
  for (const [dimension, key, limit, duration] of windows) {
    const slot = await ctx.db
      .query('emailCampaignQuotaSlots')
      .withIndex('ledger_dimension', (q: any) =>
        q.eq('ledgerId', input.ledger._id).eq('dimension', dimension)
      )
      .take(1)
    if (
      !slot.length ||
      slot[0].state !== 'reserved' ||
      slot[0].scopeKey !== key
    )
      return {
        authorized: false,
        reason: 'reservation_invalid',
        suspendCampaign: false,
      }
    const aggregate = await ctx.db
      .query('emailCampaignQuotaAggregates')
      .withIndex('scope', (q: any) =>
        q.eq('dimension', dimension).eq('scopeKey', key)
      )
      .unique()
    if (!aggregate) return suspend('quota_ledger_uninitialized')
    if ((await quotaUse(ctx, dimension, key, input.now, duration)) > limit)
      return suspend('rolling_quota_exceeded')
  }
  const authorized = await commitCampaignDeparture(ctx, {
    ...input,
    campaign,
  })
  return authorized
    ? { authorized: true }
    : {
        authorized: false,
        reason: 'reservation_invalid',
        suspendCampaign: false,
      }
}

async function commitCampaignDeparture(
  ctx: MutationCtx,
  input: {
    attempt: Doc<'emailAttempts'>
    campaign: Doc<'emailCampaigns'>
    ledger: Doc<'emailCampaignRecipientLedger'>
    now: number
  }
) {
  if (
    input.attempt.state !== 'reserved' ||
    input.attempt.dispatchEpoch !== (input.campaign.dispatchEpoch ?? 0) ||
    input.ledger.reservationAttemptId !== input.attempt._id ||
    input.ledger.state !== 'reserved'
  )
    return false
  await ctx.db.patch(input.attempt._id, {
    state: 'departure_authorized',
    authorizedAt: input.now,
    dispatchReservedAt: input.now,
  })
  await ctx.db.patch(input.ledger._id, {
    state: 'departure_authorized',
    departureAuthorizedAt: input.now,
    everAuthorized: true,
    updatedAt: input.now,
  })
  await setLedgerSlots(ctx, input.ledger._id, 'authorized', input.now)
  return true
}

/** Release only an unused reservation or a provider-proven non-transmission. */
export async function releaseCampaignReservation(
  ctx: MutationCtx,
  attempt: Doc<'emailAttempts'>,
  proof: string,
  now: number
) {
  const ledger =
    attempt.campaignLedgerId && (await ctx.db.get(attempt.campaignLedgerId))
  const unused = attempt.state === 'reserved'
  const proven = proof === 'provider_definitive_non_acceptance'
  if (attempt.releasedAt) return true
  if (!unused && !proven) return false
  await ctx.db.patch(attempt._id, {
    state: 'released',
    releasedAt: now,
    releaseProof: proof,
  })
  if (ledger && ledger.reservationAttemptId === attempt._id) {
    const campaign = await ctx.db.get(ledger.campaignId)
    await setLedgerSlots(ctx, ledger._id, 'released', now)
    await ctx.db.patch(ledger._id, {
      state: unused ? 'eligible' : 'rejected_before_acceptance',
      ...(unused ? { reservationAttemptId: undefined } : {}),
      departureAuthorizedAt: undefined,
      updatedAt: now,
    })
    if (campaign) {
      await ctx.db.patch(campaign._id, {
        ...(unused
          ? {
              campaignAttemptCount: Math.max(
                0,
                (campaign.campaignAttemptCount ?? 1) - 1
              ),
            }
          : {}),
        ...(!ledger.everAuthorized
          ? {
              campaignUniqueRecipientCount: Math.max(
                0,
                (campaign.campaignUniqueRecipientCount ?? 1) - 1
              ),
            }
          : {}),
      })
    }
  }
  return true
}

/** @deprecated Direct permit grants are disabled; use the final revalidation helper. */
export async function authorizeCampaignDeparture(
  _ctx: MutationCtx,
  _input: {
    attempt: Doc<'emailAttempts'>
    campaign: Doc<'emailCampaigns'>
    ledger: Doc<'emailCampaignRecipientLedger'>
    now: number
  }
) {
  return false
}
