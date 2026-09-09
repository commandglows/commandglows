// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, test, vi } from 'vitest'
import AuthNavAction from '@/components/shared/site/AuthNavAction'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const roots: ReturnType<typeof createRoot>[] = []
afterEach(async () => { await act(async () => roots.splice(0).forEach((root) => root.unmount())); document.body.replaceChildren(); vi.unstubAllGlobals() })
async function renderSession(response: unknown, fails = false) {
  const fetchMock = vi.fn().mockImplementation(async () => {
    if (fails) throw new Error('offline')
    return { ok: true, json: async () => response }
  })
  vi.stubGlobal('fetch', fetchMock)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(<AuthNavAction className="account" overviewLabel="Compte" settingsLabel="Paramètres" tasksLabel="Tâches" signInLabel="Connexion" signInUrl="/fr/signin" />))
  return { container, fetchMock }
}
async function renderSessionSequence(responses: unknown[]) {
  let index = 0
  const fetchMock = vi.fn().mockImplementation(async () => {
    const response = responses[Math.min(index, responses.length - 1)]
    index += 1
    return { ok: true, json: async () => response }
  })
  vi.stubGlobal('fetch', fetchMock)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  await act(async () => root.render(<AuthNavAction className="account" overviewLabel="Compte" settingsLabel="Paramètres" tasksLabel="Tâches" signInLabel="Connexion" signInUrl="/fr/signin" />))
  return { container, fetchMock }
}
test('shows account navigation and POST logout for a verified account session', async () => {
  const { container, fetchMock } = await renderSession({ userId: 'global_test' })
  expect(container.querySelector('a[href="/dashboard/parametres"]')?.textContent).toBe('Paramètres')
  expect(container.querySelector('form')?.getAttribute('method')).toBe('post')
  expect(container.querySelector('form')?.getAttribute('action')).toBe('/api/auth/logout')
  expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }))
})
test.each([null, {}, { userId: null }, { userId: 123 }])('offers login for absent or malformed sessions %j', async (session) => {
  const { container } = await renderSession(session)
  expect(container.querySelector('a')?.getAttribute('href')).toBe('/fr/signin')
  expect(container.querySelector('form')).toBeNull()
})
test('keeps login available when session lookup fails', async () => {
  const { container } = await renderSession(null, true)
  expect(container.textContent).toBe('Connexion')
})
test('hides private navigation as soon as sign out is submitted', async () => {
  const { container } = await renderSession({ userId: 'global_test' })
  await act(async () => container.querySelector('form')?.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true })))
  expect(container.querySelector('form')).toBeNull()
  expect(container.querySelector('a')?.getAttribute('href')).toBe('/fr/signin')
})
test('refreshes session when a cached page is shown again', async () => {
  const { container, fetchMock } = await renderSessionSequence([{ userId: 'global_test' }, null])
  expect(container.querySelector('a[href="/dashboard/parametres"]')?.textContent).toBe('Paramètres')
  await act(async () => window.dispatchEvent(new PageTransitionEvent('pageshow')))
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(container.querySelector('form')).toBeNull()
  expect(container.querySelector('a')?.getAttribute('href')).toBe('/fr/signin')
})
