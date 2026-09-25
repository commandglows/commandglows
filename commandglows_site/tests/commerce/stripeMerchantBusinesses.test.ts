import { commerceBusinessForProduct } from '../../convex/commerceBusiness'
import { stripeMerchant } from '../../src/lib/commerce/stripeMerchants'

describe('suite merchant boundaries', () => {
  test.each([
    ['commandglows_app', 'commandglows'],
    ['commandglows_formation', 'commandglows'],
    ['communityglows', 'communityglows'],
    ['replayglows', 'replayglows'],
    ['contentglowz', 'contentglows'],
  ])('maps %s to its business', (product, business) => {
    expect(commerceBusinessForProduct(product)).toBe(business)
  })

  test.each(['replayglows', 'contentglows'] as const)('uses only %s credentials', (business) => {
    const prefix = `STRIPE_${business.toUpperCase()}`
    const env = {
      [`${prefix}_ACCOUNT_ID`]: `acct_${business}123`,
      [`${prefix}_SECRET_KEY`]: `sk_test_${business}`,
      [`${prefix}_WEBHOOK_SECRET`]: `whsec_${business}`,
      STRIPE_SECRET_KEY: 'sk_test_commandglows',
      STRIPE_COMMANDGLOWS_ACCOUNT_ID: 'acct_commandglows123',
    }
    expect(stripeMerchant(business, env)).toMatchObject({
      business, accountId: `acct_${business}123`, secretKey: `sk_test_${business}`,
      webhookSecret: `whsec_${business}`,
    })
    expect(stripeMerchant(business, { ...env, [`${prefix}_SECRET_KEY`]: undefined })).toBeNull()
    expect(stripeMerchant(business, { ...env, [`${prefix}_ACCOUNT_ID`]: 'acct_commandglows123' })).toBeNull()
  })

  test('does not route unapproved products to a merchant', () => {
    expect(commerceBusinessForProduct('unknown')).toBeNull()
  })
})
