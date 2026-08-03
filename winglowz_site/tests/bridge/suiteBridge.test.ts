import {
  DEFAULT_FREE_PRODUCT_IDS,
  buildFirestoreSuiteAccessMirror,
  buildReplayGlowzProductToken,
  getBridgeEndpointSecret,
  getConvexBridgeSecret,
  getBearerTokenFromAuthorizationHeader,
  getReplayGlowzProductJwtAudience,
  getReplayGlowzProductJwtIssuer,
  getSocialGlowzBridgeSecret,
  getTemuShoppingListsBridgeSecret,
  getSuiteEntitlementVerifySecret,
  getReplayGlowzProductTokenJwks,
  hasActiveEntitlement,
  isActiveAccessStatus,
  isAllowedSocialGlowzPlan,
  isAllowedSocialGlowzSource,
  isAllowedSuiteProduct,
  normalizeSuiteProductId,
  isTrustedFirebaseIdTokenClaims,
  parseSyncRequestBody,
  maskProviderAccountId,
  resolveReplayGlowzEntitlementSnapshot,
  resolveSocialGlowzEntitlementSnapshot,
} from '@/lib/suiteBridge'
import { createPublicKey, generateKeyPairSync } from 'node:crypto'

function decodeBase64Url(value: string): Uint8Array {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

function toPemBytes(pem: string): Uint8Array {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s/g, '')
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

function decodeJwt(token: string) {
  const parts = token.split('.')
  expect(parts).toHaveLength(3)
  const header = JSON.parse(
    Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
  ) as { alg: string; kid: string; typ: string }
  const payload = JSON.parse(
    Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
  ) as {
    sub: string
    globalUserId: string
    productId: string
    matchedProductId: string
    reasonCode: string
    productUserId: string
    productUserIdSource: string
    iat: number
    exp: number
    iss: string
    aud: string
  }

  return {
    header,
    payload,
    signature: parts[2],
    signingInput: `${parts[0]}.${parts[1]}`,
  }
}

function buildJwtRsaKeys() {
  const pair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })

  const publicJwk = createPublicKey(pair.publicKey).export({ format: 'jwk' })
  return { ...pair, publicJwk }
}

describe('suiteBridge helpers', () => {
  test('extracts bearer token from authorization header', () => {
    expect(getBearerTokenFromAuthorizationHeader('Bearer abc.def.ghi')).toBe(
      'abc.def.ghi'
    )
    expect(getBearerTokenFromAuthorizationHeader('bearer token123')).toBe(
      'token123'
    )
  })

  test('rejects malformed authorization headers', () => {
    expect(getBearerTokenFromAuthorizationHeader(null)).toBeNull()
    expect(getBearerTokenFromAuthorizationHeader('Token abc')).toBeNull()
    expect(getBearerTokenFromAuthorizationHeader('Bearer')).toBeNull()
    expect(getBearerTokenFromAuthorizationHeader('')).toBeNull()
  })

  test('filters allowed suite products only', () => {
    expect(isAllowedSuiteProduct('winglowz_app')).toBe(true)
    expect(isAllowedSuiteProduct('winglowz_formation')).toBe(true)
    expect(isAllowedSuiteProduct('gocharbon')).toBe(true)
    expect(isAllowedSuiteProduct('contentglowz')).toBe(true)
    expect(isAllowedSuiteProduct('shipglows')).toBe(true)
    expect(isAllowedSuiteProduct('shipglowz')).toBe(true)
    expect(normalizeSuiteProductId('shipglowz')).toBe('shipglows')
    expect(isAllowedSuiteProduct('replayglowz')).toBe(true)
    expect(isAllowedSuiteProduct('socialglowz')).toBe(true)
    expect(isAllowedSuiteProduct('temu_shopping_lists')).toBe(true)
    expect(isAllowedSuiteProduct('winglowz_android')).toBe(false)
    expect(isAllowedSuiteProduct('old_youtube_product')).toBe(false)
    expect(isAllowedSuiteProduct('legacy_product')).toBe(false)
  })

  test('keeps default free access scoped to free-tier products', () => {
    expect(DEFAULT_FREE_PRODUCT_IDS).toEqual([
      'winglowz_app',
      'winglowz_formation',
      'gocharbon',
      'contentglowz',
      'shipglows',
      'replayglowz',
      'socialglowz',
      'temu_shopping_lists',
    ])
  })

  test('accepts only active and trialing status for access', () => {
    expect(isActiveAccessStatus('active')).toBe(true)
    expect(isActiveAccessStatus('trialing')).toBe(true)
    expect(isActiveAccessStatus('refunded')).toBe(false)
  })

  test('detects active product entitlement', () => {
    expect(
      hasActiveEntitlement(
        [
          { productId: 'winglowz_app', status: 'trialing', plan: 'monthly' },
          { productId: 'old_youtube_product', status: 'refunded', plan: 'pro' },
        ],
        'winglowz_app'
      )
    ).toBe(true)
    expect(
      hasActiveEntitlement(
        [{ productId: 'winglowz_app', status: 'refunded', plan: 'monthly' }],
        'winglowz_app'
      )
    ).toBe(false)
  })

  test('builds a Firestore suite access mirror for rules', () => {
    expect(
      buildFirestoreSuiteAccessMirror({
        globalUserId: 'gu_123',
        entitlements: [
          { productId: 'winglowz_app', status: 'active', plan: 'pro' },
          { productId: 'replayglowz', status: 'active', plan: 'pro' },
        ],
      })
    ).toEqual({
      globalUserId: 'gu_123',
      products: {
        winglowz_app: {
          active: true,
          status: 'active',
          plan: 'pro',
        },
      },
    })

    expect(
      buildFirestoreSuiteAccessMirror({
        globalUserId: 'gu_123',
        entitlements: [
          { productId: 'winglowz_app', status: 'refunded', plan: 'pro' },
        ],
      }).products.winglowz_app.active
    ).toBe(false)
  })

  test('treats WinGlows free plan as active sync access and prefers paid plan metadata', () => {
    expect(
      buildFirestoreSuiteAccessMirror({
        globalUserId: 'gu_123',
        entitlements: [
          { productId: 'winglowz_app', status: 'active', plan: 'free' },
        ],
      }).products.winglowz_app
    ).toEqual({
      active: true,
      status: 'active',
      plan: 'free',
    })

    expect(
      buildFirestoreSuiteAccessMirror({
        globalUserId: 'gu_123',
        entitlements: [
          { productId: 'winglowz_app', status: 'active', plan: 'free' },
          { productId: 'winglowz_app', status: 'active', plan: 'pro' },
        ],
      }).products.winglowz_app
    ).toEqual({
      active: true,
      status: 'active',
      plan: 'pro',
    })
  })

  test('masks provider account identifiers', () => {
    expect(maskProviderAccountId('1234567890')).toBe('123***890')
    expect(maskProviderAccountId('abc12')).toBe('a***2')
  })

  test('resolves bridge endpoint secret with sync override first', () => {
    expect(
      getBridgeEndpointSecret({
        SUITE_BRIDGE_SYNC_SECRET: 'sync-secret',
        SUITE_BRIDGE_CONVEX_SECRET: 'convex-secret',
      })
    ).toBe('sync-secret')
    expect(
      getBridgeEndpointSecret({
        SUITE_BRIDGE_CONVEX_SECRET: 'convex-secret',
      })
    ).toBe('convex-secret')
    expect(
      getBridgeEndpointSecret({
        SUITE_BRIDGE_SYNC_SECRET: '',
        SUITE_BRIDGE_CONVEX_SECRET: 'convex-secret',
      })
    ).toBe('convex-secret')
    expect(getBridgeEndpointSecret({})).toBeNull()
  })

  test('keeps Convex bridge secret separate from endpoint override', () => {
    expect(
      getConvexBridgeSecret({
        SUITE_BRIDGE_SYNC_SECRET: 'sync-secret',
        SUITE_BRIDGE_CONVEX_SECRET: 'convex-secret',
      })
    ).toBe('convex-secret')
    expect(getConvexBridgeSecret({ SUITE_BRIDGE_CONVEX_SECRET: '' })).toBeNull()
  })

  test('resolves suite entitlement verifier secret without falling back', () => {
    expect(
      getSuiteEntitlementVerifySecret({
        SUITE_ENTITLEMENT_VERIFY_SECRET: 'entitlement-secret',
      })
    ).toBe('entitlement-secret')
    expect(
      getSuiteEntitlementVerifySecret({
        SUITE_BRIDGE_CONVEX_SECRET: 'convex-secret',
      })
    ).toBeNull()
  })

  test('resolves socialglowz bridge secret from dedicated env keys', () => {
    expect(
      getSocialGlowzBridgeSecret({
        SOCIALGLOWZ_SUITE_BRIDGE_SECRET: 'social-bridge-secret',
      })
    ).toBe('social-bridge-secret')
    expect(
      getSocialGlowzBridgeSecret({
        SUITE_SOCIALGLOWZ_BRIDGE_SECRET: 'suite-social-secret',
      })
    ).toBe('suite-social-secret')
    expect(
      getSocialGlowzBridgeSecret({
        SOCIALGLOWZ_SUITE_BRIDGE_SECRET: '  ',
      })
    ).toBeNull()
  })

  test('resolves temu shopping lists bridge secret from dedicated env keys', () => {
    expect(
      getTemuShoppingListsBridgeSecret({
        TEMU_SHOPPING_LISTS_SUITE_BRIDGE_SECRET: 'temu-bridge-secret',
      })
    ).toBe('temu-bridge-secret')
    expect(
      getTemuShoppingListsBridgeSecret({
        SUITE_TEMU_SHOPPING_LISTS_BRIDGE_SECRET: 'suite-temu-secret',
      })
    ).toBe('suite-temu-secret')
    expect(
      getTemuShoppingListsBridgeSecret({
        TEMU_SHOPPING_LISTS_SUITE_BRIDGE_SECRET: '  ',
      })
    ).toBeNull()
  })

  test('allows only allowlisted socialglowz plan/source values', () => {
    expect(isAllowedSocialGlowzPlan('free')).toBe(true)
    expect(isAllowedSocialGlowzPlan('lifetime_deal')).toBe(true)
    expect(isAllowedSocialGlowzPlan('founder_ltd')).toBe(true)
    expect(isAllowedSocialGlowzPlan('monthly')).toBe(false)

    expect(isAllowedSocialGlowzSource('product_default')).toBe(true)
    expect(isAllowedSocialGlowzSource('manual')).toBe(true)
    expect(isAllowedSocialGlowzSource('direct')).toBe(true)
    expect(isAllowedSocialGlowzSource('stripe')).toBe(false)
  })

  test('resolves socialglowz snapshot from canonical entitlement', () => {
    expect(
      resolveSocialGlowzEntitlementSnapshot({
        globalUserId: 'gu_123',
        entitlements: [
          {
            productId: 'socialglowz',
            status: 'active',
            plan: 'lifetime_deal',
            source: 'manual',
          },
        ],
      })
    ).toEqual({
      hasAccess: true,
      planId: 'lifetime_deal',
      source: 'manual',
      globalUserId: 'gu_123',
      reasonCode: 'active_entitlement',
    })
  })

  test('resolves socialglowz free access and prefers paid metadata', () => {
    expect(
      resolveSocialGlowzEntitlementSnapshot({
        globalUserId: 'gu_123',
        entitlements: [
          {
            productId: 'socialglowz',
            status: 'active',
            plan: 'free',
            source: 'product_default',
          },
        ],
      })
    ).toEqual({
      hasAccess: true,
      planId: 'free',
      source: 'product_default',
      globalUserId: 'gu_123',
      reasonCode: 'active_entitlement',
    })

    expect(
      resolveSocialGlowzEntitlementSnapshot({
        globalUserId: 'gu_123',
        entitlements: [
          {
            productId: 'socialglowz',
            status: 'active',
            plan: 'free',
            source: 'product_default',
          },
          {
            productId: 'socialglowz',
            status: 'active',
            plan: 'lifetime_deal',
            source: 'manual',
          },
        ],
      })
    ).toEqual({
      hasAccess: true,
      planId: 'lifetime_deal',
      source: 'manual',
      globalUserId: 'gu_123',
      reasonCode: 'active_entitlement',
    })
  })

  test('resolves ReplayGlowz access from canonical entitlement first', () => {
    expect(
      resolveReplayGlowzEntitlementSnapshot({
        globalUserId: 'gu_123',
        entitlements: [
          { productId: 'old_youtube_product', status: 'active', plan: 'legacy' },
          { productId: 'replayglowz', status: 'trialing', plan: 'pro' },
        ],
      })
    ).toEqual({
      hasAccess: true,
      globalUserId: 'gu_123',
      matchedProductId: 'replayglowz',
      reasonCode: 'active_entitlement',
    })
  })

  test('ignores old ReplayGlowz aliases and falls back to free access', () => {
    expect(
      resolveReplayGlowzEntitlementSnapshot({
        globalUserId: 'gu_123',
        entitlements: [
          { productId: 'old_youtube_product', status: 'active', plan: 'legacy' },
        ],
      })
    ).toEqual({
      hasAccess: true,
      globalUserId: 'gu_123',
      matchedProductId: 'replayglowz',
      reasonCode: 'default_free_entitlement',
    })
  })

  test('grants ReplayGlowz free access without active product entitlement', () => {
    expect(
      resolveReplayGlowzEntitlementSnapshot({
        globalUserId: 'gu_123',
        entitlements: [
          { productId: 'replayglowz', status: 'refunded', plan: 'pro' },
          { productId: 'winglowz_app', status: 'active', plan: 'pro' },
        ],
      })
    ).toEqual({
      hasAccess: true,
      globalUserId: 'gu_123',
      matchedProductId: 'replayglowz',
      reasonCode: 'default_free_entitlement',
    })
  })

  test('denies ReplayGlowz access when Clerk account is unknown', () => {
    expect(
      resolveReplayGlowzEntitlementSnapshot({
        globalUserId: null,
        entitlements: [],
        accountExists: false,
      })
    ).toEqual({
      hasAccess: false,
      globalUserId: null,
      matchedProductId: null,
      reasonCode: 'account_not_found',
    })
  })

  test('parses sync request body with required global user id', () => {
    expect(parseSyncRequestBody({ globalUserId: 'gu_123' })).toEqual({
      globalUserId: 'gu_123',
    })
    expect(parseSyncRequestBody({ globalUserId: '  gu_123  ' })).toEqual({
      globalUserId: 'gu_123',
    })
    expect(parseSyncRequestBody({})).toBeNull()
    expect(parseSyncRequestBody({ globalUserId: '' })).toBeNull()
    expect(parseSyncRequestBody(null)).toBeNull()
  })

  test('accepts trusted firebase id token claims', () => {
    expect(
      isTrustedFirebaseIdTokenClaims(
        {
          aud: 'winglowz-prod',
          iss: 'https://securetoken.google.com/winglowz-prod',
          sub: 'firebase-user-123',
        },
        'winglowz-prod'
      )
    ).toBe(true)
  })

  test('rejects firebase claims with invalid issuer/audience/subject', () => {
    expect(
      isTrustedFirebaseIdTokenClaims(
        {
          aud: 'wrong-project',
          iss: 'https://securetoken.google.com/winglowz-prod',
          sub: 'firebase-user-123',
        },
        'winglowz-prod'
      )
    ).toBe(false)

    expect(
      isTrustedFirebaseIdTokenClaims(
        {
          aud: 'winglowz-prod',
          iss: 'https://securetoken.google.com/wrong-project',
          sub: 'firebase-user-123',
        },
        'winglowz-prod'
      )
    ).toBe(false)

    expect(
      isTrustedFirebaseIdTokenClaims(
        {
          aud: 'winglowz-prod',
          iss: 'https://securetoken.google.com/winglowz-prod',
          sub: '',
        },
        'winglowz-prod'
      )
    ).toBe(false)
  })

  test('builds a RS256 product token for ReplayGlowz with valid claims and signature', async () => {
    const keys = buildJwtRsaKeys()
    const env = {
      REPLAYGLOWZ_PRODUCT_JWT_PRIVATE_KEY_PEM: keys.privateKey,
      REPLAYGLOWZ_PRODUCT_JWT_KEY_ID: 'replayglowz-suite-2026-06-02',
      REPLAYGLOWZ_PRODUCT_JWT_ISSUER: 'https://winglowz.com',
      REPLAYGLOWZ_PRODUCT_JWT_AUDIENCE: 'replayglowz-convex',
    }

    const now = Date.UTC(2026, 5, 2, 12, 0, 0)
    const token = await buildReplayGlowzProductToken(
      {
        globalUserId: 'gu_123',
        productUserId: 'clerk_abc',
        productUserIdSource: 'clerk',
        matchedProductId: 'replayglowz',
        reasonCode: 'active_entitlement',
        issuer: getReplayGlowzProductJwtIssuer(env),
        audience: getReplayGlowzProductJwtAudience(env),
        now,
      },
      env
    )

    expect(token).not.toBeNull()
    if (!token) {
      return
    }

    const { header, payload, signature, signingInput } = decodeJwt(token)
    expect(header).toMatchObject({
      alg: 'RS256',
      kid: 'replayglowz-suite-2026-06-02',
    })
    expect(payload).toMatchObject({
      sub: 'clerk_abc',
      globalUserId: 'gu_123',
      productId: 'replayglowz',
      matchedProductId: 'replayglowz',
      reasonCode: 'active_entitlement',
      productUserId: 'clerk_abc',
      productUserIdSource: 'clerk',
      iss: 'https://winglowz.com',
      aud: 'replayglowz-convex',
    })
    expect(payload.iat).toBe(Math.floor(now / 1000))
    expect(payload.exp).toBe(Math.floor(now / 1000) + 600)

    const verifyKey = await globalThis.crypto.subtle.importKey(
      'spki',
      toPemBytes(keys.publicKey),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    )
    const valid = await globalThis.crypto.subtle.verify(
      {
        name: 'RSASSA-PKCS1-v1_5',
      },
      verifyKey,
      decodeBase64Url(signature),
      new TextEncoder().encode(signingInput)
    )

    expect(valid).toBe(true)
  })

  test('builds ReplayGlowz JWKS from public JWK env', async () => {
    const keys = buildJwtRsaKeys()
    const env = {
      REPLAYGLOWZ_PRODUCT_JWT_PUBLIC_KEY_JWK: JSON.stringify(keys.publicJwk),
      REPLAYGLOWZ_PRODUCT_JWT_KEY_ID: 'replayglowz-suite-2026-06-02',
    }

    const jwks = await getReplayGlowzProductTokenJwks(env)

    expect(jwks).toHaveLength(1)
    expect(jwks[0]).toMatchObject({
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      kid: 'replayglowz-suite-2026-06-02',
    })
    expect(jwks[0]).not.toHaveProperty('d')
    expect(jwks[0]).toHaveProperty('n')
  })

  test('builds ReplayGlowz JWKS from public key PEM fallback', async () => {
    const keys = buildJwtRsaKeys()
    const env = {
      REPLAYGLOWZ_PRODUCT_JWT_PUBLIC_KEY_PEM: keys.publicKey,
      REPLAYGLOWZ_PRODUCT_JWT_KEY_ID: 'replayglowz-suite-2026-06-02',
    }

    const jwks = await getReplayGlowzProductTokenJwks(env)

    expect(jwks).toHaveLength(1)
    expect(jwks[0]).toMatchObject({
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      kid: 'replayglowz-suite-2026-06-02',
    })
  })

  test('returns no ReplayGlowz JWKS when public key material is missing', async () => {
    const jwks = await getReplayGlowzProductTokenJwks({})
    expect(jwks).toHaveLength(0)
  })
})
