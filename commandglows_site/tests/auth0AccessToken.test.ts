import { generateKeyPairSync, sign } from 'node:crypto'
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
})
