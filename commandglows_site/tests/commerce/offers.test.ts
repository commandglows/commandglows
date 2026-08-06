import {
  getCommerceOffer,
  getOfferProviderConfig,
  getOfferProviderCandidates,
  isAllowedCommunityGlowsOffer,
  normalizeCommerceProviderOrder,
  COMMUNITYGLOWS_LTD_OFFER_ID,
  COMMUNITYGLOWS_LETTER,
  COMMANDGLOWS_APP_COMMAND_LTD_OFFER_ID,
  COMMANDGLOWS_APP_CONTROL_LTD_OFFER_ID,
  COMMANDGLOWS_APP_FOCUS_LTD_OFFER_ID,
  COMMANDGLOWS_APP_POWER_LTD_OFFER_ID,
} from '@/lib/commerce/offers'

function withEnv(vars: Record<string, string | undefined>, test: () => void) {
  const previous = { ...process.env }
  Object.assign(process.env, vars)
  try {
    test()
  } finally {
    process.env = previous as NodeJS.ProcessEnv
  }
}

describe('commerce offer configuration', () => {
  test('returns communityglows offer config and allowlist', () => {
    const offer = getCommerceOffer(COMMUNITYGLOWS_LTD_OFFER_ID)
    expect(offer).toMatchObject({
      id: COMMUNITYGLOWS_LTD_OFFER_ID,
      productId: 'communityglows',
      plan: 'lifetime_deal',
    })

    expect(isAllowedCommunityGlowsOffer(COMMUNITYGLOWS_LTD_OFFER_ID, 'communityglows', 'lifetime_deal')).toBe(
      true
    )
    expect(isAllowedCommunityGlowsOffer(COMMUNITYGLOWS_LTD_OFFER_ID, 'communityglows', 'monthly')).toBe(
      false
    )
  })

  test('normalizes provider order to configured providers', () => {
    const candidates = normalizeCommerceProviderOrder(COMMUNITYGLOWS_LTD_OFFER_ID)
    expect(candidates.includes('lemonsqueezy')).toBe(true)
    expect(candidates.includes('polar')).toBe(true)

    const allowed = getOfferProviderCandidates(COMMUNITYGLOWS_LTD_OFFER_ID)
    expect(allowed).toEqual(candidates)
  })

  test('returns CommandGlows founder offer configs', () => {
    expect(getCommerceOffer(COMMANDGLOWS_APP_FOCUS_LTD_OFFER_ID)).toMatchObject({
      productId: 'commandglows_app',
      plan: 'focus',
      providers: ['lemonsqueezy'],
    })
    expect(getCommerceOffer(COMMANDGLOWS_APP_POWER_LTD_OFFER_ID)).toMatchObject({
      productId: 'commandglows_app',
      plan: 'power',
      providers: ['lemonsqueezy'],
    })
    expect(getCommerceOffer(COMMANDGLOWS_APP_CONTROL_LTD_OFFER_ID)).toMatchObject({
      productId: 'commandglows_app',
      plan: 'control',
      providers: ['lemonsqueezy'],
    })
    expect(getCommerceOffer(COMMANDGLOWS_APP_COMMAND_LTD_OFFER_ID)).toMatchObject({
      productId: 'commandglows_app',
      plan: 'command',
      providers: ['lemonsqueezy'],
    })
  })

  test('reads lemonSqueezy provider config from environment', () => {
    withEnv(
      {
        LEMONSQUEEZY_API_KEY: 'api-key-123',
        LEMONSQUEEZY_STORE_ID: 'store-456',
        LEMONSQUEEZY_COMMUNITYGLOWS_LIFETIME_DEAL_VARIANT_ID: 'variant-789',
        LEMONSQUEEZY_COMMANDGLOWS_APP_PRODUCT_ID: 'commandglows-product',
        LEMONSQUEEZY_COMMANDGLOWS_APP_POWER_VARIANT_ID: 'commandglows-power-variant',
        POLAR_COMMANDGLOWS_PRODUCT_ID: 'polar-commandglows',
      },
      () => {
        const lemonConfig = getOfferProviderConfig(
          COMMUNITYGLOWS_LTD_OFFER_ID,
          'lemonsqueezy'
        )
        expect(lemonConfig).toEqual({
          provider: 'lemonsqueezy',
          productId: undefined,
          variantId: 'variant-789',
          storeId: 'store-456',
        })

        const polarConfig = getOfferProviderConfig(
          COMMUNITYGLOWS_LTD_OFFER_ID,
          'polar'
        )
        expect(polarConfig).toEqual({
          provider: 'polar',
          productId: 'polar-commandglows',
        })

        const commandglowsConfig = getOfferProviderConfig(
          COMMANDGLOWS_APP_POWER_LTD_OFFER_ID,
          'lemonsqueezy'
        )
        expect(commandglowsConfig).toEqual({
          provider: 'lemonsqueezy',
          productId: 'commandglows-product',
          variantId: 'commandglows-power-variant',
          storeId: 'store-456',
        })
      }
    )
  })

  test('returns no provider config without required env', () => {
    withEnv({}, () => {
      expect(getOfferProviderConfig(COMMUNITYGLOWS_LTD_OFFER_ID, 'lemonsqueezy')).toBeNull()
      expect(getOfferProviderConfig(COMMUNITYGLOWS_LTD_OFFER_ID, 'polar')).toBeNull()
    })
  })

  test('keeps legacy aliases accessible for source/plan metadata', () => {
    expect(COMMUNITYGLOWS_LETTER).toBe(COMMUNITYGLOWS_LTD_OFFER_ID)
  })
})
