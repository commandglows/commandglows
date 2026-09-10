import { mutation, query, internalMutation } from './_generated/server'
import { makeFunctionReference } from 'convex/server'
import { v } from 'convex/values'
import {
  authorize,
  canonical,
  fail,
  normalizeEmail,
  parseEmailConfig,
} from './emailConfig'
import {
  campaignContent,
  renderCampaign,
} from '../src/lib/email/central/campaignContent'
import { emptyCampaignCounters, patchEmailMessage } from './emailCampaignState'
import { suppressed } from './email'

const PAGE = 50
const expandRef = makeFunctionReference<'mutation'>(
  'emailCampaigns:expand'
) as any
const cancelRef = makeFunctionReference<'mutation'>(
  'emailCampaigns:cancelPage'
) as any
const states = ['draft', 'scheduled', 'sending', 'completed', 'cancelled']
const iso = (n: number | undefined) =>
  n === undefined ? null : new Date(n).toISOString()
const requiredString = (s: unknown, max = 256): string =>
  typeof s === 'string' && s.trim() && s.length <= max
    ? s
    : fail('invalid_input')
function strict(input: any, keys: string[]) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => !keys.includes(k))
  )
    fail('invalid_input')
}
function wire(c: any) {
  return {
    id: c._id,
    business_id: c.businessId,
    title: c.title,
    audience_id: c.audienceId,
    locale: c.locale,
    subject: c.subject,
    preheader: c.preheader,
    blocks: c.blocks,
    version: c.version,
    state: c.state,
    created_at: iso(c.createdAt),
    updated_at: iso(c.updatedAt),
    scheduled_at: iso(c.scheduledAt),
    counters: c.counters,
    expansion_complete: c.expansionComplete,
    eligible_count: c.reviewComplete ? c.reviewCount : null,
  }
}
async function campaign(ctx: any, id: unknown, businessId: string) {
  const normalized = ctx.db.normalizeId('emailCampaigns', requiredString(id))
  const c = normalized && (await ctx.db.get(normalized))
  if (!c || c.businessId !== businessId) fail('not_found')
  return c
}
function capabilities(b: any) {
  const enabled = Boolean(
    b.activated && b.allowedRecipients?.length && b.retentionDays
  )
  return {
    can_test: enabled,
    can_approve: enabled,
    disabled_reason: enabled ? null : 'pilot_not_configured',
  }
}
function checkContent(input: any, b: any) {
  try {
    const content = campaignContent(input)
    if (!b.audiences.some((a: any) => a.id === content.audienceId))
      fail('invalid_input')
    return content
  } catch {
    return fail('invalid_input')
  }
}
function rendered(c: any, b: any) {
  try {
    return renderCampaign(c, b)
  } catch {
    return fail('invalid_input')
  }
}
async function eligible(ctx: any, m: any, b: any, cutoff: number) {
  return (
    m.state === 'subscribed' &&
    m._creationTime <= cutoff &&
    m.updatedAt <= cutoff &&
    b.allowedRecipients?.includes(m.email) &&
    !(await suppressed(ctx, b.id, m.email, b.broadcastStream))
  )
}
async function page(ctx: any, c: any, cursor: string | null) {
  return ctx.db
    .query('emailMemberships')
    .withIndex('audience', (q: any) =>
      q
        .eq('businessId', c.businessId)
        .eq('audienceId', c.audienceId)
        .eq('state', 'subscribed')
    )
    .paginate({ numItems: PAGE, cursor })
}
export const read = query({
  args: {
    credential: v.string(),
    actorId: v.string(),
    businessId: v.optional(v.string()),
    operation: v.string(),
    input: v.any(),
  },
  handler: async (ctx, a) => {
    requiredString(a.actorId)
    if (a.operation === 'context') {
      strict(a.input, [])
      const config = parseEmailConfig(process.env.EMAIL_CONTROL_CONFIG)
      const businesses = []
      for (const b of config.businesses) {
        try {
          authorize(a.credential, b.id, 'campaign_read')
        } catch {
          continue
        }
        businesses.push({
          id: b.id,
          brand: b.brand,
          from: b.from,
          audiences: b.audiences.map((x) => ({ id: x.id, purpose: x.purpose })),
          capabilities: capabilities(b),
          test_recipients: b.allowedRecipients ?? [],
        })
      }
      if (!businesses.length) fail('forbidden')
      return { businesses }
    }
    const businessId = requiredString(a.businessId)
    authorize(a.credential, businessId, 'campaign_read')
    if (a.operation === 'get') {
      strict(a.input, ['campaignId'])
      const c = await campaign(ctx, a.input.campaignId, businessId)
      return {
        campaign: wire(c),
        rendered: c.rendered
          ? { html: c.rendered.html, text: c.rendered.text }
          : null,
      }
    }
    if (a.operation !== 'list') fail('invalid_input')
    strict(a.input, ['cursor', 'state', 'limit'])
    const limit = a.input.limit ?? 20
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
      fail('invalid_input')
    if (a.input.state !== undefined && !states.includes(a.input.state))
      fail('invalid_input')
    const cursor =
      a.input.cursor === undefined || a.input.cursor === null
        ? null
        : requiredString(a.input.cursor, 4096)
    const result = await (
      a.input.state
        ? ctx.db
            .query('emailCampaigns')
            .withIndex('state', (q) =>
              q.eq('businessId', businessId).eq('state', a.input.state)
            )
        : ctx.db
            .query('emailCampaigns')
            .withIndex('business', (q) => q.eq('businessId', businessId))
    )
      .order('desc')
      .paginate({ numItems: limit, cursor })
    return {
      campaigns: result.page.map(wire),
      next_cursor: result.isDone ? null : result.continueCursor,
    }
  },
})

export const command = mutation({
  args: {
    credential: v.string(),
    actorId: v.string(),
    businessId: v.string(),
    operation: v.string(),
    idempotencyKey: v.string(),
    input: v.any(),
  },
  handler: async (ctx, a) => {
    const { business: b } = authorize(
      a.credential,
      a.businessId,
      'campaign_write'
    )
    requiredString(a.actorId)
    if (!/^[A-Za-z0-9_:-]{16,128}$/.test(a.idempotencyKey))
      fail('invalid_input')
    const edit = [
      'title',
      'audienceId',
      'locale',
      'subject',
      'preheader',
      'blocks',
    ]
    const allowed: Record<string, string[]> = {
      create: edit,
      save: ['campaignId', 'expectedVersion', ...edit],
      review: ['campaignId', 'expectedVersion'],
      test: ['campaignId', 'expectedVersion', 'recipient'],
      approve: ['campaignId', 'expectedVersion', 'reviewId', 'scheduledAt'],
      cancel: ['campaignId', 'expectedVersion'],
      delete: ['campaignId', 'expectedVersion'],
    }
    if (!allowed[a.operation]) fail('invalid_input')
    strict(a.input, allowed[a.operation])
    if (JSON.stringify(a.input).length > 60000) fail('invalid_input')
    const fingerprint = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(
            canonical({ operation: a.operation, input: a.input })
          )
        )
      )
    )
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
    const previous = await ctx.db
      .query('emailCampaignCommands')
      .withIndex('request', (q) =>
        q
          .eq('businessId', b.id)
          .eq('actorId', a.actorId)
          .eq('key', a.idempotencyKey)
      )
      .unique()
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('idempotency_conflict')
      return previous.result
    }
    const now = Date.now()
    const window = Math.floor(now / 60000)
    const rateKey = `campaign:${a.actorId}`
    const rate = await ctx.db
      .query('emailRateLimits')
      .withIndex('scope', (q) =>
        q.eq('businessId', b.id).eq('key', rateKey).eq('window', window)
      )
      .unique()
    if (rate && rate.count >= 100) fail('rate_limited')
    if (rate) await ctx.db.patch(rate._id, { count: rate.count + 1 })
    else
      await ctx.db.insert('emailRateLimits', {
        businessId: b.id,
        key: rateKey,
        window,
        count: 1,
      })
    let result: any
    if (a.operation === 'create') {
      const id = await ctx.db.insert('emailCampaigns', {
        ...checkContent(a.input, b),
        businessId: b.id,
        version: 1,
        state: 'draft',
        createdAt: now,
        updatedAt: now,
        createdBy: a.actorId,
        updatedBy: a.actorId,
        counters: emptyCampaignCounters(),
        expansionComplete: false,
      })
      result = { campaign: wire(await ctx.db.get(id)) }
    } else {
      const c = await campaign(ctx, a.input.campaignId, b.id)
      if (
        !Number.isSafeInteger(a.input.expectedVersion) ||
        a.input.expectedVersion !== c.version
      )
        fail('version_conflict')
      if (a.operation !== 'cancel' && c.state !== 'draft') fail('invalid_state')
      if (a.operation === 'save') {
        await ctx.db.patch(c._id, {
          ...checkContent(a.input, b),
          version: c.version + 1,
          updatedAt: now,
          updatedBy: a.actorId,
          reviewId: undefined,
          reviewCutoff: undefined,
          reviewCursor: undefined,
          reviewCount: undefined,
          reviewComplete: undefined,
          rendered: undefined,
        })
      } else if (a.operation === 'review') {
        const content = rendered(c, b)
        const cutoff = c.reviewCutoff ?? now
        const reviewId =
          c.reviewId ?? `${c._id}:${c.version}:${a.idempotencyKey}`
        let count = c.reviewCount ?? 0
        let complete = c.reviewComplete ?? false
        let cursor = c.reviewCursor
        if (!complete) {
          const members = await page(ctx, c, cursor ?? null)
          for (const member of members.page) {
            if (!(await eligible(ctx, member, b, cutoff))) continue
            const existing = await ctx.db
              .query('emailCampaignAudience')
              .withIndex('membership', (q) =>
                q
                  .eq('campaignId', c._id)
                  .eq('version', c.version)
                  .eq('membershipId', member._id)
              )
              .unique()
            if (!existing) {
              await ctx.db.insert('emailCampaignAudience', {
                campaignId: c._id,
                version: c.version,
                membershipId: member._id,
                generation: member.generation,
              })
              count++
            }
          }
          complete = members.isDone
          cursor = members.continueCursor
        }
        await ctx.db.patch(c._id, {
          reviewId,
          reviewCutoff: cutoff,
          reviewCursor: cursor,
          reviewCount: count,
          reviewComplete: complete,
          rendered: content,
          updatedBy: a.actorId,
        })
        result = {
          campaign: wire(c),
          review: {
            id: reviewId,
            version: c.version,
            eligible_count: count,
            complete,
            html: content.html,
            text: content.text,
          },
        }
      } else if (a.operation === 'test') {
        if (!capabilities(b).can_test) fail('transport_not_enabled')
        const email = normalizeEmail(a.input.recipient)
        const member = await ctx.db
          .query('emailMemberships')
          .withIndex('scope', (q) =>
            q
              .eq('businessId', b.id)
              .eq('email', email)
              .eq('audienceId', c.audienceId)
          )
          .unique()
        if (!member || !(await eligible(ctx, member, b, now)))
          fail('recipient_not_eligible')
        const content = rendered(c, b)
        const audience = b.audiences.find((x) => x.id === c.audienceId)!
        const messageId = await ctx.db.insert('emailMessages', {
          businessId: b.id,
          email,
          audienceId: c.audienceId,
          purpose: audience.purpose,
          kind: 'broadcast',
          rendered: content,
          state: 'queued',
          createdAt: now,
          nextAt: now,
        })
        result = {
          campaign: wire(c),
          test: { message_id: messageId, version: c.version, state: 'queued' },
        }
      } else if (a.operation === 'approve') {
        if (!capabilities(b).can_approve) fail('transport_not_enabled')
        if (
          !c.reviewId ||
          a.input.reviewId !== c.reviewId ||
          !c.rendered ||
          c.reviewCutoff === undefined ||
          !c.reviewComplete
        )
          fail('review_required')
        let scheduledAt = now
        if (a.input.scheduledAt !== undefined) {
          if (
            typeof a.input.scheduledAt !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(
              a.input.scheduledAt
            )
          )
            fail('invalid_input')
          scheduledAt = Date.parse(a.input.scheduledAt)
          if (
            !Number.isFinite(scheduledAt) ||
            scheduledAt < now ||
            scheduledAt > now + 366 * 86400000
          )
            fail('invalid_input')
        }
        await ctx.db.patch(c._id, {
          state: scheduledAt > now ? 'scheduled' : 'sending',
          scheduledAt,
          updatedAt: now,
          updatedBy: a.actorId,
        })
        await ctx.scheduler.runAt(scheduledAt, expandRef, { campaignId: c._id })
      } else if (a.operation === 'cancel') {
        if (c.state === 'completed') fail('invalid_state')
        await ctx.db.patch(c._id, {
          state: 'cancelled',
          updatedAt: now,
          updatedBy: a.actorId,
          expansionComplete: true,
        })
        await ctx.scheduler.runAfter(0, cancelRef, { campaignId: c._id })
      } else if (a.operation === 'delete') {
        await ctx.db.delete(c._id)
        result = { deleted: true }
      }
      result ??= { campaign: wire(await ctx.db.get(c._id)) }
    }
    await ctx.db.insert('emailCampaignCommands', {
      businessId: b.id,
      actorId: a.actorId,
      key: a.idempotencyKey,
      fingerprint,
      result,
      at: now,
    })
    return result
  },
})

/** Each invocation scans a bounded page and schedules continuation atomically with its outbox writes. */
export const expand = internalMutation({
  args: { campaignId: v.id('emailCampaigns') },
  handler: async (ctx, a) => {
    const c = await ctx.db.get(a.campaignId)
    if (
      !c ||
      !['scheduled', 'sending'].includes(c.state) ||
      c.expansionComplete ||
      (c.scheduledAt ?? Infinity) > Date.now()
    )
      return
    const b = parseEmailConfig(
      process.env.EMAIL_CONTROL_CONFIG
    ).businesses.find((x) => x.id === c.businessId)
    if (!b || !b.activated) return
    const members = await ctx.db
      .query('emailCampaignAudience')
      .withIndex('campaign', (q) =>
        q.eq('campaignId', c._id).eq('version', c.version)
      )
      .paginate({ numItems: PAGE, cursor: c.expansionCursor ?? null })
    let queued = 0
    for (const snapshot of members.page) {
      const member = await ctx.db.get(snapshot.membershipId)
      if (
        !member ||
        member.generation !== snapshot.generation ||
        member.businessId !== c.businessId ||
        member.audienceId !== c.audienceId
      )
        continue
      if (!(await eligible(ctx, member, b, c.reviewCutoff!))) continue
      const exists = await ctx.db
        .query('emailCampaignRecipients')
        .withIndex('recipient', (q) =>
          q.eq('campaignId', c._id).eq('membershipId', member._id)
        )
        .unique()
      if (exists) continue
      const audience = b.audiences.find((x) => x.id === c.audienceId)
      if (!audience) continue
      const id = await ctx.db.insert('emailMessages', {
        businessId: c.businessId,
        email: member.email,
        audienceId: c.audienceId,
        purpose: audience.purpose,
        kind: 'broadcast',
        campaignId: c._id,
        campaignMembershipGeneration: member.generation,
        rendered: c.rendered,
        state: 'queued',
        createdAt: Date.now(),
        nextAt: Date.now(),
      })
      await ctx.db.insert('emailCampaignRecipients', {
        campaignId: c._id,
        membershipId: member._id,
        messageId: id,
      })
      queued++
    }
    const counters = { ...c.counters, queued: c.counters.queued + queued }
    await ctx.db.patch(c._id, {
      counters,
      expansionComplete: members.isDone,
      expansionCursor: members.continueCursor,
      state:
        members.isDone && counters.queued === 0 && counters.sending === 0
          ? 'completed'
          : 'sending',
      updatedAt: Date.now(),
    })
    if (!members.isDone) await ctx.scheduler.runAfter(0, expandRef, a)
  },
})
export const cancelPage = internalMutation({
  args: { campaignId: v.id('emailCampaigns') },
  handler: async (ctx, a) => {
    const c = await ctx.db.get(a.campaignId)
    if (!c || c.state !== 'cancelled') return
    const rows = await ctx.db
      .query('emailMessages')
      .withIndex('campaign', (q) =>
        q.eq('campaignId', c._id).eq('state', 'queued')
      )
      .take(PAGE)
    for (const row of rows)
      await patchEmailMessage(ctx, row._id, { state: 'cancelled' })
    if (rows.length === PAGE) await ctx.scheduler.runAfter(0, cancelRef, a)
  },
})

/** Recovery after a disabled configuration or failed scheduled expansion. No sends here. */
export const recover = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (!process.env.EMAIL_CONTROL_CONFIG) return
    for (const state of ['scheduled', 'sending']) {
      await ctx.scheduler.runAfter(
        0,
        makeFunctionReference<'mutation'>('emailCampaigns:recoverState') as any,
        { state }
      )
    }
  },
})
// Convex permits one paginated query per invocation, so each state gets its own transaction.
export const recoverState = internalMutation({
  args: { state: v.union(v.literal('scheduled'), v.literal('sending')) },
  handler: async (ctx, { state }) => {
    const progress = await ctx.db
      .query('emailCampaignRecovery')
      .withIndex('state', (q) => q.eq('state', state))
      .unique()
    const rows = await ctx.db
      .query('emailCampaigns')
      .withIndex('pending', (q) =>
        q
          .eq('expansionComplete', false)
          .eq('state', state)
          .lte('scheduledAt', Date.now())
      )
      .paginate({ numItems: 20, cursor: progress?.cursor ?? null })
    const cursor = rows.isDone ? null : rows.continueCursor
    if (progress) await ctx.db.patch(progress._id, { cursor })
    else await ctx.db.insert('emailCampaignRecovery', { state, cursor })
    for (const c of rows.page)
      await ctx.scheduler.runAfter(0, expandRef, { campaignId: c._id })
  },
})
