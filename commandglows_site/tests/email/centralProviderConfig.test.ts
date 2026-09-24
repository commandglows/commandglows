import {
  canonical,
  deliveryRoute,
  dispatchAllowed,
  parseEmailConfig,
  requiresLiveTest,
} from '../../convex/emailConfig'
import { createConfiguredTransport } from '../../src/lib/email/central/transports/configured'
import { handlePostmarkWebhook } from '../../src/lib/email/central/webhooks'

const credential = 'synthetic-credential-'.repeat(3)
const business = {
  id: 'test',
  brand: 'Test',
  legalFooter: 'Test footer',
  from: 'sender@example.test',
  publicBaseUrl: 'https://example.test',
  audiences: [],
  activated: true,
  retentionDays: 30,
  allowedRecipients: ['reader@example.test'],
}
const delivery = {
  provider: 'postmark',
  mode: 'sandbox',
  channels: { transactional: 'service', broadcast: 'news' },
  options: { serverId: 123, serverTokenEnv: 'EMAIL_PROVIDER' },
}
const profile = (entry: Record<string, unknown>) => ({
  environment: 'sandbox',
  clients: [
    {
      id: 'webhook',
      credentialEnv: 'EMAIL_WEBHOOK',
      businessIds: ['test'],
      operations: ['webhook'],
    },
  ],
  businesses: [entry],
})
const parse = (entry: Record<string, unknown>) =>
  parseEmailConfig(JSON.stringify(profile(entry)))

test('normalizes old Postmark options and preserves the persisted route in the new format', () => {
  const old = parse({
    ...business,
    transport: 'postmark',
    providerMode: 'Sandbox',
    serverId: 123,
    serverTokenEnv: 'EMAIL_PROVIDER',
    transactionalStream: 'service',
    broadcastStream: 'news',
  })
  const current = parse({ ...business, delivery })
  expect(old.businesses[0]).toEqual(current.businesses[0])
  expect(old.businesses[0]).not.toHaveProperty('serverId')
  const expected = canonical({
    environment: 'sandbox',
    transport: 'postmark',
    providerMode: 'Sandbox',
    serverId: 123,
    serverTokenEnv: 'EMAIL_PROVIDER',
    from: business.from,
    transactionalStream: 'service',
    broadcastStream: 'news',
    liveTest: null,
  })
  expect(deliveryRoute(old, old.businesses[0])).toBe(expected)
  expect(deliveryRoute(current, current.businesses[0])).toBe(expected)
})

test.each([
  { ...delivery, provider: 'unknown' },
  { ...delivery, provider: '__proto__' },
  { ...delivery, mode: 'capture' },
  { ...delivery, options: { serverId: -1 } },
  { ...delivery, options: { serverTokenEnv: 'a-secret-value' } },
  { ...delivery, options: { token: 'not-allowed' } },
])('rejects unsupported provider configuration %#', (invalid) => {
  expect(() => parse({ ...business, delivery: invalid })).toThrow()
})

test('rejects mixed input and duplicate provider resources across businesses', () => {
  expect(() => parse({ ...business, delivery, serverId: 123 })).toThrow()
  const config = profile({ ...business, delivery })
  config.businesses.push({ ...business, id: 'other', delivery })
  expect(() => parseEmailConfig(JSON.stringify(config))).toThrow()
})

test('nested Live delivery requires the same bounded operator authorization', () => {
  const config = parse({ ...business, delivery: { ...delivery, mode: 'live' } })
  const entry = config.businesses[0]
  expect(requiresLiveTest(config, entry)).toBe(true)
  expect(
    dispatchAllowed(config, entry, 'reader@example.test', 'operator', 100)
  ).toBe(false)
  entry.liveTest = {
    id: 'approved',
    expiresAt: 200,
    maxAttempts: 1,
    recipients: ['reader@example.test'],
  }
  expect(
    dispatchAllowed(config, entry, 'reader@example.test', 'operator', 100)
  ).toBe(true)
  expect(
    dispatchAllowed(config, entry, 'reader@example.test', 'confirmation', 100)
  ).toBe(false)
  expect(
    dispatchAllowed(config, entry, 'reader@example.test', 'operator', 200)
  ).toBe(false)
})

test('nested Postmark configuration selects and verifies the adapter then submits a mocked message', async () => {
  const config = parse({ ...business, delivery })
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ ID: 123, DeliveryType: 'Sandbox' }))
    .mockResolvedValueOnce(
      Response.json({
        MessageStreams: [
          { ID: 'service', ServerID: 123, MessageStreamType: 'Transactional' },
          {
            ID: 'news',
            ServerID: 123,
            MessageStreamType: 'Broadcasts',
            SubscriptionManagementConfiguration: {
              UnsubscribeHandlingType: 'Postmark',
            },
          },
        ],
      })
    )
    .mockResolvedValueOnce(
      Response.json({ ErrorCode: 0, MessageID: 'mock-receipt' })
    )
  const transport = createConfiguredTransport({
    config,
    business: config.businesses[0],
    env: { EMAIL_PROVIDER: credential },
    allowProduction: false,
    liveTestReserved: false,
    fetcher,
  })
  await transport.verify()
  const outcome = await transport.send({
    messageId: 'message',
    businessId: 'test',
    from: business.from,
    to: 'reader@example.test',
    streamId: 'news',
    streamClass: 'broadcast',
    subject: 'Test',
    html: '<a href="{{{ email:unsubscribe }}}">Stop</a>',
    text: '{{{ email:unsubscribe }}}',
  })
  expect(outcome).toMatchObject({
    status: 'submitted',
    providerMessageId: 'mock-receipt',
  })
  expect(fetcher).toHaveBeenCalledTimes(3)
  expect(JSON.parse(fetcher.mock.calls[2][1].body)).toMatchObject({
    MessageStream: 'news',
    TextBody: '{{{ pm:unsubscribe }}}',
  })
})

test('capture does not contact a provider and cannot receive a Postmark webhook', async () => {
  const entry = {
    ...business,
    delivery: {
      provider: 'capture',
      mode: 'capture',
      channels: delivery.channels,
      options: {},
    },
  }
  const config = parse(entry)
  const fetcher = vi.fn(() => {
    throw new Error('unexpected network')
  })
  const transport = createConfiguredTransport({
    config,
    business: config.businesses[0],
    env: {},
    allowProduction: false,
    liveTestReserved: false,
    fetcher,
  })
  expect(requiresLiveTest(config, config.businesses[0])).toBe(false)
  await transport.verify()
  expect(
    (
      await transport.send({
        messageId: 'message',
        businessId: 'test',
        from: business.from,
        to: 'reader@example.test',
        streamId: 'news',
        streamClass: 'broadcast',
        subject: 'Test',
        html: 'Test',
        text: 'Test',
      })
    ).status
  ).toBe('submitted')
  expect(fetcher).not.toHaveBeenCalled()
  const mutation = vi.fn()
  const response = await handlePostmarkWebhook(
    new Request('https://example.test/webhook?business_id=test', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credential}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        RecordType: 'Delivery',
        MessageStream: 'news',
        Recipient: 'reader@example.test',
      }),
    }),
    {
      EMAIL_CONTROL_CONFIG: JSON.stringify(profile(entry)),
      EMAIL_WEBHOOK: credential,
    },
    mutation
  )
  expect(response.status).toBe(422)
  expect(mutation).not.toHaveBeenCalled()
})
