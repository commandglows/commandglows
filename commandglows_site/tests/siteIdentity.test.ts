import { convexTest } from 'convex-test'
import { anyApi } from 'convex/server'
import schema from '../convex/schema'

const modules = import.meta.glob('../convex/**/*.ts')
const backend = () => convexTest(schema, modules)
const identity = { provider: 'auth0', issuer: 'https://tenant.example.test/', subject: 'auth0|buyer', environment: 'sandbox', bridgeSecret: 'synthetic-site-secret' }
beforeEach(() => { vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', identity.bridgeSecret); vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'test') })
afterEach(() => vi.unstubAllEnvs())

async function legacy(t: ReturnType<typeof backend>, environment = 'sandbox') {
  return t.run(async ctx => {
    const id = await ctx.db.insert('globalUsers', { globalUserId: 'gu_existing', primaryEmail: 'same@example.test', createdAt: 1, updatedAt: 1 })
    await ctx.db.insert('identityAccounts', { globalUserId: id, provider: 'clerk', providerAccountId: 'user_old', environment, createdAt: 1, updatedAt: 1 })
    await ctx.db.insert('users', { clerkId: 'user_old', email: 'same@example.test', globalUserId: id, role: 'admin' })
    return id
  })
}

test('rejects untrusted caller and foreign deployment environment', async () => {
  const t = backend()
  await expect(t.query(anyApi.siteIdentity.resolve, { ...identity, bridgeSecret: 'bad' })).rejects.toThrow('identity_forbidden')
  await expect(t.mutation(anyApi.siteIdentity.upsert, { ...identity, environment: 'production' })).rejects.toThrow('identity_environment_mismatch')
})
test('creates once, never merges matching emails, and scopes identical subjects by issuer', async () => {
  const t = backend(); await legacy(t)
  const a = await t.mutation(anyApi.siteIdentity.upsert, { ...identity, email: 'same@example.test' })
  expect(a.globalUserId).not.toBe('gu_existing'); expect(a.role).toBe('user'); expect(a.formationAccess).toBe(false)
  expect(await t.mutation(anyApi.siteIdentity.upsert, identity)).toEqual(a)
  const b = await t.mutation(anyApi.siteIdentity.upsert, { ...identity, issuer: 'https://other.example.test/' })
  expect(b.globalUserId).not.toBe(a.globalUserId)
})
test('dual verified identity link preserves the original account, admin role and idempotence', async () => {
  const t = backend(); await legacy(t)
  const args = { ...identity, clerkId: 'user_old' }
  expect(await t.mutation(anyApi.siteIdentity.linkVerifiedClerk, args)).toMatchObject({ globalUserId: 'gu_existing', role: 'admin', formationAccess: true })
  await t.mutation(anyApi.siteIdentity.linkVerifiedClerk, args)
  expect(await t.run(ctx => ctx.db.query('globalUsers').collect())).toHaveLength(1)
  expect(await t.run(ctx => ctx.db.query('identityAccounts').collect())).toHaveLength(2)
  const audit = await t.run(ctx => ctx.db.query('productAccessEvents').collect())
  expect(audit).toHaveLength(1)
  expect(audit[0]).toMatchObject({ eventType: 'identity_linked', status: 'verified', environment: 'sandbox' })
})
test('transitional Clerk projection requires verified server authority and matching environment', async () => {
  const t = backend(); await legacy(t)
  const args = { clerkId: 'user_old', environment: 'preview', bridgeSecret: identity.bridgeSecret }
  expect(await t.query(anyApi.siteIdentity.resolveClerk, args)).toMatchObject({ globalUserId: 'gu_existing', role: 'admin' })
  await expect(t.query(anyApi.siteIdentity.resolveClerk, { ...args, bridgeSecret: 'bad' })).rejects.toThrow('identity_forbidden')
  await t.run(async ctx => { const row = await ctx.db.query('identityAccounts').unique(); await ctx.db.patch(row!._id, { environment: 'production' }) })
  expect(await t.query(anyApi.siteIdentity.resolveClerk, args)).toBeNull()
})
test('deleting migrated Clerk identity preserves canonical role but prevents legacy sign in', async () => {
  const t = backend(); await legacy(t)
  await t.mutation(anyApi.siteIdentity.linkVerifiedClerk, { ...identity, clerkId: 'user_old' })
  await t.mutation(anyApi.users.deleteByClerkId, { clerkId: 'user_old' })
  expect(await t.query(anyApi.siteIdentity.resolve, identity)).toMatchObject({ globalUserId: 'gu_existing', role: 'admin' })
  expect(await t.query(anyApi.siteIdentity.resolveClerk, { clerkId: 'user_old', environment: 'sandbox', bridgeSecret: identity.bridgeSecret })).toBeNull()
  expect(await t.run(ctx => ctx.db.query('users').collect())).toHaveLength(1)
})
test('deleting a sole Clerk identity retains existing deletion behavior', async () => {
  const t = backend(); await legacy(t)
  await t.mutation(anyApi.users.deleteByClerkId, { clerkId: 'user_old' })
  expect(await t.run(ctx => ctx.db.query('users').collect())).toHaveLength(0)
})
test('rejects linking an already owned identity without moving either account', async () => {
  const t = backend(); await legacy(t)
  const created = await t.mutation(anyApi.siteIdentity.upsert, identity)
  await expect(t.mutation(anyApi.siteIdentity.linkVerifiedClerk, { ...identity, clerkId: 'user_old' })).rejects.toThrow('identity_link_conflict')
  expect((await t.query(anyApi.siteIdentity.resolve, identity)).globalUserId).toBe(created.globalUserId)
})
test('rejects legacy linkage across environments and leaves unscoped Auth0 records untouched', async () => {
  const t = backend(); const id = await legacy(t, 'production')
  await expect(t.mutation(anyApi.siteIdentity.linkVerifiedClerk, { ...identity, clerkId: 'user_old' })).rejects.toThrow('legacy_identity_not_found')
  await t.run(ctx => ctx.db.insert('identityAccounts', { globalUserId: id, provider: 'auth0', providerAccountId: identity.subject, createdAt: 1, updatedAt: 1 }))
  expect(await t.query(anyApi.siteIdentity.resolve, identity)).toBeNull()
})
test('formation access requires an active qualifying entitlement in this environment', async () => {
  const t = backend(); const a = await t.mutation(anyApi.siteIdentity.upsert, identity)
  await t.run(async ctx => {
    const user = await ctx.db.query('globalUsers').withIndex('by_globalUserId', q => q.eq('globalUserId', a.globalUserId)).unique()
    await ctx.db.insert('productEntitlements', { globalUserId: user!._id, productId: 'commandglows_formation', plan: 'paid', status: 'active', source: 'stripe', environment: 'production', idempotencyKey: 'paid', createdAt: 1, updatedAt: 1 })
  })
  expect((await t.query(anyApi.siteIdentity.resolve, identity)).formationAccess).toBe(false)
  await t.run(async ctx => { const e = await ctx.db.query('productEntitlements').unique(); await ctx.db.patch(e!._id, { environment: 'sandbox' }) })
  expect((await t.query(anyApi.siteIdentity.resolve, identity)).formationAccess).toBe(true)
  await t.run(async ctx => { const e = await ctx.db.query('productEntitlements').unique(); await ctx.db.patch(e!._id, { status: 'revoked' }) })
  expect((await t.query(anyApi.siteIdentity.resolve, identity)).formationAccess).toBe(false)
})
test('legacy ContentGlows Auth0 bridge cannot adopt a scoped site identity with the same subject', async () => {
  const t = backend()
  const site = await t.mutation(anyApi.siteIdentity.upsert, identity)
  const content = await t.mutation(anyApi.bridge.upsertContentGlowsAuth0Identity, {
    auth0Subject: identity.subject, environment: 'sandbox', bridgeSecret: identity.bridgeSecret,
  })
  expect(content.globalUserId).not.toBe(site.globalUserId)
  expect((await t.query(anyApi.siteIdentity.resolve, identity)).globalUserId).toBe(site.globalUserId)
  const rows = await t.run(ctx => ctx.db.query('identityAccounts').collect())
  expect(rows.map(row => row.provider).sort()).toEqual(['auth0', 'site:auth0'])
})
test('rejects nested or ambiguous provider namespaces', async () => {
  const t = backend()
  for (const provider of ['site:auth0', 'auth0/tenant', 'Auth0', '']) {
    await expect(t.mutation(anyApi.siteIdentity.upsert, { ...identity, provider })).rejects.toThrow('identity_invalid')
  }
})
