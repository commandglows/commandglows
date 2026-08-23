import { convexTest } from 'convex-test'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const BRIDGE_SECRET = 'account-retention-convex-secret'

describe('CommunityGlows account retention and relink', () => {
  beforeAll(() => {
    process.env.SUITE_BRIDGE_CONVEX_SECRET = BRIDGE_SECRET
  })

  test('removes plaintext identity while retaining paid and trial history', async () => {
    const t = convexTest(schema, modules)
    const seeded = await t.run(async (ctx) => {
      const globalUserId = await ctx.db.insert('globalUsers', {
        globalUserId: 'gu_retention',
        primaryEmail: 'buyer@example.test',
        name: 'Buyer',
        createdAt: 1,
        updatedAt: 1,
      })
      await ctx.db.insert('identityAccounts', {
        globalUserId,
        provider: 'communityglows_convex',
        providerAccountId: 'provider-old',
        email: 'buyer@example.test',
        sourceRef: 'plaintext-source',
        createdAt: 1,
        updatedAt: 1,
      })
      const entitlementId = await ctx.db.insert('productEntitlements', {
        globalUserId,
        productId: 'communityglows',
        plan: 'lifetime_deal',
        status: 'active',
        source: 'direct',
        sourceRef: 'order-123',
        environment: 'test',
        idempotencyKey: 'paid:order-123',
        trialAttempt: 3,
        createdAt: 1,
        updatedAt: 1,
      })
      return { globalUserId, entitlementId }
    })

    const result = await t.mutation(api.bridge.prepareCommunityGlowsAccountDeletion, {
      providerAccountId: 'provider-old',
      email: 'BUYER@example.test',
      emailDigest: 'email-digest',
      providerAccountDigest: 'old-provider-digest',
      environment: 'test',
      bridgeSecret: BRIDGE_SECRET,
    })
    expect(result).toMatchObject({ status: 'prepared', paidEntitlementRetained: true })

    const state = await t.run(async (ctx) => ({
      user: await ctx.db.get(seeded.globalUserId),
      identities: await ctx.db.query('identityAccounts').collect(),
      retentions: await ctx.db.query('communityGlowsAccountRetentions').collect(),
      entitlement: await ctx.db.get(seeded.entitlementId),
    }))
    expect(state.user).not.toHaveProperty('primaryEmail')
    expect(state.identities[0]).toMatchObject({
      providerAccountId: expect.stringMatching(/^deleted:/),
    })
    expect(state.identities[0]).not.toHaveProperty('email')
    expect(state.retentions[0]).toMatchObject({
      emailDigest: 'email-digest',
      deletedProviderAccountDigest: 'old-provider-digest',
      trialAttempts: 3,
    })
    expect(JSON.stringify(state.retentions[0])).not.toContain('buyer@example.test')
    expect(state.entitlement).toMatchObject({ status: 'active', plan: 'lifetime_deal' })
  })

  test('relinks the same retained identity without reviving refunded access', async () => {
    const t = convexTest(schema, modules)
    const globalUserId = await t.run(async (ctx) => {
      const id = await ctx.db.insert('globalUsers', {
        globalUserId: 'gu_refunded', createdAt: 1, updatedAt: 1,
      })
      const entitlementId = await ctx.db.insert('productEntitlements', {
        globalUserId: id,
        productId: 'communityglows',
        plan: 'lifetime_deal',
        status: 'refunded',
        source: 'direct',
        environment: 'test',
        idempotencyKey: 'refunded:order-1',
        trialAttempt: 3,
        createdAt: 1,
        updatedAt: 1,
      })
      await ctx.db.insert('communityGlowsAccountRetentions', {
        emailDigest: 'same-email-digest',
        deletedProviderAccountDigest: 'old-provider-digest',
        globalUserId: id,
        environment: 'test',
        trialAttempts: 3,
        retainedEntitlementIds: [entitlementId],
        status: 'retained',
        deletedAt: 2,
        createdAt: 2,
        updatedAt: 2,
      })
      return id
    })

    const result = await t.mutation(api.bridge.relinkCommunityGlowsAccount, {
      providerAccountId: 'provider-new',
      emailDigest: 'same-email-digest',
      providerAccountDigest: 'new-provider-digest',
      environment: 'test',
      bridgeSecret: BRIDGE_SECRET,
    })
    expect(result).toMatchObject({
      status: 'relinked', hasAccess: false, trialAttempts: 3,
    })
    const identity = await t.run(async (ctx) =>
      ctx.db.query('identityAccounts').withIndex('by_providerAccount', (q) =>
        q.eq('provider', 'communityglows_convex').eq('providerAccountId', 'provider-new')
      ).first()
    )
    expect(identity?.globalUserId).toBe(globalUserId)
    expect(identity).not.toHaveProperty('email')
  })

  test('rejects reuse of a deleted provider account identifier', async () => {
    const t = convexTest(schema, modules)
    await t.run(async (ctx) => {
      const globalUserId = await ctx.db.insert('globalUsers', {
        globalUserId: 'gu_deleted_provider', createdAt: 1, updatedAt: 1,
      })
      await ctx.db.insert('communityGlowsAccountRetentions', {
        emailDigest: 'email-digest',
        deletedProviderAccountDigest: 'deleted-provider-digest',
        globalUserId,
        environment: 'test',
        trialAttempts: 3,
        retainedEntitlementIds: [],
        status: 'retained',
        deletedAt: 2,
        createdAt: 2,
        updatedAt: 2,
      })
    })

    await expect(t.mutation(
      api.bridge.ensureCommunityGlowsEntitlementSnapshotByProviderAccount,
      {
        providerAccountId: 'deleted-provider-id',
        providerAccountDigest: 'deleted-provider-digest',
        environment: 'test',
        bridgeSecret: BRIDGE_SECRET,
      }
    )).rejects.toThrow('provider_account_deleted')
  })
})
