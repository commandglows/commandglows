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
  expect(container.textContent).not.toContain('Aucun dossier dans cette page.')
  expect(container.textContent).toContain('Vérification')
  await click('Actualiser')
  expect(container.textContent).toContain('Aucun dossier dans cette page.')
  expect(container.querySelector('[role="alert"]')).toBeNull()
})

test('shows queue states with action, warning, and resolved semantics', async () => {
  const open = { ...fixture, status: 'processing', queueState: 'open', overdue: false }
  const resolved = { ...fixture, status: 'resolved', queueState: 'resolved', overdue: false }
  vi.mocked(fetch).mockImplementation(async (url) => String(url).includes('view=resolved')
    ? response({ page: [resolved], environment: 'sandbox', isDone: true, continueCursor: '' })
    : response({ page: [open], environment: 'sandbox', isDone: true, continueCursor: '' }))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  const openCard = container.querySelector('article')!
  expect(openCard.className).toContain('border-l-amber-500')
  expect(openCard.querySelector('span')?.className).toContain('bg-amber-50')
  expect(openCard.querySelector('span')?.className).not.toContain('bg-emerald-50')
  await click('Résolus')
  const resolvedCard = container.querySelector('article')!
  expect(resolvedCard.className).toContain('border-l-emerald-500')
  expect(resolvedCard.querySelector('span')?.className).toContain('bg-emerald-50')
})

test('does not show an empty candidates state after a failed load', async () => {
  vi.mocked(fetch).mockImplementation(async (url) => String(url).includes('view=missing')
    ? Promise.reject(new Error('Candidates unavailable'))
    : response({ page: [], environment: 'sandbox', isDone: true, continueCursor: '' }))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  await click('Paiements à confirmer')
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Candidates unavailable')
  expect(container.textContent).not.toContain('Aucune session à vérifier dans cette page.')
})

test('clears the previous queue when another view fails to load', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response({ page: [fixture], environment: 'sandbox', isDone: true, continueCursor: '' }))
    .mockRejectedValueOnce(new Error('Resolved queue unavailable'))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  expect(container.textContent).toContain('evt_fixture')
  await click('Résolus')
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('Resolved queue unavailable')
  expect(container.textContent).not.toContain('evt_fixture')
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
    if (String(url).includes('incidentId=')) return response({ incident: fixture, actions: [], historyTruncated: false,
      receipt: { businessId: 'commandglows', providerAccountId: 'acct_fixture' } })
    return response({ page: [fixture], environment: 'sandbox', isDone: true, continueCursor: '', alertChannelConfigured: false,
      watchdog: { stale: true }, merchantAvailability: { commandglows: true } })
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

test('disables Stripe recovery when its merchant is not configured', async () => {
  vi.mocked(fetch).mockImplementation(async (url) => String(url).includes('incidentId=')
    ? response({ incident: fixture, actions: [], historyTruncated: false,
      receipt: { businessId: 'replayglows', providerAccountId: 'acct_fixture' } })
    : response({ page: [fixture], environment: 'production', isDone: true, continueCursor: '',
      merchantAvailability: { commandglows: true, replayglows: false } }))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  await click('Ouvrir le dossier')
  expect(byLabel('Vérifier Stripe et effectuer l’ultime reprise').disabled).toBe(true)
  expect(container.textContent).toContain('L’ultime reprise nécessite un reçu lié à un compte Stripe configuré')
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

const queue = (page = [fixture]) => ({ page, environment: 'production', isDone: true,
  continueCursor: '', merchantAvailability: { commandglows: true } })
const incidentDetail = (incident = fixture) => ({ incident, actions: [], historyTruncated: false })

test.each([
  ['reconcile', 'commerce-event', 'evt_verified', 'Vérifier et récupérer l’événement'],
  ['repair_checkout', 'commerce-session', 'cs_verified', 'Vérifier et réparer le rattachement'],
])('Stripe %s works from missing payments with its own reason and provider reference', async (action, inputId, value, buttonLabel) => {
  vi.mocked(fetch).mockImplementation(async (_url, options) => options?.method === 'POST'
    ? response({ status: 'granted' }) : response(queue([])))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  await click('Paiements à confirmer')
  await fill(inputId, value)
  await click(buttonLabel)
  expect(document.activeElement?.id).toBe('commerce-stripe-reason')
  expect(vi.mocked(fetch).mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
  await fill('commerce-stripe-reason', 'Paiement et référence vérifiés dans Stripe')
  await click(buttonLabel)
  const post = vi.mocked(fetch).mock.calls.find(([, options]) => options?.method === 'POST')!
  const payload = JSON.parse(String(post[1]?.body))
  expect(payload).toMatchObject({ action, reason: 'Paiement et référence vérifiés dans Stripe', businessId: 'commandglows',
    [action === 'reconcile' ? 'eventId' : 'sessionId']: value })
  expect(payload).not.toHaveProperty('incidentId')
  expect(container.textContent).toContain('Opération enregistrée')
})

test('a failed switch removes the former incident and its intervention context', async () => {
  const other = { ...fixture, _id: 'case_2' }
  vi.mocked(fetch).mockImplementation(async (url) => String(url).includes('incidentId=case_2')
    ? Promise.reject(new Error('Detail unavailable')) : String(url).includes('incidentId=')
      ? response(incidentDetail()) : response(queue([fixture, other])))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  await click('Ouvrir le dossier')
  await fill('commerce-reason', 'Ancien motif')
  await fill('commerce-stripe-reason', 'Ancien motif Stripe')
  await fill('commerce-event', 'evt_previous')
  await act(async () => { [...container.querySelectorAll('button')].filter((entry) => entry.textContent === 'Ouvrir le dossier')[1].click() })
  expect(container.querySelector('aside')).toBeNull()
  expect(container.textContent).toContain('Detail unavailable')
  expect(byLabel('Prendre en charge')).toBeUndefined()
  expect(container.querySelector<HTMLTextAreaElement>('#commerce-stripe-reason')?.value).toBe('')
  expect(container.querySelector<HTMLInputElement>('#commerce-event')?.value).toBe('')
})

test.each(['network', 'conflict', 'unavailable'])('a %s mutation blocks all actions until the incident is successfully reread', async (failure) => {
  let detailFails = false
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    if (options?.method === 'POST') {
      if (failure === 'network') throw new Error('Connection lost')
      return response({}, failure === 'conflict' ? 409 : 503)
    }
    if (String(url).includes('incidentId=')) {
      if (detailFails) throw new Error('Read unavailable')
      return response(incidentDetail({ ...fixture, version: 6 }))
    }
    return response(queue())
  })
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  await click('Ouvrir le dossier')
  await fill('commerce-reason', 'Vérification du dossier')
  await fill('commerce-event', 'evt_verified')
  await click('Prendre en charge')
  expect(byLabel('Prendre en charge').disabled).toBe(true)
  expect(byLabel('Escalader').disabled).toBe(true)
  expect(byLabel('Vérifier et récupérer l’événement').disabled).toBe(true)
  expect(container.textContent).toContain('Actions suspendues')
  detailFails = true
  await click('Actualiser')
  expect(byLabel('Prendre en charge').disabled).toBe(true)
  detailFails = false
  await click('Actualiser')
  expect(byLabel('Prendre en charge').disabled).toBe(false)
  expect(container.textContent).toContain('Version 6')
})

test.each(['queue', 'detail'])('confirmed mutation survives a failed %s refresh with controls locked', async (failedRead) => {
  let mutated = false
  let readsFail = true
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    if (options?.method === 'POST') { mutated = true; return response({ status: 'escalated' }) }
    const isDetail = String(url).includes('incidentId=')
    if (mutated && readsFail && (failedRead === 'detail' ? isDetail : !isDetail)) throw new Error('Read unavailable')
    return response(isDetail ? incidentDetail({ ...fixture, version: mutated ? 6 : 5 }) : queue())
  })
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  await click('Ouvrir le dossier')
  await fill('commerce-reason', 'Transmettre le dossier au support')
  await click('Escalader')
  expect(container.textContent).toContain('Opération enregistrée. Escaladé')
  expect(container.textContent).toContain('Opération confirmée, mais actualisation indisponible')
  expect(container.textContent).not.toContain('Résultat à vérifier.')
  expect(byLabel('Escalader').disabled).toBe(true)
  readsFail = false
  await click('Actualiser')
  expect(byLabel('Escalader').disabled).toBe(false)
  await click('Escalader')
  const posts = vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === 'POST')
  expect(JSON.parse(String(posts[1][1]?.body)).expectedVersion).toBe(6)
})

test('changing queues cannot bypass the verification of an uncertain incident', async () => {
  let readsFail = false
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    if (options?.method === 'POST') throw new Error('Connection lost')
    if (String(url).includes('incidentId=')) {
      if (readsFail) throw new Error('Read unavailable')
      return response(incidentDetail())
    }
    return response(queue())
  })
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  await click('Ouvrir le dossier')
  await fill('commerce-reason', 'Motif vérifié')
  await click('Prendre en charge')
  await click('Paiements à confirmer')
  await fill('commerce-event', 'evt_verified')
  expect(byLabel('Vérifier et récupérer l’événement').disabled).toBe(true)
  readsFail = true
  await click('Actualiser')
  expect(byLabel('Vérifier et récupérer l’événement').disabled).toBe(true)
  readsFail = false
  await click('Actualiser')
  expect(byLabel('Vérifier et récupérer l’événement').disabled).toBe(false)
})

test('a confirmed validation refusal preserves the incident controls without reporting an unknown result', async () => {
  vi.mocked(fetch).mockImplementation(async (url, options) => options?.method === 'POST'
    ? response({ error: 'reason_required' }, 400)
    : response(String(url).includes('incidentId=') ? incidentDetail() : queue()))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  await click('Ouvrir le dossier')
  await fill('commerce-reason', 'Motif refusé par le serveur')
  await click('Prendre en charge')
  expect(byLabel('Prendre en charge').disabled).toBe(false)
  expect(container.textContent).not.toContain('Résultat à vérifier')
  expect(container.textContent).not.toContain('Actions suspendues')
})

test('a queue change clears both the incident and Stripe form context', async () => {
  vi.mocked(fetch).mockImplementation(async (url) => response(String(url).includes('incidentId=') ? incidentDetail() : queue()))
  await act(async () => root.render(createElement(CommerceIncidentConsole)))
  await click('Ouvrir le dossier')
  await fill('commerce-reason', 'Ancien dossier')
  await fill('commerce-stripe-reason', 'Ancienne intervention Stripe')
  await fill('commerce-session', 'cs_previous')
  await click('Paiements à confirmer')
  expect(container.querySelector('aside')).toBeNull()
  expect(container.querySelector<HTMLTextAreaElement>('#commerce-stripe-reason')?.value).toBe('')
  expect(container.querySelector<HTMLInputElement>('#commerce-session')?.value).toBe('')
})
