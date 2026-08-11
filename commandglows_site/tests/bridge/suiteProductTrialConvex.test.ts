import { convexTest } from 'convex-test'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const BRIDGE_SECRET = 'suite-product-trial-test-secret'
const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000

describe('shared suite product trial writer', () => {
  const previousBridgeSecret = process.env.SUITE_BRIDGE_CONVEX_SECRET

  beforeAll(() => {
    process.env.SUITE_BRIDGE_CONVEX_SECRET = BRIDGE_SECRET
  })

  test.each([
    'commandglows_app',
    'commandglows_formation',
    'gocharbon',
    'contentglowz',
    'shipglows',
    'replayglowz',
    'communityglows',
    'temu_shopping_lists',
  ])('makes the common trial reachable for registered product %s', async (productId) => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const now = Date.now()
      await ctx.db.insert('globalUsers', {
        globalUserId: `gu_${productId}`,
        createdAt: now,
        updatedAt: now,
      })
    })

    const before = Date.now()
    const snapshot = await t.mutation(
      api.bridge.ensureSuiteProductTrialByGlobalUserId,
      {
        globalUserId: `gu_${productId}`,
        productId,
        installationHash: `installation_${productId}`,
        environment: 'test',
        trialAction: 'start',
        bridgeSecret: BRIDGE_SECRET,
      }
    )

    expect(snapshot).toMatchObject({
      productId,
      hasAccess: true,
      accessState: 'trial_active',
      trialAttempt: 1,
      trialRestartsRemaining: 2,
      trialRestartEligible: false,
      planId: 'trial',
      source: 'product_trial',
    })
    const rows = await t.run(async (ctx) =>
      (await ctx.db.query('productEntitlements').collect()).filter(
        (row) => row.productId === productId
      )
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].trialExpiresAt).toBeGreaterThanOrEqual(
      before + TRIAL_DURATION_MS
    )
  })

  afterAll(() => {
    if (previousBridgeSecret === undefined) {
      delete process.env.SUITE_BRIDGE_CONVEX_SECRET
    } else {
      process.env.SUITE_BRIDGE_CONVEX_SECRET = previousBridgeSecret
    }
  })

  test('starts ReplayGlowz with the common 30-day policy and no free fallback', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const now = Date.now()
      const globalUserId = await ctx.db.insert('globalUsers', {
        globalUserId: 'gu_replay_trial',
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert('identityAccounts', {
        globalUserId,
        provider: 'clerk',
        providerAccountId: 'clerk_replay_trial',
        environment: 'test',
        createdAt: now,
        updatedAt: now,
      })
    })

    const before = Date.now()
    const snapshot = await t.mutation(
      api.bridge.ensureReplayGlowzEntitlementSnapshotByClerkId,
      {
        clerkId: 'clerk_replay_trial',
        bridgeSecret: BRIDGE_SECRET,
        environment: 'test',
        installationHash: 'replay_installation_hash',
        trialAction: 'start',
      }
    )
    expect(snapshot).toMatchObject({
      hasAccess: true,
      matchedProductId: 'replayglowz',
      reasonCode: 'active_entitlement',
    })

    const trials = await t.run(async (ctx) => {
      const rows = await ctx.db.query('productEntitlements').collect()
      return rows.filter((row) => row.productId === 'replayglowz')
    })
    expect(trials).toHaveLength(1)
    expect(trials[0]).toMatchObject({
      status: 'trialing',
      source: 'product_trial',
      trialAttempt: 1,
    })
    expect(trials[0].trialExpiresAt).toBeGreaterThanOrEqual(
      before + TRIAL_DURATION_MS
    )
  })

  test('starts Temu with the same policy instead of a permanent grant', async () => {
    const t = convexTest(schema, modules)
    const before = Date.now()
    const snapshot = await t.mutation(
      api.bridge.ensureTemuShoppingListsEntitlementSnapshotByProviderAccount,
      {
        providerAccountId: 'temu_trial_user',
        bridgeSecret: BRIDGE_SECRET,
        environment: 'test',
        installationHash: 'temu_installation_hash',
        trialAction: 'start',
      }
    )

    expect(snapshot).toMatchObject({
      hasAccess: true,
      accessState: 'trial_active',
      trialAttempt: 1,
      trialRestartsRemaining: 2,
      trialRestartEligible: false,
      source: 'product_trial',
    })
    const trials = await t.run(async (ctx) => {
      const rows = await ctx.db.query('productEntitlements').collect()
      return rows.filter((row) => row.productId === 'temu_shopping_lists')
    })
    expect(trials).toHaveLength(1)
    expect(trials[0].source).toBe('product_trial')
    expect(trials[0].trialExpiresAt).toBeGreaterThanOrEqual(
      before + TRIAL_DURATION_MS
    )
  })
})
