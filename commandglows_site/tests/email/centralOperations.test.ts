import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import schema from '../../convex/schema'
import { handleOperations } from '../../src/lib/email/central/operations'
import { convexMutation } from '../../src/lib/email/central/api'
import { handleOperatorRelay } from '../../src/lib/email/central/operatorRelay'
import { handleCatalog } from '../../src/lib/email/central/catalog'

const modules = import.meta.glob('../../convex/**/*.ts')
const credential = 'synthetic-operator-credential-00000000000'
const config = {
  environment: 'sandbox',
  clients: [
    {
      id: 'operator',
      credentialEnv: 'EMAIL_TEST_OPERATOR',
      businessIds: ['a'],
      operations: [
        'operations_read',
        'operations_write',
        'templates_read',
        'dispatch',
      ],
    },
  ],
  businesses: [
    {
      id: 'a',
      from: 'sender@example.test',
      brand: 'A',
      legalFooter: 'Synthetic',
      transactionalStream: 'service',
      broadcastStream: 'news',
      activated: true,
      retentionDays: 30,
      allowedRecipients: ['person@example.test'],
      audiences: [],
    },
  ],
}
const env = {
  EMAIL_TEST_OPERATOR: credential,
  EMAIL_CONTROL_CONFIG: JSON.stringify(config),
}
beforeEach(() => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})
const query = (t: any, name: string, args: object) =>
  t.query(makeFunctionReference<'query'>(`emailOperations:${name}`), {
    credential,
    businessId: 'a',
    ...args,
  })
const operate = (t: any, args: object) =>
  t.mutation(makeFunctionReference<'mutation'>('emailOperations:operate'), {
    credential,
    businessId: 'a',
    key: 'operator-request-00001',
    reasonCode: 'investigation',
    expectedVersion: 0,
    ...args,
  })
async function seed(t: any, businessId = 'a', state = 'queued') {
  return t.run((ctx: any) =>
    ctx.db.insert('emailMessages', {
      businessId,
      email: 'person@example.test',
      kind: 'transactional',
      rendered: {
        subject: 'Private subject',
        html: 'private body',
        text: 'private body',
      },
      state,
      createdAt: 1,
      nextAt: 1,
    })
  )
}

test('operator pagination is scoped and redacted, wrong tenant and credential fail', async () => {
  const t = convexTest(schema, modules)
  const own = await seed(t)
  await seed(t)
  const foreign = await seed(t, 'b')
  const first = await query(t, 'list', {
    state: 'queued',
    paginationOpts: { numItems: 1, cursor: null },
  })
  const next = await query(t, 'list', {
    state: 'queued',
    paginationOpts: { numItems: 1, cursor: first.cursor },
  })
  expect(
    new Set([...first.items, ...next.items].map((m: any) => m.message_id)).size
  ).toBe(2)
  expect(JSON.stringify(first)).not.toMatch(
    /person@|Private|private body|credential/
  )
  await expect(
    query(t, 'detail', {
      messageId: foreign,
      paginationOpts: { numItems: 20, cursor: null },
    })
  ).rejects.toThrow('not_found')
  await expect(query(t, 'status', { credential: 'wrong' })).rejects.toThrow(
    'forbidden'
  )
  await expect(
    query(t, 'list', {
      state: 'queued',
      paginationOpts: { numItems: 101, cursor: null },
    })
  ).rejects.toThrow('invalid_input')
  expect(
    (
      await query(t, 'detail', {
        messageId: own,
        paginationOpts: { numItems: 20, cursor: null },
      })
    ).version
  ).toBe(0)
})

test('pause is idempotent, survives retries, rejects stale resume and prevents a claim', async () => {
  const t = convexTest(schema, modules)
  await seed(t)
  const paused = await operate(t, { action: 'pause', class: 'all' })
  expect(await operate(t, { action: 'pause', class: 'all' })).toEqual(paused)
  await expect(operate(t, { action: 'resume', class: 'all' })).rejects.toThrow(
    'idempotency_conflict'
  )
  await expect(
    operate(t, {
      key: 'operator-request-00002',
      action: 'resume',
      class: 'all',
    })
  ).rejects.toThrow('version_conflict')
  expect(
    await t.mutation(makeFunctionReference<'mutation'>('email:claim'), {
      credential,
      businessId: 'a',
    })
  ).toEqual([])
  const status = await query(t, 'status', {})
  expect(status.controls).toEqual([{ class: 'all', paused: true, version: 1 }])
  expect(status.provider_verified).toBe(false)
  await operate(t, {
    key: 'operator-request-00003',
    action: 'resume',
    class: 'all',
    expectedVersion: 1,
  })
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_001)
  expect(
    (
      await t.mutation(makeFunctionReference<'mutation'>('email:claim'), {
        credential,
        businessId: 'a',
      })
    ).length
  ).toBe(1)
})

test('unknown evidence is audited without changing submission state or permitting resend', async () => {
  const t = convexTest(schema, modules)
  const messageId = await seed(t, 'a', 'unknown')
  await operate(t, { action: 'acknowledge', messageId })
  await operate(t, {
    key: 'operator-request-00002',
    action: 'record_evidence',
    messageId,
    expectedVersion: 1,
    evidenceReference: 'case:synthetic-1',
  })
  await expect(
    operate(t, {
      key: 'operator-request-00003',
      action: 'cancel',
      messageId,
      expectedVersion: 2,
    })
  ).rejects.toThrow('invalid_state')
  const detail = await query(t, 'detail', {
    messageId,
    paginationOpts: { numItems: 20, cursor: null },
  })
  expect(detail.status).toBe('unknown')
  expect(detail.version).toBe(2)
  expect(detail.evidence).toHaveLength(2)
  expect(detail.allowed_actions).not.toContain('cancel')
})

test('HTTP client exercises operations end to end and refuses unauthorized requests before backend', async () => {
  const t = convexTest(schema, modules)
  const messageId = await seed(t)
  const backend = {
    query: (name: string, args: any) =>
      t.query(makeFunctionReference<'query'>(name), args),
    mutation: (name: string, args: any) =>
      t.mutation(makeFunctionReference<'mutation'>(name), args),
  }
  const headers = {
    Authorization: `Bearer ${credential}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': 'operator-request-00001',
  }
  const response = await handleOperations(
    new Request('https://example.test/api/v1/email/operations', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        business_id: 'a',
        action: 'cancel',
        message_id: messageId,
        expected_version: 0,
        reason_code: 'obsolete',
      }),
    }),
    env,
    backend
  )
  expect(response.status).toBe(200)
  expect((await response.json()).status).toBe('cancelled')
  const listed = await handleOperations(
    new Request(
      'https://example.test/api/v1/email/operations?business_id=a&state=cancelled',
      { headers }
    ),
    env,
    backend
  )
  expect((await listed.json()).items).toHaveLength(1)
  const spy = { query: vi.fn(), mutation: vi.fn() }
  const denied = await handleOperations(
    new Request('https://example.test/api/v1/email/operations?business_id=b', {
      headers,
    }),
    env,
    spy
  )
  expect(denied.status).toBe(403)
  expect(spy.query).not.toHaveBeenCalled()
})

test('explicit Convex origin accepts regional deployment and rejects lookalikes or credentials', () => {
  expect(() =>
    convexMutation({
      EMAIL_CONVEX_URL: 'https://synthetic.eu-west-1.convex.cloud',
    })
  ).not.toThrow()
  for (const url of [
    'https://synthetic.convex.cloud.evil.test',
    'https://token@synthetic.convex.cloud',
    'http://synthetic.convex.cloud',
    'https://synthetic.convex.cloud/path',
  ])
    expect(() => convexMutation({ EMAIL_CONVEX_URL: url })).toThrow()
})

test('site relay requires session, same-origin writes and canonical admin before forwarding', async () => {
  const authorize = vi.fn().mockResolvedValue({ authorized: true })
  const forward = vi.fn().mockResolvedValue(new Response('{}'))
  const relayEnv = {
    ...env,
    EMAIL_OPERATOR_CREDENTIAL: credential,
    SUITE_BRIDGE_CONVEX_SECRET: 'test-bridge-secret',
  }
  const request = () =>
    new Request('https://example.test/api/admin/email?business_id=a')
  expect(
    (
      await handleOperatorRelay(request(), null, relayEnv, {
        authorize,
        forward,
      })
    ).status
  ).toBe(401)
  expect(authorize).not.toHaveBeenCalled()
  expect(
    (
      await handleOperatorRelay(
        new Request(request(), { method: 'POST' }),
        'actor-1',
        relayEnv,
        { authorize, forward }
      )
    ).status
  ).toBe(403)
  authorize.mockRejectedValueOnce(new Error('admin_forbidden'))
  expect(
    (
      await handleOperatorRelay(request(), 'actor-1', relayEnv, {
        authorize,
        forward,
      })
    ).status
  ).toBe(403)
  expect(forward).not.toHaveBeenCalled()
  await handleOperatorRelay(request(), 'actor-1', relayEnv, {
    authorize,
    forward,
  })
  expect(authorize).toHaveBeenLastCalledWith(
    'emailOperations:siteAuthorize',
    expect.objectContaining({ actorGlobalUserId: 'actor-1', businessId: 'a' })
  )
  expect(forward.mock.calls[0][0].headers.get('authorization')).toBe(
    `Bearer ${credential}`
  )
})

test('canonical site role check rejects non-admin even with valid relay secret', async () => {
  vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', 'test-bridge-secret')
  vi.stubEnv('EMAIL_OPERATOR_CREDENTIAL', credential)
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    await ctx.db.insert('globalUsers', {
      globalUserId: 'actor-1',
      createdAt: 1,
      updatedAt: 1,
    })
  })
  await expect(
    t.query(makeFunctionReference<'query'>('emailOperations:siteAuthorize'), {
      actorGlobalUserId: 'actor-1',
      bridgeSecret: 'test-bridge-secret',
      businessId: 'a',
      operation: 'operations_read',
    })
  ).rejects.toThrow('admin_forbidden')
})

test('versioned catalog declares supported contracts and preview rejects unsupported content', async () => {
  const headers = {
    Authorization: `Bearer ${credential}`,
    'Content-Type': 'application/json',
  }
  const catalog = await handleCatalog(
    new Request('https://example.test/api/v1/email/templates?business_id=a', {
      headers,
    }),
    env
  )
  const description = await catalog.json()
  expect(description.capabilities.scheduling).toBe(true)
  expect(description.capabilities.arbitrary_html).toBe(false)
  expect(JSON.stringify(description)).not.toMatch(
    /person@|serverTokenEnv|synthetic-operator/
  )
  const body = {
    business_id: 'a',
    template_key: 'newsletter',
    template_version: '1',
    locale: 'fr',
    subject: 'Test',
    paragraphs: ['<script>unsafe</script>'],
  }
  const preview = await handleCatalog(
    new Request('https://example.test/api/v1/email/templates', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
    env
  )
  expect(preview.status).toBe(200)
  expect((await preview.json()).rendered.html).toContain('&lt;script&gt;')
  expect(
    (
      await handleCatalog(
        new Request('https://example.test/api/v1/email/templates', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, template_version: '2' }),
        }),
        env
      )
    ).status
  ).toBe(422)
})
