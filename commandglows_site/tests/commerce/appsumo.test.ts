import { createHmac } from 'node:crypto'
import { describe, expect, test, vi } from 'vitest'
import { parseAppSumoWebhook, exchangeAppSumoCode } from '@/lib/commerce/providers/appsumo'

const now = 1789060000000
const key = 'synthetic-appsumo-test-secret'
const license = '00000000-0000-4000-8000-000000000001'
function signed(overrides: Record<string, unknown> = {}) {
  const rawBody = JSON.stringify({ license_key: license, event: 'activate',
    license_status: 'inactive', event_timestamp: now, tier: 1, ...overrides })
  return { rawBody, timestamp: String(now), apiKey: key, now,
    signature: createHmac('sha256', key).update(`${now}${rawBody}`).digest('hex') }
}
describe('AppSumo signed protocol', () => {
  const oauth = { code: 'synthetic-code', clientId: 'test-client', clientSecret: 'test-secret', redirectUri: 'https://suite.example/callback' }
  test('exchanges OAuth once and returns only the license, never tokens', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'synthetic-token', refresh_token: 'do-not-store' }))
      .mockResolvedValueOnce(Response.json({ license_key: license, status: 'active' }))
    expect(await exchangeAppSumoCode(oauth, fetcher)).toEqual({ licenseKey: license, status: 'active' })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[0][1].body.get('grant_type')).toBe('authorization_code')
    expect(fetcher.mock.calls[1][1].redirect).toBe('error')
  })
  test('redacts failures and never retries a single-use code', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('secret access_token=private'))
    await expect(exchangeAppSumoCode(oauth, fetcher)).rejects.toThrow('appsumo_oauth_exchange_failed')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  test('uses event semantics for pre-ACK activation', () => {
    expect(parseAppSumoWebhook(signed())).toMatchObject({ desiredStatus: 'active', licenseKey: license })
  })
  test('never activates a test or purchase', () => {
    expect(parseAppSumoWebhook(signed({ test: true })).desiredStatus).toBe('inactive')
    expect(parseAppSumoWebhook(signed({ event: 'purchase' })).desiredStatus).toBe('inactive')
  })
  test('deactivation overrides pre-ACK active status', () => {
    expect(parseAppSumoWebhook(signed({ event: 'deactivate', license_status: 'active' })).desiredStatus).toBe('deactivated')
  })
  test('rejects tampering, malformed signatures, stale and future requests', () => {
    const input = signed()
    for (const bad of [{ ...input, rawBody: input.rawBody + ' ' },
      { ...input, signature: 'z'.repeat(64) }, { ...input, now: now + 300001 },
      { ...input, now: now - 300001 }]) expect(() => parseAppSumoWebhook(bad)).toThrow('appsumo_invalid_signature')
  })
  test.each(['upgrade', 'downgrade'])('requires valid %s lineage', (event) => {
    expect(() => parseAppSumoWebhook(signed({ event }))).toThrow('appsumo_invalid_lineage')
    expect(() => parseAppSumoWebhook(signed({ event, prev_license_key: license }))).toThrow('appsumo_invalid_lineage')
    expect(parseAppSumoWebhook(signed({ event, prev_license_key: '00000000-0000-4000-8000-000000000002' }))).toMatchObject({ desiredStatus: 'active' })
  })
  test('rejects unsupported add-ons and malformed test flags', () => {
    expect(() => parseAppSumoWebhook(signed({ parent_license_key: license }))).toThrow('appsumo_addon_requires_mapping')
    expect(() => parseAppSumoWebhook(signed({ test: 'true' }))).toThrow('appsumo_invalid_payload')
  })
})
