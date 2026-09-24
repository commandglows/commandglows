import { convexTest } from 'convex-test'
import { internal } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')

afterEach(() => vi.unstubAllEnvs())

test('rejects trial counter resets outside explicitly configured development', async () => {
  const t = convexTest(schema, modules)
  for (const environment of ['', 'production']) {
    vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', environment)
    await expect(t.mutation(internal.trialMaintenance.resetAllDevelopmentNetworkTrialLimits, {}))
      .rejects.toThrow('trial_reset_requires_development_environment')
  }
})

test('preserves production counters when resetting development counters', async () => {
  vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'development')
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (const environment of ['development', 'production']) {
      await ctx.db.insert('productTrialRiskWindows', {
        productId: 'commandglows_app', environment, networkHash: 'network',
        windowStartedAt: 1, grantCount: 3, expiresAt: 100, updatedAt: 1,
      })
    }
  })
  expect(await t.mutation(internal.trialMaintenance.resetAllDevelopmentNetworkTrialLimits, {}))
    .toEqual({ deletedNetworkLimitWindows: 1 })
  const remaining = await t.run((ctx) => ctx.db.query('productTrialRiskWindows').collect())
  expect(remaining).toHaveLength(1)
  expect(remaining[0].environment).toBe('production')
})
