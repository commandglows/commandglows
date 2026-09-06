import { describe, expect, test, vi } from 'vitest'
import { clerkAccountIdentityAdapter } from '@/lib/auth/clerkAccountIdentity'

describe('verified account identity adapter', () => {
  test('anonymous sessions never query account mappings', async () => {
    const lookup = vi.fn()
    expect(await clerkAccountIdentityAdapter(null, lookup).resolveAccount()).toBeNull()
    expect(lookup).not.toHaveBeenCalled()
  })

  test('returns only the canonical account, never provider attributes or email', async () => {
    const lookup = vi.fn().mockResolvedValue({
      globalUserId: 'global-buyer', email: 'buyer@example.test', role: 'admin',
    })
    expect(await clerkAccountIdentityAdapter('verified-clerk-id', lookup).resolveAccount())
      .toEqual({ globalUserId: 'global-buyer' })
    expect(lookup).toHaveBeenCalledWith('verified-clerk-id')
  })

  test.each([null, {}, { globalUserId: '' }, { globalUserId: '  ' }, { globalUserId: 3 }])(
    'unresolved or malformed account fails closed: %j', async (value) => {
      expect(await clerkAccountIdentityAdapter('verified-id', async () => value).resolveAccount())
        .toBeNull()
    },
  )

  test('lookup failure cannot become an authenticated account', async () => {
    const lookup = vi.fn().mockRejectedValue(new Error('backend unavailable'))
    await expect(clerkAccountIdentityAdapter('verified-id', lookup).resolveAccount())
      .rejects.toThrow('backend unavailable')
  })
})
