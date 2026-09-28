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

const resultFor = (globalUserId: string) => ({ globalUserId, email: null, entitlementCount: 1, activeEntitlementCount: 1, recognizedInstallationCount: 0, updatedAt: 1 })
const click = async (label: string) => act(async () => [...container.querySelectorAll('button')].find(button => button.textContent?.trim() === label)?.click())
const chooseAccount = async (id: string) => act(async () => [...container.querySelectorAll('button')].find(button => button.querySelector('span')?.textContent === id)!.click())
const search = async () => {
  await fill('license-search', 'customer@example.com')
  await act(async () => container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
}

test('ignores a late account response and clears the previous support reason', async () => {
  let finishA!: (value: Response) => void
  let finishB!: (value: Response) => void
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('globalUserId=gu_a')) return new Promise<Response>(resolve => { finishA = resolve })
    if (url.includes('globalUserId=gu_b')) return new Promise<Response>(resolve => { finishB = resolve })
    return Promise.resolve(response({ results: [resultFor('gu_a'), resultFor('gu_b')], ambiguous: true }))
  }))
  await act(async () => root.render(createElement(LicenseAdminConsole)))
  await search()
  await chooseAccount('gu_a')
  await chooseAccount('gu_b')
  await act(async () => finishB(response({ ...detail, account: { ...detail.account, globalUserId: 'gu_b' } })))
  await fill('support-reason', 'Reason for B')
  await act(async () => finishA(response({ ...detail, account: { ...detail.account, globalUserId: 'gu_a' } })))
  expect(container.querySelector('#license-detail-title')?.textContent).toBe('gu_b')
  expect((container.querySelector('#support-reason') as HTMLTextAreaElement).value).toBe('Reason for B')
})

test('locks both mutations after lost response until a successful explicit reread', async () => {
  let reads = 0
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') throw new TypeError('Network lost after sending')
    if (url.includes('globalUserId=')) return ++reads === 2 ? response({}, 503) : response(detail)
    return response({ results: [resultFor('gu_customer')] })
  })
  vi.stubGlobal('fetch', fetchMock)
  await act(async () => root.render(createElement(LicenseAdminConsole)))
  await search()
  await fill('support-reason', 'Verified support request')
  await click('Accorder l’accès')
  expect(container.textContent).toContain('Résultat inconnu')
  expect([...container.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Retirer l’accès')?.disabled).toBe(true)
  await click('Retirer l’accès')
  expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
  await click('Relire le détail et le journal')
  expect(container.textContent).toContain('Les actions restent verrouillées')
  await click('Relire le détail et le journal')
  expect([...container.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Retirer l’accès')?.disabled).toBe(false)
  expect((container.querySelector('#support-reason') as HTMLTextAreaElement).value).toBe('')
})

test('shows ambiguity, incomplete search, masked identities and limited history', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('globalUserId=')
    ? response({ ...detail, environment: 'production', identities: [{ provider: 'clerk', providerReference: '***1234', email: 'c***@example.test', environment: 'production' }], eventHistoryTruncated: true })
    : response({ results: [resultFor('gu_customer')], ambiguous: true, truncated: true })))
  await act(async () => root.render(createElement(LicenseAdminConsole)))
  await search()
  expect(container.textContent).toContain('Plusieurs comptes correspondent')
  expect(container.textContent).toContain('Recherche limitée')
  expect(container.querySelector('#license-detail-title')).toBeNull()
  await chooseAccount('gu_customer')
  expect(container.textContent).toContain('Environnement des interventions : production')
  expect(container.textContent).toContain('***1234')
  expect(container.textContent).toContain('50 événements les plus récents')
})

test('preselects an entitlement in a legacy alias of the server environment', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('globalUserId=')
    ? response({ ...detail, environment: 'sandbox', entitlements: detail.entitlements.map(entry => ({ ...entry, environment: 'test' })) })
    : response({ results: [resultFor('gu_customer')] })))
  await act(async () => root.render(createElement(LicenseAdminConsole)))
  await search()
  expect((container.querySelector('#support-product') as HTMLSelectElement).value).toBe('commandglows_formation')
  expect((container.querySelector('#support-plan') as HTMLSelectElement).value).toBe('formation')
})

test('removes intervention controls when the session expires during a mutation', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => init?.method === 'POST'
    ? response({ error: 'auth_required' }, 401)
    : url.includes('globalUserId=') ? response(detail) : response({ results: [resultFor('gu_customer')] })))
  await act(async () => root.render(createElement(LicenseAdminConsole)))
  await search()
  await fill('support-reason', 'Verified support request')
  await click('Accorder l’accès')
  expect(container.textContent).toContain('Votre session a expiré')
  expect(container.querySelector('#support-reason')).toBeNull()
})
