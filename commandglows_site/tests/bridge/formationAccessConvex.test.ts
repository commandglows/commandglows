import { convexTest } from 'convex-test'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')

describe('Formation entitlement access', () => {
  test('ignores legacy Polar-era user flags and requires a canonical entitlement', async () => {
    const t = convexTest(schema, modules)
    let globalUserId = ''
    await t.run(async (ctx) => {
      globalUserId = await ctx.db.insert('globalUsers', {
        globalUserId: 'gu_formation_access',
        primaryEmail: 'formation@example.test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      await ctx.db.insert('users', {
        clerkId: 'clerk_formation_access',
        email: 'formation@example.test',
        globalUserId: globalUserId as never,
        subscriptionTier: 'premium',
        subscriptionStatus: 'active',
        courseEntitlements: ['commandglows-training'],
      })
    })

    const legacyOnly = await t.query(api.users.getFormationAccessByClerkId, {
      clerkId: 'clerk_formation_access',
    })
    expect(legacyOnly).toMatchObject({ hasAccess: false, source: 'none' })

    await t.run(async (ctx) => {
      const now = Date.now()
      await ctx.db.insert('productEntitlements', {
        globalUserId: globalUserId as never,
        productId: 'commandglows_formation',
        plan: 'formation',
        status: 'active',
        source: 'suite_commerce',
        environment: 'test',
        idempotencyKey: 'stripe:formation-access',
        grantedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    })

    const paid = await t.query(api.users.getFormationAccessByClerkId, {
      clerkId: 'clerk_formation_access',
    })
    expect(paid).toMatchObject({ hasAccess: true, source: 'entitlement' })
  })

  test('grants only a non-expired Formation trial', async () => {
    const t = convexTest(schema, modules)
    let globalUserId = ''
    await t.run(async (ctx) => {
      const now = Date.now()
      globalUserId = await ctx.db.insert('globalUsers', {
        globalUserId: 'gu_formation_trial',
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert('users', {
        clerkId: 'clerk_formation_trial',
        email: 'trial@example.test',
        globalUserId: globalUserId as never,
      })
      await ctx.db.insert('productEntitlements', {
        globalUserId: globalUserId as never,
        productId: 'commandglows_formation',
        plan: 'trial',
        status: 'trialing',
        source: 'product_trial',
        environment: 'test',
        idempotencyKey: 'formation-trial:1',
        trialStartedAt: now,
        trialExpiresAt: now + 30 * 24 * 60 * 60 * 1000,
        trialAttempt: 1,
        createdAt: now,
        updatedAt: now,
      })
    })

    expect(await t.query(api.users.getFormationAccessByClerkId, {
      clerkId: 'clerk_formation_trial',
    })).toMatchObject({ hasAccess: true, source: 'entitlement' })

    await t.run(async (ctx) => {
      const trial = await ctx.db
        .query('productEntitlements')
        .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', 'formation-trial:1'))
        .unique()
      await ctx.db.patch(trial!._id, { trialExpiresAt: Date.now() - 1 })
    })
    expect(await t.query(api.users.getFormationAccessByClerkId, {
      clerkId: 'clerk_formation_trial',
    })).toMatchObject({ hasAccess: false, source: 'none' })
  })
})
