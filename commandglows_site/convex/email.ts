import {
  renderEmail,
  type EmailContent,
} from '../src/lib/email/central/templates'
import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { authorize, canonical, fail, normalizeEmail } from './emailConfig'
function safeRender(content: EmailContent) {
  try {
    return renderEmail(content)
  } catch {
    return fail('invalid_input')
  }
}
async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    )
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
export async function nonceDigest(nonce: unknown) {
  if (typeof nonce !== 'string' || !/^[a-f0-9]{64}$/.test(nonce))
    fail('invalid_input')
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce))
    )
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
const str = (x: any, max = 200) => {
  if (typeof x !== 'string' || !x || x.length > max) fail('invalid_input')
  return x as string
}
const get = (
  ctx: any,
  table: string,
  index: string,
  fields: Record<string, any>
) =>
  ctx.db
    .query(table)
    .withIndex(index, (q: any) =>
      Object.entries(fields).reduce((r, [k, val]) => r.eq(k, val), q)
    )
    .first()
const membership = (
  ctx: any,
  businessId: string,
  email: string,
  audienceId: string
) => get(ctx, 'emailMemberships', 'scope', { businessId, email, audienceId })
async function suppressionDigest(email: string) {
  const secret = process.env.EMAIL_SUPPRESSION_HASH_KEY
  if (!secret || secret.length < 32) fail('retention_unconfigured')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(email))
    )
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
async function suppressed(
  ctx: any,
  businessId: string,
  email: string,
  streamId: string
) {
  const raw = await ctx.db
    .query('emailSuppressions')
    .withIndex('scope', (q: any) =>
      q.eq('businessId', businessId).eq('email', email)
    )
    .collect()
  if (!process.env.EMAIL_SUPPRESSION_HASH_KEY) {
    const records = await ctx.db
      .query('emailSuppressions')
      .withIndex('digest', (q: any) => q.eq('businessId', businessId))
      .collect()
    if (records.some((record: any) => record.emailDigest))
      fail('configuration_unavailable')
  }
  const awaitDigest = process.env.EMAIL_SUPPRESSION_HASH_KEY
    ? await suppressionDigest(email)
    : ''
  const hashed = process.env.EMAIL_SUPPRESSION_HASH_KEY
    ? await ctx.db
        .query('emailSuppressions')
        .withIndex('digest', (q: any) =>
          q.eq('businessId', businessId).eq('emailDigest', awaitDigest)
        )
        .collect()
    : []
  return [...raw, ...hashed].some(
    (s: any) => !s.streamId || s.streamId === streamId
  )
}
async function queue(
  ctx: any,
  businessId: string,
  email: string,
  kind: string,
  content: any,
  audienceId?: string,
  purpose?: string
) {
  const now = Date.now()
  return ctx.db.insert('emailMessages', {
    businessId,
    email,
    kind,
    rendered: content,
    state: kind === 'broadcast' ? 'draft' : 'queued',
    createdAt: now,
    nextAt: now,
    ...(audienceId ? { audienceId, purpose } : {}),
  })
}
export const command = mutation({
  args: {
    credential: v.string(),
    operation: v.string(),
    idempotencyKey: v.string(),
    input: v.any(),
  },
  handler: async (ctx, args) => {
    const i =
      args.input && typeof args.input === 'object' && !Array.isArray(args.input)
        ? { ...args.input }
        : args.input
    if (!i || typeof i !== 'object' || Array.isArray(i)) fail('invalid_input')
    if (JSON.stringify(i).length > 150000) fail('invalid_input')
    const businessId = str(i.businessId)
    const { client, business } = authorize(
      args.credential,
      businessId,
      args.operation
    )
    const now = Date.now()
    str(args.idempotencyKey, 128)
    const allowed: Record<string, string[]> = {
      subscribe: [
        'email',
        'audienceId',
        'purpose',
        'source',
        'noticeVersion',
        'locale',
        'consent',
        'confirmationNonce',
        'unsubscribeNonce',
        'abuseKey',
        'occurredAt',
      ],
      confirm: ['tokenDigest'],
      unsubscribe: ['tokenDigest'],
      preferences: ['tokenDigest'],
      withdraw: ['subscriptionId'],
      transactional: ['email', 'templateKey', 'reason', 'locale'],
      broadcast_preview: [
        'email',
        'audienceId',
        'purpose',
        'locale',
        'subject',
        'paragraphs',
      ],
      broadcast_approve: ['draftId'],
      erase: ['email'],
    }
    if (
      !allowed[args.operation] ||
      Object.keys(i).some(
        (k) => k !== 'businessId' && !allowed[args.operation].includes(k)
      )
    )
      fail('invalid_input')
    if (i.email !== undefined) i.email = normalizeEmail(i.email)
    if (args.idempotencyKey.length < 16) fail('invalid_input')
    const fingerprint = await digest(
      canonical({ operation: args.operation, input: i })
    )
    const old = await get(ctx, 'emailRequests', 'scope', {
      businessId,
      clientId: client.id,
      key: args.idempotencyKey,
    })
    if (old) {
      if (old.fingerprint !== fingerprint) fail('idempotency_conflict')
      return old.result
    }
    const window = Math.floor(now / 60000)
    const rate = await get(ctx, 'emailRateLimits', 'scope', {
      businessId,
      key: client.id,
      window,
    })
    if (rate?.count >= 100) fail('rate_limited')
    if (rate) await ctx.db.patch(rate._id, { count: rate.count + 1 })
    else
      await ctx.db.insert('emailRateLimits', {
        businessId,
        key: client.id,
        window,
        count: 1,
      })
    let result: any = { status: 'accepted' }
    if (args.operation === 'subscribe') {
      if (
        i.occurredAt !== undefined &&
        (!Number.isSafeInteger(i.occurredAt) ||
          i.occurredAt > now + 300000 ||
          i.occurredAt < now - 86400000)
      )
        fail('invalid_input')
      if (i.abuseKey !== undefined) {
        if (!/^[a-f0-9]{64}$/.test(i.abuseKey)) fail('invalid_input')
        const abuseWindow = Math.floor(now / 3600000)
        const r = await get(ctx, 'emailRateLimits', 'scope', {
          businessId,
          key: i.abuseKey,
          window: abuseWindow,
        })
        if (r?.count >= 10) fail('rate_limited')
        if (r) await ctx.db.patch(r._id, { count: r.count + 1 })
        else
          await ctx.db.insert('emailRateLimits', {
            businessId,
            key: i.abuseKey,
            window: abuseWindow,
            count: 1,
          })
      }
      const email = normalizeEmail(i.email)
      const audience = business.audiences.find(
        (a) => a.id === i.audienceId && a.purpose === i.purpose
      )
      if (
        !audience ||
        !audience.sources.includes(i.source) ||
        !audience.noticeVersions.includes(i.noticeVersion) ||
        !['fr', 'en'].includes(i.locale) ||
        i.consent !== true
      )
        fail('invalid_input')
      const tokenDigest = await nonceDigest(i.confirmationNonce)
      const unsubscribeDigest = await nonceDigest(i.unsubscribeNonce)
      if (tokenDigest === unsubscribeDigest) fail('invalid_input')
      if (
        (await get(ctx, 'emailTokens', 'digest', { digest: tokenDigest })) ||
        (await get(ctx, 'emailTokens', 'digest', { digest: unsubscribeDigest }))
      )
        fail('invalid_input')
      const addressWindow = Math.floor(now / 3600000)
      const addressRate = await get(ctx, 'emailRateLimits', 'scope', {
        businessId,
        key: await digest(email),
        window: addressWindow,
      })
      if (addressRate?.count >= 3) fail('rate_limited')
      if (addressRate)
        await ctx.db.patch(addressRate._id, { count: addressRate.count + 1 })
      else
        await ctx.db.insert('emailRateLimits', {
          businessId,
          key: await digest(email),
          window: addressWindow,
          count: 1,
        })
      if (!(await get(ctx, 'emailAddresses', 'email', { email })))
        await ctx.db.insert('emailAddresses', {
          email,
          createdAt: now,
        })
      if (
        !(await get(ctx, 'emailAudiences', 'scope', {
          businessId,
          audienceId: audience.id,
        }))
      )
        await ctx.db.insert('emailAudiences', {
          businessId,
          audienceId: audience.id,
          purpose: audience.purpose,
        })
      const m = await membership(ctx, businessId, email, audience.id)
      const generation = (m?.generation || 0) + 1
      if (m?.state === 'subscribed') {
        result = {
          status: 'subscribed',
          subscriptionId: m._id,
          businessId,
          audienceId: audience.id,
          recordedAt: m.updatedAt,
        }
        await ctx.db.insert('emailRequests', {
          businessId,
          clientId: client.id,
          key: args.idempotencyKey,
          fingerprint,
          email,
          result,
          at: now,
        })
        return result
      }
      await ctx.db.insert('emailConsents', {
        businessId,
        email,
        audienceId: audience.id,
        purpose: audience.purpose,
        action: 'requested',
        ...(i.occurredAt !== undefined ? { occurredAt: i.occurredAt } : {}),
        source: i.source,
        noticeVersion: i.noticeVersion,
        locale: i.locale,
        at: now,
      })
      if (m)
        await ctx.db.patch(m._id, {
          state: 'pending',
          generation,
          updatedAt: now,
        })
      else
        await ctx.db.insert('emailMemberships', {
          businessId,
          email,
          audienceId: audience.id,
          purpose: audience.purpose,
          state: 'pending',
          generation,
          updatedAt: now,
        })
      await ctx.db.insert('emailTokens', {
        businessId,
        email,
        audienceId: audience.id,
        purpose: audience.purpose,
        source: i.source,
        noticeVersion: i.noticeVersion,
        locale: i.locale,
        digest: tokenDigest,
        kind: 'confirmation',
        generation,
        expiresAt: now + 86400000,
      })
      await ctx.db.insert('emailTokens', {
        businessId,
        email,
        audienceId: audience.id,
        purpose: audience.purpose,
        digest: unsubscribeDigest,
        kind: 'unsubscribe',
        generation,
        expiresAt: now + 365 * 86400000,
      })
      const messageId = await queue(
        ctx,
        businessId,
        email,
        'confirmation',
        {
          templateKey: 'subscription_confirmation',
          locale: i.locale,
          brand: business.brand,
          legalFooter: business.legalFooter,
          confirmationNonce: i.confirmationNonce,
          unsubscribeNonce: i.unsubscribeNonce,
          generation,
        },
        audience.id,
        audience.purpose
      )
      const savedMembership = await membership(
        ctx,
        businessId,
        email,
        audience.id
      )
      result = {
        status: 'pending',
        messageId,
        subscriptionId: savedMembership._id,
        businessId,
        audienceId: audience.id,
        recordedAt: now,
      }
    } else if (
      ['confirm', 'unsubscribe', 'preferences'].includes(args.operation)
    ) {
      const token = await get(ctx, 'emailTokens', 'digest', {
        digest: str(i.tokenDigest, 64),
      })
      if (
        !token ||
        token.businessId !== businessId ||
        token.expiresAt <= now ||
        token.usedAt
      )
        fail('invalid_token')
      const m = await membership(ctx, businessId, token.email, token.audienceId)
      if (!m || m.generation !== token.generation) fail('invalid_token')
      if (args.operation === 'preferences')
        result = { status: m.state, audienceId: m.audienceId }
      else {
        if (args.operation === 'confirm' && token.kind !== 'confirmation')
          fail('invalid_token')
        if (args.operation === 'confirm' && m.state !== 'pending')
          fail('invalid_token')
        if (args.operation === 'unsubscribe' && token.kind !== 'unsubscribe')
          fail('invalid_token')
        await ctx.db.patch(token._id, { usedAt: now })
        const state = args.operation === 'confirm' ? 'subscribed' : 'withdrawn'
        await ctx.db.patch(m._id, {
          state,
          updatedAt: now,
          generation: state === 'withdrawn' ? m.generation + 1 : m.generation,
        })
        await ctx.db.insert('emailConsents', {
          businessId,
          email: token.email,
          audienceId: m.audienceId,
          purpose: m.purpose,
          action: state === 'subscribed' ? 'granted' : 'withdrawn',
          source: token.source || 'token',
          noticeVersion: token.noticeVersion || 'withdrawal',
          locale: token.locale || 'en',
          at: now,
        })
        result = { status: state }
      }
    } else if (args.operation === 'withdraw') {
      const id = ctx.db.normalizeId('emailMemberships', str(i.subscriptionId))
      const member = id ? await ctx.db.get(id) : null
      if (!member || member.businessId !== businessId) fail('not_found')
      await ctx.db.patch(member._id, {
        state: 'withdrawn',
        updatedAt: now,
        generation: member.generation + 1,
      })
      await ctx.db.insert('emailConsents', {
        businessId,
        email: member.email,
        audienceId: member.audienceId,
        purpose: member.purpose,
        action: 'withdrawn',
        source: client.id,
        noticeVersion: 'withdrawal',
        locale: 'en',
        at: now,
      })
      result = { status: 'withdrawn', subscriptionId: member._id }
    } else if (args.operation === 'transactional') {
      if (
        i.templateKey !== 'service_notification' ||
        i.reason !== 'service' ||
        !['fr', 'en'].includes(i.locale)
      )
        fail('invalid_input')
      result = {
        status: 'queued',
        messageId: await queue(
          ctx,
          businessId,
          normalizeEmail(i.email),
          'transactional',
          safeRender({
            templateKey: 'service_notification',
            locale: i.locale,
            brand: business.brand,
            legalFooter: business.legalFooter,
            subject:
              i.locale === 'fr'
                ? 'Notification de s\u00e9curit\u00e9'
                : 'Security notification',
            paragraphs: [
              i.locale === 'fr'
                ? 'Une modification de s\u00e9curit\u00e9 a \u00e9t\u00e9 effectu\u00e9e sur votre compte.'
                : 'A security change was made to your account.',
            ],
          })
        ),
      }
    } else if (args.operation === 'broadcast_preview') {
      if (
        !business.audiences.some(
          (a) => a.id === i.audienceId && a.purpose === i.purpose
        )
      )
        fail('invalid_input')
      const content = safeRender({
        templateKey: 'newsletter',
        locale: i.locale,
        brand: business.brand,
        legalFooter: business.legalFooter,
        subject: i.subject,
        paragraphs: i.paragraphs,
        unsubscribeUrl: '{{{ pm:unsubscribe }}}',
      })
      result = {
        status: 'draft',
        rendered: content,
        draftId: await queue(
          ctx,
          businessId,
          normalizeEmail(i.email),
          'broadcast',
          content,
          i.audienceId,
          i.purpose
        ),
      }
    } else if (args.operation === 'broadcast_approve') {
      const draftId = ctx.db.normalizeId('emailMessages', str(i.draftId))
      const m = draftId ? await ctx.db.get(draftId) : null
      if (
        !m ||
        !('businessId' in m) ||
        m.businessId !== businessId ||
        !('state' in m) ||
        m.state !== 'draft'
      )
        fail('invalid_input')
      await ctx.db.patch(m._id, { state: 'queued' } as any)
      result = { status: 'queued', messageId: m._id }
    } else if (args.operation === 'erase') {
      if (!business.retentionDays) fail('retention_unconfigured')
      const email = normalizeEmail(i.email)
      for (const table of [
        'emailMemberships',
        'emailConsents',
        'emailTokens',
      ]) {
        const rows = await ctx.db
          .query(table as any)
          .withIndex('scope', (q: any) =>
            q.eq('businessId', businessId).eq('email', email)
          )
          .collect()
        for (const row of rows)
          if (row.businessId === businessId && row.email === email)
            await ctx.db.delete(row._id)
      }
      const remainingMemberships = await ctx.db
        .query('emailMemberships')
        .withIndex('email', (q) => q.eq('email', email))
        .collect()
      if (!remainingMemberships.some((member) => member.email === email)) {
        const address = await get(ctx, 'emailAddresses', 'email', { email })
        if (address) await ctx.db.delete(address._id)
      }
      for (const message of await ctx.db
        .query('emailMessages')
        .withIndex('contact', (q) =>
          q.eq('businessId', businessId).eq('email', email)
        )
        .collect())
        if (message.businessId === businessId && message.email === email)
          await ctx.db.patch(message._id, {
            email: 'erased',
            rendered: {},
            state: 'erased',
          })
      for (const request of await ctx.db
        .query('emailRequests')
        .withIndex('contact', (q) =>
          q.eq('businessId', businessId).eq('email', email)
        )
        .collect())
        if (request.businessId === businessId && request.email === email)
          await ctx.db.delete(request._id)
      const emailDigest = await suppressionDigest(email)
      const suppressions = await ctx.db
        .query('emailSuppressions')
        .withIndex('scope', (q) =>
          q.eq('businessId', businessId).eq('email', email)
        )
        .collect()
      for (const suppression of suppressions)
        await ctx.db.patch(suppression._id, { email: undefined, emailDigest })
      await ctx.db.insert('emailSuppressions', {
        businessId,
        emailDigest,
        reason: 'erasure_tombstone',
        at: now,
      })
      result = { status: 'erased' }
    }
    await ctx.db.insert('emailRequests', {
      businessId,
      clientId: client.id,
      key: args.idempotencyKey,
      fingerprint,
      ...(i.email && args.operation !== 'erase'
        ? { email: normalizeEmail(i.email) }
        : {}),
      result,
      at: now,
    })
    return result
  },
})
export const claim = mutation({
  args: { credential: v.string(), businessId: v.string() },
  handler: async (ctx, args) => {
    const { business, config } = authorize(
      args.credential,
      args.businessId,
      'dispatch'
    )
    const now = Date.now()
    const expired = await ctx.db
      .query('emailMessages')
      .withIndex('queue', (q) =>
        q.eq('businessId', args.businessId).eq('state', 'sending')
      )
      .take(100)
    for (const m of expired)
      if ((m.leaseUntil || 0) <= now) {
        await ctx.db.patch(m._id, { state: 'unknown' })
        const attempts = await ctx.db
          .query('emailAttempts')
          .withIndex('message', (q) => q.eq('messageId', m._id))
          .collect()
        for (const attempt of attempts)
          if (attempt.state === 'sending')
            await ctx.db.patch(attempt._id, { state: 'unknown' })
      }
    const messages = await ctx.db
      .query('emailMessages')
      .withIndex('queue', (q) =>
        q
          .eq('businessId', args.businessId)
          .eq('state', 'queued')
          .lte('nextAt', now)
      )
      .take(10)
    const jobs = []
    for (const m of messages) {
      const streamId =
        m.kind === 'broadcast'
          ? business.broadcastStream
          : business.transactionalStream
      const member = m.audienceId
        ? await membership(ctx, m.businessId, m.email, m.audienceId)
        : null
      if (
        (await suppressed(ctx, m.businessId, m.email, streamId)) ||
        (m.kind === 'broadcast' && member?.state !== 'subscribed') ||
        (m.kind === 'confirmation' &&
          (member?.state !== 'pending' ||
            member?.generation !== m.rendered.generation))
      ) {
        await ctx.db.patch(m._id, { state: 'cancelled' })
        continue
      }
      if (!business.activated || !business.allowedRecipients?.includes(m.email))
        continue
      if (config.environment === 'production' && !business.retentionDays)
        continue
      const attemptId = await ctx.db.insert('emailAttempts', {
        businessId: m.businessId,
        messageId: m._id,
        state: 'sending',
        at: now,
      })
      await ctx.db.patch(m._id, { state: 'sending', leaseUntil: now + 60000 })
      jobs.push({
        messageId: m._id,
        attemptId,
        businessId: m.businessId,
        to: m.email,
        from: business.from,
        streamId,
        streamClass: m.kind === 'broadcast' ? 'broadcast' : 'transactional',
        ...(m.kind === 'confirmation' ? { content: m.rendered } : m.rendered),
      })
      break // One lease per worker invocation; skipped ineligible rows do not stall the queue.
    }
    return jobs
  },
})
export const settle = mutation({
  args: {
    credential: v.string(),
    businessId: v.string(),
    messageId: v.id('emailMessages'),
    attemptId: v.id('emailAttempts'),
    outcome: v.union(
      v.literal('submitted'),
      v.literal('retryable_failure'),
      v.literal('permanent_failure'),
      v.literal('unknown')
    ),
    providerMessageId: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    retryAfterMs: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    authorize(a.credential, a.businessId, 'dispatch')
    if (
      a.retryAfterMs !== undefined &&
      (!Number.isSafeInteger(a.retryAfterMs) ||
        a.retryAfterMs < 0 ||
        a.retryAfterMs > 3600000)
    )
      fail('invalid_input')
    const m = await ctx.db.get(a.messageId)
    const t = await ctx.db.get(a.attemptId)
    // A provider receipt may arrive before the HTTP response is settled.
    if (
      m &&
      t &&
      m.businessId === a.businessId &&
      t.messageId === m._id &&
      ['submitted', 'delivered'].includes(m.state) &&
      t.state === 'submitted'
    ) {
      if (
        a.providerMessageId &&
        m.providerMessageId &&
        a.providerMessageId !== m.providerMessageId
      )
        fail('invalid_state')
      return { status: 'accepted' }
    }
    if (
      !m ||
      !t ||
      m.businessId !== a.businessId ||
      t.messageId !== m._id ||
      m.state !== 'sending' ||
      t.state !== 'sending'
    )
      fail('invalid_state')
    await ctx.db.patch(t._id, {
      state: a.outcome,
      ...(a.errorCode ? { errorCode: str(a.errorCode, 100) } : {}),
    })
    const attempts = await ctx.db
      .query('emailAttempts')
      .withIndex('message', (q) => q.eq('messageId', m._id))
      .collect()
    await ctx.db.patch(m._id, {
      state:
        a.outcome === 'retryable_failure'
          ? attempts.length < 5
            ? 'queued'
            : 'permanent_failure'
          : a.outcome,
      nextAt:
        Date.now() +
        Math.max(
          a.retryAfterMs || 0,
          Math.min(3600000, 30000 * 2 ** attempts.length)
        ),
      ...(a.providerMessageId
        ? { providerMessageId: str(a.providerMessageId) }
        : {}),
    })
    return { status: 'accepted' }
  },
})
export const webhook = mutation({
  args: {
    credential: v.string(),
    businessId: v.string(),
    eventId: v.string(),
    providerMessageId: v.optional(v.string()),
    internalMessageId: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    email: v.string(),
    type: v.string(),
    streamId: v.string(),
  },
  handler: async (ctx, a) => {
    const { business } = authorize(a.credential, a.businessId, 'webhook')
    if (
      a.occurredAt !== undefined &&
      (!Number.isSafeInteger(a.occurredAt) ||
        a.occurredAt < 0 ||
        a.occurredAt > Date.now() + 300000)
    )
      fail('invalid_input')
    if (
      ![business.broadcastStream, business.transactionalStream].includes(
        a.streamId
      ) ||
      ![
        'hard_bounce',
        'complaint',
        'unsubscribe',
        'reactivate',
        'delivery',
        'soft_bounce',
        'ignored',
        'suppressed',
      ].includes(a.type)
    )
      fail('invalid_input')
    str(a.eventId)
    const old = await get(ctx, 'emailEvents', 'scope', {
      businessId: a.businessId,
      eventId: a.eventId,
    })
    if (old) return { status: 'accepted' }
    const email = normalizeEmail(a.email)
    let correlatedMessage = a.internalMessageId
      ? await ctx.db.get(
          ctx.db.normalizeId('emailMessages', a.internalMessageId) ||
            fail('invalid_input')
        )
      : null
    if (a.providerMessageId) {
      const providerMessage = await get(ctx, 'emailMessages', 'provider', {
        providerMessageId: a.providerMessageId,
      })
      if (
        correlatedMessage &&
        providerMessage &&
        correlatedMessage._id !== providerMessage._id
      )
        fail('forbidden')
      correlatedMessage ||= providerMessage
    }
    if (correlatedMessage) {
      if (
        correlatedMessage.businessId !== a.businessId ||
        correlatedMessage.email !== email ||
        (correlatedMessage.kind === 'broadcast'
          ? business.broadcastStream
          : business.transactionalStream) !== a.streamId
      )
        fail('forbidden')
      if (
        correlatedMessage.providerMessageId &&
        a.providerMessageId &&
        correlatedMessage.providerMessageId !== a.providerMessageId
      )
        fail('forbidden')
      if (
        a.providerMessageId &&
        ['delivery', 'soft_bounce', 'hard_bounce', 'complaint'].includes(
          a.type
        ) &&
        ['sending', 'unknown', 'submitted'].includes(correlatedMessage.state)
      ) {
        await ctx.db.patch(correlatedMessage._id, {
          providerMessageId: str(a.providerMessageId),
          state: a.type === 'delivery' ? 'delivered' : 'submitted',
        })
        const attempts = await ctx.db
          .query('emailAttempts')
          .withIndex('message', (q) =>
            q.eq('messageId', correlatedMessage!._id)
          )
          .collect()
        for (const attempt of attempts)
          if (['sending', 'unknown'].includes(attempt.state))
            await ctx.db.patch(attempt._id, { state: 'submitted' })
      }
    }
    if (
      ['hard_bounce', 'complaint', 'unsubscribe', 'suppressed'].includes(a.type)
    ) {
      const emailDigest = process.env.EMAIL_SUPPRESSION_HASH_KEY
        ? await suppressionDigest(email)
        : undefined
      const erased = emailDigest
        ? await ctx.db
            .query('emailSuppressions')
            .withIndex('digest', (q) =>
              q.eq('businessId', a.businessId).eq('emailDigest', emailDigest)
            )
            .first()
        : null
      await ctx.db.insert('emailSuppressions', {
        businessId: a.businessId,
        ...(erased ? { emailDigest } : { email }),
        streamId: a.streamId,
        reason: a.type,
        at: Date.now(),
      })
      if (a.type === 'unsubscribe' && a.streamId === business.broadcastStream) {
        const rows = await ctx.db
          .query('emailMemberships')
          .withIndex('scope', (q) =>
            q.eq('businessId', a.businessId).eq('email', email)
          )
          .collect()
        for (const m of rows) {
          await ctx.db.patch(m._id, {
            state: 'withdrawn',
            generation: m.generation + 1,
            updatedAt: Date.now(),
          })
          await ctx.db.insert('emailConsents', {
            businessId: a.businessId,
            email,
            audienceId: m.audienceId,
            purpose: m.purpose,
            action: 'withdrawn',
            source: 'postmark',
            noticeVersion: 'provider_event',
            locale: 'und',
            at: Date.now(),
          })
        }
      }
    }
    await ctx.db.insert('emailEvents', {
      businessId: a.businessId,
      eventId: a.eventId,
      type: a.type,
      ...(correlatedMessage ? { messageId: correlatedMessage._id } : {}),
      ...(a.providerMessageId
        ? { providerMessageId: str(a.providerMessageId) }
        : {}),
      ...(a.occurredAt !== undefined ? { occurredAt: a.occurredAt } : {}),
      at: Date.now(),
    })
    return { status: 'accepted' }
  },
})

/** Check at the last worker boundary; an already in-flight provider request cannot be recalled. */
export const recheckDispatch = mutation({
  args: {
    credential: v.string(),
    businessId: v.string(),
    messageId: v.id('emailMessages'),
    attemptId: v.id('emailAttempts'),
  },
  handler: async (ctx, args) => {
    const { business } = authorize(args.credential, args.businessId, 'dispatch')
    const message = await ctx.db.get(args.messageId)
    const attempt = await ctx.db.get(args.attemptId)
    if (
      !message ||
      !attempt ||
      message.businessId !== args.businessId ||
      attempt.messageId !== message._id ||
      message.state !== 'sending' ||
      attempt.state !== 'sending'
    )
      return { eligible: false }
    const member = message.audienceId
      ? await membership(
          ctx,
          message.businessId,
          message.email,
          message.audienceId
        )
      : null
    const stream =
      message.kind === 'broadcast'
        ? business.broadcastStream
        : business.transactionalStream
    const eligible = Boolean(
      business.activated &&
      business.allowedRecipients?.includes(message.email) &&
      (message.leaseUntil || 0) > Date.now() &&
      !(await suppressed(ctx, message.businessId, message.email, stream)) &&
      (message.kind !== 'broadcast' || member?.state === 'subscribed') &&
      (message.kind !== 'confirmation' ||
        (member?.state === 'pending' &&
          member.generation === message.rendered.generation))
    )
    if (!eligible) {
      await ctx.db.patch(message._id, { state: 'cancelled' })
      await ctx.db.patch(attempt._id, { state: 'cancelled' })
    }
    return { eligible }
  },
})
