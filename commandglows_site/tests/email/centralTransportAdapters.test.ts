import { createPostmarkTransport } from '../../src/lib/email/central/transports/postmark'
import { createCaptureTransport } from '../../src/lib/email/central/transports/capture'
import {
  EMAIL_UNSUBSCRIBE_PLACEHOLDER,
  type TransportMessage,
} from '../../src/lib/email/central/transport'

const options = {
  serverToken: 'mock-token',
  environment: 'sandbox' as const,
  allowProduction: false,
  serverId: 123,
  transactionalStream: 'transactional',
  broadcastStream: 'broadcast',
}
const server = { ID: 123, DeliveryType: 'Sandbox' }
const streams = {
  MessageStreams: [
    { ID: 'transactional', MessageStreamType: 'Transactional', ServerID: 123 },
    {
      ID: 'broadcast',
      MessageStreamType: 'Broadcasts',
      ServerID: 123,
      SubscriptionManagementConfiguration: {
        UnsubscribeHandlingType: 'Postmark',
      },
    },
  ],
}
const message: TransportMessage = {
  messageId: 'message-1',
  businessId: 'business',
  to: 'reader@example.test',
  from: 'sender@example.test',
  streamId: 'broadcast',
  streamClass: 'broadcast',
  subject: 'News',
  html: `<a href="${EMAIL_UNSUBSCRIBE_PLACEHOLDER}">Unsubscribe</a>`,
  text: `Unsubscribe: ${EMAIL_UNSUBSCRIBE_PLACEHOLDER}`,
}
const reply = (body: unknown) => new Response(JSON.stringify(body))

describe('email provider adapters', () => {
  test('Postmark verifies the mapped server and streams before use', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(reply(server))
      .mockResolvedValueOnce(reply(streams))
    await createPostmarkTransport(options, fetcher).verify()
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      'https://api.postmarkapp.com/server',
      'https://api.postmarkapp.com/message-streams',
    ])
  })
  test('rejects wrong server, live environment, archived stream and external unsubscribe handling', async () => {
    for (const [actualServer, actualStreams] of [
      [{ ...server, ID: 124 }, streams],
      [{ ...server, DeliveryType: 'Live' }, streams],
      [
        server,
        {
          MessageStreams: [
            streams.MessageStreams[0],
            { ...streams.MessageStreams[1], ArchivedAt: '2026-01-01' },
          ],
        },
      ],
      [
        server,
        {
          MessageStreams: [
            streams.MessageStreams[0],
            {
              ...streams.MessageStreams[1],
              SubscriptionManagementConfiguration: {
                UnsubscribeHandlingType: 'Custom',
              },
            },
          ],
        },
      ],
    ]) {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(reply(actualServer))
        .mockResolvedValueOnce(reply(actualStreams))
      await expect(
        createPostmarkTransport(options, fetcher).verify()
      ).rejects.toThrow()
      expect(fetcher.mock.calls.every((call) => !call[1].method)).toBe(true)
    }
  })
  test('Postmark maps neutral unsubscribe placeholders without mutating the message', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(reply({ ErrorCode: 0, MessageID: 'provider-1' }))
    await createPostmarkTransport(options, fetcher).send(message)
    const payload = JSON.parse(fetcher.mock.calls[0][1].body)
    expect(payload.HtmlBody).toContain('{{{ pm:unsubscribe }}}')
    expect(payload.TextBody).toContain('{{{ pm:unsubscribe }}}')
    expect(payload.HtmlBody).not.toContain(EMAIL_UNSUBSCRIBE_PLACEHOLDER)
    expect(message.html).toContain(EMAIL_UNSUBSCRIBE_PLACEHOLDER)
  })
  test('capture uses the same port and keeps the neutral message', async () => {
    const captured = vi.fn()
    const transport = createCaptureTransport(captured)
    await transport.verify()
    expect(await transport.send(message)).toMatchObject({
      status: 'submitted',
      reasonCode: 'captured_locally',
    })
    expect(captured).toHaveBeenCalledWith(message)
    expect(captured.mock.calls[0][0]).not.toBe(message)
    expect(transport.capabilities.deliversToInbox).toBe(false)
  })
})

test.each([true, false])(
  'worker orchestrates an arbitrary provider with eligibility=%s',
  async (eligible) => {
    const { handleDispatch } =
      await import('../../src/lib/email/central/worker')
    const { deliveryRoute } = await import('../../convex/emailConfig')
    const calls: string[] = []
    const config = {
      environment: 'sandbox' as const,
      clients: [
        {
          id: 'worker',
          credentialEnv: 'EMAIL_TEST',
          businessIds: ['business'],
          operations: ['dispatch'],
        },
      ],
      businesses: [
        {
          id: 'business',
          brand: 'Test',
          legalFooter: 'Test',
          from: message.from,
          transactionalStream: 'transactional',
          broadcastStream: 'broadcast',
          audiences: [],
          activated: true,
          retentionDays: 30,
          publicBaseUrl: 'https://example.test',
        },
      ],
    }
    const job = {
      ...message,
      attemptId: 'attempt-1',
      route: deliveryRoute(config, config.businesses[0]),
    }
    const mutation = vi.fn(async (name: string) => {
      calls.push(name)
      if (name === 'email:claim') return [job]
      if (name === 'email:recheckDispatch') return { eligible }
      return null
    })
    const send = vi.fn(async () => {
      calls.push('send')
      return {
        status: 'unknown' as const,
        reasonCode: 'submission_unconfirmed',
      }
    })
    const factory = vi.fn(() => ({
      capabilities: {
        provider: 'another-provider',
        deliversToInbox: false,
        supportsIdempotency: false,
        supportsDeliveryEvents: false,
      },
      verify: async () => {
        calls.push('verify')
      },
      send,
    }))
    const fetcher = vi.fn()
    const credential = 'c'.repeat(40)
    const gate = 'g'.repeat(40)
    const response = await handleDispatch(
      new Request('https://example.test/dispatch', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${credential}`,
          'x-email-worker-gate': gate,
        },
        body: JSON.stringify({ business_id: 'business' }),
      }),
      {
        EMAIL_CONTROL_CONFIG: JSON.stringify(config),
        EMAIL_TEST: credential,
        EMAIL_WORKER_GATE_SECRET: gate,
        EMAIL_TOKEN_SIGNING_KEY: 's'.repeat(40),
      },
      mutation,
      fetcher,
      factory
    )
    expect(response.status).toBe(200)
    expect(calls).toEqual(
      eligible
        ? [
            'verify',
            'email:claim',
            'email:recheckDispatch',
            'send',
            'email:settle',
          ]
        : ['verify', 'email:claim', 'email:recheckDispatch']
    )
    expect(fetcher).not.toHaveBeenCalled()
    if (eligible) {
      expect(send).toHaveBeenCalledWith(job)
      expect(mutation).toHaveBeenLastCalledWith(
        'email:settle',
        expect.objectContaining({
          outcome: 'unknown',
          errorCode: 'submission_unconfirmed',
        })
      )
    } else expect(send).not.toHaveBeenCalled()
  }
)
