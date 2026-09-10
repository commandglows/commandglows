import { v } from 'convex/values'
import type { QueryCtx, MutationCtx } from './_generated/server'
import { commerceEnvironment } from './commerceEventContract'

export const siteAuthorityArgs = {
  actorGlobalUserId: v.optional(v.string()), clerkId: v.optional(v.string()), bridgeSecret: v.string(),
}
export type SiteAuthority = { actorGlobalUserId?: string; clerkId?: string; bridgeSecret: string }
export async function requireSiteAccount(ctx: QueryCtx | MutationCtx, args: SiteAuthority) {
  if (!process.env.SUITE_BRIDGE_CONVEX_SECRET || args.bridgeSecret !== process.env.SUITE_BRIDGE_CONVEX_SECRET) throw new Error('bridge_secret_mismatch')
  if (Boolean(args.actorGlobalUserId) === Boolean(args.clerkId)) throw new Error('account_identity_required')
  if (args.actorGlobalUserId) {
    const account = await ctx.db.query('globalUsers').withIndex('by_globalUserId', q => q.eq('globalUserId', args.actorGlobalUserId!)).unique()
    if (!account) throw new Error('account_not_ready')
    return account
  }
  const mapping = await ctx.db.query('identityAccounts').withIndex('by_providerAccount', q => q.eq('provider', 'clerk').eq('providerAccountId', args.clerkId!)).unique()
  const environment = commerceEnvironment(process.env.SUITE_BRIDGE_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || '')
  if (!environment || !mapping || commerceEnvironment(mapping.environment || '') !== environment) throw new Error('account_not_ready')
  const account = mapping && await ctx.db.get(mapping.globalUserId)
  if (!account) throw new Error('account_not_ready')
  return account
}
export async function requireSiteAdmin(ctx: QueryCtx | MutationCtx, args: SiteAuthority) {
  const account = await requireSiteAccount(ctx, args)
  const users = await ctx.db.query('users').withIndex('by_globalUserId', q => q.eq('globalUserId', account._id)).collect()
  const admin = users.find(user => user.role === 'admin')
  if (!admin) throw new Error('admin_forbidden')
  return { ...admin, actorGlobalUserId: account.globalUserId }
}
