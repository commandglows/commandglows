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
const locals = { auth: () => ({ userId: 'user_admin' }) }
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
