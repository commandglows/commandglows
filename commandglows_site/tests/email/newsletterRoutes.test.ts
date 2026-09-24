import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'
import { nonceDigest } from '../../convex/email'
import { handleNewsletterSubscribeRequest } from '../../src/lib/email/central/newsletterRoutes'
import { handlePreferences } from '../../src/lib/email/central/preferences'
import { signPreference } from '../../src/lib/email/central/security'
const credential = 'test-newsletter-client-secret-with-32-chars'
const workerEnv = {
  EMAIL_CONTROL_CONFIG: JSON.stringify({
    environment: 'sandbox',
    clients: [
      {
        id: 'commandglows-site',
        credentialEnv: 'EMAIL_TEST_NEWSLETTER',
        businessIds: ['commandglows'],
        operations: ['subscribe', 'confirm', 'unsubscribe'],
      },
    ],
    businesses: [
      {
        id: 'commandglows',
        brand: 'CommandGlows',
        legalFooter: 'Test notice',
        from: 'newsletter@example.test',
        transactionalStream: 'outbound',
        broadcastStream: 'newsletter',
        audiences: [
          {
            id: 'marketing',
            purpose: 'marketing',
            sources: ['footer', 'lead-magnet', 'windows-mastery'],
            noticeVersions: ['consent-v1'],
          },
        ],
      },
    ],
  }),
  EMAIL_TEST_NEWSLETTER: credential,
  EMAIL_PREFERENCES_CREDENTIAL: credential,
  EMAIL_NEWSLETTER_BUSINESS_ID: 'commandglows',
  EMAIL_NEWSLETTER_AUDIENCE_ID: 'marketing',
  EMAIL_NEWSLETTER_PURPOSE: 'marketing',
  EMAIL_NEWSLETTER_NOTICE_VERSION: 'consent-v1',
  EMAIL_TOKEN_SIGNING_KEY: 'test-token-signing-key-with-32-chars',
}

const modules = import.meta.glob('../../convex/**/*.ts')
const subscribeRequest = (overrides: Record<string, unknown> = {}) =>
  new Request('https://site.example/api/newsletter/subscribe', {
    method: 'POST',
    headers: {
      Origin: 'https://site.example',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'reader@example.test',
      source: 'footer',
      lang: 'fr',
      consent: true,
      ...overrides,
    }),
  })
const preferenceRequest = (token: string, method = 'POST') =>
  new Request(
    `https://site.example/api/newsletter/unsubscribe${method === 'GET' ? `?token=${encodeURIComponent(token)}` : ''}`,
    {
      method,
      ...(method === 'POST'
        ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, lang: 'fr' }),
          }
        : {}),
    }
  )

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Unexpected network access')
    })
  )
})
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('provider-independent newsletter routes', () => {
  test('records explicit consent and requests central double opt-in', async () => {
    const mutate = vi.fn().mockResolvedValue({ status: 'pending' })
    const response = await handleNewsletterSubscribeRequest(
      subscribeRequest(),
      workerEnv,
      mutate
    )
    expect(response.status).toBe(200)
    expect(mutate).toHaveBeenCalledOnce()
    expect(mutate.mock.calls[0]).toEqual([
      'email:command',
      expect.objectContaining({
        operation: 'subscribe',
        input: expect.objectContaining({
          businessId: 'commandglows',
          audienceId: 'marketing',
          purpose: 'marketing',
          source: 'footer',
          noticeVersion: 'consent-v1',
          locale: 'fr',
          consent: true,
        }),
      }),
    ])
  })

  test.each([
    { consent: false },
    { consent: undefined },
    { source: 'unknown' },
  ])('rejects invalid consent/source %j without mutation', async (body) => {
    const mutate = vi.fn()
    expect(
      (
        await handleNewsletterSubscribeRequest(
          subscribeRequest(body),
          workerEnv,
          mutate
        )
      ).status
    ).toBe(400)
    expect(mutate).not.toHaveBeenCalled()
  })

  test('rejects malformed JSON and foreign origins before accessing the registry', async () => {
    const mutate = vi.fn()
    const malformed = new Request(subscribeRequest().url, {
      method: 'POST',
      headers: subscribeRequest().headers,
      body: '{',
    })
    expect(
      (await handleNewsletterSubscribeRequest(malformed, workerEnv, mutate))
        .status
    ).toBe(400)
    const foreign = subscribeRequest()
    foreign.headers.set('Origin', 'https://attacker.example')
    expect(
      (await handleNewsletterSubscribeRequest(foreign, workerEnv, mutate))
        .status
    ).toBe(403)
    expect(mutate).not.toHaveBeenCalled()
  })

  test.each([
    {},
    { ...workerEnv, EMAIL_NEWSLETTER_AUDIENCE_ID: 'unconfigured' },
  ])('fails closed when mapping is unavailable', async (env) => {
    const mutate = vi.fn()
    expect(
      (await handleNewsletterSubscribeRequest(subscribeRequest(), env, mutate))
        .status
    ).toBe(503)
    expect(mutate).not.toHaveBeenCalled()
  })

  test('refuses public email-only GET and POST without mutation', async () => {
    const mutate = vi.fn()
    const get = new Request(
      'https://site.example/api/newsletter/unsubscribe?email=reader%40example.test'
    )
    expect((await handlePreferences(get, workerEnv, mutate)).status).toBe(400)
    const post = new Request(get.url, {
      method: 'POST',
      headers: {
        Origin: 'https://site.example',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'email=reader%40example.test&lang=fr',
    })
    expect((await handlePreferences(post, workerEnv, mutate)).status).toBe(400)
    expect(mutate).not.toHaveBeenCalled()
  })

  test.each(['confirm', 'unsubscribe'] as const)(
    'signed %s GET is inert and POST invokes the intended operation',
    async (action) => {
      const token = signPreference(
        workerEnv.EMAIL_TOKEN_SIGNING_KEY,
        'commandglows',
        'a'.repeat(64),
        action
      )
      const mutate = vi
        .fn()
        .mockResolvedValue({
          status: action === 'confirm' ? 'subscribed' : 'withdrawn',
        })
      expect(
        (
          await handlePreferences(
            preferenceRequest(token, 'GET'),
            workerEnv,
            mutate
          )
        ).status
      ).toBe(200)
      expect(mutate).not.toHaveBeenCalled()
      expect(
        (await handlePreferences(preferenceRequest(token), workerEnv, mutate))
          .status
      ).toBe(200)
      expect(mutate).toHaveBeenCalledOnce()
      expect(mutate.mock.calls[0][1]).toMatchObject({
        operation: action,
        input: { businessId: 'commandglows' },
      })
    }
  )

  test('registry errors do not expose backend details', async () => {
    const mutate = vi
      .fn()
      .mockRejectedValue(new Error('private backend credential detail'))
    const response = await handleNewsletterSubscribeRequest(
      subscribeRequest(),
      workerEnv,
      mutate
    )
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain(
      'private backend credential detail'
    )
    const token = signPreference(
      workerEnv.EMAIL_TOKEN_SIGNING_KEY,
      'commandglows',
      'b'.repeat(64),
      'unsubscribe'
    )
    const withdrawal = await handlePreferences(
      preferenceRequest(token),
      workerEnv,
      mutate
    )
    expect(withdrawal.status).toBe(503)
    expect(await withdrawal.text()).not.toContain(
      'private backend credential detail'
    )
  })

  test('persists signup, confirmation and withdrawal without provider delivery or reactivation on replay', async () => {
    for (const [key, value] of Object.entries(workerEnv)) vi.stubEnv(key, value)
    vi.stubEnv(
      'EMAIL_SUPPRESSION_HASH_KEY',
      'synthetic-suppression-key-at-least-32-characters'
    )
    const t = convexTest(schema, modules)
    const mutate = (name: string, args: Record<string, unknown>) =>
      t.mutation(makeFunctionReference<'mutation'>(name), args)
    const response = await handleNewsletterSubscribeRequest(
      subscribeRequest(),
      workerEnv,
      mutate
    )
    expect(response.status).toBe(200)
    const pending = await t.run((ctx) =>
      ctx.db.query('emailMemberships').first()
    )
    expect(pending?.state).toBe('pending')
    const message = await t.run((ctx) => ctx.db.query('emailMessages').first())
    expect(message?.state).toBe('queued')
    const content = message!.rendered as {
      confirmationNonce: string
      unsubscribeNonce: string
    }
    const confirm = signPreference(
      workerEnv.EMAIL_TOKEN_SIGNING_KEY,
      'commandglows',
      content.confirmationNonce,
      'confirm'
    )
    expect(
      (await handlePreferences(preferenceRequest(confirm), workerEnv, mutate))
        .status
    ).toBe(200)
    expect(
      (await t.run((ctx) => ctx.db.query('emailMemberships').first()))?.state
    ).toBe('subscribed')
    const unsubscribe = signPreference(
      workerEnv.EMAIL_TOKEN_SIGNING_KEY,
      'commandglows',
      content.unsubscribeNonce,
      'unsubscribe'
    )
    expect(
      (
        await handlePreferences(
          preferenceRequest(unsubscribe),
          workerEnv,
          mutate
        )
      ).status
    ).toBe(200)
    const withdrawn = await t.run((ctx) =>
      ctx.db.query('emailMemberships').first()
    )
    expect(withdrawn?.state).toBe('withdrawn')
    expect(withdrawn?.generation).toBe(pending!.generation + 1)
    // HTTP retries may return an idempotent receipt, but must never grant consent again.
    await handlePreferences(preferenceRequest(confirm), workerEnv, mutate)
    expect(
      (await t.run((ctx) => ctx.db.query('emailMemberships').first()))?.state
    ).toBe('withdrawn')
    await expect(
      mutate('email:command', {
        credential,
        operation: 'confirm',
        idempotencyKey: 'fresh-confirm-after-withdrawal',
        input: {
          businessId: 'commandglows',
          tokenDigest: await nonceDigest(content.confirmationNonce),
        },
      })
    ).rejects.toThrow('invalid_token')
    const consents = await t.run((ctx) =>
      ctx.db.query('emailConsents').collect()
    )
    expect(consents.map((entry) => entry.action)).toEqual([
      'requested',
      'granted',
      'withdrawn',
    ])
    expect(
      await t.run((ctx) => ctx.db.query('emailAttempts').collect())
    ).toEqual([])
  })
})
