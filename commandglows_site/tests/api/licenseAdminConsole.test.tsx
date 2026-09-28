// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import LicenseAdminConsole from '@/components/admin/LicenseAdminConsole'

let container: HTMLDivElement
let root: Root
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const detail = {
  account: { globalUserId: 'gu_customer', email: null, createdAt: 1, updatedAt: 1 },
  entitlements: [{ productId: 'commandglows_formation', plan: 'formation', status: 'active', source: 'stripe', grantedAt: 1, trialExpiresAt: null, updatedAt: 1 }],
  events: [], recognizedInstallationCount: 0,
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

async function fill(id: string, value: string) {
  await act(async () => {
    const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

test('acts on the selected entitlement and reports an already-revoked result accurately', async () => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return response({ status: 'already_revoked' })
    if (url.includes('globalUserId=')) return response(detail)
    return response({ results: [{ globalUserId: 'gu_customer', email: null, entitlementCount: 1, activeEntitlementCount: 1, recognizedInstallationCount: 0, updatedAt: 1 }] })
  })
  vi.stubGlobal('fetch', fetchMock)
  await act(async () => root.render(createElement(LicenseAdminConsole)))
  await fill('license-search', 'customer@example.com')
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  expect((container.querySelector('#support-product') as HTMLSelectElement).value).toBe('commandglows_formation')
  expect((container.querySelector('#support-plan') as HTMLSelectElement).value).toBe('formation')
  await fill('support-reason', 'Verified support request')
  await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Retirer l’accès')?.click())
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
  expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ action: 'revoke', productId: 'commandglows_formation', plan: 'formation' })
  expect(container.textContent).toContain('Ce droit était déjà révoqué')
})

test('preserves a confirmed mutation outcome when detail refresh fails', async () => {
  let detailReads = 0
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return response({ status: 'granted' })
    if (url.includes('globalUserId=')) return ++detailReads === 1 ? response(detail) : response({ error: 'unavailable' }, 503)
    return response({ results: [{ globalUserId: 'gu_customer', email: null, entitlementCount: 1, activeEntitlementCount: 1, recognizedInstallationCount: 0, updatedAt: 1 }] })
  })
  vi.stubGlobal('fetch', fetchMock)
  await act(async () => root.render(createElement(LicenseAdminConsole)))
  await fill('license-search', 'customer@example.com')
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  await fill('support-reason', 'Verified support request')
  await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Accorder l’accès')?.click())
  expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
  expect(container.textContent).toContain('Accès accordé et journalisé. Le détail n’a pas pu être actualisé')
  expect(container.textContent).not.toContain('Résultat inconnu')
  expect([...container.querySelectorAll('button')].some((button) => button.textContent === 'Accorder l’accès')).toBe(false)
})
