export const SUITE_PRODUCT_ALLOWLIST = [
  'commandglows_app',
  'commandglows_formation',
  'gocharbon',
  'contentglowz',
  'shipglows',
  'replayglowz',
  'communityglows',
  'temu_shopping_lists',
] as const

export const COMMANDGLOWS_FORMATION_PRODUCT_ID = 'commandglows_formation'
export const GOCHARBON_PRODUCT_ID = 'gocharbon'
export const CONTENTGLOWZ_PRODUCT_ID = 'contentglowz'
export const SHIPGLOWS_PRODUCT_ID = 'shipglows'
export const LEGACY_SHIPGLOWZ_PRODUCT_ID = 'shipglowz'
export const REPLAYGLOWZ_PRODUCT_ID = 'replayglowz'
export const COMMUNITYGLOWS_PRODUCT_ID = 'communityglows'
export const TEMU_SHOPPING_LISTS_PRODUCT_ID = 'temu_shopping_lists'
export const SUITE_TRIAL_MAX_CYCLES = 3
export const REPLAYGLOWZ_PRODUCT_JWT_DEFAULT_KEY_ID =
  'replayglowz-suite-2026-06-02'
// Protocol identifier kept for verifier compatibility; this is not an SEO origin.
export const REPLAYGLOWZ_PRODUCT_JWT_DEFAULT_ISSUER = 'https://commandglows.com'
export const REPLAYGLOWZ_PRODUCT_JWT_DEFAULT_AUDIENCE =
  'replayglowz-convex'
export const REPLAYGLOWZ_PRODUCT_JWT_TTL_SECONDS = 10 * 60
export const COMMUNITYGLOWS_DEFAULT_PLAN = 'lifetime_deal' as const
export const COMMUNITYGLOWS_ALLOWED_PLANS = [
  'lifetime_deal',
  'founder_ltd',
  'ltd',
] as const
export const COMMUNITYGLOWS_ALLOWED_SOURCES = [
  'manual',
  'partner',
  'appsumo',
  'direct',
  'legacy',
] as const

const ACTIVE_ENTITLEMENT_STATUSES = new Set(['active', 'trialing'])
const FIRESTORE_ENTITLEMENT_PRODUCTS = ['commandglows_app'] as const

type BridgeEntitlement = {
  productId: string
  status: string
  plan?: string | null
  source?: string | null
  trialStartedAt?: number | null
  trialExpiresAt?: number | null
  trialAttempt?: number | null
}
const ALLOWED_PRODUCT_SET = new Set<string>(SUITE_PRODUCT_ALLOWLIST)

export function normalizeSuiteProductId(productId: string): string {
  return productId === LEGACY_SHIPGLOWZ_PRODUCT_ID
    ? SHIPGLOWS_PRODUCT_ID
    : productId
}

export type BridgeEntitlementSnapshot = {
  productId: string
  plan: string
  status: string
}

export type ReplayGlowzEntitlementReasonCode =
  | 'active_entitlement'
  | 'missing_product_entitlement'
  | 'account_not_found'
  | 'global_user_not_found'

export type ReplayGlowzEntitlementSnapshot = {
  hasAccess: boolean
  globalUserId: string | null
  matchedProductId: string | null
  reasonCode: ReplayGlowzEntitlementReasonCode
}

export type ReplayGlowzProductUserIdSource = 'clerk' | 'globalUserId'

export type ReplayGlowzProductJwtPayload = {
  sub: string
  globalUserId: string
  productId: typeof REPLAYGLOWZ_PRODUCT_ID
  matchedProductId: string
  reasonCode: ReplayGlowzEntitlementReasonCode
  productUserId: string
  productUserIdSource: ReplayGlowzProductUserIdSource
  iat: number
  exp: number
  iss: string
  aud: string
}

type ReplayGlowzProductTokenConfig = {
  privateKeyPem: string
  keyId: string
  issuer: string
  audience: string
}

export type CommunityGlowsEntitlementReasonCode =
  | 'active_entitlement'
  | 'trial_expired'
  | 'trial_exhausted'
  | 'account_not_found'
  | 'global_user_not_found'
  | 'missing_product_entitlement'
  | 'code_not_found'
  | 'code_disabled'
  | 'code_used'
  | 'code_import_failed'
  | 'code_redeem_failed'
  | 'plan_not_allowed'
  | 'source_not_allowed'

export type CommunityGlowsEntitlementSnapshot = {
  hasAccess: boolean
  accessState:
    | 'lifetime_active'
    | 'trial_active'
    | 'trial_expired'
    | 'trial_exhausted'
    | 'inactive'
  planId: string | null
  source: string | null
  globalUserId: string | null
  trialStartedAt: number | null
  trialEndsAt: number | null
  trialExpiresAt: number | null
  trialAttempt: number | null
  trialRestartsRemaining: number
  trialRestartEligible: boolean
  reasonCode: CommunityGlowsEntitlementReasonCode
}

const COMMUNITYGLOWS_SOURCE_SET = new Set<string>(COMMUNITYGLOWS_ALLOWED_SOURCES)
const COMMUNITYGLOWS_PLAN_SET = new Set<string>(COMMUNITYGLOWS_ALLOWED_PLANS)

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function base64UrlEncode(value: Uint8Array): string {
  let output = ''
  for (const byte of value) {
    output += String.fromCharCode(byte)
  }
  return btoa(output).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function parseJsonWebKey(value: string | undefined): JsonWebKey | null {
  if (!isNonEmptyString(value)) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as JsonWebKey
    return typeof parsed === 'object' &&
      parsed !== null &&
      parsed.kty === 'RSA' &&
      typeof parsed.n === 'string' &&
      typeof parsed.e === 'string'
      ? parsed
      : null
  } catch {
    return null
  }
}

function normalizePem(value: string | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  return trimmed.replace(/\\n/g, '\n')
}

function toPemBytes(pem: string): ArrayBuffer {
  const trimmed = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s/g, '')
  const binary = atob(trimmed)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function importReplayGlowzProductSigningKey(
  privateKeyPem: string
): Promise<CryptoKey | null> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    return null
  }

  try {
    const keyData = toPemBytes(privateKeyPem)
    return await subtle.importKey(
      'pkcs8',
      keyData,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    )
  } catch {
    return null
  }
}

async function importReplayGlowzProductVerificationKey(
  publicKeyPem: string
): Promise<CryptoKey | null> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    return null
  }

  try {
    const keyData = toPemBytes(publicKeyPem)
    return await subtle.importKey(
      'spki',
      keyData,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      true,
      ['verify']
    )
  } catch {
    return null
  }
}

function stripPrivateFields(jwk: JsonWebKey): JsonWebKey {
  const {
    d,
    p,
    q,
    dp,
    dq,
    qi,
    oth,
    ...publicFields
  } = jwk as Record<string, unknown>
  return publicFields as JsonWebKey
}

function buildReplayGlowzProductTokenConfig(env: Record<string, string | undefined>) {
  const privateKeyPem = normalizePem(env.REPLAYGLOWZ_PRODUCT_JWT_PRIVATE_KEY_PEM)
  const keyId = isNonEmptyString(env.REPLAYGLOWZ_PRODUCT_JWT_KEY_ID)
    ? env.REPLAYGLOWZ_PRODUCT_JWT_KEY_ID!.trim()
    : REPLAYGLOWZ_PRODUCT_JWT_DEFAULT_KEY_ID
  const issuer = isNonEmptyString(env.REPLAYGLOWZ_PRODUCT_JWT_ISSUER)
    ? env.REPLAYGLOWZ_PRODUCT_JWT_ISSUER!.trim()
    : REPLAYGLOWZ_PRODUCT_JWT_DEFAULT_ISSUER
  const audience = isNonEmptyString(env.REPLAYGLOWZ_PRODUCT_JWT_AUDIENCE)
    ? env.REPLAYGLOWZ_PRODUCT_JWT_AUDIENCE!.trim()
    : REPLAYGLOWZ_PRODUCT_JWT_DEFAULT_AUDIENCE

  if (!privateKeyPem) {
    return null
  }

  return {
    privateKeyPem,
    keyId,
    issuer,
    audience,
  } as ReplayGlowzProductTokenConfig
}

export function getReplayGlowzProductJwtPrivateKeyPem(
  env: Record<string, string | undefined>
): string | null {
  return normalizePem(env.REPLAYGLOWZ_PRODUCT_JWT_PRIVATE_KEY_PEM)
}

export function getReplayGlowzProductJwtPublicKeyJwk(
  env: Record<string, string | undefined>
): JsonWebKey | null {
  const publicKeyJwk = parseJsonWebKey(
    env.REPLAYGLOWZ_PRODUCT_JWT_PUBLIC_KEY_JWK
  )
  if (publicKeyJwk) {
    return publicKeyJwk
  }
  return null
}

export async function getReplayGlowzProductJwtPublicKeyJwkOrNull(
  env: Record<string, string | undefined>
): Promise<JsonWebKey | null> {
  const direct = getReplayGlowzProductJwtPublicKeyJwk(env)
  if (direct) {
    return direct
  }

  const publicKeyPem = normalizePem(env.REPLAYGLOWZ_PRODUCT_JWT_PUBLIC_KEY_PEM)
  if (!publicKeyPem) {
    return null
  }

  const key = await importReplayGlowzProductVerificationKey(publicKeyPem)
  if (!key) {
    return null
  }

  try {
    const jwk = (await globalThis.crypto!.subtle.exportKey('jwk', key)) as
      | JsonWebKey
      | undefined
    return jwk ? stripPrivateFields(jwk) : null
  } catch {
    return null
  }
}

export function getReplayGlowzProductJwtKeyId(env: Record<string, string | undefined>) {
  return isNonEmptyString(env.REPLAYGLOWZ_PRODUCT_JWT_KEY_ID)
    ? env.REPLAYGLOWZ_PRODUCT_JWT_KEY_ID!.trim()
    : REPLAYGLOWZ_PRODUCT_JWT_DEFAULT_KEY_ID
}

export function getReplayGlowzProductJwtIssuer(env: Record<string, string | undefined>) {
  return isNonEmptyString(env.REPLAYGLOWZ_PRODUCT_JWT_ISSUER)
    ? env.REPLAYGLOWZ_PRODUCT_JWT_ISSUER!.trim()
    : REPLAYGLOWZ_PRODUCT_JWT_DEFAULT_ISSUER
}

export function getReplayGlowzProductJwtAudience(env: Record<string, string | undefined>) {
  return isNonEmptyString(env.REPLAYGLOWZ_PRODUCT_JWT_AUDIENCE)
    ? env.REPLAYGLOWZ_PRODUCT_JWT_AUDIENCE!.trim()
    : REPLAYGLOWZ_PRODUCT_JWT_DEFAULT_AUDIENCE
}

export async function buildReplayGlowzProductToken(
  args: {
    globalUserId: string
    productUserId: string
    productUserIdSource: ReplayGlowzProductUserIdSource
    matchedProductId: string
    reasonCode: ReplayGlowzEntitlementReasonCode
    issuer: string
    audience: string
    now?: number
  },
  env: Record<string, string | undefined>
): Promise<string | null> {
  const config = buildReplayGlowzProductTokenConfig(env)
  if (!config) {
    return null
  }

  const key = await importReplayGlowzProductSigningKey(config.privateKeyPem)
  if (!key) {
    return null
  }

  const issueTime = Math.floor((args.now ?? Date.now()) / 1000)
  const expiresAt = issueTime + REPLAYGLOWZ_PRODUCT_JWT_TTL_SECONDS
  const header = { alg: 'RS256', kid: config.keyId, typ: 'JWT' }
  const issuer = isNonEmptyString(args.issuer) ? args.issuer : config.issuer
  const audience = isNonEmptyString(args.audience) ? args.audience : config.audience
  const payload: ReplayGlowzProductJwtPayload = {
    sub: args.productUserId,
    globalUserId: args.globalUserId,
    productId: REPLAYGLOWZ_PRODUCT_ID,
    matchedProductId: args.matchedProductId,
    reasonCode: args.reasonCode,
    productUserId: args.productUserId,
    productUserIdSource: args.productUserIdSource,
    iat: issueTime,
    exp: expiresAt,
    iss: issuer,
    aud: audience,
  }

  const tokenParts = `${base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  )}.${base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))}`
  try {
    const signature = new Uint8Array(
      await globalThis.crypto!.subtle.sign(
        {
          name: 'RSASSA-PKCS1-v1_5',
        },
        key,
        new TextEncoder().encode(tokenParts)
      )
    )

    return `${tokenParts}.${base64UrlEncode(signature)}`
  } catch {
    return null
  }
}

function buildReplayGlowzProductTokenJwks(
  jwk: JsonWebKey,
  keyId: string
): JsonWebKey {
  return {
    ...stripPrivateFields(jwk),
    use: 'sig',
    kid: keyId,
    alg: 'RS256',
  } as JsonWebKey
}

export async function getReplayGlowzProductTokenJwks(
  env: Record<string, string | undefined>
): Promise<JsonWebKey[]> {
  const keyId = getReplayGlowzProductJwtKeyId(env)
  const direct = getReplayGlowzProductJwtPublicKeyJwk(env)
  if (direct) {
    return [buildReplayGlowzProductTokenJwks(direct, keyId)]
  }

  const fromPublicPem = await getReplayGlowzProductJwtPublicKeyJwkOrNull(env)
  if (fromPublicPem) {
    return [buildReplayGlowzProductTokenJwks(fromPublicPem, keyId)]
  }

  return []
}

export function isAllowedSuiteProduct(productId: string): boolean {
  return ALLOWED_PRODUCT_SET.has(normalizeSuiteProductId(productId))
}

export function isActiveAccessStatus(status: string): boolean {
  return ACTIVE_ENTITLEMENT_STATUSES.has(status)
}

function isActiveSuiteEntitlement(entry: BridgeEntitlement, now = Date.now()) {
  if (
    entry.source === 'product_default' ||
    (entry.status === 'active' && entry.plan === 'free')
  ) {
    return false
  }
  if (entry.status === 'active') {
    return true
  }

  if (entry.status !== 'trialing') {
    return false
  }

  return (
    typeof entry.trialExpiresAt === 'number' &&
    entry.trialExpiresAt > now
  )
}

export function hasActiveEntitlement(
  entitlements: BridgeEntitlement[],
  productId: string
): boolean {
  return entitlements.some(
    (entry) =>
      normalizeSuiteProductId(entry.productId) === normalizeSuiteProductId(productId) &&
      isActiveSuiteEntitlement(entry)
  )
}

function selectPreferredActiveEntitlement(
  entitlements: BridgeEntitlement[],
  productId: string
): BridgeEntitlement | undefined {
  const activeEntitlements = entitlements.filter(
    (entry) =>
      entry.productId === productId && isActiveSuiteEntitlement(entry)
  )
  return (
    activeEntitlements.find((entry) => entry.plan !== 'free') ??
    activeEntitlements[0]
  )
}

export function isAllowedCommunityGlowsPlan(planId: string): boolean {
  return COMMUNITYGLOWS_PLAN_SET.has(planId)
}

export function isAllowedCommunityGlowsSource(source: string): boolean {
  return COMMUNITYGLOWS_SOURCE_SET.has(source)
}

export function resolveCommunityGlowsEntitlementSnapshot({
  globalUserId,
  entitlements,
  now = Date.now(),
  trialEligible = false,
}: {
  globalUserId: string | null
  entitlements: BridgeEntitlement[]
  now?: number
  trialEligible?: boolean
}): CommunityGlowsEntitlementSnapshot {
  const activeSocialEntitlements = entitlements.filter(
    (entry) =>
      entry.productId === COMMUNITYGLOWS_PRODUCT_ID &&
      isActiveSuiteEntitlement(entry, now)
  )
  const paidEntitlement = activeSocialEntitlements.find(
      (entry) => entry.status === 'active' && entry.source !== 'product_default'
    )
  const activeTrial = activeSocialEntitlements.find(
    (entry) => entry.status === 'trialing'
  )
  const trials = entitlements
    .filter(
      (entry) =>
        entry.productId === COMMUNITYGLOWS_PRODUCT_ID &&
        entry.source === 'product_trial'
    )
    .sort((left, right) =>
      (right.trialAttempt ?? 0) - (left.trialAttempt ?? 0)
    )
  const latestTrial = trials[0]
  const trialRestartsRemaining = Math.max(
    0,
    SUITE_TRIAL_MAX_CYCLES - Math.max(1, trials.length)
  )
  const socialEntitlement = paidEntitlement ?? activeTrial
  if (!globalUserId) {
    return {
      hasAccess: false,
      accessState: 'inactive',
      planId: null,
      source: null,
      globalUserId: null,
      trialStartedAt: null,
      trialEndsAt: null,
      trialExpiresAt: null,
      trialAttempt: null,
      trialRestartsRemaining: 2,
      trialRestartEligible: false,
      reasonCode: 'account_not_found',
    }
  }

  if (!socialEntitlement) {
    if (latestTrial) {
      const exhausted = trialRestartsRemaining === 0
      return {
        hasAccess: false,
        accessState: exhausted ? 'trial_exhausted' : 'trial_expired',
        planId: latestTrial.plan ?? COMMUNITYGLOWS_DEFAULT_PLAN,
        source: latestTrial.source ?? null,
        globalUserId,
        trialStartedAt: latestTrial.trialStartedAt ?? null,
        trialEndsAt: latestTrial.trialExpiresAt ?? null,
        trialExpiresAt: latestTrial.trialExpiresAt ?? null,
        trialAttempt: latestTrial.trialAttempt ?? trials.length,
        trialRestartsRemaining,
        trialRestartEligible: trialEligible && !exhausted,
        reasonCode: exhausted ? 'trial_exhausted' : 'trial_expired',
      }
    }
    return {
      hasAccess: false,
      accessState: 'inactive',
      planId: null,
      source: null,
      globalUserId,
      trialStartedAt: null,
      trialEndsAt: null,
      trialExpiresAt: null,
      trialAttempt: null,
      trialRestartsRemaining: 2,
      trialRestartEligible: false,
      reasonCode: 'missing_product_entitlement',
    }
  }

  const isTrial = socialEntitlement.status === 'trialing'
  return {
    hasAccess: true,
    accessState: isTrial ? 'trial_active' : 'lifetime_active',
    planId: socialEntitlement.plan ?? COMMUNITYGLOWS_DEFAULT_PLAN,
    source: socialEntitlement.source ?? null,
    globalUserId,
    trialStartedAt: isTrial ? (socialEntitlement.trialStartedAt ?? null) : null,
    trialEndsAt: isTrial ? (socialEntitlement.trialExpiresAt ?? null) : null,
    trialExpiresAt: isTrial ? (socialEntitlement.trialExpiresAt ?? null) : null,
    trialAttempt: isTrial
      ? (socialEntitlement.trialAttempt ?? trials.length)
      : null,
    trialRestartsRemaining,
    trialRestartEligible: false,
    reasonCode: 'active_entitlement',
  }
}

export function resolveReplayGlowzEntitlementSnapshot({
  globalUserId,
  entitlements,
  accountExists = true,
}: {
  globalUserId: string | null
  entitlements: BridgeEntitlement[]
  accountExists?: boolean
}): ReplayGlowzEntitlementSnapshot {
  if (!globalUserId) {
    return {
      hasAccess: false,
      globalUserId: null,
      matchedProductId: null,
      reasonCode: accountExists ? 'global_user_not_found' : 'account_not_found',
    }
  }

  const canonical = selectPreferredActiveEntitlement(
    entitlements,
    REPLAYGLOWZ_PRODUCT_ID
  )
  if (canonical) {
    return {
      hasAccess: true,
      globalUserId,
      matchedProductId: REPLAYGLOWZ_PRODUCT_ID,
      reasonCode: 'active_entitlement',
    }
  }

  return {
    hasAccess: false,
    globalUserId,
    matchedProductId: null,
    reasonCode: 'missing_product_entitlement',
  }
}

export function buildFirestoreSuiteAccessMirror({
  globalUserId,
  entitlements,
}: {
  globalUserId: string
  entitlements: BridgeEntitlement[]
}) {
  const products = Object.fromEntries(
    FIRESTORE_ENTITLEMENT_PRODUCTS.map((productId) => {
      const entitlement = selectPreferredActiveEntitlement(
        entitlements,
        productId
      )

      return [
        productId,
        {
          active: entitlement != null,
          status: entitlement?.status ?? 'inactive',
          plan: entitlement?.plan ?? null,
        },
      ]
    })
  )

  return {
    globalUserId,
    products,
  }
}

export function maskProviderAccountId(value: string): string {
  if (value.length <= 6) {
    return `${value[0] ?? ''}***${value[value.length - 1] ?? ''}`
  }

  return `${value.slice(0, 3)}***${value.slice(-3)}`
}

export function getBearerTokenFromAuthorizationHeader(
  authorizationHeader: string | null
): string | null {
  if (!authorizationHeader) {
    return null
  }

  const parts = authorizationHeader.trim().split(/\s+/)
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer' || !parts[1]) {
    return null
  }

  return parts[1]
}

type FirebaseIdTokenClaimsLike = {
  aud?: unknown
  iss?: unknown
  sub?: unknown
  uid?: unknown
}

export function isTrustedFirebaseIdTokenClaims(
  claims: FirebaseIdTokenClaimsLike,
  projectId: string
): boolean {
  const expectedIssuer = `https://securetoken.google.com/${projectId}`
  const subject = claims.sub ?? claims.uid

  return (
    isNonEmptyString(projectId) &&
    claims.aud === projectId &&
    claims.iss === expectedIssuer &&
    isNonEmptyString(subject)
  )
}

export function resolveBridgeEnvironment(nodeEnv: string | undefined): string {
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return nodeEnv
  }
  return 'production'
}

function cleanSecret(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function getBridgeEndpointSecret(
  env: Record<string, string | undefined>
): string | null {
  return (
    cleanSecret(env.SUITE_BRIDGE_SYNC_SECRET) ??
    cleanSecret(env.SUITE_BRIDGE_CONVEX_SECRET)
  )
}

export function getConvexBridgeSecret(
  env: Record<string, string | undefined>
): string | null {
  return cleanSecret(env.SUITE_BRIDGE_CONVEX_SECRET)
}

export function getSuiteEntitlementVerifySecret(
  env: Record<string, string | undefined>
): string | null {
  return cleanSecret(env.SUITE_ENTITLEMENT_VERIFY_SECRET)
}

export function getCommunityGlowsBridgeSecret(
  env: Record<string, string | undefined>
): string | null {
  return (
    cleanSecret(env.COMMUNITYGLOWS_SUITE_BRIDGE_SECRET) ??
    cleanSecret(env.SUITE_COMMUNITYGLOWS_BRIDGE_SECRET)
  )
}

export function getTemuShoppingListsBridgeSecret(
  env: Record<string, string | undefined>
): string | null {
  return (
    cleanSecret(env.TEMU_SHOPPING_LISTS_SUITE_BRIDGE_SECRET) ??
    cleanSecret(env.SUITE_TEMU_SHOPPING_LISTS_BRIDGE_SECRET)
  )
}

export function isValidGlobalUserId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function parseSyncRequestBody(
  body: unknown
): { globalUserId: string } | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const globalUserId = (body as Record<string, unknown>).globalUserId
  if (!isValidGlobalUserId(globalUserId)) {
    return null
  }

  return { globalUserId: globalUserId.trim() }
}
