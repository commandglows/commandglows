import {
  getCommerceOffers,
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
  COMMANDGLOWS_FORMATION_OFFER,
} from '@/lib/commerce/offers'

describe('Stripe-only commerce offer configuration', () => {
  test('allowlists Stripe as the sole provider for every offer', () => {
    for (const offer of Object.values(getCommerceOffers())) {
      expect(offer.providers).toEqual(['stripe'])
      expect(getOfferProviderCandidates(offer.id)).toEqual(['stripe'])
      expect(normalizeCommerceProviderOrder(offer.id)).toEqual(['stripe'])
    }
  })

  test('keeps canonical product and plan mappings', () => {
    expect(getCommerceOffer(COMMUNITYGLOWS_LTD_OFFER_ID)).toMatchObject({
      productId: 'communityglows', plan: 'lifetime_deal', providers: ['stripe'],
    })
    expect(isAllowedCommunityGlowsOffer(
      COMMUNITYGLOWS_LTD_OFFER_ID, 'communityglows', 'lifetime_deal'
    )).toBe(true)
    expect(getCommerceOffer(COMMANDGLOWS_FORMATION_OFFER)).toMatchObject({
      productId: 'commandglows_formation', plan: 'formation', providers: ['stripe'],
    })
    for (const [offerId, plan] of [
      [COMMANDGLOWS_APP_FOCUS_LTD_OFFER_ID, 'focus'],
      [COMMANDGLOWS_APP_POWER_LTD_OFFER_ID, 'power'],
      [COMMANDGLOWS_APP_CONTROL_LTD_OFFER_ID, 'control'],
      [COMMANDGLOWS_APP_COMMAND_LTD_OFFER_ID, 'command'],
    ] as const) {
      expect(getCommerceOffer(offerId)).toMatchObject({
        productId: 'commandglows_app', plan, providers: ['stripe'],
      })
    }
  })

  test('resolves only environment-backed Stripe Price IDs', () => {
    expect(getOfferProviderConfig(COMMUNITYGLOWS_LTD_OFFER_ID, 'stripe', {
      STRIPE_COMMUNITYGLOWS_LIFETIME_DEAL_PRICE_ID: 'price_community',
    })).toEqual({ provider: 'stripe', priceId: 'price_community' })
    expect(getOfferProviderConfig(COMMANDGLOWS_FORMATION_OFFER, 'stripe', {
      STRIPE_COMMANDGLOWS_FORMATION_PRICE_ID: 'price_formation',
    })).toEqual({ provider: 'stripe', priceId: 'price_formation' })
    expect(getOfferProviderConfig(COMMANDGLOWS_APP_POWER_LTD_OFFER_ID, 'stripe', {
      STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID: 'price_power',
    })).toEqual({ provider: 'stripe', priceId: 'price_power' })
    expect(getOfferProviderConfig(COMMUNITYGLOWS_LTD_OFFER_ID, 'stripe', {})).toBeNull()
  })

  test('keeps the historical CommunityGlows alias', () => {
    expect(COMMUNITYGLOWS_LETTER).toBe(COMMUNITYGLOWS_LTD_OFFER_ID)
  })
})
