import { createHmac, timingSafeEqual } from 'node:crypto'

export type AppSumoEvent = {
  licenseKey: string
  previousLicenseKey?: string
  event: 'purchase' | 'activate' | 'upgrade' | 'downgrade' | 'deactivate'
  eventTimestamp: number
  tier?: number
  test: boolean
  desiredStatus: 'inactive' | 'active' | 'deactivated'
}

const events = new Set(['purchase', 'activate', 'upgrade', 'downgrade', 'deactivate'])
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

/** Server-only exchange. Caller must first consume an authenticated, single-use OAuth state. */
export async function exchangeAppSumoCode(input: {
  code: string; clientId: string; clientSecret: string; redirectUri: string
}, fetcher: typeof fetch = fetch): Promise<{ licenseKey: string; status: string }> {
  if (!input.code || !input.clientId || !input.clientSecret || !input.redirectUri.startsWith('https://')) {
    throw new Error('appsumo_oauth_not_configured')
  }
  try {
    const tokenResponse = await fetcher('https://appsumo.com/openid/token/', {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: input.code, client_id: input.clientId,
        client_secret: input.clientSecret, redirect_uri: input.redirectUri, grant_type: 'authorization_code' }),
    })
    if (!tokenResponse.ok) throw new Error('token_failed')
    const token = await tokenResponse.json()
    if (typeof token.access_token !== 'string' || !token.access_token) throw new Error('token_missing')
    // Official OAuth endpoint requires this query parameter; never log its URL.
    const url = new URL('https://appsumo.com/openid/license_key/')
    url.searchParams.set('access_token', token.access_token)
    const response = await fetcher(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error('license_failed')
    const license = await response.json()
    if (typeof license.license_key !== 'string' || !uuid.test(license.license_key) ||
      !['active', 'inactive', 'deactivated'].includes(license.status)) throw new Error('license_invalid')
    return { licenseKey: license.license_key.toLowerCase(), status: license.status }
  } catch {
    // Codes are single-use, including failed attempts. Do not retry automatically.
    throw new Error('appsumo_oauth_exchange_failed')
  }
}

/** Verify the exact bytes. The provider timestamp is milliseconds, without a separator. */
export function parseAppSumoWebhook(input: {
  rawBody: string; timestamp: string; signature: string; apiKey: string
  now?: number; toleranceMs?: number
}): AppSumoEvent {
  const now = input.now ?? Date.now()
  const tolerance = input.toleranceMs ?? 300_000
  if (!input.apiKey || !/^\d{13}$/.test(input.timestamp) ||
    !/^[a-f0-9]{64}$/i.test(input.signature) ||
    !Number.isFinite(now) || !Number.isFinite(tolerance) || tolerance < 0 ||
    Math.abs(now - Number(input.timestamp)) > tolerance) {
    throw new Error('appsumo_invalid_signature')
  }
  const expected = createHmac('sha256', input.apiKey)
    .update(input.timestamp).update(input.rawBody).digest()
  if (!timingSafeEqual(expected, Buffer.from(input.signature, 'hex'))) {
    throw new Error('appsumo_invalid_signature')
  }
  let value: Record<string, unknown>
  try { value = JSON.parse(input.rawBody) } catch { throw new Error('appsumo_invalid_payload') }
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    typeof value.license_key !== 'string' || !uuid.test(value.license_key) ||
    typeof value.event !== 'string' || !events.has(value.event) ||
    !Number.isSafeInteger(value.event_timestamp) || Number(value.event_timestamp) <= 0 ||
    (value.test !== undefined && typeof value.test !== 'boolean') ||
    (value.tier !== undefined && (!Number.isSafeInteger(value.tier) || Number(value.tier) < 1))) {
    throw new Error('appsumo_invalid_payload')
  }
  // Add-ons have separate ownership and quota semantics; never treat them as base deals.
  if (value.parent_license_key !== undefined) throw new Error('appsumo_addon_requires_mapping')
  const replacement = value.event === 'upgrade' || value.event === 'downgrade'
  if ((replacement && !value.prev_license_key) ||
    (value.prev_license_key !== undefined &&
      (typeof value.prev_license_key !== 'string' || !uuid.test(value.prev_license_key) ||
        value.prev_license_key.toLowerCase() === value.license_key.toLowerCase()))) {
    throw new Error('appsumo_invalid_lineage')
  }
  return {
    licenseKey: value.license_key.toLowerCase(),
    previousLicenseKey: typeof value.prev_license_key === 'string' ? value.prev_license_key.toLowerCase() : undefined,
    event: value.event as AppSumoEvent['event'],
    eventTimestamp: Number(value.event_timestamp),
    tier: typeof value.tier === 'number' ? value.tier : undefined,
    test: value.test === true,
    // An activate webhook may carry inactive status until our acknowledgement.
    desiredStatus: value.test === true || value.event === 'purchase' ? 'inactive'
      : value.event === 'deactivate' ? 'deactivated' : 'active',
  }
}
