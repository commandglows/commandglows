import { generateKeyPairSync, randomUUID, sign } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { verifyAuth0AccessToken } from '../src/lib/auth0AccessToken'

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

describe('verifyAuth0AccessToken', () => {
  afterEach(() => vi.restoreAllMocks())

  it('accepts a signed RS256 token with exact issuer and audience', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    })
    const jwk = publicKey.export({ format: 'jwk' })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              keys: [{ ...jwk, kid: 'test-key', alg: 'RS256' }],
            }),
            { status: 200 }
          )
      )
    )

    const header = encode({ alg: 'RS256', kid: 'test-key', typ: 'JWT' })
    const payload = encode({
      sub: 'auth0|subject',
      iss: 'https://tenant.example/',
      aud: 'https://api.contentglows.test',
      exp: 2_000,
      email: 'USER@EXAMPLE.COM',
      email_verified: true,
    })
    const input = `${header}.${payload}`
    const signature = sign(
      'RSA-SHA256',
      Buffer.from(input),
      privateKey
    ).toString('base64url')

    const claims = await verifyAuth0AccessToken(`${input}.${signature}`, {
      domainOrIssuer: 'tenant.example',
      audience: 'https://api.contentglows.test',
      nowSeconds: 1_000,
    })

    expect(claims.sub).toBe('auth0|subject')
    expect(claims.email).toBe('user@example.com')
  })

  it('rejects a token issued for another audience', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    })
    const jwk = publicKey.export({ format: 'jwk' })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              keys: [{ ...jwk, kid: 'other-key', alg: 'RS256' }],
            }),
            { status: 200 }
          )
      )
    )
    const header = encode({ alg: 'RS256', kid: 'other-key' })
    const payload = encode({
      sub: 'auth0|subject',
      iss: 'https://other-tenant.example/',
      aud: 'another-api',
      exp: 2_000,
    })
    const input = `${header}.${payload}`
    const signature = sign(
      'RSA-SHA256',
      Buffer.from(input),
      privateKey
    ).toString('base64url')

    await expect(
      verifyAuth0AccessToken(`${input}.${signature}`, {
        domainOrIssuer: 'other-tenant.example',
        audience: 'https://api.contentglows.test',
        nowSeconds: 1_000,
      })
    ).rejects.toThrow('invalid_jwt_claims')
  })

  it('refetches JWKS exactly once when a cached set does not contain the kid', async () => {
    const oldPair = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const rotatedPair = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const oldJwk = oldPair.publicKey.export({ format: 'jwk' })
    const rotatedJwk = rotatedPair.publicKey.export({ format: 'jwk' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            keys: [{ ...oldJwk, kid: 'old-key', alg: 'RS256' }],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            keys: [{ ...rotatedJwk, kid: 'rotated-key', alg: 'RS256' }],
          }),
          { status: 200 }
        )
      )
    vi.stubGlobal('fetch', fetchMock)

    const issuer = `rotation-${randomUUID()}.example`
    const audience = 'https://api.contentglows.test'
    const makeToken = (kid: string, privateKey: typeof oldPair.privateKey) => {
      const header = encode({ alg: 'RS256', kid })
      const payload = encode({
        sub: 'auth0|rotation-subject',
        iss: `https://${issuer}/`,
        aud: audience,
        exp: 2_000,
      })
      const input = `${header}.${payload}`
      const signature = sign(
        'RSA-SHA256',
        Buffer.from(input),
        privateKey
      ).toString('base64url')
      return `${input}.${signature}`
    }

    await verifyAuth0AccessToken(makeToken('old-key', oldPair.privateKey), {
      domainOrIssuer: issuer,
      audience,
      nowSeconds: 1_000,
    })
    await verifyAuth0AccessToken(
      makeToken('rotated-key', rotatedPair.privateKey),
      { domainOrIssuer: issuer, audience, nowSeconds: 1_000 }
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
