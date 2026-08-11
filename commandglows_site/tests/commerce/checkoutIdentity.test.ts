import { describe, expect, test } from 'vitest'
import {
  createCommerceCheckoutIdentityToken,
  verifyCommerceCheckoutIdentityToken,
} from '@/lib/commerce/checkoutIdentity'

describe('commerce checkout identity handoff', () => {
  test('accepts a valid token before expiry', () => {
    const token = createCommerceCheckoutIdentityToken('gu_123', 'secret', 1_000)
    expect(verifyCommerceCheckoutIdentityToken(token, 'secret', 1_001)).toBe('gu_123')
  })

  test('rejects modified, expired, or wrong-secret tokens', () => {
    const token = createCommerceCheckoutIdentityToken('gu_123', 'secret', 1_000)
    expect(verifyCommerceCheckoutIdentityToken(`${token}x`, 'secret', 1_001)).toBeNull()
    expect(verifyCommerceCheckoutIdentityToken(token, 'wrong', 1_001)).toBeNull()
    expect(verifyCommerceCheckoutIdentityToken(token, 'secret', 8_201)).toBeNull()
  })
})
