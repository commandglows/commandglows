import { mutation, query } from './_generated/server'
import { v, ConvexError } from 'convex/values'

const args = {
  credential: v.string(),
  actorId: v.string(),
  mailboxId: v.string(),
  kind: v.string(),
  key: v.string(),
}
function authorize(a: any) {
  const expected = process.env.EMAIL_OPERATOR_CREDENTIAL
  if (!expected || expected.length < 32 || a.credential !== expected)
    throw new ConvexError('forbidden')
  const boxes = JSON.parse(process.env.EMAIL_SUPPORT_MAILBOXES ?? '[]')
  if (!boxes.some((b: any) => b.id === a.mailboxId && b.actorId === a.actorId))
    throw new ConvexError('forbidden')
  if (
    !['token', 'oauth', 'status', 'reply'].includes(a.kind) ||
    a.key.length > 256
  )
    throw new ConvexError('invalid_request')
}
async function record(ctx: any, a: any) {
  return ctx.db
    .query('emailSupportRecords')
    .withIndex('by_owner', (q: any) =>
      q
        .eq('actorId', a.actorId)
        .eq('mailboxId', a.mailboxId)
        .eq('kind', a.kind)
        .eq('key', a.key)
    )
    .unique()
}
export const read = query({
  args,
  handler: async (ctx, a) => {
    authorize(a)
    const row = await record(ctx, a)
    return row && (!row.expiresAt || row.expiresAt > Date.now())
      ? row.value
      : null
  },
})
export const write = mutation({
  args: {
    ...args,
    value: v.any(),
    expiresAt: v.optional(v.number()),
    mode: v.union(v.literal('put'), v.literal('once'), v.literal('consume')),
  },
  handler: async (ctx, a) => {
    authorize(a)
    if (JSON.stringify(a.value).length > 16384)
      throw new ConvexError('invalid_request')
    if (a.kind === 'oauth' && a.mode !== 'consume') {
      const expired = await ctx.db
        .query('emailSupportRecords')
        .withIndex('by_expiry', (q) =>
          q
            .eq('actorId', a.actorId)
            .eq('mailboxId', a.mailboxId)
            .eq('kind', 'oauth')
            .lte('expiresAt', Date.now())
        )
        .take(50)
      for (const row of expired) await ctx.db.delete(row._id)
      const active = await ctx.db
        .query('emailSupportRecords')
        .withIndex('by_expiry', (q) =>
          q
            .eq('actorId', a.actorId)
            .eq('mailboxId', a.mailboxId)
            .eq('kind', 'oauth')
            .gt('expiresAt', Date.now())
        )
        .take(5)
      if (active.length >= 5) throw new ConvexError({ code: 'rate_limited' })
      if (!a.expiresAt || a.expiresAt > Date.now() + 600000)
        throw new ConvexError('invalid_request')
    }
    const row = await record(ctx, a)
    if (a.mode === 'consume') {
      if (!row) return null
      await ctx.db.delete(row._id)
      if (row.expiresAt && row.expiresAt <= Date.now()) return null
      return row.value
    }
    if (a.mode === 'once' && row) return { created: false, value: row.value }
    const data = {
      actorId: a.actorId,
      mailboxId: a.mailboxId,
      kind: a.kind,
      key: a.key,
      value: a.value,
      updatedAt: Date.now(),
      ...(a.expiresAt ? { expiresAt: a.expiresAt } : {}),
    }
    if (row) await ctx.db.replace(row._id, data)
    else await ctx.db.insert('emailSupportRecords', data)
    return { created: true, value: a.value }
  },
})
