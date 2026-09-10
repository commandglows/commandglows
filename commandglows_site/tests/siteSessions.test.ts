import { convexTest } from 'convex-test'
import { anyApi } from 'convex/server'
import schema from '../convex/schema'
const modules = import.meta.glob('../convex/**/*.ts')
const args = { attemptId: 'synthetic_attempt_1234567890', environment: 'test', bridgeSecret: 'synthetic-session-secret' }
beforeEach(() => { vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', args.bridgeSecret); vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'sandbox') })
afterEach(() => vi.unstubAllEnvs())
test('registration is idempotent only for the same pending transaction and cannot grant access', async () => {
  const t = convexTest(schema, modules); const input = { ...args, expiresAt: Date.now() + 300_000 }
  await t.mutation(anyApi.siteSessions.register, input); await t.mutation(anyApi.siteSessions.register, input)
  expect(await t.query(anyApi.siteSessions.isActive, args)).toBe(false)
  await expect(t.mutation(anyApi.siteSessions.register, { ...input, expiresAt: input.expiresAt + 1 })).rejects.toThrow('session_attempt_conflict')
})
test.each(['before', 'after'])('logout %s activation prevents later authenticated use', async order => {
  const t = convexTest(schema, modules)
  await t.mutation(anyApi.siteSessions.register, { ...args, expiresAt: Date.now() + 300_000 })
  const active = { ...args, expiresAt: Date.now() + 3_000_000 }
  if (order === 'after') { await t.mutation(anyApi.siteSessions.activate, active); expect(await t.query(anyApi.siteSessions.isActive, args)).toBe(true) }
  await t.mutation(anyApi.siteSessions.revoke, args); await t.mutation(anyApi.siteSessions.revoke, args)
  await expect(t.mutation(anyApi.siteSessions.activate, active)).rejects.toThrow('session_attempt_inactive')
  expect(await t.query(anyApi.siteSessions.isActive, args)).toBe(false)
})
test('unknown, expired and overlong sessions fail closed', async () => {
  const t = convexTest(schema, modules)
  await expect(t.mutation(anyApi.siteSessions.activate, { ...args, expiresAt: Date.now() + 1000 })).rejects.toThrow('session_attempt_inactive')
  await expect(t.mutation(anyApi.siteSessions.register, { ...args, expiresAt: Date.now() + 700_000 })).rejects.toThrow('session_expiry_invalid')
  await t.run(ctx => ctx.db.insert('siteLoginAttempts', { attemptId: args.attemptId, environment: 'sandbox', status: 'pending', expiresAt: 1, createdAt: 1, updatedAt: 1 }))
  await expect(t.mutation(anyApi.siteSessions.activate, { ...args, expiresAt: Date.now() + 1000 })).rejects.toThrow('session_attempt_inactive')
  expect(await t.query(anyApi.siteSessions.isActive, args)).toBe(false)
})
test('requires secret and matching deployment environment', async () => {
  const t = convexTest(schema, modules)
  await expect(t.query(anyApi.siteSessions.isActive, { ...args, bridgeSecret: 'wrong' })).rejects.toThrow('session_forbidden')
  await expect(t.query(anyApi.siteSessions.isActive, { ...args, environment: 'production' })).rejects.toThrow('session_environment_mismatch')
})
