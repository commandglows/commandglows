import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import {
  authorize,
  canonical,
  deliveryRoute,
  dispatchAllowed,
  fail,
  requiresLiveTest,
} from './emailConfig'
import { suppressed } from './email'
import { emailChannelPaused } from './emailOperationsPolicy'
import { renderEmail } from '../src/lib/email/central/templates'
import {
  campaignContent,
  renderCampaign,
} from '../src/lib/email/central/campaignContent'
import {
  createEvidenceReport,
  consumeHumanChallenge,
  currentReport,
  evidenceScope,
} from './emailCampaignEvidence'
import {
  currentExecutionPolicy,
  firstLotExhausted,
  ledgerForContact,
} from './emailCampaignExecution'

const SNAPSHOT_PAGE = 50
const FANOUT_PAGE = 25
function reviewId(campaignId: Id<'emailCampaigns'>, version: number) {
  return `${campaignId}:${version}`
}
const contentKeys = [
  'audienceId',
  'locale',
  'subject',
  'paragraphs',
  'scheduledAt',
  'timezone',
]
function content(input: any) {
  if (input?.blocks) {
    try {
      const value = campaignContent(input)
      return {
        audienceId: value.audienceId,
        locale: value.locale,
        subject: value.subject,
        preheader: value.preheader,
        paragraphs: value.blocks.map((block) => block.text).filter(Boolean),
        blocks: value.blocks,
        title: value.title,
        scheduledAt: input.scheduledAt ?? Date.now(),
        timezone: input.timezone ?? 'UTC',
      }
    } catch {
      fail('invalid_input')
    }
  }
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => !contentKeys.includes(k)) ||
    !['fr', 'en'].includes(input.locale) ||
    typeof input.audienceId !== 'string' ||
    typeof input.subject !== 'string' ||
    !Array.isArray(input.paragraphs) ||
    !Number.isSafeInteger(input.scheduledAt) ||
    input.scheduledAt < 0 ||
    input.scheduledAt > 8_640_000_000_000_000 ||
    typeof input.timezone !== 'string'
  )
    fail('invalid_input')
  try {
    new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format(
      input.scheduledAt
    )
  } catch {
    fail('invalid_input')
  }
  return input as {
    audienceId: string
    locale: 'fr' | 'en'
    subject: string
    paragraphs: string[]
    scheduledAt: number
    timezone: string
  }
}
async function scoped(
  ctx: QueryCtx | MutationCtx,
  businessId: string,
  campaignId: Id<'emailCampaigns'> | undefined
) {
  const campaign = campaignId && (await ctx.db.get(campaignId))
  if (!campaign || campaign.businessId !== businessId) fail('not_found')
  return campaign
}
function receipt(
  c: Doc<'emailCampaigns'>,
  version?: Doc<'emailCampaignVersions'> | null
) {
  const campaign = {
    id: c._id,
    version: c.revision,
    business_id: c.businessId,
    title: version?.title ?? '',
    audience_id: version?.audienceId ?? null,
    locale: version?.locale ?? null,
    subject: version?.subject ?? '',
    preheader: version?.preheader ?? '',
    blocks: version?.blocks ?? [],
    state: c.state,
    scheduled_at: version?.scheduledAt
      ? new Date(version.scheduledAt).toISOString()
      : null,
    updated_at: new Date(c.updatedAt).toISOString(),
    counters: {
      queued: c.fanoutQueued,
      cancelled: c.counters?.cancelled ?? c.fanoutExcluded,
      delivered: 0,
      submitted: 0,
      failed: 0,
      unknown: 0,
    },
    eligible_count: c.eligible,
    excluded_count: c.excluded,
  }
  return {
    campaign,
    campaign_id: c._id,
    business_id: c.businessId,
    revision: c.revision,
    content_version: version?.number ?? null,
    state: c.state,
    operation_id: c.operationId ?? null,
    scheduled_at: version?.scheduledAt ?? null,
    timezone: version?.timezone ?? null,
    audience_id: version?.audienceId ?? null,
    snapshot: {
      complete: c.snapshotComplete,
      scanned: c.scanned,
      eligible: c.eligible,
      excluded: c.excluded,
      cutoff: version?.cutoff ?? null,
    },
    fanout: {
      queued: c.fanoutQueued,
      excluded: c.fanoutExcluded,
      complete:
        c.state === 'fanout_complete' || c.resumeState === 'fanout_complete',
    },
    block_reason: c.blockReason ?? null,
    eligible_count: c.eligible,
    excluded_count: c.excluded,
  }
}
async function currentReceipt(
  ctx: QueryCtx | MutationCtx,
  id: Id<'emailCampaigns'>
) {
  const c = (await ctx.db.get(id))!
  return receipt(c, c.versionId ? await ctx.db.get(c.versionId) : null)
}

/** All writes are scoped, revision-checked and replayable with the same operation receipt. */
export const command = mutation({
  args: {
    credential: v.string(),
    businessId: v.string(),
    key: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    actorId: v.optional(v.string()),
    sessionRef: v.optional(v.string()),
    operation: v.string(),
    expectedVersion: v.optional(v.number()),
    campaignId: v.optional(v.id('emailCampaigns')),
    input: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const input = (args.input ?? {}) as Record<string, any>
    const operation =
      args.operation === 'save'
        ? 'revise'
        : args.operation === 'review'
          ? 'snapshot'
          : args.operation
    const key = args.key ?? args.idempotencyKey
    const campaignId = args.campaignId ?? input.campaignId
    const expectedVersion = args.expectedVersion ?? input.expectedVersion ?? 0
    const { config, business, client } = authorize(
      args.credential,
      args.businessId,
      'campaign_write'
    )
    if (
      ![
        'create',
        'revise',
        'snapshot',
        'test',
        'approve',
        'challenge',
        'reduce',
        'pause',
        'resume',
        'cancel',
        'delete',
      ].includes(operation) ||
      !key ||
      !/^[A-Za-z0-9_:-]{16,128}$/.test(key) ||
      !Number.isSafeInteger(expectedVersion) ||
      JSON.stringify(args.input ?? {}).length > 100_000
    )
      fail('invalid_input')
    const fingerprint = canonical({
      operation,
      expectedVersion,
      campaignId: campaignId ?? null,
      input: args.input ?? {},
    })
    const previous = await ctx.db
      .query('emailCampaignRequests')
      .withIndex('scope', (q) =>
        q
          .eq('businessId', business.id)
          .eq('clientId', client.id)
          .eq('key', key!)
      )
      .unique()
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('idempotency_conflict')
      return previous.result
    }
    const now = Date.now()
    let generatedChallenge: {
      id: string
      reportId: string
      expiresAt: number
    } | null = null
    let c: Doc<'emailCampaigns'>
    if (operation === 'create') {
      if (campaignId || expectedVersion !== 0) fail('version_conflict')
      const id = await ctx.db.insert('emailCampaigns', {
        businessId: business.id,
        revision: 0,
        planRevision: 1,
        dispatchEpoch: 0,
        firstLotComplete: false,
        state: 'draft',
        snapshotComplete: false,
        scanned: 0,
        eligible: 0,
        excluded: 0,
        fanoutQueued: 0,
        fanoutExcluded: 0,
        counters: {
          queued: 0,
          sending: 0,
          submitted: 0,
          delivered: 0,
          failed: 0,
          unknown: 0,
          cancelled: 0,
        },
        expansionComplete: false,
        nextAt: now,
        createdAt: now,
        updatedAt: now,
      })
      c = (await ctx.db.get(id))!
    } else {
      c = await scoped(ctx, business.id, campaignId)
      // Safety pauses are allowed from stale UI state and do not revise the
      // campaign. All other changes remain optimistic-version checked.
      if (operation !== 'pause' && (c.revision ?? 0) !== expectedVersion)
        fail('version_conflict')
    }
    const oldVersion = c.versionId ? await ctx.db.get(c.versionId) : null
    if (['create', 'revise'].includes(operation)) {
      if (
        (c.fanoutQueued ?? 0) > 0 ||
        !['draft', 'scheduled', 'paused'].includes(c.state)
      )
        fail('invalid_state')
      const value = content(args.input)
      const audience = business.audiences.find((a) => a.id === value.audienceId)
      if (!audience) fail('invalid_input')
      let rendered: ReturnType<typeof renderEmail>
      try {
        rendered = input.blocks
          ? renderCampaign(campaignContent(input), business)
          : renderEmail({
              templateKey: 'newsletter',
              locale: value.locale,
              brand: business.brand,
              legalFooter: business.legalFooter,
              subject: value.subject,
              paragraphs: value.paragraphs,
              unsubscribeUrl: '{{{ pm:unsubscribe }}}',
            })
      } catch {
        // Drafts may be incomplete; keep a safe placeholder render while the
        // stored structured content remains the source of truth.
        rendered = renderEmail({
          templateKey: 'newsletter',
          locale: value.locale,
          brand: business.brand,
          legalFooter: business.legalFooter,
          subject:
            value.subject ||
            ('title' in value ? value.title : '') ||
            'Brouillon',
          paragraphs: value.paragraphs.length
            ? value.paragraphs
            : ['Brouillon incomplet'],
          unsubscribeUrl: '{{{ pm:unsubscribe }}}',
        })
      }
      const versionId = await ctx.db.insert('emailCampaignVersions', {
        ...value,
        purpose: audience.purpose,
        campaignId: c._id,
        businessId: business.id,
        number: (oldVersion?.number ?? 0) + 1,
        rendered,
        scheduledAt: value.scheduledAt,
        cutoff: now,
        route: deliveryRoute(config, business),
        createdAt: now,
      })
      await ctx.db.patch(c._id, {
        versionId,
        state: 'draft',
        approvedVersionId: undefined,
        approvedRoute: undefined,
        resumeState: undefined,
        blockReason: undefined,
        snapshotCursor: undefined,
        snapshotComplete: false,
        scanned: 0,
        eligible: 0,
        excluded: 0,
        fanoutCursor: undefined,
        fanoutQueued: 0,
        fanoutExcluded: 0,
      })
    } else {
      if (
        args.input &&
        Object.keys(args.input).some(
          (key) =>
            ![
              'campaignId',
              'expectedVersion',
              'reviewId',
              'reportId',
              'challengeId',
              'recipient',
              'scheduledAt',
              'reason',
              'membershipIds',
              'recipientIds',
              'action',
            ].includes(key)
        )
      )
        fail('invalid_input')
      if (!oldVersion) fail('invalid_state')
      if (operation === 'snapshot') {
        if (!['draft', 'paused'].includes(c.state)) fail('invalid_state')
        if (!oldVersion.subject.trim() || !oldVersion.paragraphs.length)
          fail('invalid_input')
        if (!c.snapshotComplete) {
          const batch = await ctx.db
            .query('emailMemberships')
            .withIndex('audience', (q) =>
              q
                .eq('businessId', business.id)
                .eq('audienceId', oldVersion.audienceId)
                .lte('_creationTime', oldVersion.cutoff)
            )
            .paginate({
              cursor: c.snapshotCursor ?? null,
              numItems: SNAPSHOT_PAGE,
            })
          let eligible = 0
          for (const member of batch.page) {
            if (
              member.purpose !== oldVersion.purpose ||
              member.state !== 'subscribed' ||
              member.purpose !== oldVersion.purpose ||
              member.updatedAt > oldVersion.cutoff ||
              !dispatchAllowed(
                config,
                business,
                member.email,
                'broadcast',
                now
              ) ||
              (await suppressed(
                ctx,
                business.id,
                member.email,
                business.broadcastStream
              ))
            )
              continue
            const exists = await ctx.db
              .query('emailCampaignRecipients')
              .withIndex('member', (q) =>
                q.eq('versionId', oldVersion._id).eq('membershipId', member._id)
              )
              .unique()
            if (!exists) {
              const ledger = await ledgerForContact(ctx, {
                businessId: business.id,
                campaignId: c._id,
                canonicalContactKey: member.email,
                planRevision: c.planRevision ?? 1,
              })
              await ctx.db.insert('emailCampaignRecipients', {
                businessId: business.id,
                campaignId: c._id,
                versionId: oldVersion._id,
                membershipId: member._id,
                generation: member.generation,
                canonicalContactKey: member.email,
                ledgerId: ledger._id,
                state: 'snapshot',
              })
              eligible++
            }
          }
          await ctx.db.patch(c._id, {
            snapshotCursor: batch.isDone ? undefined : batch.continueCursor,
            snapshotComplete: batch.isDone,
            scanned: (c.scanned ?? 0) + batch.page.length,
            eligible: (c.eligible ?? 0) + eligible,
            excluded: (c.excluded ?? 0) + batch.page.length - eligible,
            reviewCutoff: oldVersion.cutoff,
          })
        }
      } else if (operation === 'approve') {
        const requestedReviewId = input.reviewId
        if (
          requestedReviewId !== reviewId(c._id, c.revision ?? 0) ||
          !c.snapshotComplete
        )
          fail('review_required')
        const report = await currentReport(ctx, c._id, c.revision ?? 0)
        const expectedScope = evidenceScope({
          businessId: business.id,
          campaignId: c._id,
          versionId: oldVersion._id,
          audienceId: oldVersion.audienceId,
          purpose: oldVersion.purpose,
          route: oldVersion.route,
          planRevision: c.planRevision ?? 1,
        })
        const policy = await currentExecutionPolicy(
          ctx,
          business.id,
          oldVersion.route
        )
        if (
          !report ||
          input.reportId !== report._id ||
          report.status !== 'valid' ||
          report.expiresAt <= now ||
          report.scopeDigest !== expectedScope ||
          !policy.record ||
          report.policyRevision !== policy.record.revision
        )
          fail('preflight_blocked')
        await consumeHumanChallenge(ctx, {
          challengeId: input.challengeId,
          businessId: business.id,
          action: 'approve',
          scopeDigest: expectedScope,
          reportId: report._id,
          revision: c.revision ?? 0,
          actorId: args.actorId,
          sessionRef: args.sessionRef,
          now,
        })
        if (
          (c.state !== 'draft' &&
            !(
              c.state === 'paused' && c.blockReason === 'remaining_plan_reduced'
            )) ||
          requiresLiveTest(config, business) ||
          !business.activated ||
          !business.audiences.some(
            (a) =>
              a.id === oldVersion.audienceId && a.purpose === oldVersion.purpose
          ) ||
          oldVersion.route !== deliveryRoute(config, business)
        )
          fail('invalid_state')
        await ctx.db.patch(c._id, {
          state: oldVersion.scheduledAt > now ? 'scheduled' : 'sending',
          approvedVersionId: oldVersion._id,
          approvedRoute: oldVersion.route,
          nextAt:
            typeof input.scheduledAt === 'string' &&
            Number.isFinite(Date.parse(input.scheduledAt))
              ? Date.parse(input.scheduledAt)
              : oldVersion.scheduledAt,
          approvedScheduledAt:
            typeof input.scheduledAt === 'string' &&
            Number.isFinite(Date.parse(input.scheduledAt))
              ? Date.parse(input.scheduledAt)
              : oldVersion.scheduledAt,
          reviewCutoff: oldVersion.cutoff,
          pausedAt: undefined,
          expansionComplete: false,
          blockReason: undefined,
        })
      } else if (operation === 'test') {
        const recipient = input.recipient
        if (typeof recipient !== 'string') fail('invalid_input')
        const normalized = recipient.trim().toLowerCase()
        const audience = business.audiences.find(
          (a) =>
            a.id === oldVersion.audienceId && a.purpose === oldVersion.purpose
        )
        if (
          !audience ||
          !dispatchAllowed(config, business, normalized, 'broadcast', now) ||
          (await suppressed(
            ctx,
            business.id,
            normalized,
            business.broadcastStream
          ))
        )
          fail('recipient_not_eligible')
        const messageId = await ctx.db.insert('emailMessages', {
          businessId: business.id,
          email: normalized,
          audienceId: oldVersion.audienceId,
          purpose: oldVersion.purpose,
          kind: 'broadcast_test',
          rendered: oldVersion.rendered,
          state: 'queued',
          createdAt: now,
          nextAt: now,
          route: oldVersion.route,
          campaignId: c._id,
          campaignVersionId: oldVersion._id,
        })
        ;(c as any).__test = {
          message_id: messageId,
          version: c.revision,
          state: 'queued',
        }
      } else if (operation === 'delete') {
        if (c.state !== 'draft' || (c.fanoutQueued ?? 0) > 0)
          fail('invalid_state')
        await ctx.db.delete(c._id)
        const result = { deleted: true }
        const operationId = await ctx.db.insert('emailCampaignRequests', {
          businessId: business.id,
          clientId: client.id,
          key: key!,
          fingerprint,
          result,
          at: now,
        })
        void operationId
        return result
      } else if (operation === 'pause') {
        if (['completed', 'cancelled'].includes(c.state)) {
          // A terminal stop is an idempotent receipt, never a state rewrite.
        } else if (c.state === 'draft') {
          await ctx.db.patch(c._id, { blockReason: 'operator_paused' })
        } else {
          await ctx.db.patch(c._id, {
            state: 'paused',
            resumeState: c.state,
            pausedAt: now,
            blockReason: 'operator_paused',
            dispatchEpoch: (c.dispatchEpoch ?? 0) + 1,
          })
        }
      } else if (operation === 'challenge') {
        const action = input.action
        if (
          !['approve', 'resume'].includes(action) ||
          typeof args.actorId !== 'string' ||
          !args.actorId ||
          typeof args.sessionRef !== 'string' ||
          !args.sessionRef
        )
          fail('human_authority_required')
        if (
          (action === 'approve' &&
            (!c.snapshotComplete ||
              (c.state !== 'draft' &&
                !(
                  c.state === 'paused' &&
                  c.blockReason === 'remaining_plan_reduced'
                )))) ||
          (action === 'resume' &&
            (c.state !== 'paused' ||
              !c.resumeState ||
              c.approvedVersionId !== oldVersion._id))
        )
          fail('invalid_state')
        const report = await currentReport(ctx, c._id, c.revision ?? 0)
        const scopeDigest = evidenceScope({
          businessId: business.id,
          campaignId: c._id,
          versionId: oldVersion._id,
          audienceId: oldVersion.audienceId,
          purpose: oldVersion.purpose,
          route: oldVersion.route,
          planRevision: c.planRevision ?? 1,
        })
        const policy = await currentExecutionPolicy(
          ctx,
          business.id,
          oldVersion.route
        )
        if (
          !report ||
          input.reportId !== report._id ||
          report.status !== 'valid' ||
          report.expiresAt <= now ||
          report.scopeDigest !== scopeDigest ||
          (action === 'resume' &&
            (!c.pausedAt || report.checkedAt <= c.pausedAt)) ||
          !policy.record ||
          report.policyRevision !== policy.record.revision
        )
          fail('preflight_blocked')
        const challengeId = crypto.randomUUID()
        const expiresAt = now + 120_000
        await ctx.db.insert('emailOperatorChallenges', {
          challengeId,
          actorId: args.actorId,
          sessionRef: args.sessionRef,
          businessId: business.id,
          action,
          scopeDigest,
          reportId: report._id,
          revision: c.revision ?? 0,
          expiresAt,
        })
        generatedChallenge = {
          id: challengeId,
          reportId: report._id,
          expiresAt,
        }
      } else if (operation === 'resume') {
        const report = await currentReport(ctx, c._id, c.revision ?? 0)
        const scopeDigest = evidenceScope({
          businessId: business.id,
          campaignId: c._id,
          versionId: oldVersion._id,
          audienceId: oldVersion.audienceId,
          purpose: oldVersion.purpose,
          route: oldVersion.route,
          planRevision: c.planRevision ?? 1,
        })
        const policy = await currentExecutionPolicy(
          ctx,
          business.id,
          oldVersion.route
        )
        if (
          !report ||
          input.reportId !== report._id ||
          report.status !== 'valid' ||
          report.expiresAt <= now ||
          report.scopeDigest !== scopeDigest ||
          !c.pausedAt ||
          report.checkedAt <= c.pausedAt ||
          !policy.record ||
          report.policyRevision !== policy.record.revision
        )
          fail('preflight_blocked')
        await consumeHumanChallenge(ctx, {
          challengeId: input.challengeId,
          businessId: business.id,
          action: 'resume',
          scopeDigest,
          reportId: report._id,
          revision: c.revision ?? 0,
          actorId: args.actorId,
          sessionRef: args.sessionRef,
          now,
        })
        if (
          c.state !== 'paused' ||
          !c.resumeState ||
          c.approvedVersionId !== oldVersion._id ||
          oldVersion.route !== deliveryRoute(config, business) ||
          requiresLiveTest(config, business)
        )
          fail('invalid_state')
        await ctx.db.patch(c._id, {
          state: c.resumeState,
          resumeState: undefined,
          pausedAt: undefined,
          blockReason: undefined,
          nextAt: Math.max(now, oldVersion.scheduledAt),
        })
      } else if (operation === 'cancel') {
        if (c.state !== 'cancelled')
          await ctx.db.patch(c._id, {
            state: 'cancelled',
            blockReason: 'operator_cancelled',
            dispatchEpoch: (c.dispatchEpoch ?? 0) + 1,
          })
      } else if (operation === 'reduce') {
        if (
          ![
            'scheduled',
            'sending',
            'running',
            'fanout_complete',
            'paused',
            'completed',
          ].includes(c.state)
        )
          fail('invalid_state')
        if (
          (!Array.isArray(input.recipientIds) &&
            !Array.isArray(input.membershipIds)) ||
          (input.recipientIds ?? input.membershipIds).some(
            (id: unknown) => typeof id !== 'string'
          )
        )
          fail('invalid_input')
        const selectedRecipients = Array.isArray(input.recipientIds)
          ? new Set(input.recipientIds)
          : null
        const selectedMemberships = selectedRecipients
          ? null
          : new Set(input.membershipIds)
        const recipients = await ctx.db
          .query('emailCampaignRecipients')
          .withIndex('campaign', (q) => q.eq('campaignId', c._id))
          .collect()
        // The caller may only shrink the frozen remaining plan; membership IDs
        // not in this campaign cannot be smuggled into a revision.
        if (
          selectedRecipients
            ? Array.from(selectedRecipients).some(
                (id) => !recipients.some((row) => row._id === id)
              )
            : Array.from(selectedMemberships!).some(
                (id) => !recipients.some((row) => row.membershipId === id)
              )
        )
          fail('invalid_input')
        for (const row of recipients) {
          const ledger = row.ledgerId && (await ctx.db.get(row.ledgerId))
          const permanentlyTreated =
            ledger &&
            [
              'departure_authorized',
              'accepted',
              'delivered',
              'unknown',
            ].includes(ledger.state)
          const selected = selectedRecipients
            ? selectedRecipients.has(row._id)
            : selectedMemberships!.has(row.membershipId)
          if (!selected && !permanentlyTreated) {
            if (row.messageId) {
              const message = await ctx.db.get(row.messageId)
              if (message?.state === 'queued')
                await ctx.db.patch(message._id, { state: 'cancelled' })
            }
            await ctx.db.patch(row._id, {
              state: 'excluded',
              reason: 'remaining_plan_reduced',
            })
          }
        }
        await ctx.db.patch(c._id, {
          state: 'paused',
          resumeState: undefined,
          approvedVersionId: undefined,
          approvedRoute: undefined,
          blockReason: 'remaining_plan_reduced',
          planRevision: (c.planRevision ?? 1) + 1,
          dispatchEpoch: (c.dispatchEpoch ?? 0) + 1,
        })
      }
    }
    const operationId = await ctx.db.insert('emailCampaignRequests', {
      businessId: business.id,
      clientId: client.id,
      key: key!,
      fingerprint,
      result: null,
      at: now,
    })
    await ctx.db.patch(c._id, {
      revision:
        (c.revision ?? 0) +
        (['create', 'revise', 'reduce'].includes(operation) ? 1 : 0),
      operationId,
      updatedAt: now,
    })
    let result: any = await currentReceipt(ctx, c._id)
    if (operation === 'snapshot') {
      const refreshed = (await ctx.db.get(c._id))!
      const evidence = await createEvidenceReport(ctx, {
        businessId: business.id,
        campaignId: refreshed._id,
        versionId: oldVersion!._id,
        revision: refreshed.revision ?? 0,
        audienceId: oldVersion!.audienceId,
        purpose: oldVersion!.purpose,
        route: oldVersion!.route,
        planRevision: refreshed.planRevision ?? 1,
        now,
      })
      result = {
        ...result,
        review: {
          id: reviewId(refreshed._id, refreshed.revision ?? 0),
          complete: refreshed.snapshotComplete,
          eligible_count: refreshed.eligible,
          excluded_count: refreshed.excluded,
          html: oldVersion!.rendered.html,
          text: oldVersion!.rendered.text,
          report_id: evidence.reportId,
          expires_at: evidence.report?.expiresAt ?? null,
          blocking_checks: evidence.report?.blockingChecks ?? [],
        },
      }
    }
    if (operation === 'challenge') {
      result = {
        ...result,
        challenge: {
          id: generatedChallenge!.id,
          report_id: generatedChallenge!.reportId,
          expires_at: generatedChallenge!.expiresAt,
        },
      }
    }
    if (operation === 'test' && (c as any).__test)
      result = { ...result, test: (c as any).__test }
    await ctx.db.patch(operationId, { result })
    return result
  },
})

/** Each bounded page commits its recipient-to-message links and cursor together. */
export const expand = mutation({
  args: {
    credential: v.string(),
    businessId: v.string(),
    campaignId: v.id('emailCampaigns'),
  },
  handler: async (ctx, args) => {
    const { config, business } = authorize(
      args.credential,
      args.businessId,
      'campaign_dispatch'
    )
    authorize(args.credential, args.businessId, 'dispatch')
    const c = await scoped(ctx, business.id, args.campaignId)
    const version = c.versionId && (await ctx.db.get(c.versionId))
    if (!version || c.approvedVersionId !== version._id) return { processed: 0 }
    if ((c.approvedScheduledAt ?? version.scheduledAt) > Date.now())
      return { processed: 0 }
    const execution = await currentExecutionPolicy(
      ctx,
      business.id,
      version.route
    )
    const page = await ctx.db
      .query('emailCampaignRecipients')
      .withIndex('version', (q) => q.eq('versionId', version._id))
      .paginate({ cursor: c.fanoutCursor ?? null, numItems: SNAPSHOT_PAGE })
    let queued = 0
    let excluded = 0
    let firstLotComplete = c.firstLotComplete ?? false
    for (const snapshot of page.page) {
      if (
        !firstLotComplete &&
        firstLotExhausted(execution.limits, (c.fanoutQueued ?? 0) + queued)
      ) {
        firstLotComplete = true
        break
      }
      if (snapshot.messageId || snapshot.state !== 'snapshot') continue
      const member = await ctx.db.get(snapshot.membershipId)
      if (
        !member ||
        member.state !== 'subscribed' ||
        member.generation !== snapshot.generation ||
        !dispatchAllowed(
          config,
          business,
          member.email,
          'broadcast',
          Date.now()
        ) ||
        (await suppressed(
          ctx,
          business.id,
          member.email,
          business.broadcastStream
        ))
      ) {
        await ctx.db.patch(snapshot._id, {
          state: 'excluded',
          reason: 'recipient_no_longer_eligible',
        })
        excluded++
        continue
      }
      const ledger =
        snapshot.ledgerId ||
        (
          await ledgerForContact(ctx, {
            businessId: business.id,
            campaignId: c._id,
            canonicalContactKey: member.email,
            planRevision: c.planRevision ?? 1,
          })
        )._id
      if (!snapshot.ledgerId)
        await ctx.db.patch(snapshot._id, { ledgerId: ledger })
      const messageId = await ctx.db.insert('emailMessages', {
        businessId: business.id,
        email: member.email,
        audienceId: version.audienceId,
        purpose: version.purpose,
        kind: 'broadcast',
        rendered: version.rendered,
        state: 'queued',
        createdAt: Date.now(),
        nextAt: Date.now(),
        route: version.route,
        campaignId: c._id,
        campaignVersionId: version._id,
        campaignRecipientId: snapshot._id,
        campaignLedgerId: ledger,
        campaignMembershipGeneration: member.generation,
      })
      await ctx.db.patch(snapshot._id, { state: 'queued', messageId })
      queued++
    }
    await ctx.db.patch(c._id, {
      state: firstLotComplete
        ? 'paused'
        : page.isDone
          ? 'fanout_complete'
          : 'running',
      resumeState: firstLotComplete ? 'sending' : undefined,
      blockReason: firstLotComplete
        ? 'first_lot_observation_required'
        : undefined,
      firstLotComplete,
      fanoutCursor: firstLotComplete
        ? c.fanoutCursor
        : page.isDone
          ? undefined
          : page.continueCursor,
      fanoutQueued: (c.fanoutQueued ?? 0) + queued,
      fanoutExcluded: (c.fanoutExcluded ?? 0) + excluded,
      expansionComplete: page.isDone,
      counters: {
        ...(c.counters ?? {}),
        queued: (c.counters?.queued ?? 0) + queued,
        cancelled: (c.counters?.cancelled ?? 0) + excluded,
      },
      nextAt: Date.now() + 1000,
      updatedAt: Date.now(),
    })
    return { processed: queued }
  },
})

/** Each bounded page commits its recipient-to-message links and cursor together. */
export const pump = mutation({
  args: { credential: v.string(), businessId: v.string() },
  handler: async (ctx, args) => {
    const { config, business } = authorize(
      args.credential,
      args.businessId,
      'campaign_dispatch'
    )
    authorize(args.credential, args.businessId, 'dispatch')
    if (
      !business.activated ||
      requiresLiveTest(config, business) ||
      (await emailChannelPaused(ctx, business.id, 'broadcast'))
    )
      return { processed: 0 }
    const now = Date.now()
    let processed = 0
    const candidates = (
      await Promise.all(
        ['scheduled', 'sending', 'running'].map((state) =>
          ctx.db
            .query('emailCampaigns')
            .withIndex('due', (q) =>
              q
                .eq('businessId', business.id)
                .eq('state', state)
                .lte('nextAt', now)
            )
            .take(1)
        )
      )
    )
      .flat()
      .sort((a, b) => a.nextAt - b.nextAt || a._creationTime - b._creationTime)
    // Convex supports one pagination call per invocation. Rotate one campaign page per tick.
    for (const c of candidates.slice(0, 1)) {
      const version = c.versionId && (await ctx.db.get(c.versionId))
      if (
        !version ||
        version._id !== c.approvedVersionId ||
        version.route !== deliveryRoute(config, business) ||
        c.approvedRoute !== version.route
      ) {
        await ctx.db.patch(c._id, {
          state: 'paused',
          resumeState: c.state,
          blockReason: 'delivery_route_changed',
          updatedAt: now,
        })
        continue
      }
      if ((c.approvedScheduledAt ?? version.scheduledAt) > now) continue
      const execution = await currentExecutionPolicy(
        ctx,
        business.id,
        version.route
      )
      const page = await ctx.db
        .query('emailCampaignRecipients')
        .withIndex('version', (q) => q.eq('versionId', version._id))
        .paginate({ cursor: c.fanoutCursor ?? null, numItems: FANOUT_PAGE })
      let queued = 0,
        excluded = 0
      let firstLotComplete = c.firstLotComplete ?? false
      for (const snapshot of page.page) {
        if (
          !firstLotComplete &&
          firstLotExhausted(execution.limits, (c.fanoutQueued ?? 0) + queued)
        ) {
          firstLotComplete = true
          break
        }
        if (snapshot.messageId || snapshot.state !== 'snapshot') continue
        const member = await ctx.db.get(snapshot.membershipId)
        if (
          !member ||
          member.businessId !== business.id ||
          member.audienceId !== version.audienceId ||
          member.purpose !== version.purpose ||
          member.generation !== snapshot.generation ||
          member.state !== 'subscribed' ||
          !dispatchAllowed(config, business, member.email, 'broadcast', now) ||
          (await suppressed(
            ctx,
            business.id,
            member.email,
            business.broadcastStream
          ))
        ) {
          await ctx.db.patch(snapshot._id, {
            state: 'excluded',
            reason: 'recipient_no_longer_eligible',
          })
          excluded++
          continue
        }
        const audience = business.audiences.find(
          (a) => a.id === version.audienceId
        )
        if (!audience || audience.purpose !== version.purpose) {
          await ctx.db.patch(snapshot._id, {
            state: 'excluded',
            reason: 'audience_unavailable',
          })
          excluded++
          continue
        }
        const ledger =
          snapshot.ledgerId ||
          (
            await ledgerForContact(ctx, {
              businessId: business.id,
              campaignId: c._id,
              canonicalContactKey: member.email,
              planRevision: c.planRevision ?? 1,
            })
          )._id
        if (!snapshot.ledgerId)
          await ctx.db.patch(snapshot._id, { ledgerId: ledger })
        const messageId = await ctx.db.insert('emailMessages', {
          businessId: business.id,
          email: member.email,
          audienceId: version.audienceId,
          purpose: audience.purpose,
          kind: 'broadcast',
          rendered: version.rendered,
          state: 'queued',
          createdAt: now,
          nextAt: now,
          route: version.route,
          campaignId: c._id,
          campaignVersionId: version._id,
          campaignRecipientId: snapshot._id,
          campaignLedgerId: ledger,
          campaignMembershipGeneration: member.generation,
        })
        await ctx.db.patch(snapshot._id, { state: 'queued', messageId })
        queued++
      }
      await ctx.db.patch(c._id, {
        state: firstLotComplete
          ? 'paused'
          : page.isDone
            ? 'fanout_complete'
            : 'running',
        resumeState: firstLotComplete ? 'sending' : undefined,
        blockReason: firstLotComplete
          ? 'first_lot_observation_required'
          : undefined,
        firstLotComplete,
        fanoutCursor: firstLotComplete
          ? c.fanoutCursor
          : page.isDone
            ? undefined
            : page.continueCursor,
        fanoutQueued: (c.fanoutQueued ?? 0) + queued,
        fanoutExcluded: (c.fanoutExcluded ?? 0) + excluded,
        counters: {
          ...(c.counters ?? {
            queued: 0,
            sending: 0,
            submitted: 0,
            delivered: 0,
            failed: 0,
            unknown: 0,
            cancelled: 0,
          }),
          queued: (c.counters?.queued ?? 0) + queued,
          cancelled: (c.counters?.cancelled ?? 0) + excluded,
        },
        expansionComplete: page.isDone,
        nextAt: now + 1_000,
        updatedAt: now,
      })
      processed += queued
    }
    return { processed }
  },
})

export const read = query({
  args: {
    credential: v.string(),
    businessId: v.string(),
    actorId: v.optional(v.string()),
    view: v.optional(v.string()),
    campaignId: v.optional(v.id('emailCampaigns')),
    paginationOpts: v.optional(paginationOptsValidator),
    operation: v.optional(v.string()),
    input: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    authorize(args.credential, args.businessId, 'campaign_read')
    const view = args.view ?? args.operation ?? 'list'
    const input = (args.input ?? {}) as Record<string, any>
    const campaignId = args.campaignId ?? input.campaignId
    const paginationOpts = args.paginationOpts ?? {
      numItems: Math.min(Number(input.limit ?? 20), 100),
      cursor: input.cursor ?? null,
    }
    if (
      !Number.isSafeInteger(paginationOpts.numItems) ||
      paginationOpts.numItems < 1 ||
      paginationOpts.numItems > 100 ||
      (paginationOpts.cursor?.length ?? 0) > 4096
    )
      fail('invalid_input')
    if (view === 'list') {
      const page = await ctx.db
        .query('emailCampaigns')
        .withIndex('business', (q) => q.eq('businessId', args.businessId))
        .order('desc')
        .paginate(paginationOpts)
      return {
        page: await Promise.all(
          page.page.map((c) => currentReceipt(ctx, c._id))
        ),
        cursor: page.isDone ? null : page.continueCursor,
        complete: page.isDone,
      }
    }
    const c = await scoped(ctx, args.businessId, campaignId)
    const version = c.versionId && (await ctx.db.get(c.versionId))
    if (!version) fail('invalid_state')
    if (view === 'status' || view === 'get') return receipt(c, version)
    if (view === 'preview')
      return {
        ...receipt(c, version),
        template_key: 'newsletter',
        template_version: '1',
        locale: version.locale,
        subject: version.subject,
        paragraphs: version.paragraphs,
        rendered: version.rendered,
      }
    if (view !== 'recipients') fail('invalid_input')
    const page = await ctx.db
      .query('emailCampaignRecipients')
      .withIndex('version', (q) => q.eq('versionId', version._id))
      .paginate(paginationOpts)
    const counts: Record<string, number> = {}
    const rows = await Promise.all(
      page.page.map(async (row) => {
        const message = row.messageId && (await ctx.db.get(row.messageId))
        const state = message?.state ?? row.state
        const ledger = row.ledgerId && (await ctx.db.get(row.ledgerId))
        const protectedLedgerStates = [
          'departure_authorized',
          'accepted',
          'delivered',
          'unknown',
        ]
        const protectedByLedger = Boolean(
          ledger && protectedLedgerStates.includes(ledger.state)
        )
        counts[state] = (counts[state] ?? 0) + 1
        return {
          recipient_reference: row._id,
          message_id: row.messageId ?? null,
          state,
          reason: row.reason ?? null,
          reducible:
            !protectedByLedger &&
            (!ledger || ledger.state === 'eligible') &&
            ['snapshot', 'queued'].includes(state),
          protected: protectedByLedger,
        }
      })
    )
    return {
      ...receipt(c, version),
      page: rows,
      cursor: page.isDone ? null : page.continueCursor,
      complete: page.isDone,
      page_state_counts: counts,
    }
  },
})
