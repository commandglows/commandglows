export const COMMANDGLOWS_APP_PRODUCT_ID = 'commandglows_app'
export const COMMANDGLOWS_FORMATION_PRODUCT_ID = 'commandglows_formation'
export const GOCHARBON_PRODUCT_ID = 'gocharbon'
export const CONTENTGLOWZ_PRODUCT_ID = 'contentglowz'
export const SHIPGLOWS_PRODUCT_ID = 'shipglows'
export const LEGACY_SHIPGLOWZ_PRODUCT_ID = 'shipglowz'
export const REPLAYGLOWZ_PRODUCT_ID = 'replayglowz'
export const COMMUNITYGLOWS_PRODUCT_ID = 'communityglows'
export const TEMU_SHOPPING_LISTS_PRODUCT_ID = 'temu_shopping_lists'

export const SUITE_PRODUCT_IDS = [
  COMMANDGLOWS_APP_PRODUCT_ID,
  COMMANDGLOWS_FORMATION_PRODUCT_ID,
  GOCHARBON_PRODUCT_ID,
  CONTENTGLOWZ_PRODUCT_ID,
  SHIPGLOWS_PRODUCT_ID,
  REPLAYGLOWZ_PRODUCT_ID,
  COMMUNITYGLOWS_PRODUCT_ID,
  TEMU_SHOPPING_LISTS_PRODUCT_ID,
] as const

export type SuiteProductId = (typeof SUITE_PRODUCT_IDS)[number]

export const SUITE_TRIAL_PLAN = 'trial'
export const SUITE_TRIAL_SOURCE = 'product_trial'
export const SUITE_TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000
export const SUITE_TRIAL_MAX_RESTARTS = 2
export const SUITE_TRIAL_MAX_CYCLES = SUITE_TRIAL_MAX_RESTARTS + 1

export const PRODUCT_TRIAL_POLICIES = SUITE_PRODUCT_IDS.map((productId) => ({
  productId,
  mode: 'trial_then_paid' as const,
  trialDurationMs: SUITE_TRIAL_DURATION_MS,
  maxTrialCycles: SUITE_TRIAL_MAX_CYCLES,
  maxUserRestarts: SUITE_TRIAL_MAX_RESTARTS,
  paymentRequiredAfterExhaustion: true as const,
  permanentFreeGrantAllowed: false as const,
}))

const SUITE_PRODUCT_ALLOWLIST = new Set<string>(SUITE_PRODUCT_IDS)
const ACTIVE_ENTITLEMENT_STATUSES = new Set(['active', 'trialing'])

type RawEntitlement = {
  productId: string
  status: string
  plan?: string
  source?: string | null
  expiresAt?: number | null
  trialExpiresAt?: number | null
}

export function normalizeSuiteProductId(productId: string): string {
  return productId === LEGACY_SHIPGLOWZ_PRODUCT_ID
    ? SHIPGLOWS_PRODUCT_ID
    : productId
}

export function isAllowedSuiteProduct(productId: string): boolean {
  return SUITE_PRODUCT_ALLOWLIST.has(normalizeSuiteProductId(productId))
}

export function getSuiteProductTrialPolicy(productId: string) {
  const canonicalProductId = normalizeSuiteProductId(productId)
  return (
    PRODUCT_TRIAL_POLICIES.find(
      (policy) => policy.productId === canonicalProductId
    ) ?? null
  )
}

export function isActiveAccessStatus(status: string): boolean {
  return ACTIVE_ENTITLEMENT_STATUSES.has(status)
}

export function isActiveSuiteEntitlement(
  entry: RawEntitlement,
  now: number = Date.now()
) {
  // Historical default-free rows are intentionally preserved but never grant.
  if (
    entry.source === 'product_default' ||
    (entry.status === 'active' && entry.plan === 'free')
  ) {
    return false
  }

  if (entry.status === 'trialing') {
    const expiry =
      typeof entry.expiresAt === 'number'
        ? entry.expiresAt
        : entry.trialExpiresAt
    return typeof expiry === 'number' && expiry > now
  }

  return ACTIVE_ENTITLEMENT_STATUSES.has(entry.status)
}

export function selectPreferredActiveProductEntitlement<T extends RawEntitlement>(
  entitlements: T[],
  productId: string,
  now: number = Date.now()
): T | undefined {
  const canonicalProductId = normalizeSuiteProductId(productId)
  const activeEntitlements = entitlements.filter(
    (entry) =>
      normalizeSuiteProductId(entry.productId) === canonicalProductId &&
      isActiveSuiteEntitlement(entry, now)
  )
  return (
    activeEntitlements.find((entry) => entry.status === 'active') ??
    activeEntitlements[0]
  )
}
