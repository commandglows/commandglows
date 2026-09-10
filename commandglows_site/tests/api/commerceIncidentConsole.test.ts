// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import CommerceIncidentConsole from '@/components/admin/CommerceIncidentConsole'

let container: HTMLDivElement
let root: Root
const fixture = { _id: 'case_1', receiptId: 'receipt_1', providerEventId: 'evt_fixture', productId: 'communityglows',
  status: 'pending_review', reason: 'missing_global_user', attempts: 5, queueState: 'escalated',
  dueAt: Date.now() + 100000, version: 5, overdue: false, alerts: [{ id: 'alert_1', status: 'failed', error: 'alert_delivery_unavailable', attempts: 5 }] }
const response = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
const byLabel = (value: string) => [...container.querySelectorAll('button')].find((button) => button.textContent === value)!
async function click(value: string) { await act(async () => { byLabel(value).click() }) }
async function fill(id: string, value: string) {
  await act(async () => {
    const input = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!
    const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ page: [], environment: 'sandbox', isDone: true, continueCursor: '', alertChannelConfigured: true })))
})
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals() })

test('shows an accessible empty queue and a failed fetch can be retried', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('Queue unavailable'))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Queue unavailable')
  await click('Actualiser')
  expect(container.textContent).toContain('Aucun dossier dans cette page.')
  expect(container.querySelector('[role="alert"]')).toBeNull()
})

test('denies the operator controls after a forbidden response', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response({ error: 'admin_required' }, 403))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  expect(container.textContent).toContain('réservée aux administrateurs')
  expect(container.querySelector('textarea')).toBeNull()
})

test('exhausted incidents expose alert failure and guard retry while requiring a reason', async () => {
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    if (options?.method === 'POST') return response({ status: 'escalated' })
    if (String(url).includes('incidentId=')) return response({ incident: fixture, actions: [], historyTruncated: false })
    return response({ page: [fixture], environment: 'sandbox', isDone: true, continueCursor: '', alertChannelConfigured: false,
      watchdog: { stale: true } })
  })
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  expect(container.textContent).toContain('Canal d’alerte non configuré')
  expect(container.textContent).toContain('Échec de notification')
  expect(container.textContent).toContain('Surveillance automatique non vérifiée')
  await click('Ouvrir le dossier')
  expect(byLabel('Reprendre le traitement').disabled).toBe(true)
  expect(byLabel('Vérifier Stripe et effectuer l’ultime reprise').disabled).toBe(false)
  await click('Prendre en charge')
  expect(container.textContent).toContain('Ajoutez un motif précis')
  expect(vi.mocked(fetch).mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  await fill('commerce-reason', 'Verified operator follow-up')
  await click('Prendre en charge')
  const post = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === 'POST')
  expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({ action: 'claim', incidentId: 'case_1', expectedVersion: 5, expectedAttempts: 5, reason: 'Verified operator follow-up' })
})

test('groups older notification failures and repeated missing-channel states', async () => {
  const incident = {
    ...fixture,
    alerts: [
      { id: 'alert_5', status: 'pending', attempts: 1 },
      { id: 'alert_4', status: 'failed', error: 'alert_channel_not_configured', attempts: 5 },
      { id: 'alert_3', status: 'failed', error: 'alert_channel_not_configured', attempts: 5 },
      { id: 'alert_2', status: 'failed', error: 'alert_delivery_unavailable', attempts: 5 },
      { id: 'alert_1', status: 'failed', error: 'alert_channel_not_configured', attempts: 5 },
    ],
  }
  vi.mocked(fetch).mockResolvedValueOnce(response({ page: [incident], environment: 'sandbox', isDone: true, continueCursor: '', alertChannelConfigured: false }))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  expect(container.textContent).toContain('États antérieurs masqués : 2 notification(s) en erreur')
  expect(container.textContent).toContain('Répétitions d’état canal non configuré regroupées : 2')
})

test('checkout uncertainty does not offer receipt retry or pretend its internal key is a Stripe event', async () => {
  const checkout = { ...fixture, receiptId: undefined, kind: 'checkout_verification', providerEventId: 'checkout:internal_1', sourceRef: 'suite-checkout:one', status: 'checkout_unverified', attempts: 0 }
  vi.mocked(fetch).mockImplementation(async (url) => String(url).includes('incidentId=')
    ? response({ incident: checkout, actions: [], historyTruncated: false })
    : response({ page: [checkout], environment: 'sandbox', isDone: true, continueCursor: '' }))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  await click('Ouvrir le dossier')
  expect(byLabel('Vérifier la reprise').disabled).toBe(true)
  expect(byLabel('Vérifier Stripe et effectuer l’ultime reprise').disabled).toBe(true)
  expect(container.textContent).toContain('ne doit pas être saisie comme identifiant Stripe')
  expect(byLabel('Clôturer le dossier sans modifier les droits').disabled).toBe(true)
})
