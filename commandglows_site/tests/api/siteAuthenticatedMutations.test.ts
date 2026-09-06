import { beforeEach, expect, test, vi } from 'vitest'
const mutation = vi.hoisted(() => vi.fn())
vi.mock('convex/browser', () => ({ ConvexHttpClient: vi.fn().mockImplementation(function () { return { mutation } }) }))
import { POST as suggest } from '@/pages/api/features/suggest'
import { POST as vote } from '@/pages/api/features/[key]/vote'
import { POST as licenses } from '@/pages/api/admin/licenses'
import { POST as checkout } from '@/pages/api/checkout/start'
vi.mock('@/pages/api/commerce/checkout', () => ({ createCommerceCheckout: vi.fn() }))
const origin = 'https://app.example'
const payload = { projectId: 'project', title: 'Useful feature', description: 'A useful improvement', actorGlobalUserId: 'attacker', bridgeSecret: 'attacker' }
function context(incomingOrigin: string | null = origin) {
  return { request: new Request(`${origin}/api/features/suggest`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(incomingOrigin ? { Origin: incomingOrigin } : {}) }, body: JSON.stringify(payload) }), locals: { siteAuth: () => ({ userId: 'global-verified' }) }, params: { key: 'feature' } }
}
beforeEach(() => { mutation.mockReset(); mutation.mockResolvedValue({ status: 'ok', votes: 1 }); process.env.PUBLIC_CONVEX_URL = 'https://example.convex.cloud'; process.env.SUITE_BRIDGE_CONVEX_SECRET = 'server-authority' })
test.each([null, 'https://evil.example'])('all cookie-authorized mutations reject untrusted origin %s', async (incomingOrigin) => {
  for (const route of [suggest, vote, licenses, checkout]) expect((await route(context(incomingOrigin) as never)).status).toBe(403)
  expect(mutation).not.toHaveBeenCalled()
})
test.each([suggest, vote])('feature mutations use server canonical identity and authority', async (route) => {
  const response = await route(context() as never)
  expect(response.status).toBe(200)
  expect(mutation).toHaveBeenCalledWith(expect.stringMatching(/^features:/), expect.objectContaining({ actorGlobalUserId: 'global-verified', bridgeSecret: 'server-authority' }))
})
