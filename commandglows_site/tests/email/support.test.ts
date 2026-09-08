import { describe, it, expect } from 'vitest'
import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'
import { handleSupportApi } from '../../src/lib/email/support/api'
import {
  seal,
  unseal,
  threadWire,
  replyMime,
  provider,
} from '../../src/lib/email/support/gmail'

const key = Buffer.alloc(32, 7).toString('base64')
const env = {
  SUITE_BRIDGE_CONVEX_SECRET: 'bridge',
  EMAIL_OPERATOR_CREDENTIAL: 'operator'.repeat(6),
  EMAIL_GMAIL_CLIENT_ID: 'client',
  EMAIL_GMAIL_CLIENT_SECRET: 'secret',
  EMAIL_SUPPORT_TOKEN_KEY: key,
  EMAIL_GMAIL_REDIRECT_URI:
    'https://app.test/api/admin/email/support/oauth/callback',
  EMAIL_SUPPORT_MAILBOXES: JSON.stringify([
    {
      id: 'own',
      email: 'owner@gmail.com',
      actorId: 'admin',
      relayDomains: ['relay.example.com'],
    },
  ]),
  EMAIL_SUPPORT_REPLY_ENABLED: 'true',
}
const raw = (reply = 'opaque@relay.example.com') => ({
  id: 'thread1',
  messages: [
    {
      id: 'message1',
      internalDate: '1000',
      payload: {
        mimeType: 'text/plain',
        body: { data: Buffer.from('Bonjour').toString('base64url') },
        headers: [
          { name: 'From', value: 'client@example.com' },
          { name: 'Reply-To', value: reply },
          { name: 'Message-ID', value: '<original@example.com>' },
          { name: 'Subject', value: 'Une question' },
        ],
      },
    },
  ],
})
function harness() {
  const records = new Map<string, any>()
  let sends = 0
  const deps = {
    authority: async () => ({ actorId: 'admin' }),
    read: async (_: string, a: any) =>
      records.get(`${a.mailboxId}:${a.kind}:${a.key}`) ?? null,
    command: async (_: string, a: any) => {
      const k = `${a.mailboxId}:${a.kind}:${a.key}`,
        old = records.get(k)
      if (a.mode === 'consume') {
        records.delete(k)
        return old ?? null
      }
      if (a.mode === 'once' && old) return { created: false, value: old }
      records.set(k, a.value)
      return { created: true, value: a.value }
    },
    fetcher: async (url: any) => {
      if (String(url).includes('messages/send')) {
        sends++
        throw Error('uncertain')
      }
      return new Response(
        JSON.stringify(
          String(url).includes('/token') ? { access_token: 'access' } : raw()
        )
      )
    },
  }
  records.set(
    'own:token:current',
    seal({ refresh_token: 'refresh' }, key, 'admin:own')
  )
  const call = (path: string, body?: any, overrides: any = {}) =>
    handleSupportApi(
      {
        request: new Request(
          `https://app.test/api/admin/email/support/${path}`,
          body
            ? {
                method: 'POST',
                headers: {
                  origin: 'https://app.test',
                  'content-type': 'application/json',
                  'idempotency-key': 'abcdefghijklmnopqrstuvwx',
                },
                body: JSON.stringify(body),
              }
            : {}
        ),
        locals: { auth: () => ({ userId: 'admin' }) },
      },
      path.split('?')[0],
      env,
      { ...deps, ...overrides }
    )
  return { call, records, deps, sends: () => sends }
}
describe('support Gmail boundaries', () => {
  it('rejects cross-origin authenticated reads, including context', async () => {
    for (const path of ['context', 'threads?mailbox_id=own']) {
      const h = harness()
      const response = await handleSupportApi(
        {
          request: new Request(
            `https://app.test/api/admin/email/support/${path}`,
            { headers: { origin: 'https://other-suite.test' } }
          ),
          locals: { auth: () => ({ userId: 'admin' }) },
        },
        path.split('?')[0],
        env,
        h.deps
      )
      expect(response.status).toBe(403)
    }
  })
  it('reopens resolved threads only when a new inbound message arrives', async () => {
    const h = harness()
    expect(
      (
        await h.call('threads/thread1/status', {
          mailbox_id: 'own',
          status: 'resolved',
        })
      ).status
    ).toBe(200)
    expect(
      (await (await h.call('threads/thread1?mailbox_id=own')).json()).thread
        .status
    ).toBe('resolved')
    const changed = raw()
    changed.messages[0].id = 'new-incoming'
    const response = await h.call('threads/thread1?mailbox_id=own', undefined, {
      fetcher: async (url: any) =>
        new Response(
          JSON.stringify(
            String(url).includes('/token')
              ? { access_token: 'access' }
              : changed
          )
        ),
    })
    expect((await response.json()).thread.status).toBe('pending')
    const outgoing: any = raw()
    outgoing.messages.push({
      ...outgoing.messages[0],
      id: 'own-reply',
      internalDate: '2000',
      labelIds: ['SENT'],
    })
    const sent = await h.call('threads/thread1?mailbox_id=own', undefined, {
      fetcher: async (url: any) =>
        new Response(
          JSON.stringify(
            String(url).includes('/token')
              ? { access_token: 'access' }
              : outgoing
          )
        ),
    })
    expect((await sent.json()).thread.status).toBe('resolved')
    outgoing.messages.at(-1).labelIds = ['DRAFT']
    const draft = await h.call('threads/thread1?mailbox_id=own', undefined, {
      fetcher: async (url: any) =>
        new Response(
          JSON.stringify(
            String(url).includes('/token')
              ? { access_token: 'access' }
              : outgoing
          )
        ),
    })
    expect((await draft.json()).thread.status).toBe('resolved')
  })
  it('binds ciphertext to owner and detects tampering', () => {
    const encrypted = seal({ refresh_token: 'secret' }, key, 'admin:own')
    expect(unseal(encrypted, key, 'admin:own').refresh_token).toBe('secret')
    expect(() => unseal(encrypted, key, 'another:own')).toThrow()
    expect(() => unseal(encrypted.slice(2), key, 'admin:own')).toThrow()
  })
  it('preserves relay destination, thread headers and UTF8 without direct-recipient fallback', () => {
    const t = threadWire(raw(), 'pending', ['relay.example.com'], true)
    const mime = Buffer.from(
      replyMime(t, 'owner@gmail.com', 'Réponse\r\nBcc: text only'),
      'base64url'
    ).toString()
    expect(mime).toContain('To: opaque@relay.example.com\r\n')
    expect(mime).toContain('In-Reply-To: <original@example.com>')
    expect(mime).not.toContain('To: client@example.com')
    expect(mime).not.toContain('\r\nBcc:')
  })
  it.each([
    '',
    'client@example.com',
    'opaque@relay.example.com\r\nBcc: attack@example.com',
    'a@relay.example.com, b@relay.example.com',
  ])('blocks unsafe or non-relay Reply-To %s', (reply) => {
    expect(
      threadWire(raw(reply), 'pending', ['relay.example.com'], true).can_reply
    ).toBe(false)
  })
  it('does not expose arbitrary HTML as text content', () => {
    const r = raw()
    r.messages[0].payload.mimeType = 'text/html'
    expect(threadWire(r, 'pending', [], false).messages[0].text).toContain(
      'indisponible'
    )
  })
  it('denies non-admin before mailbox/token access', async () => {
    const h = harness()
    const response = await h.call('context', undefined, {
      authority: async () => ({ actorId: 'someone' }),
    })
    expect(response.status).toBe(403)
  })
  it('never exposes refresh tokens in context', async () => {
    const h = harness()
    const text = await (await h.call('context')).text()
    expect(text).toContain('owner@gmail.com')
    expect(text).not.toContain('refresh')
  })
  it('rejects other mailbox before provider access', async () => {
    const h = harness()
    expect((await h.call('threads?mailbox_id=other')).status).toBe(403)
  })
  it('binds OAuth state to one mailbox and consumes it once', async () => {
    const h = harness()
    const response = await h.call('oauth/start', { mailbox_id: 'own' })
    const url = new URL((await response.json()).authorization_url)
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    const path = `oauth/callback?state=${url.searchParams.get('state')}&error=access_denied`
    expect((await h.call(path)).status).toBe(303)
    expect((await h.call(path)).status).toBe(400)
  })
  it('journals unknown sends and prevents second key/body from sending again', async () => {
    const h = harness(),
      body = {
        mailbox_id: 'own',
        body: 'Bonjour',
        expected_message_id: 'message1',
        confirmed: true,
      }
    expect(await (await h.call('threads/thread1/reply', body)).json()).toEqual({
      state: 'unknown',
      message_id: null,
    })
    expect(await (await h.call('threads/thread1/reply', body)).json()).toEqual({
      state: 'unknown',
      message_id: null,
    })
    expect(
      (await h.call('threads/thread1/reply', { ...body, body: 'again' })).status
    ).toBe(409)
    expect(h.sends()).toBe(1)
  })
  it('requires confirmation and current source message', async () => {
    const h = harness()
    expect(
      (
        await h.call('threads/thread1/reply', {
          mailbox_id: 'own',
          body: 'x',
          expected_message_id: 'old',
          confirmed: true,
        })
      ).status
    ).toBe(409)
    expect(h.sends()).toBe(0)
  })
  it('caps provider responses while streaming', async () => {
    await expect(
      provider(
        'https://gmail.googleapis.com',
        {},
        async () => new Response('x'.repeat(2000001))
      )
    ).rejects.toThrow('thread_too_large')
  })
})
describe('support durable ownership and race protection', () => {
  it('bounds concurrent OAuth starts and removes expired states opportunistically', async () => {
    process.env.EMAIL_OPERATOR_CREDENTIAL = env.EMAIL_OPERATOR_CREDENTIAL
    process.env.EMAIL_SUPPORT_MAILBOXES = env.EMAIL_SUPPORT_MAILBOXES
    const t = convexTest(schema, import.meta.glob('../../convex/**/*.ts'))
    const write = makeFunctionReference<'mutation'>('emailSupport:write')
    const base = {
      credential: env.EMAIL_OPERATOR_CREDENTIAL,
      actorId: 'admin',
      mailboxId: 'own',
      kind: 'oauth',
      value: 'cipher',
      mode: 'put',
    }
    await t.mutation(write, {
      ...base,
      key: 'expired',
      expiresAt: Date.now() - 1,
    })
    for (let i = 0; i < 5; i++)
      await t.mutation(write, {
        ...base,
        key: String(i),
        expiresAt: Date.now() + 50000,
      })
    await expect(
      t.mutation(write, {
        ...base,
        key: 'sixth',
        expiresAt: Date.now() + 50000,
      })
    ).rejects.toThrow('rate_limited')
    const rows = await t.run((ctx) =>
      ctx.db.query('emailSupportRecords').collect()
    )
    expect(rows).toHaveLength(5)
    expect(rows.some((r: any) => r.key === 'expired')).toBe(false)
  })
  it('enforces actor allowlist, one-time state expiry and atomic send ownership', async () => {
    process.env.EMAIL_OPERATOR_CREDENTIAL = env.EMAIL_OPERATOR_CREDENTIAL
    process.env.EMAIL_SUPPORT_MAILBOXES = env.EMAIL_SUPPORT_MAILBOXES
    const t = convexTest(schema, import.meta.glob('../../convex/**/*.ts'))
    const write = makeFunctionReference<'mutation'>('emailSupport:write')
    const common = {
      credential: env.EMAIL_OPERATOR_CREDENTIAL,
      actorId: 'admin',
      mailboxId: 'own',
      kind: 'reply',
      key: 'thread:message',
      value: { state: 'unknown' },
      mode: 'once',
    }
    const responses = await Promise.all([
      t.mutation(write, common),
      t.mutation(write, common),
    ])
    expect(responses.filter((x: any) => x.created)).toHaveLength(1)
    await expect(
      t.mutation(write, { ...common, actorId: 'other' })
    ).rejects.toThrow()
    await t.mutation(write, {
      ...common,
      kind: 'oauth',
      key: 'expired',
      expiresAt: Date.now() - 1,
      mode: 'put',
    })
    expect(
      await t.mutation(write, {
        ...common,
        kind: 'oauth',
        key: 'expired',
        mode: 'consume',
      })
    ).toBe(null)
  })
})
