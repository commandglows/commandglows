import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ parse: vi.fn(), mutation: vi.fn() }))
vi.mock('@/lib/commerce/providers/stripe', () => ({ parseStripeManagedPaymentsWebhook: mocks.parse }))
vi.mock('convex/browser', () => ({ ConvexHttpClient: vi.fn().mockImplementation(function () { return { mutation: mocks.mutation } }) }))
vi.mock('@/lib/serverEnv', () => ({ getServerEnv: () => ({ PUBLIC_CONVEX_URL: 'https://synthetic.convex.cloud',
  SUITE_BRIDGE_CONVEX_SECRET: 'synthetic', STRIPE_SECRET_KEY: 'sk_test_synthetic', STRIPE_WEBHOOK_SECRET: 'whsec_synthetic' }) }))
import { POST } from '@/pages/api/commerce/webhooks/stripe'

const verifiedEvent = { providerEventId: 'evt_failure', providerPayloadHash: 'a'.repeat(64), providerEventType: 'refund.updated', environment: 'sandbox' }
const request = () => ({ request: new Request('https://commandglows.test/api/commerce/webhooks/stripe', {
  method: 'POST', headers: { 'stripe-signature': 'synthetic' }, body: '{}' }) })

beforeEach(() => { vi.clearAllMocks(); mocks.mutation.mockResolvedValue({ status: 'recorded' }) })

describe('webhook incident durability and retry responses', () => {
  test('invalid signatures do not create trusted incidents', async () => {
    mocks.parse.mockResolvedValue({ ok: false, ignored: false, reason: 'invalid_signature', message: 'Invalid signature', status: 400 })
    expect((await POST(request() as never)).status).toBe(400)
    expect(mocks.mutation).not.toHaveBeenCalled()
  })

  test('verified dependency failure is recorded while Stripe receives retryable failure', async () => {
    mocks.parse.mockResolvedValue({ ok: false, ignored: false, reason: 'invalid_event', message: 'Dependency unavailable', status: 500, verifiedEvent })
    const response = await POST(request() as never)
    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(mocks.mutation).toHaveBeenCalledWith('commerceOperations:recordCommerceIngressFailure', {
      ...verifiedEvent, reason: 'stripe_dependency_unavailable', bridgeSecret: 'synthetic' })
  })

  test('fulfillment failure creates a diagnostic without acknowledging successful delivery', async () => {
    mocks.parse.mockResolvedValue({ ok: true, normalizedEvent: { ...verifiedEvent, eventType: 'refund_updated', refundAmount: 40 } })
    mocks.mutation.mockRejectedValueOnce(new Error('private provider payload must not be logged'))
    const response = await POST(request() as never)
    expect(response.status).toBe(500)
    expect(mocks.mutation).toHaveBeenLastCalledWith('commerceOperations:recordCommerceIngressFailure', {
      ...verifiedEvent, reason: 'commerce_fulfillment_failed', bridgeSecret: 'synthetic' })
    expect(await response.text()).not.toContain('private')
  })

  test('complete database outage preserves non-2xx and produces a redacted fallback alarm', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.parse.mockResolvedValue({ ok: false, ignored: false, message: 'Dependency unavailable', status: 500, verifiedEvent })
    mocks.mutation.mockRejectedValueOnce(new Error('database unavailable'))
    expect((await POST(request() as never)).status).toBe(500)
    expect(log).toHaveBeenCalledWith('commerce_incident_persistence_failed', { eventId: 'evt_failure', environment: 'sandbox' })
    log.mockRestore()
  })

  test('expected ignored events are acknowledged without creating incidents', async () => {
    mocks.parse.mockResolvedValue({ ok: false, ignored: true, message: 'Ignored event', status: 200 })
    expect((await POST(request() as never)).status).toBe(200)
    expect(mocks.mutation).not.toHaveBeenCalled()
  })
})
