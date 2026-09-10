import { convexTest } from 'convex-test'
import { anyApi } from 'convex/server'
import schema from '../../convex/schema'
const modules = import.meta.glob('../../convex/**/*.ts')
const bridgeSecret = 'feature-synthetic-secret'
const actor = { actorGlobalUserId: 'gu_existing', bridgeSecret }
beforeEach(() => { vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', bridgeSecret); vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'test') })
afterEach(() => vi.unstubAllEnvs())
async function setup() {
  const t = convexTest(schema, modules)
  await t.run(async ctx => {
    const globalUserId = await ctx.db.insert('globalUsers', { globalUserId: actor.actorGlobalUserId, createdAt: 1, updatedAt: 1 })
    await ctx.db.insert('identityAccounts', { globalUserId, provider: 'clerk', providerAccountId: 'user_legacy', environment: 'sandbox', createdAt: 1, updatedAt: 1 })
  })
  return t
}
test('votes retain one canonical owner when a Clerk account is linked to Auth0', async () => {
  const t = await setup(); const key = 'commandglows-guide-v2'
  const before = await t.mutation(anyApi.features.vote, { clerkId: 'user_legacy', bridgeSecret, key })
  const account = await t.mutation(anyApi.siteIdentity.linkVerifiedClerk, { provider: 'auth0', issuer: 'https://tenant.example.test/', subject: 'auth0|existing', environment: 'test', bridgeSecret, clerkId: 'user_legacy' })
  const after = await t.mutation(anyApi.features.vote, { actorGlobalUserId: account.globalUserId, bridgeSecret, key })
  expect(after).toMatchObject({ status: 'duplicate', votes: before.votes })
  expect(await t.run(ctx => ctx.db.query('featureVotes').collect())).toHaveLength(1)
})
test('votes reject untrusted generic identities and legacy identities from another environment', async () => {
  const t = await setup(); const key = 'commandglows-guide-v2'
  await expect(t.mutation(anyApi.features.vote, { ...actor, key, bridgeSecret: 'bad' })).rejects.toThrow('bridge_secret_mismatch')
  await expect(t.mutation(anyApi.features.vote, { ...actor, key, actorGlobalUserId: 'gu_missing' })).rejects.toThrow('account_not_ready')
  await t.run(async ctx => { const mapping = await ctx.db.query('identityAccounts').unique(); await ctx.db.patch(mapping!._id, { environment: 'production' }) })
  await expect(t.mutation(anyApi.features.vote, { clerkId: 'user_legacy', bridgeSecret, key })).rejects.toThrow('account_not_ready')
  expect(await t.run(ctx => ctx.db.query('featureVotes').collect())).toHaveLength(0)
})
