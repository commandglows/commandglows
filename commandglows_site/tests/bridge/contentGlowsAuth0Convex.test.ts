import { convexTest } from 'convex-test'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const BRIDGE_SECRET = 'contentglows-convex-test-secret'

describe('ContentGlows Auth0 entitlement bridge', () => {
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

  test('does not grant development access from a production entitlement', async () => {
    const t = convexTest(schema, modules)
    const now = Date.now()
    const globalUserDocId = await t.run((ctx) =>
      ctx.db.insert('globalUsers', {
        globalUserId: 'gu_contentglows_environment',
        createdAt: now,
        updatedAt: now,
      })
    )
    await t.run(async (ctx) => {
      await ctx.db.insert('identityAccounts', {
        globalUserId: globalUserDocId,
        provider: 'auth0',
        providerAccountId: 'auth0|environment-subject',
        environment: 'production',
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert('productEntitlements', {
        globalUserId: globalUserDocId,
        productId: 'contentglowz',
        plan: 'paid',
        status: 'active',
        source: 'test',
        environment: 'production',
        idempotencyKey: 'contentglows-production-only',
        createdAt: now,
        updatedAt: now,
      })
    })

    const development = await t.mutation(
      api.bridge.upsertContentGlowsAuth0Identity,
      {
        auth0Subject: 'auth0|environment-subject',
        environment: 'development',
        bridgeSecret: BRIDGE_SECRET,
      }
    )
    expect(development.entitlement).toMatchObject({ hasAccess: false })
    expect(development.entitlements).toHaveLength(0)

    const production = await t.mutation(
      api.bridge.upsertContentGlowsAuth0Identity,
      {
        auth0Subject: 'auth0|environment-subject',
        environment: 'production',
        bridgeSecret: BRIDGE_SECRET,
      }
    )
    expect(production.entitlement).toMatchObject({
      hasAccess: true,
      status: 'active',
      plan: 'paid',
    })
  })
})
