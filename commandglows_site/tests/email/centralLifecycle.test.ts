import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'
import { handleCommand } from '../../src/lib/email/central/api'
import { handleDispatch } from '../../src/lib/email/central/worker'
import { handlePreferences } from '../../src/lib/email/central/preferences'
import { handlePostmarkWebhook } from '../../src/lib/email/central/webhooks'
import {
  deriveNonce,
  signPreference,
} from '../../src/lib/email/central/security'

const modules = import.meta.glob('../../convex/**/*.ts')

test('scheduled poll is disabled without configuration and reports safe worker failures', async () => {
  const t = convexTest(schema, modules)
  const fetcher = vi.spyOn(globalThis, 'fetch')
  try {
    vi.stubEnv('EMAIL_CONTROL_CONFIG', '')
    expect(
      await t.action(makeFunctionReference<'action'>('emailDelivery:poll'), {})
    ).toMatchObject({ status: 'disabled' })
    expect(fetcher).not.toHaveBeenCalled()
    vi.stubEnv(
      'EMAIL_CONTROL_CONFIG',
      JSON.stringify({
        environment: 'sandbox',
        clients: [],
        businesses: [
          {
            id: 'communityglows',
            brand: 'CommunityGlows',
            legalFooter: 'Test operator',
            from: 'sender@example.test',
            transactionalStream: 'outbound',
            broadcastStream: 'news',
            publicBaseUrl: 'https://email.example.test',
            audiences: [],
            activated: true,
            retentionDays: 30,
          },
        ],
      })
    )
    vi.stubEnv(
      'EMAIL_DISPATCH_CREDENTIAL',
      'test-credential-at-least-32-characters'
    )
    fetcher.mockResolvedValueOnce(
      new Response('private provider details', { status: 503 })
    )
    await expect(
      t.action(makeFunctionReference<'action'>('emailDelivery:poll'), {})
    ).rejects.toThrow('email_worker_unavailable')
    expect(fetcher).toHaveBeenCalledTimes(1)
  } finally {
    fetcher.mockRestore()
    vi.unstubAllEnvs()
  }
})

test('persisted signup → confirmation delivery → confirm → reviewed newsletter → opt-out → no further dispatch', async () => {
  const credential = 'test-lifecycle-credential-at-least-32-chars'
  const env = {
    EMAIL_TOKEN_SIGNING_KEY: 'test-signature-secret-at-least-32-chars',
    EMAIL_TEST_CLIENT: credential,
    EMAIL_PREFERENCES_CREDENTIAL: credential,
    EMAIL_TEST_POSTMARK: 'never-real-provider-token',
    EMAIL_CONTROL_CONFIG: JSON.stringify({
      environment: 'sandbox',
      clients: [
        {
          id: 'test',
          credentialEnv: 'EMAIL_TEST_CLIENT',
          businessIds: ['communityglows'],
          operations: [
            'subscribe',
            'confirm',
            'unsubscribe',
            'broadcast_preview',
            'broadcast_approve',
            'dispatch',
            'webhook',
          ],
        },
      ],
      businesses: [
        {
          id: 'communityglows',
          brand: 'CommunityGlows',
          legalFooter: 'Synthetic operator',
          from: 'sender@example.test',
          transactionalStream: 'outbound',
          broadcastStream: 'news',
          serverId: 42,
          serverTokenEnv: 'EMAIL_TEST_POSTMARK',
          publicBaseUrl: 'https://email.example.test',
          activated: true,
          retentionDays: 30,
          allowedRecipients: ['person@example.test'],
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
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  const t = convexTest(schema, modules)
  const mutate = (name: string, args: Record<string, unknown>) =>
    t.mutation(makeFunctionReference<'mutation'>(name), args)
  const request = (body: unknown, path: string, key: string) =>
    new Request(`https://email.example.test/api/v1/email/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credential}`,
        'Idempotency-Key': key,
      },
      body: JSON.stringify(body),
    })
  const sends: Record<string, unknown>[] = []
  const provider = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith('/server'))
        return Response.json({ ID: 42, DeliveryType: 'Sandbox' })
      if (String(url).endsWith('/message-streams'))
        return Response.json({
          MessageStreams: [
            {
              ID: 'outbound',
              ServerID: 42,
              MessageStreamType: 'Transactional',
            },
            {
              ID: 'news',
              ServerID: 42,
              MessageStreamType: 'Broadcasts',
              SubscriptionManagementConfiguration: {
                UnsubscribeHandlingType: 'Postmark',
              },
            },
          ],
        })
      sends.push(JSON.parse(String(init?.body)))
      return Response.json({
        ErrorCode: 0,
        MessageID: `provider-${sends.length}`,
      })
    }
  ) as typeof fetch
  try {
    const signupKey = 'lifecycle-signup-0001'
    const signup = {
      business_id: 'communityglows',
      email: 'person@example.test',
      audience_id: 'newsletter',
      purpose: 'marketing',
      source: 'communityglows_site',
      notice_version: 'test-v1',
      locale: 'fr',
      consent: true,
      occurred_at: new Date().toISOString(),
      abuse_key: 'a'.repeat(64),
    }
    const accepted = await handleCommand(
      request(signup, 'subscriptions', signupKey),
      'subscribe',
      env,
      mutate
    )
    expect(accepted.status).toBe(200)
    expect(await accepted.json()).toMatchObject({ status: 'pending' })
    expect(
      (
        await handleCommand(
          request(signup, 'subscriptions', signupKey),
          'subscribe',
          env,
          mutate
        )
      ).status
    ).toBe(200)
    expect(
      (
        await handleDispatch(
          request(
            { business_id: 'communityglows' },
            'dispatch',
            'dispatch-confirm-1'
          ),
          env,
          mutate,
          provider
        )
      ).status
    ).toBe(200)
    expect(sends).toHaveLength(1)
    expect(sends[0].MessageStream).toBe('outbound')
    const html = String(sends[0].HtmlBody)
    const confirmationUrl = /href="([^"]+)"/
      .exec(html)![1]
      .replaceAll('&amp;', '&')
    const confirmToken = new URL(confirmationUrl).searchParams.get('token')
    expect(
      (await handlePreferences(new Request(confirmationUrl), env, mutate))
        .status
    ).toBe(200)
    const confirmed = await handlePreferences(
      request(
        { token: confirmToken, lang: 'fr' },
        'preferences/resolve',
        'confirm-request-1'
      ),
      env,
      mutate
    )
    expect(confirmed.status).toBe(200)
    expect(await confirmed.json()).toMatchObject({ status: 'subscribed' })
    const content = {
      business_id: 'communityglows',
      email: 'person@example.test',
      audience_id: 'newsletter',
      purpose: 'marketing',
      locale: 'fr',
      subject: 'Nouvelles CommunityGlows',
      paragraphs: ['Un exemple de newsletter en attente de validation.'],
    }
    const preview = await handleCommand(
      request(content, 'broadcasts', 'broadcast-preview-1'),
      'broadcast_preview',
      env,
      mutate
    )
    expect(preview.status).toBe(200)
    const draft = await preview.json()
    expect(draft.rendered.text).toContain('Un exemple')
    await handleDispatch(
      request(
        { business_id: 'communityglows' },
        'dispatch',
        'dispatch-draft-1'
      ),
      env,
      mutate,
      provider
    )
    expect(sends).toHaveLength(1)
    expect(
      (
        await handleCommand(
          request(
            { business_id: 'communityglows', draft_id: draft.draft_id },
            'broadcasts/approve',
            'broadcast-approve-1'
          ),
          'broadcast_approve',
          env,
          mutate
        )
      ).status
    ).toBe(200)
    await handleDispatch(
      request({ business_id: 'communityglows' }, 'dispatch', 'dispatch-news-1'),
      env,
      mutate,
      provider
    )
    expect(sends).toHaveLength(2)
    expect(sends[1].MessageStream).toBe('news')
    expect(String(sends[1].TextBody)).toContain('{{{ pm:unsubscribe }}}')
    const unsubscribe = signPreference(
      env.EMAIL_TOKEN_SIGNING_KEY,
      'communityglows',
      deriveNonce(
        env.EMAIL_TOKEN_SIGNING_KEY,
        'communityglows',
        `test:${signupKey}`,
        'unsubscribe'
      ),
      'unsubscribe'
    )
    expect(
      (
        await handlePreferences(
          request(
            { token: unsubscribe },
            'preferences/resolve',
            'withdraw-request-1'
          ),
          env,
          mutate
        )
      ).status
    ).toBe(200)
    const event = {
      RecordType: 'SubscriptionChange',
      Recipient: 'person@example.test',
      MessageStream: 'news',
      ServerID: 42,
      ChangedAt: new Date().toISOString(),
      MessageID: null,
      SuppressSending: true,
      SuppressionReason: 'ManualSuppression',
      Origin: 'Recipient',
    }
    expect(
      (
        await handlePostmarkWebhook(
          request(
            event,
            'webhooks/postmark?business_id=communityglows',
            'webhook-00000001'
          ),
          env,
          mutate
        )
      ).status
    ).toBe(200)
    const after = await handleCommand(
      request(content, 'broadcasts', 'broadcast-preview-2'),
      'broadcast_preview',
      env,
      mutate
    )
    const next = await after.json()
    await handleCommand(
      request(
        { business_id: 'communityglows', draft_id: next.draft_id },
        'broadcasts/approve',
        'broadcast-approve-2'
      ),
      'broadcast_approve',
      env,
      mutate
    )
    await handleDispatch(
      request({ business_id: 'communityglows' }, 'dispatch', 'dispatch-news-2'),
      env,
      mutate,
      provider
    )
    expect(sends).toHaveLength(2)
  } finally {
    vi.unstubAllEnvs()
  }
})
