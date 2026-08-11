import { convexTest } from 'convex-test'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')
const BRIDGE_SECRET = 'convex-trial-test-secret'
const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000

type TrialEntitlement = {
  _id: string
  globalUserId: string
  productId: string
  plan: string
  status: string
  source: string
  trialAttempt?: number
  trialStartedAt?: number
  trialExpiresAt?: number
}

function createTestBackend() {
  return convexTest(schema, modules)
}

async function bridgeIdentity(
  t: ReturnType<typeof createTestBackend>,
  args: {
    uid: string
    installationHash: string
    networkHash?: string
    trialAction?: 'restart'
  }
) {
  return t.mutation(api.bridge.upsertFirebaseIdentity, {
    firebaseUid: args.uid,
    firebaseEmail: `${args.uid}@example.test`,
    environment: 'test',
    sourceRef: `test:${args.uid}`,
    installationHash: args.installationHash,
    networkHash: args.networkHash,
    trialAction: args.trialAction,
    bridgeSecret: BRIDGE_SECRET,
  })
}

async function commandGlowsTrials(t: ReturnType<typeof createTestBackend>) {
  return t.run(async (ctx) => {
    const rows = await ctx.db.query('productEntitlements').collect()
    return rows.filter(
      (row) =>
        row.productId === 'commandglows_app' &&
        row.source === 'product_trial'
    ) as TrialEntitlement[]
  })
}

async function expireLatestTrial(
  t: ReturnType<typeof createTestBackend>,
  globalUserPublicId: string
) {
  await t.run(async (ctx) => {
    const globalUser = await ctx.db
      .query('globalUsers')
      .withIndex('by_globalUserId', (q) =>
        q.eq('globalUserId', globalUserPublicId)
      )
      .unique()
    if (!globalUser) throw new Error('global_user_not_found')

    const rows = await ctx.db.query('productEntitlements').collect()
    const trial = rows
      .filter(
        (row) =>
          row.globalUserId === globalUser._id &&
          row.productId === 'commandglows_app' &&
          row.source === 'product_trial'
      )
      .sort((left, right) =>
        (right.trialAttempt ?? 0) - (left.trialAttempt ?? 0)
      )[0]
    if (!trial) throw new Error('trial_not_found')
    await ctx.db.patch(trial._id, {
      trialExpiresAt: Date.now() - 1,
      updatedAt: Date.now(),
    })
  })
}

describe('CommandGlows trial Convex integration', () => {
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

  test('ENT-TRIAL-001/002 creates one 14-day trial idempotently', async () => {
    const t = createTestBackend()
    const before = Date.now()

    const first = await bridgeIdentity(t, {
      uid: 'firebase-user-1',
      installationHash: 'installation-hash-1',
      networkHash: 'network-hash-1',
    })
    await bridgeIdentity(t, {
      uid: 'firebase-user-1',
      installationHash: 'installation-hash-1',
      networkHash: 'network-hash-1',
    })

    const trials = await commandGlowsTrials(t)
    expect(trials).toHaveLength(1)
    expect(trials[0]).toMatchObject({
      status: 'trialing',
      plan: 'free',
      trialAttempt: 1,
    })
    expect(trials[0].trialStartedAt).toBeGreaterThanOrEqual(before)
    expect(trials[0].trialExpiresAt).toBeGreaterThanOrEqual(
      before + TRIAL_DURATION_MS
    )
    expect(first.entitlements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: 'commandglows_app',
          status: 'trialing',
        }),
      ])
    )
  })

  test('ENT-TRIAL-003/004 allows two restarts and denies a fourth period', async () => {
    const t = createTestBackend()
    const first = await bridgeIdentity(t, {
      uid: 'firebase-user-restarts',
      installationHash: 'installation-hash-restarts',
    })

    await expireLatestTrial(t, first.globalUserId)
    await bridgeIdentity(t, {
      uid: 'firebase-user-restarts',
      installationHash: 'installation-hash-restarts',
      trialAction: 'restart',
    })
    await expireLatestTrial(t, first.globalUserId)
    await bridgeIdentity(t, {
      uid: 'firebase-user-restarts',
      installationHash: 'installation-hash-restarts',
      trialAction: 'restart',
    })
    await expireLatestTrial(t, first.globalUserId)
    const exhausted = await bridgeIdentity(t, {
      uid: 'firebase-user-restarts',
      installationHash: 'installation-hash-restarts',
      trialAction: 'restart',
    })

    const trials = await commandGlowsTrials(t)
    expect(trials.map((trial) => trial.trialAttempt)).toEqual([1, 2, 3])
    expect(
      exhausted.entitlements.some(
        (entry) =>
          entry.productId === 'commandglows_app' &&
          entry.status === 'trialing' &&
          typeof entry.trialExpiresAt === 'number' &&
          entry.trialExpiresAt > Date.now()
      )
    ).toBe(false)
  })

  test('ENT-TRIAL-005 denies a fresh trial to another email on the same installation', async () => {
    const t = createTestBackend()
    await bridgeIdentity(t, {
      uid: 'firebase-owner',
      installationHash: 'shared-installation-hash',
    })
    const alternate = await bridgeIdentity(t, {
      uid: 'firebase-alternate-email',
      installationHash: 'shared-installation-hash',
    })

    expect(
      alternate.entitlements.some(
        (entry) => entry.productId === 'commandglows_app'
      )
    ).toBe(false)
    expect(await commandGlowsTrials(t)).toHaveLength(1)
  })

  test('ENT-TRIAL-006 keeps the global trial counter across installations', async () => {
    const t = createTestBackend()
    const first = await bridgeIdentity(t, {
      uid: 'firebase-multi-device',
      installationHash: 'installation-hash-device-a',
    })
    await expireLatestTrial(t, first.globalUserId)

    await bridgeIdentity(t, {
      uid: 'firebase-multi-device',
      installationHash: 'installation-hash-device-b',
    })
    expect(await commandGlowsTrials(t)).toHaveLength(1)

    await bridgeIdentity(t, {
      uid: 'firebase-multi-device',
      installationHash: 'installation-hash-device-b',
      trialAction: 'restart',
    })
    expect((await commandGlowsTrials(t)).map((row) => row.trialAttempt)).toEqual([
      1,
      2,
    ])
  })

  test('ENT-TRIAL-007 paid access prevents trial creation', async () => {
    const t = createTestBackend()
    await t.run(async (ctx) => {
      const now = Date.now()
      const globalUserId = await ctx.db.insert('globalUsers', {
        globalUserId: 'gu_paid',
        primaryEmail: 'paid@example.test',
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert('identityAccounts', {
        globalUserId,
        provider: 'firebase',
        providerAccountId: 'firebase-paid',
        email: 'paid@example.test',
        environment: 'test',
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert('productEntitlements', {
        globalUserId,
        productId: 'commandglows_app',
        plan: 'focus',
        status: 'active',
        source: 'suite_commerce',
        environment: 'test',
        idempotencyKey: 'paid-entitlement-test',
        grantedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    })

    const snapshot = await bridgeIdentity(t, {
      uid: 'firebase-paid',
      installationHash: 'installation-hash-paid',
    })
    expect(await commandGlowsTrials(t)).toHaveLength(0)
    expect(snapshot.entitlements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: 'commandglows_app',
          plan: 'focus',
          status: 'active',
        }),
      ])
    )
  })

  test('ENT-TRIAL-011 temporarily denies the fourth network grant in 24 hours', async () => {
    const t = createTestBackend()
    const snapshots = []
    for (let index = 1; index <= 4; index += 1) {
      snapshots.push(
        await bridgeIdentity(t, {
          uid: `firebase-network-${index}`,
          installationHash: `installation-hash-network-${index}`,
          networkHash: 'shared-network-hash',
        })
      )
    }

    expect(await commandGlowsTrials(t)).toHaveLength(3)
    expect(
      snapshots[3].entitlements.some(
        (entry) => entry.productId === 'commandglows_app'
      )
    ).toBe(false)
  })
})
