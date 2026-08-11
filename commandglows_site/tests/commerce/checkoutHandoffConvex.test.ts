import { convexTest } from 'convex-test'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const BRIDGE_SECRET = 'checkout-handoff-test-secret'

describe('one-time commerce checkout handoff authority', () => {
  const previous = process.env.SUITE_BRIDGE_CONVEX_SECRET

  beforeAll(() => {
    process.env.SUITE_BRIDGE_CONVEX_SECRET = BRIDGE_SECRET
  })

  afterAll(() => {
    if (previous === undefined) delete process.env.SUITE_BRIDGE_CONVEX_SECRET
    else process.env.SUITE_BRIDGE_CONVEX_SECRET = previous
  })

  test('claims once and returns the same completed session on replay', async () => {
    const t = convexTest(schema, modules)
    const args = {
      jtiHash: 'a'.repeat(64),
      globalUserId: 'gu_checkout',
      productId: 'communityglows',
      offerId: 'communityglows/lifetime_deal',
      environment: 'test',
      expiresAt: Date.now() + 60_000,
      bridgeSecret: BRIDGE_SECRET,
    }
    const first = await t.mutation(api.bridge.claimCommerceCheckoutHandoff, args)
    const retry = await t.mutation(api.bridge.claimCommerceCheckoutHandoff, args)
    expect(retry.idempotencyKey).toBe(first.idempotencyKey)

    await t.mutation(api.bridge.completeCommerceCheckoutHandoff, {
      jtiHash: args.jtiHash,
      globalUserId: args.globalUserId,
      productId: args.productId,
      offerId: args.offerId,
      environment: args.environment,
      bridgeSecret: args.bridgeSecret,
      checkoutUrl: 'https://checkout.stripe.test/session',
      providerOrderId: 'cs_test_once',
    })
    const replay = await t.mutation(api.bridge.claimCommerceCheckoutHandoff, args)
    expect(replay).toMatchObject({
      status: 'completed',
      idempotencyKey: first.idempotencyKey,
      checkoutUrl: 'https://checkout.stripe.test/session',
      providerOrderId: 'cs_test_once',
    })

    const rows = await t.run(async (ctx) =>
      await ctx.db.query('commerceCheckoutHandoffs').collect()
    )
    expect(rows).toHaveLength(1)
  })

  test('rejects replay with a different product context', async () => {
    const t = convexTest(schema, modules)
    const base = {
      jtiHash: 'b'.repeat(64),
      globalUserId: 'gu_checkout',
      productId: 'communityglows',
      offerId: 'communityglows/lifetime_deal',
      environment: 'test',
      expiresAt: Date.now() + 60_000,
      bridgeSecret: BRIDGE_SECRET,
    }
    await t.mutation(api.bridge.claimCommerceCheckoutHandoff, base)
    await expect(t.mutation(api.bridge.claimCommerceCheckoutHandoff, {
      ...base,
      productId: 'commandglows_app',
      offerId: 'commandglows_app/power',
    })).rejects.toThrow('checkout_handoff_context_mismatch')
  })
})
