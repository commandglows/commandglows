import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn(), event: vi.fn(), session: vi.fn(), normalize: vi.fn() }))
vi.mock('convex/browser', () => ({ ConvexHttpClient: vi.fn().mockImplementation(function () { return { query: mocks.query, mutation: mocks.mutation } }) }))
vi.mock('stripe', () => ({ default: vi.fn().mockImplementation(function () { return { events: { retrieve: mocks.event }, checkout: { sessions: { retrieve: mocks.session } } } }) }))
vi.mock('@/lib/commerce/providers/stripe', () => ({ normalizeVerifiedStripeEvent: mocks.normalize }))
import { GET, POST } from '@/pages/api/admin/commerce'

const url = 'https://commandglows.example.test/api/admin/commerce'
const locals = (userId: string | null = 'trusted_admin') => ({ siteAuth: () => ({ userId }) })
const request = (payload: unknown, headers: Record<string, string> = {}) => new Request(url, {
  method: 'POST', headers: { Origin: new URL(url).origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload),
})
const post = (payload: unknown, options: Record<string, string> = {}) => POST({ request: request(payload, options), locals: locals() } as never)
const envelope = { provider: 'stripe', environment: 'sandbox', providerEventId: 'evt_trusted', providerOrderId: 'cs_trusted',
  productId: 'communityglows', offerId: 'communityglows/lifetime_deal', plan: 'lifetime_deal', sourceRef: 'suite-checkout:trusted',
  eventType: 'paid', status: 'applied', idempotencyKey: 'trusted', providerPayloadHash: 'a'.repeat(64), metadata: { source: 'provider' } }

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
  vi.stubEnv('PUBLIC_CONVEX_URL', 'https://convex.example.test')
  vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', 'server-only-secret')
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_synthetic')
  mocks.query.mockImplementation(async (name: string) => name === 'commerceOperations:authorize'
    ? { environment: 'sandbox' } : { receipt: { providerEventId: 'evt_trusted' } })
  mocks.mutation.mockResolvedValue({ status: 'granted' })
  mocks.event.mockResolvedValue({ id: 'evt_trusted', livemode: false })
  mocks.normalize.mockResolvedValue({ ok: true, normalizedEvent: envelope })
})
afterEach(() => vi.unstubAllEnvs())

describe('administrator commerce API', () => {
  test('signed-out access is denied with no-store and without backend calls', async () => {
    const response = await GET({ request: new Request(url), locals: locals(null) } as never)
    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(mocks.query).not.toHaveBeenCalled()
  })
  test('requires same-origin JSON before any mutation', async () => {
    expect((await post({}, { Origin: 'https://foreign.example.test' })).status).toBe(403)
    expect((await post({}, { 'Content-Type': 'text/plain' })).status).toBe(415)
    expect(mocks.query).not.toHaveBeenCalled()
  })
  test('canonical non-admin cannot trigger even a Stripe lookup', async () => {
    mocks.query.mockRejectedValueOnce(new Error('admin_forbidden'))
    const response = await post({ action: 'reconcile', eventId: 'evt_trusted', reason: 'Verify missing receipt' })
    expect(response.status).toBe(403)
    expect(mocks.event).not.toHaveBeenCalled()
    expect(mocks.mutation).not.toHaveBeenCalled()
  })
  test('forwards trusted admin and bounded pagination, ignoring requested environment', async () => {
    mocks.query.mockResolvedValueOnce({ environment: 'sandbox' }).mockResolvedValueOnce({ page: [], isDone: true })
    const response = await GET({ request: new Request(`${url}?environment=production&cursor=page2`), locals: locals() } as never)
    expect(response.status).toBe(200)
    expect(mocks.query).toHaveBeenLastCalledWith('commerceOperations:listIncidents', {
      actorGlobalUserId: 'trusted_admin', bridgeSecret: 'server-only-secret', active: true, paginationOpts: { numItems: 20, cursor: 'page2' },
    })
  })
  test('requires a version, attempts and support reason before retry', async () => {
    expect((await post({ action: 'retry', incidentId: 'case', expectedVersion: 1, expectedAttempts: 1, reason: '' })).status).toBe(400)
    expect((await post({ action: 'retry', incidentId: 'case', expectedVersion: 1, reason: 'Checked purchase' })).status).toBe(400)
    expect(mocks.mutation).not.toHaveBeenCalled()
  })
  test('maps stale mutation to refresh conflict without disclosing backend detail', async () => {
    mocks.mutation.mockRejectedValueOnce(new Error('incident_version_conflict: internal_sensitive_detail'))
    const response = await post({ action: 'claim', incidentId: 'case', expectedVersion: 1, reason: 'Take case ownership' })
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'case_changed_refresh_required' })
  })
  test('reconciles authenticated provider envelope and discards all caller granting fields', async () => {
    const response = await post({ action: 'reconcile', eventId: 'evt_trusted', reason: 'Verified missing webhook',
      environment: 'production', globalUserId: 'gu_attacker', productId: 'attack', providerPayloadHash: 'fake', operatorId: 'forged' })
    expect(response.status).toBe(200)
    expect(mocks.event).toHaveBeenCalledWith('evt_trusted')
    const { metadata: _metadata, ...trusted } = envelope
    expect(mocks.mutation).toHaveBeenCalledWith('commerceOperations:reconcileEvent', {
      ...trusted, actorGlobalUserId: 'trusted_admin', bridgeSecret: 'server-only-secret', reason: 'Verified missing webhook',
    })
  })
  test('rejects live-mode evidence in sandbox before normalizing', async () => {
    mocks.event.mockResolvedValueOnce({ id: 'evt_trusted', livemode: true })
    const response = await post({ action: 'reconcile', eventId: 'evt_trusted', reason: 'Verify event environment' })
    expect(response.status).toBe(400)
    expect(mocks.normalize).not.toHaveBeenCalled()
    expect(mocks.mutation).not.toHaveBeenCalled()
  })
  test('rejects metadata environment mismatch after normalization', async () => {
    mocks.normalize.mockResolvedValueOnce({ ok: true, normalizedEvent: { ...envelope, environment: 'production' } })
    expect((await post({ action: 'reconcile', eventId: 'evt_trusted', reason: 'Verify metadata environment' })).status).toBe(400)
    expect(mocks.mutation).not.toHaveBeenCalled()
  })
  test('exceptional recovery retrieves the event from the stored case and passes only its verified digest', async () => {
    const response = await post({ action: 'recover', incidentId: 'case', expectedVersion: 5, expectedAttempts: 5,
      eventId: 'evt_attacker', providerPayloadHash: 'forged', reason: 'Verified original provider evidence' })
    expect(response.status).toBe(200)
    expect(mocks.event).toHaveBeenCalledWith('evt_trusted')
    expect(mocks.mutation).toHaveBeenCalledWith('commerceOperations:recoverIncident', expect.objectContaining({
      providerEventId: 'evt_trusted', providerPayloadHash: 'a'.repeat(64), expectedAttempts: 5, expectedVersion: 5, actorGlobalUserId: 'trusted_admin',
    }))
  })
  test('provider outages leave the case intact and return a retryable service error', async () => {
    mocks.event.mockRejectedValueOnce(new Error('network down secret details'))
    const response = await post({ action: 'reconcile', eventId: 'evt_trusted', reason: 'Verify original event' })
    expect(response.status).toBe(503)
    expect(mocks.mutation).not.toHaveBeenCalled()
    expect(await response.text()).not.toContain('secret')
  })
  test('repairs only complete sessions retrieved from Stripe and forwards real metadata', async () => {
    const metadata = { source_ref: 'suite-checkout:trusted', environment: 'test', global_user_id: 'gu_true', product_id: 'communityglows', offer_id: 'communityglows/lifetime_deal' }
    mocks.session.mockResolvedValueOnce({ id: 'cs_true', status: 'open', livemode: false, metadata })
    expect((await post({ action: 'repair_checkout', sessionId: 'cs_true', reason: 'Verify failed binding' })).status).toBe(400)
    mocks.session.mockResolvedValueOnce({ id: 'cs_true', status: 'complete', livemode: false, metadata, url: null })
    expect((await post({ action: 'repair_checkout', sessionId: 'cs_true', reason: 'Verify failed binding', globalUserId: 'gu_forged' })).status).toBe(200)
    expect(mocks.mutation).toHaveBeenCalledWith('commerceOperations:repairCheckout', expect.objectContaining({ globalUserId: 'gu_true', checkoutUrl: undefined }))
  })
})
