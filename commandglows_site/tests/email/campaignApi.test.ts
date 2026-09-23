import { describe, it, expect, vi } from 'vitest'
import { handleCampaignApi } from '../../src/lib/email/central/campaignApi'
import { ConvexError } from 'convex/values'
import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import schema from '../../convex/schema'
const modules = import.meta.glob('../../convex/**/*.ts')

const env = {
  SUITE_BRIDGE_CONVEX_SECRET: 'server-identity-secret',
  EMAIL_OPERATOR_CREDENTIAL: 'server-email-secret',
}
const locals = {
  auth: () => ({ userId: 'user_admin', sessionId: 'session-test' }),
}
function setup() {
  return {
    authority: vi.fn().mockResolvedValue({ actorId: 'user_admin' }),
    read: vi.fn().mockResolvedValue({ campaigns: [] }),
    command: vi.fn().mockResolvedValue({ id: 'campaign1' }),
  }
}
function request(
  path = 'campaigns',
  body: unknown = {},
  origin = 'https://example.com'
) {
  return new Request(`https://example.com/api/admin/email/${path}`, {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/json',
      'idempotency-key': 'test-request-123456',
    },
    body: JSON.stringify(body),
  })
}
const draft = {
  business_id: 'shipglows',
  title: 'Newsletter',
  audience_id: 'news',
  locale: 'fr',
  subject: 'Bonjour',
  preheader: '',
  blocks: [{ id: 'one', type: 'text', text: 'Bonjour' }],
}
describe('campaign operator boundary', () => {
  it('reads remaining recipient references and persisted incidents by tenant scope', async () => {
    const recipients = setup()
    recipients.read.mockResolvedValueOnce({
      campaign: { id: 'campaign1', state: 'paused', version: 7 },
      page: [
        {
          recipient_reference: 'opaque-recipient-1',
          state: 'queued',
          reducible: true,
          protected: false,
          reason: null,
        },
      ],
      cursor: null,
      complete: true,
    })
    const recipientPath = 'campaigns/campaign1/recipients'
    const recipientResponse = await handleCampaignApi(
      {
        request: new Request(
          `https://example.com/api/admin/email/${recipientPath}?business_id=shipglows&limit=10`
        ),
        locals,
      },
      recipientPath,
      env,
      recipients
    )
    expect(await recipientResponse.json()).toEqual({
      campaign: {
        id: 'campaign1',
        state: 'suspended',
        version: 7,
      },
      recipients: [
        {
          recipient_reference: 'opaque-recipient-1',
          state: 'queued',
          reducible: true,
          protected: false,
          reason: null,
        },
      ],
      next_cursor: null,
      complete: true,
    })
    expect(recipients.read).toHaveBeenCalledWith(
      'emailCampaigns:read',
      expect.objectContaining({ view: 'recipients', campaignId: 'campaign1' })
    )

    const incidents = setup()
    incidents.read.mockResolvedValueOnce({
      incidents: [
        {
          id: 'incident-1',
          state: 'open',
          severity: 0.2,
          measurement: null,
          threshold: null,
          coverage: null,
          evaluated_at: null,
          measurement_unavailable_reason: 'not persisted',
        },
      ],
      cursor: null,
      complete: true,
    })
    const incidentPath = 'campaigns/campaign1/incidents'
    const incidentResponse = await handleCampaignApi(
      {
        request: new Request(
          `https://example.com/api/admin/email/${incidentPath}?business_id=shipglows`
        ),
        locals,
      },
      incidentPath,
      env,
      incidents
    )
    expect((await incidentResponse.json()).incidents[0]).toMatchObject({
      id: 'incident-1',
      measurement: null,
      threshold: null,
      coverage: null,
      evaluated_at: null,
    })
    expect(incidents.read).toHaveBeenCalledWith(
      'emailIncidentQueries:read',
      expect.objectContaining({
        businessId: 'shipglows',
        campaignId: 'campaign1',
      })
    )
  })

  it('adapts real Convex list and preview receipts to the Flutter wire shape', async () => {
    const deps = setup()
    deps.read.mockResolvedValueOnce({
      page: [
        { campaign: { id: 'one', state: 'paused', title: 'Paused' } },
        { campaign: { id: 'two', state: 'running', title: 'Sending' } },
      ],
      cursor: 'next-page',
      complete: false,
    })
    const listResponse = await handleCampaignApi(
      {
        request: new Request(
          'https://example.com/api/admin/email/campaigns?business_id=shipglows&limit=2'
        ),
        locals,
      },
      'campaigns',
      env,
      deps
    )
    expect(await listResponse.json()).toEqual({
      campaigns: [
        { id: 'one', state: 'suspended', title: 'Paused' },
        { id: 'two', state: 'sending', title: 'Sending' },
      ],
      next_cursor: 'next-page',
    })

    deps.read.mockResolvedValueOnce({
      campaign: { id: 'one', state: 'paused', title: 'Paused' },
      rendered: { html: '<p>Draft</p>', text: 'Draft' },
    })
    const detailResponse = await handleCampaignApi(
      {
        request: new Request(
          'https://example.com/api/admin/email/campaigns/one?business_id=shipglows'
        ),
        locals,
      },
      'campaigns/one',
      env,
      deps
    )
    expect(await detailResponse.json()).toEqual({
      campaign: { id: 'one', state: 'suspended', title: 'Paused' },
      rendered: { html: '<p>Draft</p>', text: 'Draft' },
    })
    expect(deps.read).toHaveBeenNthCalledWith(
      2,
      'emailCampaigns:read',
      expect.objectContaining({ view: 'preview' })
    )
  })

  it('allows pause as a stale-safe stop and binds challenge issue to the server session', async () => {
    const pauseDeps = setup()
    const pausePath = 'campaigns/campaign1/pause'
    expect(
      (
        await handleCampaignApi(
          {
            request: request(pausePath, { business_id: 'shipglows' }),
            locals,
          },
          pausePath,
          env,
          pauseDeps
        )
      ).status
    ).toBe(200)
    expect(pauseDeps.command).toHaveBeenCalledWith(
      'emailCampaigns:command',
      expect.objectContaining({
        operation: 'pause',
        input: { campaignId: 'campaign1' },
      })
    )

    const challengeDeps = setup()
    const challengePath = 'campaigns/campaign1/challenge'
    await handleCampaignApi(
      {
        request: request(challengePath, {
          business_id: 'shipglows',
          expected_version: 4,
          action: 'resume',
          report_id: 'report-current',
        }),
        locals,
      },
      challengePath,
      env,
      challengeDeps
    )
    expect(challengeDeps.command).toHaveBeenCalledWith(
      'emailCampaigns:command',
      expect.objectContaining({
        operation: 'challenge',
        actorId: 'user_admin',
        sessionRef: 'session-test',
        input: expect.objectContaining({
          action: 'resume',
          reportId: 'report-current',
          expectedVersion: 4,
        }),
      })
    )

    const receiptDeps = setup()
    receiptDeps.command.mockResolvedValueOnce({
      campaign: { id: 'campaign1', state: 'paused', version: 5 },
      block_reason: 'operator_paused',
    })
    const receipt = await handleCampaignApi(
      {
        request: request(pausePath, { business_id: 'shipglows' }),
        locals,
      },
      pausePath,
      env,
      receiptDeps
    )
    expect(await receipt.json()).toEqual({
      campaign: {
        id: 'campaign1',
        state: 'suspended',
        version: 5,
        block_reason: 'operator_paused',
      },
      block_reason: 'operator_paused',
    })
  })

  it('accepts incomplete drafts through HTTP', async () => {
    const deps = setup()
    const body = { ...draft, subject: '', blocks: [] }
    expect(
      (
        await handleCampaignApi(
          { request: request('campaigns', body), locals },
          'campaigns',
          env,
          deps
        )
      ).status
    ).toBe(200)
    expect(deps.command).toHaveBeenCalledWith(
      'emailCampaigns:command',
      expect.objectContaining({
        input: expect.objectContaining({ subject: '', blocks: [] }),
      })
    )
  })
  it.each(['http://example.com', 'https://user:password@example.com'])(
    'rejects unsafe URL %s',
    async (url) => {
      const deps = setup()
      const body = {
        ...draft,
        blocks: [{ id: 'link', type: 'button', text: 'Read', url }],
      }
      expect(
        (
          await handleCampaignApi(
            { request: request('campaigns', body), locals },
            'campaigns',
            env,
            deps
          )
        ).status
      ).toBe(400)
      expect(deps.command).not.toHaveBeenCalled()
    }
  )
  it('allows composite review ids exceeding 128 characters', async () => {
    const deps = setup()
    const path = 'campaigns/campaign1/approve'
    const body = {
      business_id: 'shipglows',
      expected_version: 1,
      review_id: `campaign1:1:${'a'.repeat(128)}`,
      report_id: 'report1',
      challenge_id: 'challenge1',
    }
    expect(
      (
        await handleCampaignApi(
          { request: request(path, body), locals },
          path,
          env,
          deps
        )
      ).status
    ).toBe(200)
  })
  it('preserves source_id in the backend block contract', async () => {
    const deps = setup()
    const body = {
      ...draft,
      blocks: [
        {
          id: 'source1',
          type: 'source',
          text: 'Reference',
          source_id: 'article1',
        },
      ],
    }
    expect(
      (
        await handleCampaignApi(
          { request: request('campaigns', body), locals },
          'campaigns',
          env,
          deps
        )
      ).status
    ).toBe(200)
    expect(deps.command).toHaveBeenCalledWith(
      'emailCampaigns:command',
      expect.objectContaining({
        input: expect.objectContaining({ blocks: body.blocks }),
      })
    )
  })
  it.each(['0', '51', '-1', '1.5', '1e1', ''])(
    'rejects invalid list limit %s',
    async (limit) => {
      const deps = setup()
      const response = await handleCampaignApi(
        {
          request: new Request(
            `https://example.com/api/admin/email/campaigns?business_id=shipglows&limit=${limit}`
          ),
          locals,
        },
        'campaigns',
        env,
        deps
      )
      expect(response.status).toBe(400)
      expect(deps.read).not.toHaveBeenCalled()
    }
  )
  it('passes the requested bounded list limit', async () => {
    const deps = setup()
    await handleCampaignApi(
      {
        request: new Request(
          'https://example.com/api/admin/email/campaigns?business_id=shipglows&limit=25'
        ),
        locals,
      },
      'campaigns',
      env,
      deps
    )
    expect(deps.read).toHaveBeenCalledWith(
      'emailCampaigns:read',
      expect.objectContaining({ input: { limit: 25 } })
    )
  })
  it('authenticates before parsing malformed requests', async () => {
    const deps = setup()
    const response = await handleCampaignApi(
      { request: request(), locals: { auth: () => ({ userId: null }) } },
      'campaigns',
      env,
      deps
    )
    expect(response.status).toBe(401)
    expect(deps.authority).not.toHaveBeenCalled()
    expect(deps.command).not.toHaveBeenCalled()
  })
  it('rejects nonadmins before any ledger access', async () => {
    const deps = setup()
    deps.authority.mockRejectedValue(new ConvexError({ code: 'forbidden' }))
    expect(
      (
        await handleCampaignApi(
          { request: request(), locals },
          'campaigns',
          env,
          deps
        )
      ).status
    ).toBe(403)
    expect(deps.command).not.toHaveBeenCalled()
  })
  it.each(['https://evil.example', 'null', ''])(
    'rejects mutation origin %s',
    async (origin) => {
      const deps = setup()
      expect(
        (
          await handleCampaignApi(
            { request: request('campaigns', draft, origin), locals },
            'campaigns',
            env,
            deps
          )
        ).status
      ).toBe(403)
      expect(deps.command).not.toHaveBeenCalled()
    }
  )
  it('maps content and keeps credentials exclusively in trusted calls', async () => {
    const deps = setup()
    const response = await handleCampaignApi(
      { request: request('campaigns', draft), locals },
      'campaigns',
      env,
      deps
    )
    expect(response.status).toBe(200)
    expect(deps.command).toHaveBeenCalledWith(
      'emailCampaigns:command',
      expect.objectContaining({
        credential: env.EMAIL_OPERATOR_CREDENTIAL,
        actorId: 'user_admin',
        businessId: 'shipglows',
        operation: 'create',
        input: expect.objectContaining({ audienceId: 'news' }),
      })
    )
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).not.toContain('secret')
  })
  it.each([
    { ...draft, actorId: 'spoof' },
    {
      ...draft,
      blocks: [
        { id: 'one', type: 'button', text: 'Go', url: 'javascript:alert(1)' },
      ],
    },
    {
      ...draft,
      blocks: [{ id: 'one', type: 'text', text: 'ok', html: '<script>' }],
    },
  ])('rejects unknown fields and unsafe block URLs', async (body) => {
    const deps = setup()
    expect(
      (
        await handleCampaignApi(
          { request: request('campaigns', body), locals },
          'campaigns',
          env,
          deps
        )
      ).status
    ).toBe(400)
    expect(deps.command).not.toHaveBeenCalled()
  })
  it('bounds body size even without content-length', async () => {
    const deps = setup()
    expect(
      (
        await handleCampaignApi(
          {
            request: request('campaigns', {
              ...draft,
              title: 'a'.repeat(65536),
            }),
            locals,
          },
          'campaigns',
          env,
          deps
        )
      ).status
    ).toBe(413)
    expect(deps.command).not.toHaveBeenCalled()
  })
  it.each([
    'business_id=shipglows&business_id=other',
    'business_id=shipglows&credential=spoof',
    'business_id=shipglows&state=bogus',
  ])('rejects ambiguous/unknown GET parameters', async (query) => {
    const deps = setup()
    const response = await handleCampaignApi(
      {
        request: new Request(
          `https://example.com/api/admin/email/campaigns?${query}`
        ),
        locals,
      },
      'campaigns',
      env,
      deps
    )
    expect(response.status).toBe(400)
    expect(deps.read).not.toHaveBeenCalled()
  })
  it('maps paginated filtered reads', async () => {
    const deps = setup()
    await handleCampaignApi(
      {
        request: new Request(
          'https://example.com/api/admin/email/campaigns?business_id=shipglows&state=draft&cursor=next'
        ),
        locals,
      },
      'campaigns',
      env,
      deps
    )
    expect(deps.read).toHaveBeenCalledWith(
      'emailCampaigns:read',
      expect.objectContaining({
        operation: 'list',
        input: { state: 'draft', cursor: 'next', limit: 20 },
      })
    )
  })
  it('requires immutable version and normalizes explicit schedule offsets', async () => {
    const deps = setup()
    const path = 'campaigns/campaign1/approve'
    const body = {
      business_id: 'shipglows',
      expected_version: 2,
      review_id: 'review1',
      report_id: 'report1',
      challenge_id: 'challenge1',
      scheduled_at: '2026-10-01T12:00:00+02:00',
    }
    expect(
      (
        await handleCampaignApi(
          { request: request(path, body), locals },
          path,
          env,
          deps
        )
      ).status
    ).toBe(200)
    expect(deps.command).toHaveBeenCalledWith(
      'emailCampaigns:command',
      expect.objectContaining({
        input: {
          campaignId: 'campaign1',
          expectedVersion: 2,
          reviewId: 'review1',
          reportId: 'report1',
          challengeId: 'challenge1',
          scheduledAt: '2026-10-01T10:00:00.000Z',
        },
      })
    )
  })
})

describe('canonical Convex email operator authority', () => {
  const reference = makeFunctionReference<'query'>(
    'emailOperatorAuthority:authorize'
  )
  it('permits only a persisted admin and denies missing/nonadmin users', async () => {
    vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', 'identity-test-secret')
    try {
      const t = convexTest(schema, modules)
      await t.run(async (ctx) => {
        await ctx.db.insert('users', {
          clerkId: 'admin',
          email: 'admin@example.test',
          role: 'admin',
        })
        await ctx.db.insert('users', {
          clerkId: 'member',
          email: 'member@example.test',
          role: 'user',
        })
      })
      expect(
        await t.query(reference, {
          clerkId: 'admin',
          bridgeSecret: 'identity-test-secret',
        })
      ).toEqual({ actorId: 'admin' })
      for (const clerkId of ['member', 'missing'])
        await expect(
          t.query(reference, { clerkId, bridgeSecret: 'identity-test-secret' })
        ).rejects.toThrow('forbidden')
    } finally {
      vi.unstubAllEnvs()
    }
  })
  it('denies admin access with mismatched or unconfigured bridge secret', async () => {
    vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', 'identity-test-secret')
    try {
      const t = convexTest(schema, modules)
      await t.run((ctx) =>
        ctx.db.insert('users', {
          clerkId: 'admin',
          email: 'admin@example.test',
          role: 'admin',
        })
      )
      await expect(
        t.query(reference, { clerkId: 'admin', bridgeSecret: 'wrong' })
      ).rejects.toThrow('forbidden')
      vi.stubEnv('SUITE_BRIDGE_CONVEX_SECRET', '')
      await expect(
        t.query(reference, { clerkId: 'admin', bridgeSecret: '' })
      ).rejects.toThrow('forbidden')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
