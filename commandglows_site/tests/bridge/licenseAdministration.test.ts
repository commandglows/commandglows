import { convexTest } from 'convex-test'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const BRIDGE_SECRET = 'license-administration-test-secret'

function backend() {
  return convexTest(schema, modules)
}

async function seed(t: ReturnType<typeof backend>) {
  return t.run(async (ctx) => {
    const now = Date.now()
    const customerId = await ctx.db.insert('globalUsers', {
      globalUserId: 'gu_customer',
      primaryEmail: 'customer@example.test',
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('identityAccounts', {
      globalUserId: customerId,
      provider: 'clerk',
      providerAccountId: 'user_customer_secret_ref',
      email: 'customer@example.test',
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert('productTrialInstallations', {
      globalUserId: customerId,
      productId: 'communityglows',
      environment: 'test',
      installationHash: 'must-never-leak',
      firstSeenAt: now,
      lastSeenAt: now,
    })
    await ctx.db.insert('users', {
      clerkId: 'clerk_admin',
      email: 'admin@example.test',
      role: 'admin',
    })
    await ctx.db.insert('users', {
      clerkId: 'clerk_member',
      email: 'member@example.test',
      role: 'member',
    })
    return customerId
  })
}

describe('license administration authority', () => {
  const previousSecret = process.env.SUITE_BRIDGE_CONVEX_SECRET
  beforeAll(() => {
    process.env.SUITE_BRIDGE_CONVEX_SECRET = BRIDGE_SECRET
  })
  afterAll(() =>
    previousSecret === undefined
      ? delete process.env.SUITE_BRIDGE_CONVEX_SECRET
      : (process.env.SUITE_BRIDGE_CONVEX_SECRET = previousSecret)
  )

  test('denies a wrong secret and a canonical non-admin user', async () => {
    const t = backend()
    await seed(t)
    await expect(
      t.query(api.licenseAdministration.searchLicenses, {
        clerkId: 'clerk_admin',
        bridgeSecret: 'wrong',
        search: 'gu_customer',
      })
    ).rejects.toThrow('bridge_secret_mismatch')
    await expect(
      t.query(api.licenseAdministration.searchLicenses, {
        clerkId: 'clerk_member',
        bridgeSecret: BRIDGE_SECRET,
        search: 'gu_customer',
      })
    ).rejects.toThrow('admin_forbidden')
  })

  test('validates bounded exact search and returns redacted summaries', async () => {
    const t = backend()
    await seed(t)
    await expect(
      t.query(api.licenseAdministration.searchLicenses, {
        clerkId: 'clerk_admin',
        bridgeSecret: BRIDGE_SECRET,
        search: '*',
      })
    ).rejects.toThrow('search_wildcards_forbidden')
    const result = await t.query(api.licenseAdministration.searchLicenses, {
      clerkId: 'clerk_admin',
      bridgeSecret: BRIDGE_SECRET,
      search: 'customer@example.test',
    })
    expect(result).toMatchObject({
      ambiguous: false,
      truncated: false,
      results: [
        {
          globalUserId: 'gu_customer',
          email: 'c***@example.test',
          recognizedInstallationCount: 1,
        },
      ],
    })
    expect(JSON.stringify(result)).not.toContain('must-never-leak')
    expect(JSON.stringify(result)).not.toContain('user_customer_secret_ref')
    const providerResult = await t.query(
      api.licenseAdministration.searchLicenses,
      {
        clerkId: 'clerk_admin',
        bridgeSecret: BRIDGE_SECRET,
        search: 'user_customer_secret_ref',
      }
    )
    expect(providerResult.results).toHaveLength(1)
    const redactedProviderResult = await t.query(
      api.licenseAdministration.searchLicenses,
      {
        clerkId: 'clerk_admin',
        bridgeSecret: BRIDGE_SECRET,
        search: '***_ref',
      }
    )
    expect(redactedProviderResult.results).toHaveLength(1)
  })

  test('surfaces duplicate-email ambiguity without merging accounts', async () => {
    const t = backend()
    await seed(t)
    await t.run(async (ctx) => {
      const now = Date.now()
      const second = await ctx.db.insert('globalUsers', {
        globalUserId: 'gu_second',
        primaryEmail: 'duplicate@example.test',
        createdAt: now,
        updatedAt: now,
      })
      const third = await ctx.db.insert('globalUsers', {
        globalUserId: 'gu_third',
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert('identityAccounts', {
        globalUserId: second,
        provider: 'firebase',
        providerAccountId: 'firebase_second',
        email: 'duplicate@example.test',
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert('identityAccounts', {
        globalUserId: third,
        provider: 'clerk',
        providerAccountId: 'clerk_third',
        email: 'duplicate@example.test',
        createdAt: now,
        updatedAt: now,
      })
    })
    const result = await t.query(api.licenseAdministration.searchLicenses, {
      clerkId: 'clerk_admin',
      bridgeSecret: BRIDGE_SECRET,
      search: 'duplicate@example.test',
    })
    expect(result.ambiguous).toBe(true)
    expect(result.results).toHaveLength(2)
  })

  test('returns detail without raw provider ids, hashes, codes, or webhook fields', async () => {
    const t = backend()
    await seed(t)
    const detail = await t.query(api.licenseAdministration.getLicenseDetail, {
      clerkId: 'clerk_admin',
      bridgeSecret: BRIDGE_SECRET,
      globalUserId: 'gu_customer',
    })
    expect(detail.identities[0]).toMatchObject({
      provider: 'clerk',
      providerReference: '***_ref',
      email: 'c***@example.test',
    })
    expect(detail.recognizedInstallationCount).toBe(1)
    const serialized = JSON.stringify(detail)
    expect(serialized).not.toContain('user_customer_secret_ref')
    expect(serialized).not.toContain('must-never-leak')
    expect(serialized).not.toContain('idempotencyKey')
  })

  test('requires allowlisted product, plan, and support reason', async () => {
    const t = backend()
    await seed(t)
    const base = {
      clerkId: 'clerk_admin',
      bridgeSecret: BRIDGE_SECRET,
      globalUserId: 'gu_customer',
      productId: 'communityglows',
      plan: 'lifetime_deal',
      reason: 'Verified purchase recovery',
      environment: 'test',
    }
    await expect(
      t.mutation(api.licenseAdministration.manualGrant, {
        ...base,
        reason: ' ',
      })
    ).rejects.toThrow('reason_required')
    await expect(
      t.mutation(api.licenseAdministration.manualGrant, {
        ...base,
        productId: 'unknown',
      })
    ).rejects.toThrow('product_not_allowed')
    await expect(
      t.mutation(api.licenseAdministration.manualGrant, {
        ...base,
        plan: 'free',
      })
    ).rejects.toThrow('plan_not_allowed')
  })

  test('grants and revokes once with one audited transition under replay', async () => {
    const t = backend()
    await seed(t)
    const args = {
      clerkId: 'clerk_admin',
      bridgeSecret: BRIDGE_SECRET,
      globalUserId: 'gu_customer',
      productId: 'communityglows',
      plan: 'lifetime_deal',
      reason: 'Verified purchase recovery',
      environment: 'test',
    }
    expect(
      await t.mutation(api.licenseAdministration.manualGrant, args)
    ).toMatchObject({ status: 'granted' })
    expect(
      await t.mutation(api.licenseAdministration.manualGrant, args)
    ).toMatchObject({ status: 'already_active' })
    expect(
      await t.mutation(api.licenseAdministration.manualRevoke, {
        ...args,
        reason: 'Customer refund confirmed',
      })
    ).toMatchObject({ status: 'revoked' })
    expect(
      await t.mutation(api.licenseAdministration.manualRevoke, {
        ...args,
        reason: 'Customer refund confirmed',
      })
    ).toMatchObject({ status: 'already_revoked' })
    const rows = await t.run(async (ctx) => ({
      entitlements: await ctx.db.query('productEntitlements').collect(),
      events: await ctx.db.query('productAccessEvents').collect(),
    }))
    expect(rows.entitlements).toHaveLength(1)
    expect(rows.entitlements[0].status).toBe('revoked')
    expect(rows.events.map((event) => event.eventType)).toEqual([
      'license_support.granted',
      'license_support.revoked',
    ])
    expect(
      rows.events.every((event) => event.sourceRef?.startsWith('admin:'))
    ).toBe(true)
  })

  test('does not duplicate an existing active commerce entitlement', async () => {
    const t = backend()
    const customerId = await seed(t)
    await t.run(async (ctx) => {
      const now = Date.now()
      await ctx.db.insert('productEntitlements', {
        globalUserId: customerId,
        productId: 'communityglows',
        plan: 'lifetime_deal',
        status: 'active',
        source: 'suite_commerce',
        environment: 'test',
        idempotencyKey: 'commerce-existing',
        grantedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    })
    const result = await t.mutation(api.licenseAdministration.manualGrant, {
      clerkId: 'clerk_admin',
      bridgeSecret: BRIDGE_SECRET,
      globalUserId: 'gu_customer',
      productId: 'communityglows',
      plan: 'lifetime_deal',
      reason: 'Verified purchase recovery',
      environment: 'test',
    })
    expect(result.status).toBe('already_active')
    const rows = await t.run(async (ctx) =>
      ctx.db.query('productEntitlements').collect()
    )
    expect(rows).toHaveLength(1)
  })
})
