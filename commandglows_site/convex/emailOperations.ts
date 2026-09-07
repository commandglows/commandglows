import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authorize, canonical, fail } from './emailConfig'
import type { Doc } from './_generated/dataModel'
import { requireSiteAdmin, siteAuthorityArgs } from './siteAuthority'

const scope = { credential: v.string(), businessId: v.string() }
const states = [
  'draft',
  'queued',
  'sending',
  'submitted',
  'delivered',
  'unknown',
  'permanent_failure',
  'cancelled',
]
const classes = [
  'all',
  'operator',
  'transactional',
  'confirmation',
  'broadcast',
]

export const siteAuthorize = query({
  args: { ...siteAuthorityArgs, businessId: v.string(), operation: v.string() },
  handler: async (ctx, args) => {
    await requireSiteAdmin(ctx, args)
    if (
      !['operations_read', 'operations_write', 'templates_read'].includes(
        args.operation
      )
    )
      fail('forbidden')
    authorize(
      process.env.EMAIL_OPERATOR_CREDENTIAL ?? '',
      args.businessId,
      args.operation
    )
    return { authorized: true }
  },
})
function pageSize(size: number) {
  if (!Number.isSafeInteger(size) || size < 1 || size > 100)
    fail('invalid_input')
}
function messageSummary(message: Doc<'emailMessages'>) {
  return {
    message_id: message._id,
    business_id: message.businessId,
    class: message.kind,
    status: message.state,
    created_at: message.createdAt,
    next_at: message.nextAt,
    provider_message_id: message.providerMessageId ?? null,
  }
}

/** Server relay credential only. Never return recipient, body, token or configuration secrets. */
export const list = query({
  args: {
    ...scope,
    state: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authorize(args.credential, args.businessId, 'operations_read')
    if (!states.includes(args.state)) fail('invalid_input')
    pageSize(args.paginationOpts.numItems)
    const result = await ctx.db
      .query('emailMessages')
      .withIndex('queue', (q) =>
        q.eq('businessId', args.businessId).eq('state', args.state)
      )
      .paginate(args.paginationOpts)
    return {
      items: result.page.map(messageSummary),
      cursor: result.isDone ? null : result.continueCursor,
      done: result.isDone,
    }
  },
})

export const detail = query({
  args: {
    ...scope,
    messageId: v.id('emailMessages'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authorize(args.credential, args.businessId, 'operations_read')
    pageSize(args.paginationOpts.numItems)
    const message = await ctx.db.get(args.messageId)
    if (!message || message.businessId !== args.businessId) fail('not_found')
    const attempts = await ctx.db
      .query('emailAttempts')
      .withIndex('message', (q) => q.eq('messageId', args.messageId))
      .take(100)
    const evidence = await ctx.db
      .query('emailOperatorActions')
      .withIndex('message', (q) =>
        q.eq('businessId', args.businessId).eq('messageId', args.messageId)
      )
      .paginate(args.paginationOpts)
    const caseRecord = await ctx.db
      .query('emailOperatorCases')
      .withIndex('message', (q) =>
        q.eq('businessId', args.businessId).eq('messageId', args.messageId)
      )
      .unique()
    return {
      ...messageSummary(message),
      version: caseRecord?.version ?? 0,
      owner: caseRecord?.owner ?? null,
      attempts: attempts.map((a) => ({
        attempt_id: a._id,
        status: a.state,
        at: a.at,
        error_code: a.errorCode ?? null,
      })),
      evidence: evidence.page.map((a) => ({
        action: a.action,
        reason_code: a.reasonCode,
        evidence_reference: a.evidenceReference ?? null,
        actor: a.clientId,
        at: a.at,
      })),
      cursor: evidence.isDone ? null : evidence.continueCursor,
      done: evidence.isDone,
      allowed_actions:
        message.state === 'unknown'
          ? ['acknowledge', 'record_evidence']
          : ['draft', 'queued'].includes(message.state)
            ? ['acknowledge', 'cancel', 'record_evidence']
            : ['acknowledge', 'record_evidence'],
    }
  },
})

export const status = query({
  args: scope,
  handler: async (ctx, args) => {
    const { business, config } = authorize(
      args.credential,
      args.businessId,
      'operations_read'
    )
    const controls = await ctx.db
      .query('emailChannelControls')
      .withIndex('scope', (q) => q.eq('businessId', args.businessId))
      .take(10)
    const queues = []
    for (const state of states) {
      const oldest = await ctx.db
        .query('emailMessages')
        .withIndex('queue', (q) =>
          q.eq('businessId', args.businessId).eq('state', state)
        )
        .first()
      queues.push({
        status: state,
        has_messages: Boolean(oldest),
        oldest_created_at: oldest?.createdAt ?? null,
      })
    }
    return {
      business_id: business.id,
      environment: config.environment,
      activated: business.activated === true,
      provider_configuration_present: Boolean(
        business.serverId && business.serverTokenEnv && business.publicBaseUrl
      ),
      provider_verified: false,
      inbox_verified: false,
      controls: controls.map((c) => ({
        class: c.class,
        paused: c.paused,
        version: c.version,
      })),
      queues,
    }
  },
})

export const events = query({
  args: {
    ...scope,
    messageId: v.id('emailMessages'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    authorize(args.credential, args.businessId, 'operations_read')
    pageSize(args.paginationOpts.numItems)
    const message = await ctx.db.get(args.messageId)
    if (!message || message.businessId !== args.businessId) fail('not_found')
    const result = await ctx.db
      .query('emailEvents')
      .withIndex('message', (q) =>
        q.eq('businessId', args.businessId).eq('messageId', args.messageId)
      )
      .order('desc')
      .paginate(args.paginationOpts)
    return {
      items: result.page.map((event) => ({
        event_id: event._id,
        type: event.type,
        occurred_at: event.occurredAt ?? null,
        recorded_at: event.at,
      })),
      cursor: result.isDone ? null : result.continueCursor,
      done: result.isDone,
    }
  },
})

export const operate = mutation({
  args: {
    ...scope,
    key: v.string(),
    action: v.string(),
    reasonCode: v.string(),
    expectedVersion: v.number(),
    messageId: v.optional(v.id('emailMessages')),
    class: v.optional(v.string()),
    evidenceReference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { client } = authorize(
      args.credential,
      args.businessId,
      'operations_write'
    )
    if (
      !/^[A-Za-z0-9_-]{16,128}$/.test(args.key) ||
      !/^[a-z][a-z0-9_]{2,63}$/.test(args.reasonCode) ||
      !Number.isSafeInteger(args.expectedVersion) ||
      args.expectedVersion < 0 ||
      (args.evidenceReference !== undefined &&
        !/^[A-Za-z0-9:_-]{3,128}$/.test(args.evidenceReference))
    )
      fail('invalid_input')
    const { credential: _credential, key: _key, ...semantic } = args
    const fingerprint = canonical(semantic)
    const previous = await ctx.db
      .query('emailOperatorActions')
      .withIndex('request', (q) =>
        q
          .eq('businessId', args.businessId)
          .eq('clientId', client.id)
          .eq('key', args.key)
      )
      .unique()
    if (previous) {
      if (previous.fingerprint !== fingerprint) fail('idempotency_conflict')
      return previous.result
    }
    const now = Date.now()
    let result: { version: number; status: string }
    if (['pause', 'resume'].includes(args.action)) {
      if (
        !args.class ||
        !classes.includes(args.class) ||
        args.messageId ||
        args.evidenceReference
      )
        fail('invalid_input')
      const control = await ctx.db
        .query('emailChannelControls')
        .withIndex('scope', (q) =>
          q.eq('businessId', args.businessId).eq('class', args.class!)
        )
        .unique()
      if ((control?.version ?? 0) !== args.expectedVersion)
        fail('version_conflict')
      const updated = {
        businessId: args.businessId,
        class: args.class,
        paused: args.action === 'pause',
        version: args.expectedVersion + 1,
        updatedAt: now,
      }
      if (control) await ctx.db.patch(control._id, updated)
      else await ctx.db.insert('emailChannelControls', updated)
      result = {
        version: updated.version,
        status: updated.paused ? 'paused' : 'active',
      }
    } else {
      if (
        !['acknowledge', 'record_evidence', 'cancel'].includes(args.action) ||
        !args.messageId ||
        args.class ||
        (args.action === 'record_evidence' && !args.evidenceReference)
      )
        fail('invalid_input')
      const message = await ctx.db.get(args.messageId)
      if (!message || message.businessId !== args.businessId) fail('not_found')
      const existing = await ctx.db
        .query('emailOperatorCases')
        .withIndex('message', (q) =>
          q.eq('businessId', args.businessId).eq('messageId', args.messageId!)
        )
        .unique()
      if ((existing?.version ?? 0) !== args.expectedVersion)
        fail('version_conflict')
      if (args.action === 'cancel') {
        // Unknown and in-flight submissions cannot be recalled or reset by an operator command.
        if (!['draft', 'queued'].includes(message.state)) fail('invalid_state')
        await ctx.db.patch(message._id, { state: 'cancelled' })
      }
      const updated = {
        businessId: args.businessId,
        messageId: args.messageId,
        owner:
          args.action === 'acknowledge'
            ? client.id
            : (existing?.owner ?? client.id),
        version: args.expectedVersion + 1,
        updatedAt: now,
      }
      if (existing) await ctx.db.patch(existing._id, updated)
      else await ctx.db.insert('emailOperatorCases', updated)
      result = {
        version: updated.version,
        status: args.action === 'cancel' ? 'cancelled' : message.state,
      }
    }
    await ctx.db.insert('emailOperatorActions', {
      businessId: args.businessId,
      clientId: client.id,
      key: args.key,
      fingerprint,
      action: args.action,
      reasonCode: args.reasonCode,
      ...(args.messageId ? { messageId: args.messageId } : {}),
      ...(args.evidenceReference
        ? { evidenceReference: args.evidenceReference }
        : {}),
      result,
      at: now,
    })
    return result
  },
})
