import { describe, expect, test } from 'vitest'
import {
  createCommerceCheckoutIdentityToken,
  verifyCommerceCheckoutIdentityToken,
} from '@/lib/commerce/checkoutIdentity'

describe('commerce checkout identity handoff', () => {
  test('accepts a valid token before expiry', () => {
    const token = createCommerceCheckoutIdentityToken('gu_123', 'communityglows', 'test', 'secret', 1_000, 'jti_123456789012345678901234')
    expect(verifyCommerceCheckoutIdentityToken(token, 'secret', 1_001)).toEqual({
      globalUserId: 'gu_123', productId: 'communityglows', environment: 'test',
      jti: 'jti_123456789012345678901234', expiresAt: 1_600,
    })
  })

  test('rejects modified, expired, or wrong-secret tokens', () => {
    const token = createCommerceCheckoutIdentityToken('gu_123', 'communityglows', 'test', 'secret', 1_000, 'jti_123456789012345678901234')
    expect(verifyCommerceCheckoutIdentityToken(`${token}x`, 'secret', 1_001)).toBeNull()
    expect(verifyCommerceCheckoutIdentityToken(token, 'wrong', 1_001)).toBeNull()
    expect(verifyCommerceCheckoutIdentityToken(token, 'secret', 1_601)).toBeNull()
  })
})
