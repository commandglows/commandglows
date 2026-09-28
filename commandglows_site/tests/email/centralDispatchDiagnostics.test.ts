import { afterEach, expect, test, vi } from 'vitest'
import { handleDispatch } from '../../src/lib/email/central/worker'

afterEach(() => vi.restoreAllMocks())

test.each(['transport_verification', 'claim'])(
  'identifies %s failures without logging credentials or exception payloads',
  async (failedStage) => {
    const credential = 'c'.repeat(40)
    const gate = 'g'.repeat(40)
    const privatePayload = 'private-provider-payload@example.test'
    const failure = new Error(`${credential} ${gate} ${privatePayload}`)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const send = vi.fn()
    const verify = vi.fn(async () => {
      if (failedStage === 'transport_verification') throw failure
    })
    const mutate = vi.fn(async () => { throw failure })
    const response = await handleDispatch(
      new Request('https://example.test/dispatch', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${credential}`,
          'x-email-worker-gate': gate,
        },
        body: JSON.stringify({ business_id: 'test' }),
      }),
      {
        EMAIL_TEST: credential,
        EMAIL_WORKER_GATE_SECRET: gate,
        EMAIL_TOKEN_SIGNING_KEY: 's'.repeat(40),
        EMAIL_CONTROL_CONFIG: JSON.stringify({
          environment: 'sandbox',
          clients: [{ id: 'worker', credentialEnv: 'EMAIL_TEST', businessIds: ['test'], operations: ['dispatch'] }],
          businesses: [{
            id: 'test', brand: 'Test', legalFooter: 'Test', from: 'sender@example.test',
            transactionalStream: 'outbound', broadcastStream: 'broadcast',
            audiences: [], activated: true, retentionDays: 30, publicBaseUrl: 'https://example.test',
          }],
        }),
      },
      mutate,
      vi.fn(),
      () => ({
        capabilities: { provider: 'test', deliversToInbox: false, supportsIdempotency: false, supportsDeliveryEvents: false },
        verify,
        send,
      })
    )
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body.error.code).toBe('service_unavailable')
    expect(log).toHaveBeenCalledTimes(1)
    const logged = JSON.parse(log.mock.calls[0][0])
    expect(logged).toEqual({
      event: 'email_dispatch_failed', stage: failedStage, status: 503,
      error_code: 'service_unavailable', request_id: body.error.request_id,
    })
    const evidence = JSON.stringify([body, log.mock.calls])
    for (const privateValue of [credential, gate, privatePayload])
      expect(evidence).not.toContain(privateValue)
    expect(send).not.toHaveBeenCalled()
    expect(mutate).toHaveBeenCalledTimes(failedStage === 'claim' ? 1 : 0)
  }
)
