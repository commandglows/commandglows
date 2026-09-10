import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'
import type { QueryCtx, MutationCtx } from './_generated/server'
import { commerceEnvironment } from './commerceEventContract'

const authority = { attemptId: v.string(), environment: v.string(), bridgeSecret: v.string() }
type Authority = { attemptId: string; environment: string; bridgeSecret: string }
function check(args: Authority) {
  if (!process.env.SUITE_BRIDGE_CONVEX_SECRET || args.bridgeSecret !== process.env.SUITE_BRIDGE_CONVEX_SECRET) throw new Error('session_forbidden')
  const environment = commerceEnvironment(args.environment)
  if (!environment || environment !== commerceEnvironment(process.env.SUITE_BRIDGE_ENVIRONMENT || '')) throw new Error('session_environment_mismatch')
  if (!/^[a-zA-Z0-9_-]{20,128}$/.test(args.attemptId)) throw new Error('session_attempt_invalid')
  return environment
}
function expiry(expiresAt: number, maxMs: number) {
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + maxMs) throw new Error('session_expiry_invalid')
}
async function find(ctx: QueryCtx | MutationCtx, attemptId: string, environment: string) {
  return ctx.db.query('siteLoginAttempts').withIndex('by_attemptEnvironment', q => q.eq('attemptId', attemptId).eq('environment', environment)).unique()
}
export const register = mutation({ args: { ...authority, expiresAt: v.number() }, handler: async (ctx, args) => {
  const environment = check(args); expiry(args.expiresAt, 600_000)
  const existing = await find(ctx, args.attemptId, environment)
  if (existing) {
    if (existing.status !== 'pending' || existing.expiresAt !== args.expiresAt) throw new Error('session_attempt_conflict')
    return { status: 'pending' as const }
  }
  const now = Date.now()
  await ctx.db.insert('siteLoginAttempts', { attemptId: args.attemptId, environment, status: 'pending', expiresAt: args.expiresAt, createdAt: now, updatedAt: now })
  return { status: 'pending' as const }
} })
export const activate = mutation({ args: { ...authority, expiresAt: v.number() }, handler: async (ctx, args) => {
  const environment = check(args); expiry(args.expiresAt, 3_600_000)
  const existing = await find(ctx, args.attemptId, environment)
  if (!existing || existing.status !== 'pending' || existing.expiresAt <= Date.now()) throw new Error('session_attempt_inactive')
  await ctx.db.patch(existing._id, { status: 'active', expiresAt: args.expiresAt, updatedAt: Date.now() })
  return { status: 'active' as const }
} })
export const isActive = query({ args: authority, handler: async (ctx, args) => {
  const environment = check(args)
  const existing = await find(ctx, args.attemptId, environment)
  return Boolean(existing && existing.status === 'active' && existing.expiresAt > Date.now())
} })
export const revoke = mutation({ args: authority, handler: async (ctx, args) => {
  const environment = check(args)
  const existing = await find(ctx, args.attemptId, environment)
  if (existing && existing.status !== 'revoked') await ctx.db.patch(existing._id, { status: 'revoked', updatedAt: Date.now() })
  return { status: 'revoked' as const }
} })
export const cleanup = internalMutation({ args: {}, handler: async ctx => {
  const rows = await ctx.db.query('siteLoginAttempts').withIndex('by_expiresAt', q => q.lt('expiresAt', Date.now() - 3_600_000)).take(100)
  for (const row of rows) await ctx.db.delete(row._id)
  return { deleted: rows.length }
} })
