import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { canonical, fail } from './emailConfig'

export const MANDATORY_EVIDENCE = [
  'identity',
  'route',
  'unsubscribe',
  'suppression_sync',
  'audience_consent',
  'policy_capacity',
] as const

export function evidenceScope(input: {
  businessId: string
  campaignId: Id<'emailCampaigns'>
  versionId: Id<'emailCampaignVersions'>
  audienceId: string
  purpose: string
  route: string
  planRevision?: number
}) {
  return canonical(input)
}

export async function currentReport(
  ctx: QueryCtx | MutationCtx,
  campaignId: Id<'emailCampaigns'>,
  revision: number
) {
  return ctx.db
    .query('emailCampaignReports')
    .withIndex('campaign', (q) =>
      q.eq('campaignId', campaignId).eq('revision', revision)
    )
    .order('desc')
    .first()
}

export async function createEvidenceReport(
  ctx: MutationCtx,
  args: {
    businessId: string
    campaignId: Id<'emailCampaigns'>
    versionId: Id<'emailCampaignVersions'>
    revision: number
    audienceId: string
    purpose: string
    route: string
    planRevision: number
    now: number
  }
) {
  const scopeDigest = evidenceScope({
    businessId: args.businessId,
    campaignId: args.campaignId,
    versionId: args.versionId,
    audienceId: args.audienceId,
    purpose: args.purpose,
    route: args.route,
    planRevision: args.planRevision,
  })
  const policies = await ctx.db
    .query('emailCampaignPolicies')
    .withIndex('scope', (q) =>
      q.eq('businessId', args.businessId).eq('identityKey', args.route)
    )
    .collect()
  const policy = policies
    .filter((candidate) => candidate.status === 'approved')
    .sort((a, b) => b.revision - a.revision)[0]
  const blockingChecks: any[] = []
  const warningChecks: any[] = []
  const evidenceIds: string[] = []
  let expiresAt = Number.POSITIVE_INFINITY

  if (!policy || policy.status !== 'approved') {
    blockingChecks.push({ kind: 'policy_capacity', code: 'policy_unavailable' })
  }

  for (const kind of MANDATORY_EVIDENCE) {
    const record = await ctx.db
      .query('emailCampaignEvidence')
      .withIndex('campaign', (q) =>
        q
          .eq('campaignId', args.campaignId)
          .eq('versionId', args.versionId)
          .eq('kind', kind)
      )
      .order('desc')
      .first()
    const maxAge = Number(policy?.evidenceMaxAge?.[kind] ?? 0)
    const valid = Boolean(
      record &&
      record.businessId === args.businessId &&
      record.scopeDigest === scopeDigest &&
      record.status === 'valid' &&
      maxAge > 0 &&
      record.validUntil >= args.now &&
      record.collectedAt + maxAge >= args.now
    )
    if (!valid) {
      blockingChecks.push({
        kind,
        code:
          record?.status === 'unavailable'
            ? 'evidence_unavailable'
            : 'evidence_invalid',
        evidence_ref: record?.evidenceRef ?? null,
      })
    } else {
      evidenceIds.push(record!.evidenceRef)
      expiresAt = Math.min(
        expiresAt,
        record!.validUntil,
        record!.collectedAt + maxAge
      )
    }
  }

  if (!Number.isFinite(expiresAt)) expiresAt = args.now
  const status = blockingChecks.length ? 'blocked' : 'valid'
  const reportId = await ctx.db.insert('emailCampaignReports', {
    businessId: args.businessId,
    campaignId: args.campaignId,
    versionId: args.versionId,
    revision: args.revision,
    scopeDigest,
    policyRevision: policy?.revision ?? 0,
    checkedAt: args.now,
    expiresAt,
    status,
    blockingChecks,
    warningChecks,
    evidenceIds,
  })
  return { reportId, report: await ctx.db.get(reportId), scopeDigest }
}

export async function consumeHumanChallenge(
  ctx: MutationCtx,
  input: {
    challengeId?: string
    businessId: string
    action: string
    scopeDigest: string
    reportId: Id<'emailCampaignReports'>
    revision: number
    actorId?: string
    sessionRef?: string
    now: number
  }
) {
  if (!input.challengeId) fail('human_authority_required')
  const challenge = await ctx.db
    .query('emailOperatorChallenges')
    .withIndex('challenge', (q) => q.eq('challengeId', input.challengeId!))
    .unique()
  if (
    !challenge ||
    challenge.usedAt ||
    challenge.expiresAt <= input.now ||
    challenge.businessId !== input.businessId ||
    challenge.action !== input.action ||
    challenge.scopeDigest !== input.scopeDigest ||
    challenge.reportId !== input.reportId ||
    challenge.revision !== input.revision ||
    challenge.actorId !== input.actorId ||
    challenge.sessionRef !== input.sessionRef
  )
    fail('challenge_rejected')
  await ctx.db.patch(challenge._id, { usedAt: input.now })
  return { actorId: challenge.actorId, sessionRef: challenge.sessionRef }
}
