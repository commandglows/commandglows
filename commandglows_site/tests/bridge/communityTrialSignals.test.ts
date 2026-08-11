import { describe, expect, test } from 'vitest'
import { convexTest } from 'convex-test'
import { pseudonymizeCommunityTrialSignal } from '@/lib/trialSignals'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

const modules = import.meta.glob('../../convex/**/*.ts')

describe('CommunityGlows trial signal pseudonymization', () => {
  test('stores a keyed value instead of the client hash', () => {
    const clientHash = 'a'.repeat(64)
    const stored = pseudonymizeCommunityTrialSignal(
      clientHash,
      'server-only-test-secret',
      'installation'
    )
    expect(stored).toMatch(/^[a-f0-9]{64}$/)
    expect(stored).not.toBe(clientHash)
    expect(stored).toBe(
      pseudonymizeCommunityTrialSignal(
        clientHash,
        'server-only-test-secret',
        'installation'
      )
    )
    expect(stored).not.toBe(
      pseudonymizeCommunityTrialSignal(
        clientHash,
        'different-secret',
        'installation'
      )
    )
  })

  test('fails closed without a server secret', () => {
    expect(() =>
      pseudonymizeCommunityTrialSignal('client-hash', '', 'installation')
    ).toThrow('trial_signal_not_configured')
  })

  test('persists only the server-keyed value in the trial ledger', async () => {
    const previous = process.env.SUITE_BRIDGE_CONVEX_SECRET
    process.env.SUITE_BRIDGE_CONVEX_SECRET = 'bridge-test-secret'
    try {
      const t = convexTest(schema, modules)
      const clientHash = 'client-derived-installation-hash'
      const serverHash = pseudonymizeCommunityTrialSignal(
        clientHash,
        'server-only-test-secret',
        'installation'
      )
      await t.mutation(
        api.bridge.ensureCommunityGlowsEntitlementSnapshotByProviderAccount,
        {
          providerAccountId: 'community_signal_user',
          installationHash: serverHash,
          environment: 'test',
          bridgeSecret: 'bridge-test-secret',
        }
      )
      const installations = await t.run(async (ctx) =>
        await ctx.db.query('productTrialInstallations').collect()
      )
      expect(installations).toHaveLength(1)
      expect(installations[0].installationHash).toBe(serverHash)
      expect(installations[0].installationHash).not.toBe(clientHash)
    } finally {
      if (previous === undefined) delete process.env.SUITE_BRIDGE_CONVEX_SECRET
      else process.env.SUITE_BRIDGE_CONVEX_SECRET = previous
    }
  })
})
