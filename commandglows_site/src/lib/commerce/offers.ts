import type {
  CommerceOffer,
  CommerceOfferId,
  CommerceProviderId,
  CommerceProviderConfig,
  CommerceCheckoutRequest,
  CommerceCheckoutCustomData,
} from "./types"

import { getServerEnv } from "../serverEnv"

const COMMUNITYGLOWS_OFFER_ID = "communityglows/lifetime_deal"
const COMMUNITYGLOWS_PRODUCT_ID = "communityglows"
const COMMUNITYGLOWS_PLAN = "lifetime_deal"
const COMMANDGLOWS_APP_PRODUCT_ID = "commandglows_app"
const COMMANDGLOWS_APP_FOCUS_OFFER_ID = "commandglows_app/focus"
const COMMANDGLOWS_APP_POWER_OFFER_ID = "commandglows_app/power"
const COMMANDGLOWS_APP_CONTROL_OFFER_ID = "commandglows_app/control"
const COMMANDGLOWS_APP_COMMAND_OFFER_ID = "commandglows_app/command"
const COMMANDGLOWS_FORMATION_PRODUCT_ID = "commandglows_formation"
const COMMANDGLOWS_FORMATION_OFFER_ID = "commandglows_formation/full_course"
const COMMUNITYGLOWS_SOURCES = [
  "direct",
  "partner",
  "appsumo",
  "manual",
  "legacy",
] as const
const COMMANDGLOWS_APP_SOURCES = [
  "direct",
  "partner",
  "appsumo",
  "manual",
  "legacy",
] as const

const OFFER_BY_ID: Record<CommerceOfferId, CommerceOffer> = {
  [COMMUNITYGLOWS_OFFER_ID]: {
    id: COMMUNITYGLOWS_OFFER_ID,
    productId: COMMUNITYGLOWS_PRODUCT_ID,
    plan: COMMUNITYGLOWS_PLAN,
    sources: COMMUNITYGLOWS_SOURCES,
    providers: ["stripe"],
    successPath: "/purchase/success",
    cancelPath: "/purchase/cancel",
    description: "CommunityGlows Lifetime Deal, direct checkout",
  },
  [COMMANDGLOWS_APP_FOCUS_OFFER_ID]: {
    id: COMMANDGLOWS_APP_FOCUS_OFFER_ID,
    productId: COMMANDGLOWS_APP_PRODUCT_ID,
    plan: "focus",
    sources: COMMANDGLOWS_APP_SOURCES,
    providers: ["stripe"],
    successPath: "/purchase/success?offerId=commandglows_app/focus",
    cancelPath: "/purchase/cancel?offerId=commandglows_app/focus",
    description: "CommandGlows Focus founder access, 1 active device",
  },
  [COMMANDGLOWS_APP_POWER_OFFER_ID]: {
    id: COMMANDGLOWS_APP_POWER_OFFER_ID,
    productId: COMMANDGLOWS_APP_PRODUCT_ID,
    plan: "power",
    sources: COMMANDGLOWS_APP_SOURCES,
    providers: ["stripe"],
    successPath: "/purchase/success?offerId=commandglows_app/power",
    cancelPath: "/purchase/cancel?offerId=commandglows_app/power",
    description: "CommandGlows Power founder access, 2 active devices",
  },
  [COMMANDGLOWS_APP_CONTROL_OFFER_ID]: {
    id: COMMANDGLOWS_APP_CONTROL_OFFER_ID,
    productId: COMMANDGLOWS_APP_PRODUCT_ID,
    plan: "control",
    sources: COMMANDGLOWS_APP_SOURCES,
    providers: ["stripe"],
    successPath: "/purchase/success?offerId=commandglows_app/control",
    cancelPath: "/purchase/cancel?offerId=commandglows_app/control",
    description: "CommandGlows Control founder access, 5 active devices",
  },
  [COMMANDGLOWS_APP_COMMAND_OFFER_ID]: {
    id: COMMANDGLOWS_APP_COMMAND_OFFER_ID,
    productId: COMMANDGLOWS_APP_PRODUCT_ID,
    plan: "command",
    sources: COMMANDGLOWS_APP_SOURCES,
    providers: ["stripe"],
    successPath: "/purchase/success?offerId=commandglows_app/command",
    cancelPath: "/purchase/cancel?offerId=commandglows_app/command",
    description: "CommandGlows Command founder access, 10 active devices",
  },
  [COMMANDGLOWS_FORMATION_OFFER_ID]: {
    id: COMMANDGLOWS_FORMATION_OFFER_ID,
    productId: COMMANDGLOWS_FORMATION_PRODUCT_ID,
    plan: "formation",
    sources: COMMANDGLOWS_APP_SOURCES,
    providers: ["stripe"],
    successPath: "/purchase/success",
    cancelPath: "/formations/",
    description: "CommandGlows complete formation access",
  },
} as const

export const COMMUNITYGLOWS_LETTER = COMMUNITYGLOWS_OFFER_ID
export const COMMUNITYGLOWS_LTD_OFFER_ID = COMMUNITYGLOWS_OFFER_ID
export const COMMANDGLOWS_APP_FOCUS_LTD_OFFER_ID = COMMANDGLOWS_APP_FOCUS_OFFER_ID
export const COMMANDGLOWS_APP_POWER_LTD_OFFER_ID = COMMANDGLOWS_APP_POWER_OFFER_ID
export const COMMANDGLOWS_APP_CONTROL_LTD_OFFER_ID = COMMANDGLOWS_APP_CONTROL_OFFER_ID
export const COMMANDGLOWS_APP_COMMAND_LTD_OFFER_ID = COMMANDGLOWS_APP_COMMAND_OFFER_ID
export const COMMANDGLOWS_FORMATION_OFFER = COMMANDGLOWS_FORMATION_OFFER_ID

export function getCommerceOffers(): Record<string, CommerceOffer> {
  return { ...OFFER_BY_ID }
}

export function getCommerceOffer(offerId: string): CommerceOffer | null {
  return OFFER_BY_ID[offerId as CommerceOfferId] ?? null
}

export function isAllowedCommunityGlowsOffer(
  offerId: string,
  productId: string,
  plan: string
): boolean {
  return (
    offerId === COMMUNITYGLOWS_OFFER_ID &&
    productId === COMMUNITYGLOWS_PRODUCT_ID &&
    plan === COMMUNITYGLOWS_PLAN
  )
}

function getStripePriceEnvKey(offerId: string): string | null {
  if (offerId === COMMUNITYGLOWS_OFFER_ID) {
    return "STRIPE_COMMUNITYGLOWS_LIFETIME_DEAL_PRICE_ID"
  }
  if (offerId === COMMANDGLOWS_APP_FOCUS_OFFER_ID) {
    return "STRIPE_COMMANDGLOWS_APP_FOCUS_PRICE_ID"
  }
  if (offerId === COMMANDGLOWS_APP_POWER_OFFER_ID) {
    return "STRIPE_COMMANDGLOWS_APP_POWER_PRICE_ID"
  }
  if (offerId === COMMANDGLOWS_APP_CONTROL_OFFER_ID) {
    return "STRIPE_COMMANDGLOWS_APP_CONTROL_PRICE_ID"
  }
  if (offerId === COMMANDGLOWS_APP_COMMAND_OFFER_ID) {
    return "STRIPE_COMMANDGLOWS_APP_COMMAND_PRICE_ID"
  }
  if (offerId === COMMANDGLOWS_FORMATION_OFFER_ID) {
    return "STRIPE_COMMANDGLOWS_FORMATION_PRICE_ID"
  }
  return null
}

export function getOfferProviderConfig(
  offerId: string,
  provider: CommerceProviderId,
  envOverride?: Record<string, string | undefined>
): CommerceProviderConfig | null {
  const offer = getCommerceOffer(offerId)
  if (!offer || !offer.providers.includes(provider)) {
    return null
  }

  const env = envOverride ?? getServerEnv()

  const priceEnvKey = getStripePriceEnvKey(offerId)
  const priceId = priceEnvKey ? env[priceEnvKey] : undefined
  return priceId ? { provider: "stripe", priceId } : null
}

export function getOfferProviderCandidates(
  offerId: string
): CommerceProviderId[] {
  const offer = getCommerceOffer(offerId)
  if (!offer) {
    return []
  }
  return [...offer.providers]
}

export function hasOfferProvider(offerId: string, provider: CommerceProviderId) {
  const offer = getCommerceOffer(offerId)
  return offer?.providers.includes(provider) ?? false
}

export function isKnownCommerceOfferId(
  offerId: string
): offerId is CommerceOfferId {
  return offerId in OFFER_BY_ID
}

export function buildCommerceCheckoutHints(
  offer: CommerceOffer,
  request: CommerceCheckoutRequest
): CommerceCheckoutCustomData {
  return {
    offer_id: offer.id,
    plan: offer.plan,
    product_id: offer.productId,
    source: request.metadata?.source || "direct",
    source_ref:
      request.metadata?.source_ref ?? request.idempotencyHint ?? undefined,
    global_user_id: request.metadata?.global_user_id,
    environment: request.metadata?.environment,
  }
}

export function normalizeCommerceProviderOrder(
  offerId: string
): CommerceProviderId[] {
  return getOfferProviderCandidates(offerId).includes("stripe")
    ? ["stripe"]
    : []
}

export function getCommunityGlowsCommerceOfferId(): CommerceOfferId {
  return COMMUNITYGLOWS_OFFER_ID
}

export function getCommunityGlowsDefaultPlan(): string {
  return COMMUNITYGLOWS_PLAN
}
