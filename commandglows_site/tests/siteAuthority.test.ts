import { convexTest } from 'convex-test'
import { anyApi } from 'convex/server'
import schema from '../convex/schema'
const modules = import.meta.glob('../convex/**/*.ts')
const auth = { actorGlobalUserId: 'gu_member', bridgeSecret: 'authority-test-secret' }
beforeEach(() => vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', auth.bridgeSecret))
afterEach(() => vi.unstubAllEnvs())
test('feature suggestions require trusted canonical account and retain ownership', async () => {
  const t = convexTest(schema, modules)
  const id = await t.run(ctx => ctx.db.insert('globalUsers', { globalUserId: auth.actorGlobalUserId, createdAt: 1, updatedAt: 1 }))
  const input = { ...auth, projectId: 'commandglows', title: 'Improve search', description: 'Support exact phrase search' }
  await expect(t.mutation(anyApi.features.suggest, { ...input, bridgeSecret: 'bad' })).rejects.toThrow('bridge_secret_mismatch')
  await expect(t.mutation(anyApi.features.suggest, { ...input, actorGlobalUserId: 'gu_missing' })).rejects.toThrow('account_not_ready')
  await expect(t.mutation(anyApi.features.suggest, { ...input, clerkId: 'user_untrusted' })).rejects.toThrow('account_identity_required')
  await t.mutation(anyApi.features.suggest, input)
  expect(await t.run(ctx => ctx.db.query('featureSuggestions').unique())).toMatchObject({ globalUserId: id, title: input.title })
  await expect(t.mutation(anyApi.features.suggest, input)).rejects.toThrow('duplicate_suggestion')
})
