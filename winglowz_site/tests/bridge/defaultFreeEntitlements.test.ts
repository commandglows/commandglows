import {
  SHIPGLOWS_PRODUCT_ID,
  isAllowedSuiteProduct,
  normalizeSuiteProductId,
  selectPreferredActiveProductEntitlement,
} from '../../convex/defaultFreeEntitlements'

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
    expect(selectPreferredActiveProductEntitlement([canonical], 'shipglows')).toBe(canonical)
    expect(selectPreferredActiveProductEntitlement([canonical, legacy], 'shipglows')).toBe(legacy)
    expect(selectPreferredActiveProductEntitlement([], 'shipglows')).toBeUndefined()
  })
})
