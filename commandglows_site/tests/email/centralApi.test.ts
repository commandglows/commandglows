import { handleCommand } from '../../src/lib/email/central/api'
import { handlePreferences } from '../../src/lib/email/central/preferences'
import {
  deriveNonce,
  resolvePreference,
  signPreference,
} from '../../src/lib/email/central/security'
import { handlePostmarkWebhook } from '../../src/lib/email/central/webhooks'
import { handleDispatch } from '../../src/lib/email/central/worker'

const credential = 'test-credential-with-at-least-32-characters'
const env = {
  EMAIL_TOKEN_SIGNING_KEY: 'test-signing-secret-at-least-32-characters',
  EMAIL_PREFERENCES_CREDENTIAL: credential,
  EMAIL_TEST_CLIENT: credential,
  EMAIL_TEST_POSTMARK: 'test-token',
  EMAIL_CONTROL_CONFIG: JSON.stringify({
    environment: 'sandbox',
    clients: [
      {
        id: 'test',
        credentialEnv: 'EMAIL_TEST_CLIENT',
        businessIds: ['communityglows'],
        operations: ['subscribe', 'webhook', 'dispatch'],
      },
    ],
    businesses: [
      {
        id: 'communityglows',
        brand: 'CommunityGlows',
        legalFooter: 'Test operator',
        from: 'sender@example.test',
        transactionalStream: 'outbound',
        broadcastStream: 'news',
        serverId: 42,
        serverTokenEnv: 'EMAIL_TEST_POSTMARK',
        publicBaseUrl: 'https://email.example.test',
        activated: true,
        retentionDays: 30,
        audiences: [
          {
            id: 'newsletter',
            purpose: 'marketing',
            sources: ['communityglows_site'],
            noticeVersions: ['test-v1'],
          },
        ],
      },
    ],
  }),
}
const input = {
  business_id: 'communityglows',
  email: 'person@example.test',
  audience_id: 'newsletter',
  purpose: 'marketing',
  source: 'communityglows_site',
  notice_version: 'test-v1',
  locale: 'fr',
  consent: true,
  occurred_at: new Date().toISOString(),
}
const request = (
  body: unknown,
  path = 'subscriptions',
  headers: Record<string, string> = {}
) =>
  new Request(`https://email.example.test/api/v1/email/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${credential}`,
      'Idempotency-Key': 'request-idempotency-1',
      ...headers,
    },
    body: JSON.stringify(body),
  })

describe('email v1 route boundary', () => {
  test('maps contract, derives stable nonces on replay, never accepts arbitrary rendering', async () => {
    const mutation = vi.fn().mockResolvedValue({ status: 'pending' })
    expect(
      (await handleCommand(request(input), 'subscribe', env, mutation)).status
    ).toBe(200)
    expect(
      (await handleCommand(request(input), 'subscribe', env, mutation)).status
    ).toBe(200)
    expect(mutation.mock.calls[0]).toEqual(mutation.mock.calls[1])
    expect(mutation.mock.calls[0][1].input).toMatchObject({
      businessId: 'communityglows',
      noticeVersion: 'test-v1',
      consent: true,
    })
    expect(
      (
        await handleCommand(
          request({ ...input, html: '<script>evil</script>' }),
          'subscribe',
          env,
          mutation
        )
      ).status
    ).toBe(400)
  })
  test('rejects missing credentials, wrong media, oversized payload before persistence', async () => {
    const mutation = vi.fn()
    expect(
      (
        await handleCommand(
          request(input, 'subscriptions', { Authorization: '' }),
          'subscribe',
          env,
          mutation
        )
      ).status
    ).toBe(401)
    expect(
      (
        await handleCommand(
          request(input, 'subscriptions', { 'Content-Type': 'text/plain' }),
          'subscribe',
          env,
          mutation
        )
      ).status
    ).toBe(415)
    expect(
      (
        await handleCommand(
          request({ ...input, email: 'a'.repeat(17_000) }),
          'subscribe',
          env,
          mutation
        )
      ).status
    ).toBe(413)
    expect(mutation).not.toHaveBeenCalled()
  })
  test('database errors are stable and do not echo the provider or PII', async () => {
    const mutation = vi
      .fn()
      .mockRejectedValue(new Error('secret person@example.test'))
    const response = await handleCommand(
      request(input),
      'subscribe',
      env,
      mutation
    )
    expect(response.status).toBe(503)
    expect(await response.text()).not.toMatch(/person@|secret/)
  })
})

describe('preferences and tokens', () => {
  const token = signPreference(
    env.EMAIL_TOKEN_SIGNING_KEY,
    'communityglows',
    deriveNonce(
      env.EMAIL_TOKEN_SIGNING_KEY,
      'communityglows',
      'test-request-1',
      'confirm'
    ),
    'confirm'
  )
  test('tampering business, nonce or action fails signature validation', () => {
    for (const changed of [
      token.replace('communityglows', 'other'),
      token.replace('.confirm.', '.unsubscribe.'),
      `${token.slice(0, -1)}!`,
    ])
      expect(() =>
        resolvePreference(env.EMAIL_TOKEN_SIGNING_KEY, changed)
      ).toThrow()
  })
  test('GET never mutates; POST uses scoped server credential and stable replay key', async () => {
    const mutation = vi.fn().mockResolvedValue({ status: 'subscribed' })
    const get = new Request(
      `https://email.example.test/api/v1/email/preferences/resolve?token=${token}&lang=fr`
    )
    const page = await handlePreferences(get, env, mutation)
    expect(page.headers.get('referrer-policy')).toBe('no-referrer')
    expect(await page.text()).toContain('Confirmer mon inscription')
    expect(mutation).not.toHaveBeenCalled()
    const response = await handlePreferences(
      request({ token, lang: 'fr' }, 'preferences/resolve'),
      env,
      mutation
    )
    expect(response.status).toBe(200)
    expect(mutation.mock.calls[0][1]).toMatchObject({
      operation: 'confirm',
      input: { businessId: 'communityglows' },
    })
  })
})

describe('Postmark webhook boundary', () => {
  const event = {
    RecordType: 'SubscriptionChange',
    Recipient: 'person@example.test',
    MessageStream: 'news',
    ServerID: 42,
    ChangedAt: '2026-09-05T00:00:00Z',
    MessageID: null,
    SuppressSending: true,
    SuppressionReason: 'ManualSuppression',
    Origin: 'Recipient',
  }
  test('auth before parse; invalid credential and wrong server never mutate', async () => {
    const mutation = vi.fn()
    expect(
      (
        await handlePostmarkWebhook(
          request(event, 'webhooks/postmark?business_id=communityglows', {
            Authorization: '',
          }),
          env,
          mutation
        )
      ).status
    ).toBe(401)
    expect(
      (
        await handlePostmarkWebhook(
          request(
            { ...event, ServerID: 99 },
            'webhooks/postmark?business_id=communityglows'
          ),
          env,
          mutation
        )
      ).status
    ).toBe(403)
    expect(mutation).not.toHaveBeenCalled()
  })
  test('nullable MessageID opt-out deduplicates semantically; reactivation grants nothing', async () => {
    const mutation = vi.fn().mockResolvedValue({ status: 'accepted' })
    for (const value of [event, event, { ...event, SuppressSending: false }])
      expect(
        (
          await handlePostmarkWebhook(
            request(value, 'webhooks/postmark?business_id=communityglows'),
            env,
            mutation
          )
        ).status
      ).toBe(200)
    expect(mutation.mock.calls[0][1].type).toBe('unsubscribe')
    expect(mutation.mock.calls[0][1].eventId).toBe(
      mutation.mock.calls[1][1].eventId
    )
    expect(mutation.mock.calls[2][1].type).toBe('reactivate')
    expect(mutation.mock.calls[2][1].eventId).not.toBe(
      mutation.mock.calls[0][1].eventId
    )
  })
})

describe('dispatch environment and consent checks', () => {
  const streamResponse = {
    MessageStreams: [
      { ID: 'outbound', ServerID: 42, MessageStreamType: 'Transactional' },
      {
        ID: 'news',
        ServerID: 42,
        MessageStreamType: 'Broadcasts',
        SubscriptionManagementConfiguration: {
          UnsubscribeHandlingType: 'Postmark',
        },
      },
    ],
  }
  test('sandbox config with a Live credential fails before claim and sends nothing', async () => {
    const mutation = vi.fn()
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ID: 42, DeliveryType: 'Live' }))
      )
    expect(
      (
        await handleDispatch(
          request({ business_id: 'communityglows' }),
          env,
          mutation,
          fetcher
        )
      ).status
    ).toBe(503)
    expect(mutation).not.toHaveBeenCalled()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  test('withdrawal after claim cancels before provider submission', async () => {
    const mutation = vi
      .fn()
      .mockResolvedValueOnce([
        {
          messageId: 'm1',
          attemptId: 'a1',
          subject: 'News',
          html: '<p>News</p>',
          text: 'News',
        },
      ])
      .mockResolvedValueOnce({ eligible: false })
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ID: 42, DeliveryType: 'Sandbox' }))
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(streamResponse)))
    const response = await handleDispatch(
      request({ business_id: 'communityglows' }),
      env,
      mutation,
      fetcher
    )
    expect(response.status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(await response.json()).toMatchObject({
      results: [{ status: 'cancelled' }],
    })
  })
})
