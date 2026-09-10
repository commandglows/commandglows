import { renderEmail } from '../../src/lib/email/central/templates'
import {
  sendPostmark,
  type TransportMessage,
} from '../../src/lib/email/central/transport'

const message: TransportMessage = {
  messageId: 'message-1',
  businessId: 'communityglows',
  to: 'recipient@example.test',
  from: 'sender@example.test',
  streamId: 'test-broadcast',
  streamClass: 'broadcast',
  subject: 'News',
  html: '<p>News</p>',
  text: 'News',
}
const options = {
  serverToken: 'test-only-token',
  environment: 'sandbox' as const,
  allowProduction: false,
}

describe('Postmark transport', () => {
  test('explicit stream, safe metadata and no tracking; checks provider ErrorCode', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ErrorCode: 0, MessageID: 'provider-1' }))
      )
    expect(await sendPostmark(message, options, fetcher)).toEqual({
      status: 'submitted',
      providerMessageId: 'provider-1',
    })
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      MessageStream: 'test-broadcast',
      TrackOpens: false,
      TrackLinks: 'None',
    })
    fetcher.mockResolvedValue(new Response(JSON.stringify({ ErrorCode: 406 })))
    expect(await sendPostmark(message, options, fetcher)).toEqual({
      status: 'permanent_failure',
      reasonCode: 'recipient_inactive',
    })
  })
  test('network/5xx/malformed receipts remain uncertain, never retryable', async () => {
    for (const fetcher of [
      vi.fn().mockRejectedValue(new Error('sensitive data')),
      vi.fn().mockResolvedValue(new Response('', { status: 502 })),
      vi.fn().mockResolvedValue(new Response('{}')),
    ]) {
      expect((await sendPostmark(message, options, fetcher)).status).toBe(
        'unknown'
      )
    }
  })
  test('429 may be retried; production disabled without explicit worker gate', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response('', { status: 429, headers: { 'retry-after': '3' } })
      )
    expect(await sendPostmark(message, options, fetcher)).toMatchObject({
      status: 'retryable_failure',
      retryAfterMs: 3000,
    })
    fetcher.mockClear()
    expect(
      (
        await sendPostmark(
          message,
          { ...options, environment: 'production' },
          fetcher
        )
      ).status
    ).toBe('permanent_failure')
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('email templates', () => {
  test.each(['fr', 'en'] as const)(
    'confirmation %s remains entirely transactional and text-equivalent',
    (locale) => {
      const rendered = renderEmail({
        templateKey: 'subscription_confirmation',
        locale,
        brand: 'CommunityGlows',
        legalFooter: 'Example operator',
        actionUrl: 'https://example.test/confirm?t=opaque',
      })
      expect(rendered.html).toContain(`lang="${locale}"`)
      expect(rendered.html).toContain('dir="ltr"')
      expect(rendered.text).toContain('https://example.test/confirm?t=opaque')
      expect(rendered.html).not.toMatch(/<img|<script|tracking/i)
    }
  )
  test('escapes content; requires newsletter opt-out and rejects unsafe links', () => {
    const content = {
      templateKey: 'newsletter' as const,
      locale: 'fr' as const,
      brand: 'CommunityGlows',
      legalFooter: 'Example operator',
      subject: 'Nouvelles',
      paragraphs: ['<script>alert(1)</script>'],
      unsubscribeUrl: '{{{ pm:unsubscribe }}}',
    }
    const rendered = renderEmail(content)
    expect(rendered.html).toContain('&lt;script&gt;')
    expect(rendered.text).toContain('{{{ pm:unsubscribe }}}')
    expect(() =>
      renderEmail({ ...content, unsubscribeUrl: undefined })
    ).toThrow('unsubscribe_required')
    expect(() =>
      renderEmail({
        ...content,
        actionUrl: 'javascript:alert(1)',
        actionLabel: 'Voir',
      })
    ).toThrow()
  })
})
