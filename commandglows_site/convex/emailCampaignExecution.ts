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
  if (value.firstLotLimit !== undefined && !positive(value.firstLotLimit)) return null
  return value as ExecutionPolicy
}

export function firstLotExhausted(policy: ExecutionPolicy | null, queued: number) {
  return Boolean(policy?.firstLotLimit && queued >= policy.firstLotLimit)
}

export async function currentExecutionPolicy(
  ctx: QueryCtx | MutationCtx,
  businessId: string,
  identityKey: string
) {
  const records = await ctx.db
    .query('emailCampaignPolicies')
    .withIndex('scope', (q: any) =>
      q.eq('businessId', businessId).eq('identityKey', identityKey)
    )
    .collect()
  const record = records
    .filter((candidate: any) => candidate.status === 'approved')
    .sort((a: any, b: any) => b.revision - a.revision)[0]
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

const activeReservation = (attempt: any) =>
  !attempt.releasedAt && ['reserved', 'departure_authorized', 'accepted', 'unknown'].includes(attempt.state)

const inWindow = (attempt: any, now: number, duration: number) =>
  activeReservation(attempt) &&
  (attempt.state === 'reserved' ||
    (typeof attempt.authorizedAt === 'number' && attempt.authorizedAt > now - duration && attempt.authorizedAt <= now))

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
  const attempts = await ctx.db.query('emailAttempts').collect()
  const campaignAttempts = attempts.filter(
    (attempt: any) => attempt.campaignId === input.campaign._id && activeReservation(attempt)
  )
  const unique = await ctx.db
    .query('emailCampaignRecipientLedger')
    .withIndex('campaign', (q: any) => q.eq('campaignId', input.campaign._id))
    .collect()
  if (
    unique.filter((entry: any) => entry.state !== 'eligible').length >=
      input.policy.campaignUniqueRecipientLimit ||
    campaignAttempts.length >= input.policy.campaignAttemptLimit
  )
    return false
  const windowed = (predicate: (attempt: any) => boolean, duration: number) =>
    attempts.filter(
      (attempt: any) => predicate(attempt) && inWindow(attempt, input.now, duration)
    ).length
  if (
    windowed((attempt) => attempt.businessId === input.campaign.businessId, input.policy.businessAttemptWindowMs) >= input.policy.businessAttemptWindowLimit ||
    windowed((attempt) => attempt.identityKey === input.identityKey, input.policy.identityAttemptWindowMs) >= input.policy.identityAttemptWindowLimit ||
    windowed(
      (attempt) =>
        attempt.businessId === input.campaign.businessId &&
        attempt.canonicalContactKey === input.canonicalContactKey,
      input.policy.contactAttemptWindowMs
    ) >= input.policy.contactAttemptWindowLimit
  )
    return false
  return true
}

export async function authorizeCampaignDeparture(
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
    updatedAt: input.now,
  })
  return true
}

/** Release only an unused reservation or a provider-proven non-transmission. */
export async function releaseCampaignReservation(
  ctx: MutationCtx,
  attempt: Doc<'emailAttempts'>,
  proof: string,
  now: number
) {
  const ledger = attempt.campaignLedgerId && (await ctx.db.get(attempt.campaignLedgerId))
  const unused = attempt.state === 'reserved'
  const proven = proof === 'provider_definitive_non_acceptance'
  if (!unused && !proven) return false
  if (attempt.releasedAt) return true
  await ctx.db.patch(attempt._id, { state: 'released', releasedAt: now, releaseProof: proof })
  if (ledger && ledger.reservationAttemptId === attempt._id)
    await ctx.db.patch(ledger._id, {
      state: 'eligible',
      reservationAttemptId: undefined,
      departureAuthorizedAt: undefined,
      updatedAt: now,
    })
  return true
}
