import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { commerceEnvironment } from './commerceEventContract'
import { isActiveSuiteEntitlement } from './productEntitlementPolicies'

const identityArgs = { provider: v.string(), issuer: v.string(), subject: v.string(), environment: v.string(), bridgeSecret: v.string() }
type Identity = { provider: string; issuer: string; subject: string; environment: string; bridgeSecret: string }
type Ctx = QueryCtx | MutationCtx

function checked(args: Identity) {
  if (!process.env.SUITE_BRIDGE_CONVEX_SECRET || args.bridgeSecret !== process.env.SUITE_BRIDGE_CONVEX_SECRET) throw new Error('identity_forbidden')
  const environment = commerceEnvironment(args.environment)
  const configured = commerceEnvironment(process.env.SUITE_BRIDGE_ENVIRONMENT || '')
  if (!environment || !configured || environment !== configured) throw new Error('identity_environment_mismatch')
  const providerName = args.provider.trim()
  const subject = args.subject.trim()
  if (!/^[a-z][a-z0-9_-]{0,63}$/.test(providerName) || !subject || subject.length > 512) throw new Error('identity_invalid')
  // Legacy bridges resolve provider+subject without issuer. Keep scoped site
  // identities outside those namespaces so they cannot be adopted by a bridge.
  const provider = `site:${providerName}`
  let url: URL
  try { url = new URL(args.issuer) } catch { throw new Error('identity_issuer_invalid') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('identity_issuer_invalid')
  return { provider, subject, issuer: url.href, environment }
}

async function find(ctx: Ctx, identity: ReturnType<typeof checked>) {
  return ctx.db.query('identityAccounts').withIndex('by_scopedProviderAccount', q =>
    q.eq('provider', identity.provider).eq('issuer', identity.issuer).eq('providerAccountId', identity.subject).eq('environment', identity.environment)).unique()
}

async function snapshot(ctx: Ctx, id: Id<'globalUsers'>, environment: string) {
  const account = await ctx.db.get(id)
  if (!account) throw new Error('global_user_not_found')
  const users = await ctx.db.query('users').withIndex('by_globalUserId', q => q.eq('globalUserId', id)).collect()
  const role = users.some(user => user.role === 'admin') ? 'admin' as const : 'user' as const
  const entitlements = await ctx.db.query('productEntitlements').withIndex('by_globalUserId', q => q.eq('globalUserId', id)).collect()
  const plans = new Set(['formation', 'lifetime_deal', 'pro', 'premium', 'paid', 'trial'])
  return {
    globalUserId: account.globalUserId,
    ...(account.primaryEmail ? { email: account.primaryEmail } : {}),
    ...(account.name ? { name: account.name } : {}),
    ...(account.imageUrl ? { imageUrl: account.imageUrl } : {}),
    role,
    formationAccess: role === 'admin' || entitlements.some(e => commerceEnvironment(e.environment) === environment && e.productId === 'commandglows_formation' && plans.has(e.plan) && isActiveSuiteEntitlement(e)),
  }
}

/** Trusted server callers must derive identity exclusively from verified provider sessions. */
export const resolve = query({ args: identityArgs, handler: async (ctx, args) => {
  const identity = checked(args)
  const existing = await find(ctx, identity)
  return existing ? snapshot(ctx, existing.globalUserId, identity.environment) : null
} })

/** Transitional verified Clerk session; no email lookup and no unscoped legacy adoption. */
export const resolveClerk = query({ args: { clerkId: v.string(), environment: v.string(), bridgeSecret: v.string() }, handler: async (ctx, args) => {
  const identity = checked({ ...args, provider: 'clerk', subject: args.clerkId, issuer: 'https://legacy-clerk.invalid/' })
  const existing = await ctx.db.query('identityAccounts').withIndex('by_providerAccount', q => q.eq('provider', 'clerk').eq('providerAccountId', identity.subject)).unique()
  if (!existing || commerceEnvironment(existing.environment || '') !== identity.environment) return null
  return snapshot(ctx, existing.globalUserId, identity.environment)
} })

export const upsert = mutation({ args: { ...identityArgs, email: v.optional(v.string()), name: v.optional(v.string()), imageUrl: v.optional(v.string()) }, handler: async (ctx, args) => {
  const identity = checked(args)
  const existing = await find(ctx, identity)
  if (existing) return snapshot(ctx, existing.globalUserId, identity.environment)
  const now = Date.now()
  const globalUserId = await ctx.db.insert('globalUsers', { globalUserId: `gu_${crypto.randomUUID()}`, primaryEmail: args.email, name: args.name, imageUrl: args.imageUrl, createdAt: now, updatedAt: now })
  await ctx.db.insert('identityAccounts', { globalUserId, provider: identity.provider, issuer: identity.issuer, providerAccountId: identity.subject, environment: identity.environment, email: args.email, source: 'site_verified_session', createdAt: now, updatedAt: now })
  return snapshot(ctx, globalUserId, identity.environment)
} })

/** Both identities must be independently verified by the server callback. Email never proves ownership. */
export const linkVerifiedClerk = mutation({ args: { ...identityArgs, clerkId: v.string() }, handler: async (ctx, args) => {
  const identity = checked(args)
  if (args.provider.trim() === 'clerk' || !args.clerkId.trim()) throw new Error('identity_link_invalid')
  const legacy = await ctx.db.query('identityAccounts').withIndex('by_providerAccount', q => q.eq('provider', 'clerk').eq('providerAccountId', args.clerkId)).unique()
  if (!legacy || commerceEnvironment(legacy.environment || '') !== identity.environment) throw new Error('legacy_identity_not_found')
  const existing = await find(ctx, identity)
  if (existing && existing.globalUserId !== legacy.globalUserId) throw new Error('identity_link_conflict')
  if (!existing) {
    const now = Date.now()
    const linkedId = await ctx.db.insert('identityAccounts', { globalUserId: legacy.globalUserId, provider: identity.provider, issuer: identity.issuer, providerAccountId: identity.subject, environment: identity.environment, source: 'site_verified_dual_session', sourceRef: legacy._id, createdAt: now, updatedAt: now })
    await ctx.db.insert('productAccessEvents', { source: 'site_identity', eventType: 'identity_linked', sourceRef: linkedId,
      idempotencyKey: `site:identity_linked:${linkedId}`, environment: identity.environment, globalUserId: legacy.globalUserId,
      status: 'verified', reason: 'Both provider sessions verified by the server', createdAt: now })
  }
  return snapshot(ctx, legacy.globalUserId, identity.environment)
} })
