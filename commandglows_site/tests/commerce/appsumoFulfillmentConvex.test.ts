import { convexTest } from 'convex-test'
import { anyApi } from 'convex/server'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const secret = 'synthetic-appsumo-bridge-secret'
const licenseKey = '00000000-0000-4000-8000-000000000001'
const nextLicenseKey = '00000000-0000-4000-8000-000000000002'

const backend = () => convexTest(schema, modules)

function appSumoEvent(overrides: Record<string, unknown> = {}) {
  return {
    bridgeSecret: secret,
    licenseKey,
    event: 'activate',
    eventTimestamp: 1789060000000,
    test: false,
    desiredStatus: 'active',
    environment: 'sandbox',
    providerEventId: 'appsumo:activate:0001',
    productId: 'communityglows',
    offerId: 'communityglows/lifetime_deal',
    plan: 'lifetime_deal',
    globalUserId: 'gu_appsumo',
    ...overrides,
  }
}

async function seedOwner(t: ReturnType<typeof backend>) {
  return t.run((ctx) => ctx.db.insert('globalUsers', {
    globalUserId: 'gu_appsumo',
    primaryEmail: 'buyer@example.test',
    createdAt: 1,
    updatedAt: 1,
  }))
}

beforeEach(() => {
  vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', secret)
  vi.stubEnv('SUITE_BRIDGE_ENVIRONMENT', 'test')
})

afterEach(() => vi.unstubAllEnvs())

describe('AppSumo Convex fulfillment', () => {
  test('records test and purchase events without granting access', async () => {
    const t = backend()
    await seedOwner(t)

    expect(await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent({
      test: true,
      providerEventId: 'appsumo:test:0001',
    }))).toMatchObject({ status: 'ignored', reason: 'appsumo_test_event' })

    expect(await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent({
      event: 'purchase',
      desiredStatus: 'inactive',
      providerEventId: 'appsumo:purchase:0001',
    }))).toMatchObject({ status: 'inactive' })

    expect(await t.run((ctx) => ctx.db.query('productEntitlements').collect())).toHaveLength(0)
    expect(await t.run((ctx) => ctx.db.query('appSumoLicenses').collect())).toHaveLength(1)
  })

  test('requires an owner and supported offer before activating a license', async () => {
    const t = backend()

    expect(await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent()))
      .toMatchObject({ status: 'pending_review', reason: 'appsumo_owner_required' })

    await seedOwner(t)
    expect(await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent({
      licenseKey: nextLicenseKey,
      providerEventId: 'appsumo:activate:0002',
      productId: undefined,
      offerId: undefined,
      plan: undefined,
    }))).toMatchObject({ status: 'pending_review', reason: 'appsumo_mapping_required' })

    expect(await t.run((ctx) => ctx.db.query('productEntitlements').collect())).toHaveLength(0)
  })

  test('activates, deduplicates, revokes and reactivates the same AppSumo entitlement', async () => {
    const t = backend()
    await seedOwner(t)

    expect(await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent()))
      .toMatchObject({ status: 'active', snapshot: { hasAccess: true, source: 'appsumo' } })
    expect(await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent()))
      .toMatchObject({ alreadyProcessed: true, status: 'active' })
    expect(await t.run((ctx) => ctx.db.query('productEntitlements').collect())).toHaveLength(1)

    expect(await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent({
      event: 'deactivate',
      desiredStatus: 'deactivated',
      providerEventId: 'appsumo:deactivate:0001',
      eventTimestamp: 1789060001000,
    }))).toMatchObject({ status: 'deactivated' })
    expect((await t.run((ctx) => ctx.db.query('productEntitlements').collect()))[0].status).toBe('revoked')

    expect(await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent({
      providerEventId: 'appsumo:reactivate:0001',
      eventTimestamp: 1789060002000,
    }))).toMatchObject({ status: 'active', snapshot: { hasAccess: true } })
    expect((await t.run((ctx) => ctx.db.query('productEntitlements').collect()))[0].status).toBe('active')
  })

  test('upgrade replaces the old license without leaving two active grants', async () => {
    const t = backend()
    await seedOwner(t)
    await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent())

    expect(await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent({
      licenseKey: nextLicenseKey,
      previousLicenseKey: licenseKey,
      event: 'upgrade',
      providerEventId: 'appsumo:upgrade:0001',
      eventTimestamp: 1789060001000,
    }))).toMatchObject({ status: 'active', snapshot: { hasAccess: true } })

    const entitlements = await t.run((ctx) => ctx.db.query('productEntitlements').collect())
    expect(entitlements.map((entry) => [entry.sourceRef, entry.status]).sort()).toEqual([
      [licenseKey, 'revoked'],
      [nextLicenseKey, 'active'],
    ])
  })

  test('isolates environments and requires the bridge secret', async () => {
    const t = backend()
    await seedOwner(t)

    await expect(t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent({
      bridgeSecret: 'wrong',
    }))).rejects.toThrow('bridge_secret_mismatch')

    expect(await t.mutation(anyApi.bridge.processAppSumoLicenseEvent, appSumoEvent({
      environment: 'production',
    }))).toMatchObject({ status: 'pending_review', reason: 'environment_mismatch' })
    expect(await t.run((ctx) => ctx.db.query('appSumoLicenses').collect())).toHaveLength(0)
  })
})
