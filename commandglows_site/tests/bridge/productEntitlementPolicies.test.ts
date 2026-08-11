import {
  SHIPGLOWS_PRODUCT_ID,
  PRODUCT_TRIAL_POLICIES,
  SUITE_TRIAL_DURATION_MS,
  SUITE_TRIAL_MAX_CYCLES,
  SUITE_TRIAL_MAX_RESTARTS,
  isActiveSuiteEntitlement,
  isAllowedSuiteProduct,
  normalizeSuiteProductId,
  selectPreferredActiveProductEntitlement,
} from '../../convex/productEntitlementPolicies'

describe('ShipGlows entitlement compatibility', () => {
  const canonical = { productId: 'shipglows', status: 'active', plan: 'free' }
  const legacy = { productId: 'shipglowz', status: 'active', plan: 'pro' }

  test('normalizes legacy and canonical product IDs at the boundary', () => {
    expect(normalizeSuiteProductId('shipglowz')).toBe(SHIPGLOWS_PRODUCT_ID)
    expect(normalizeSuiteProductId('shipglows')).toBe(SHIPGLOWS_PRODUCT_ID)
    expect(isAllowedSuiteProduct('shipglowz')).toBe(true)
  })

  test('selects legacy-only, canonical-only, dual, and missing records canonically', () => {
    expect(selectPreferredActiveProductEntitlement([legacy], 'shipglows')).toBe(legacy)
    expect(selectPreferredActiveProductEntitlement([canonical], 'shipglows')).toBeUndefined()
    expect(selectPreferredActiveProductEntitlement([canonical, legacy], 'shipglows')).toBe(legacy)
    expect(selectPreferredActiveProductEntitlement([], 'shipglows')).toBeUndefined()
  })

  test('applies one bounded trial policy and rejects every permanent free grant', () => {
    expect(PRODUCT_TRIAL_POLICIES).toHaveLength(8)
    for (const policy of PRODUCT_TRIAL_POLICIES) {
      expect(policy).toMatchObject({
        trialDurationMs: 30 * 24 * 60 * 60 * 1000,
        maxTrialCycles: 3,
        maxUserRestarts: 2,
        permanentFreeGrantAllowed: false,
      })
      expect(
        isActiveSuiteEntitlement({
          productId: policy.productId,
          status: 'active',
          plan: 'free',
          source: 'product_default',
        })
      ).toBe(false)
    }
    expect(SUITE_TRIAL_DURATION_MS).toBe(30 * 24 * 60 * 60 * 1000)
    expect(SUITE_TRIAL_MAX_CYCLES).toBe(3)
    expect(SUITE_TRIAL_MAX_RESTARTS).toBe(2)
  })
})
