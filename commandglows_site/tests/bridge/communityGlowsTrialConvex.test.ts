import { convexTest } from 'convex-test'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const BRIDGE_SECRET = 'communityglows-convex-trial-test-secret'
const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000

describe('CommunityGlows trial Convex integration', () => {
  const previousBridgeSecret = process.env.SUITE_BRIDGE_CONVEX_SECRET

  beforeAll(() => {
    process.env.SUITE_BRIDGE_CONVEX_SECRET = BRIDGE_SECRET
  })

  afterAll(() => {
    if (previousBridgeSecret === undefined) {
      delete process.env.SUITE_BRIDGE_CONVEX_SECRET
    } else {
      process.env.SUITE_BRIDGE_CONVEX_SECRET = previousBridgeSecret
    }
  })

  test('denies access after 30 days despite a stale legacy product_default grant', async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    const trialStartedAt = now - TRIAL_DURATION_MS - 1
    const trialExpiresAt = now - 1
    const providerAccountId = 'communityglows-expired-trial'
    const globalUserPublicId = 'gu_communityglows_expired_trial'

    await t.run(async (ctx) => {
      const globalUserId = await ctx.db.insert('globalUsers', {
        globalUserId: globalUserPublicId,
        primaryEmail: 'expired-trial@example.test',
        createdAt: trialStartedAt,
        updatedAt: now,
      })

      await ctx.db.insert('identityAccounts', {
        globalUserId,
        provider: 'communityglows_convex',
        providerAccountId,
        email: 'expired-trial@example.test',
        environment: 'test',
        createdAt: trialStartedAt,
        updatedAt: now,
      })

      await ctx.db.insert('productEntitlements', {
        globalUserId,
        productId: 'communityglows',
        plan: 'trial',
        status: 'trialing',
        source: 'product_trial',
        environment: 'test',
        idempotencyKey: `communityglows_product_trial:${globalUserPublicId}`,
        trialStartedAt,
        trialExpiresAt,
        trialAttempt: 1,
        grantedAt: trialStartedAt,
        createdAt: trialStartedAt,
        updatedAt: now,
      })

      await ctx.db.insert('productEntitlements', {
        globalUserId,
        productId: 'communityglows',
        plan: 'free',
        status: 'active',
        source: 'product_default',
        environment: 'test',
        idempotencyKey: `product_default:${globalUserPublicId}:communityglows`,
        grantedAt: trialStartedAt,
        createdAt: trialStartedAt,
        updatedAt: now,
      })
    })

    const snapshot = await t.mutation(
      api.bridge.ensureCommunityGlowsEntitlementSnapshotByProviderAccount,
      {
        providerAccountId,
        environment: 'test',
        bridgeSecret: BRIDGE_SECRET,
      }
    )

    expect(snapshot).toMatchObject({
      hasAccess: false,
      accessState: 'trial_expired',
      globalUserId: globalUserPublicId,
      planId: 'trial',
      source: 'product_trial',
      trialStartedAt,
      trialEndsAt: trialExpiresAt,
      trialExpiresAt,
      reasonCode: 'trial_expired',
    })

    const entitlements = await t.run(async (ctx) =>
      ctx.db.query('productEntitlements').collect()
    )
    expect(entitlements).toHaveLength(2)
  })

  test('creates three exact 30-day cycles and denies a fourth', async () => {
    const t = convexTest(schema, modules)
    const providerAccountId = 'communityglows-restarts'
    const installationHash = 'communityglows-installation-hash'

    const callBridge = (trialAction: 'start' | 'restart') =>
      t.mutation(
        api.bridge.ensureCommunityGlowsEntitlementSnapshotByProviderAccount,
        {
          providerAccountId,
          environment: 'test',
          installationHash,
          trialAction,
          bridgeSecret: BRIDGE_SECRET,
        }
      )

    const expireLatest = async () => {
      await t.run(async (ctx) => {
        const rows = await ctx.db.query('productEntitlements').collect()
        const latest = rows
          .filter(
            (row) =>
              row.productId === 'communityglows' &&
              row.source === 'product_trial'
          )
          .sort(
            (left, right) =>
              (right.trialAttempt ?? 0) - (left.trialAttempt ?? 0)
          )[0]
        if (!latest) throw new Error('trial_not_found')
        await ctx.db.patch(latest._id, {
          trialExpiresAt: Date.now() - 1,
          updatedAt: Date.now(),
        })
      })
    }

    const initialStartedAt = Date.now()
    const initial = await callBridge('start')
    expect(initial).toMatchObject({
      hasAccess: true,
      accessState: 'trial_active',
      trialAttempt: 1,
      trialRestartsRemaining: 2,
      trialRestartEligible: false,
    })
    expect(initial.trialExpiresAt).toBeGreaterThanOrEqual(
      initialStartedAt + TRIAL_DURATION_MS
    )

    await expireLatest()
    const secondStartedAt = Date.now()
    const second = await callBridge('restart')
    expect(second).toMatchObject({
      trialAttempt: 2,
      trialRestartsRemaining: 1,
      trialRestartEligible: false,
    })
    expect(second.trialExpiresAt).toBeGreaterThanOrEqual(
      secondStartedAt + TRIAL_DURATION_MS
    )

    await expireLatest()
    const thirdStartedAt = Date.now()
    const third = await callBridge('restart')
    expect(third).toMatchObject({
      trialAttempt: 3,
      trialRestartsRemaining: 0,
      trialRestartEligible: false,
    })
    expect(third.trialExpiresAt).toBeGreaterThanOrEqual(
      thirdStartedAt + TRIAL_DURATION_MS
    )

    await expireLatest()
    const exhausted = await callBridge('restart')
    expect(exhausted).toMatchObject({
      hasAccess: false,
      accessState: 'trial_exhausted',
      trialAttempt: 3,
      trialRestartsRemaining: 0,
      trialRestartEligible: false,
      reasonCode: 'trial_exhausted',
    })

    const trials = await t.run(async (ctx) => {
      const rows = await ctx.db.query('productEntitlements').collect()
      return rows.filter(
        (row) =>
          row.productId === 'communityglows' &&
          row.source === 'product_trial'
      )
    })
    expect(trials.map((trial) => trial.trialAttempt)).toEqual([1, 2, 3])
  })
})
