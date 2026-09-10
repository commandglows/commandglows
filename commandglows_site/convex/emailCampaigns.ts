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

const PAGE = 25
const contentKeys = [
  'audienceId',
  'locale',
  'subject',
  'paragraphs',
  'scheduledAt',
  'timezone',
]
function content(input: any) {
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
  return {
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
    key: v.string(),
    operation: v.string(),
    expectedVersion: v.number(),
    campaignId: v.optional(v.id('emailCampaigns')),
    input: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
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
        'approve',
        'pause',
        'resume',
        'cancel',
      ].includes(args.operation) ||
      !/^[A-Za-z0-9_:-]{16,128}$/.test(args.key) ||
      !Number.isSafeInteger(args.expectedVersion) ||
      JSON.stringify(args.input ?? {}).length > 100_000
    )
      fail('invalid_input')
    const fingerprint = canonical({
      operation: args.operation,
      expectedVersion: args.expectedVersion,
      campaignId: args.campaignId ?? null,
      input: args.input ?? {},
    })
    const previous = await ctx.db
      .query('emailCampaignRequests')
      .withIndex('scope', (q) =>
        q
          .eq('businessId', business.id)
          .eq('clientId', client.id)
          .eq('key', args.key)
      )
      .unique()
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('idempotency_conflict')
      return previous.result
    }
    const now = Date.now()
    let c: Doc<'emailCampaigns'>
    if (args.operation === 'create') {
      if (args.campaignId || args.expectedVersion !== 0)
        fail('version_conflict')
      const id = await ctx.db.insert('emailCampaigns', {
        businessId: business.id,
        revision: 0,
        state: 'draft',
        snapshotComplete: false,
        scanned: 0,
        eligible: 0,
        excluded: 0,
        fanoutQueued: 0,
        fanoutExcluded: 0,
        nextAt: now,
        createdAt: now,
        updatedAt: now,
      })
      c = (await ctx.db.get(id))!
    } else {
      c = await scoped(ctx, business.id, args.campaignId)
      if (c.revision !== args.expectedVersion) fail('version_conflict')
    }
    const oldVersion = c.versionId ? await ctx.db.get(c.versionId) : null
    if (['create', 'revise'].includes(args.operation)) {
      if (
        c.fanoutQueued > 0 ||
        !['draft', 'scheduled', 'paused'].includes(c.state)
      )
        fail('invalid_state')
      const value = content(args.input)
      const audience = business.audiences.find((a) => a.id === value.audienceId)
      if (!audience) fail('invalid_input')
      let rendered: ReturnType<typeof renderEmail>
      try {
        rendered = renderEmail({
          templateKey: 'newsletter',
          locale: value.locale,
          brand: business.brand,
          legalFooter: business.legalFooter,
          subject: value.subject,
          paragraphs: value.paragraphs,
          unsubscribeUrl: '{{{ pm:unsubscribe }}}',
        })
      } catch {
        return fail('invalid_input')
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
      if (args.input && Object.keys(args.input).length) fail('invalid_input')
      if (!oldVersion) fail('invalid_state')
      if (args.operation === 'snapshot') {
        if (c.state !== 'draft') fail('invalid_state')
        if (!c.snapshotComplete) {
          const batch = await ctx.db
            .query('emailMemberships')
            .withIndex('audience', (q) =>
              q
                .eq('businessId', business.id)
                .eq('audienceId', oldVersion.audienceId)
                .lte('_creationTime', oldVersion.cutoff)
            )
            .paginate({ cursor: c.snapshotCursor ?? null, numItems: PAGE })
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
              await ctx.db.insert('emailCampaignRecipients', {
                businessId: business.id,
                campaignId: c._id,
                versionId: oldVersion._id,
                membershipId: member._id,
                generation: member.generation,
                state: 'snapshot',
              })
              eligible++
            }
          }
          await ctx.db.patch(c._id, {
            snapshotCursor: batch.isDone ? undefined : batch.continueCursor,
            snapshotComplete: batch.isDone,
            scanned: c.scanned + batch.page.length,
            eligible: c.eligible + eligible,
            excluded: c.excluded + batch.page.length - eligible,
          })
        }
      } else if (args.operation === 'approve') {
        if (
          c.state !== 'draft' ||
          !c.snapshotComplete ||
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
          state: 'scheduled',
          approvedVersionId: oldVersion._id,
          approvedRoute: oldVersion.route,
          nextAt: oldVersion.scheduledAt,
          blockReason: undefined,
        })
      } else if (args.operation === 'pause') {
        if (!['scheduled', 'running', 'fanout_complete'].includes(c.state))
          fail('invalid_state')
        await ctx.db.patch(c._id, {
          state: 'paused',
          resumeState: c.state,
          blockReason: 'operator_paused',
        })
      } else if (args.operation === 'resume') {
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
          blockReason: undefined,
          nextAt: Math.max(now, oldVersion.scheduledAt),
        })
      } else if (args.operation === 'cancel') {
        if (c.state === 'cancelled') fail('invalid_state')
        await ctx.db.patch(c._id, {
          state: 'cancelled',
          blockReason: 'operator_cancelled',
        })
      }
    }
    const operationId = await ctx.db.insert('emailCampaignRequests', {
      businessId: business.id,
      clientId: client.id,
      key: args.key,
      fingerprint,
      result: null,
      at: now,
    })
    await ctx.db.patch(c._id, {
      revision: c.revision + 1,
      operationId,
      updatedAt: now,
    })
    const result = await currentReceipt(ctx, c._id)
    await ctx.db.patch(operationId, { result })
    return result
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
        ['scheduled', 'running'].map((state) =>
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
      if (version.scheduledAt > now) continue
      const page = await ctx.db
        .query('emailCampaignRecipients')
        .withIndex('version', (q) => q.eq('versionId', version._id))
        .paginate({ cursor: c.fanoutCursor ?? null, numItems: PAGE })
      let queued = 0,
        excluded = 0
      for (const snapshot of page.page) {
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
        })
        await ctx.db.patch(snapshot._id, { state: 'queued', messageId })
        queued++
      }
      await ctx.db.patch(c._id, {
        state: page.isDone ? 'fanout_complete' : 'running',
        fanoutCursor: page.isDone ? undefined : page.continueCursor,
        fanoutQueued: c.fanoutQueued + queued,
        fanoutExcluded: c.fanoutExcluded + excluded,
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
    view: v.string(),
    campaignId: v.optional(v.id('emailCampaigns')),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authorize(args.credential, args.businessId, 'campaign_read')
    if (
      !Number.isSafeInteger(args.paginationOpts.numItems) ||
      args.paginationOpts.numItems < 1 ||
      args.paginationOpts.numItems > 100 ||
      (args.paginationOpts.cursor?.length ?? 0) > 4096
    )
      fail('invalid_input')
    if (args.view === 'list') {
      const page = await ctx.db
        .query('emailCampaigns')
        .withIndex('business', (q) => q.eq('businessId', args.businessId))
        .order('desc')
        .paginate(args.paginationOpts)
      return {
        page: await Promise.all(
          page.page.map((c) => currentReceipt(ctx, c._id))
        ),
        cursor: page.isDone ? null : page.continueCursor,
        complete: page.isDone,
      }
    }
    const c = await scoped(ctx, args.businessId, args.campaignId)
    const version = c.versionId && (await ctx.db.get(c.versionId))
    if (!version) fail('invalid_state')
    if (args.view === 'status') return receipt(c, version)
    if (args.view === 'preview')
      return {
        ...receipt(c, version),
        template_key: 'newsletter',
        template_version: '1',
        locale: version.locale,
        subject: version.subject,
        paragraphs: version.paragraphs,
        rendered: version.rendered,
      }
    if (args.view !== 'recipients') fail('invalid_input')
    const page = await ctx.db
      .query('emailCampaignRecipients')
      .withIndex('version', (q) => q.eq('versionId', version._id))
      .paginate(args.paginationOpts)
    const counts: Record<string, number> = {}
    const rows = await Promise.all(
      page.page.map(async (row) => {
        const message = row.messageId && (await ctx.db.get(row.messageId))
        const state = message?.state ?? row.state
        counts[state] = (counts[state] ?? 0) + 1
        return {
          recipient_reference: row._id,
          message_id: row.messageId ?? null,
          state,
          reason: row.reason ?? null,
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
