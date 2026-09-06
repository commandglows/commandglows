// @vitest-environment jsdom
import { beforeEach, afterEach, expect, test, vi } from 'vitest'
import { installSiteSessionGuard, SESSION_CHANGE_EVENT_KEY } from '../src/lib/auth/siteSessionGuard'
let cleanup: (() => void) | undefined
const flush = async () => { await Promise.resolve(); await Promise.resolve() }
beforeEach(() => {
  document.body.innerHTML = '<main>Private content</main><section data-session-recovery hidden>Reconnect</section>'
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
})
afterEach(() => cleanup?.())
function start(fetchSession = vi.fn().mockResolvedValue({ userId: 'alice' })) {
  const reload = vi.fn(), signIn = vi.fn()
  cleanup = installSiteSessionGuard({ window, document, expectedUserId: 'alice', fetchSession, reload, signIn })
  return { fetchSession, reload, signIn, surface: document.querySelector('main')! }
}
test('hides rendered content until fresh identity is verified and on bfcache restore', async () => {
  const guard = start(); expect(guard.surface.hidden).toBe(true)
  await flush(); expect(guard.surface.hidden).toBe(false)
  window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
  expect(guard.surface.hidden).toBe(true)
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
  await flush(); expect(guard.fetchSession).toHaveBeenCalledTimes(2)
  expect(guard.surface.hidden).toBe(false)
})
test('focus with another account reloads without revealing previous content', async () => {
  const guard = start(); await flush()
  guard.fetchSession.mockResolvedValue({ userId: 'bob' })
  window.dispatchEvent(new Event('focus')); await flush()
  expect(guard.reload).toHaveBeenCalledOnce(); expect(guard.surface.hidden).toBe(true)
})
test('signed-out verification redirects, network failure offers recovery without stale content', async () => {
  const guard = start(vi.fn().mockResolvedValue({ userId: null })); await flush()
  expect(guard.signIn).toHaveBeenCalledOnce(); expect(guard.surface.hidden).toBe(true)
  cleanup?.()
  const failed = start(vi.fn().mockRejectedValue(new Error('offline'))); await flush()
  expect(failed.surface.hidden).toBe(true)
  expect(document.querySelector<HTMLElement>('[data-session-recovery]')!.hidden).toBe(false)
})
test('hidden tabs invalidate in-flight responses and visible tabs revalidate', async () => {
  let resolve!: (value: unknown) => void
  const fetcher = vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done })).mockResolvedValue({ userId: 'alice' })
  const guard = start(fetcher)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  document.dispatchEvent(new Event('visibilitychange'))
  resolve({ userId: 'alice' }); await flush(); expect(guard.surface.hidden).toBe(true)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  document.dispatchEvent(new Event('visibilitychange')); await flush()
  expect(guard.surface.hidden).toBe(false)
})
test('cross-tab change blocks stale response and focus cannot restore it', async () => {
  let resolve!: (value: unknown) => void
  const guard = start(vi.fn().mockImplementation(() => new Promise(done => { resolve = done })))
  window.dispatchEvent(new StorageEvent('storage', { key: SESSION_CHANGE_EVENT_KEY, newValue: 'opaque-change' }))
  resolve({ userId: 'alice' }); await flush()
  window.dispatchEvent(new Event('focus')); await flush()
  expect(guard.surface.hidden).toBe(true); expect(guard.fetchSession).toHaveBeenCalledTimes(1)
})
test('disposed or superseded request cannot reveal stale content', async () => {
  const resolvers: ((value: unknown) => void)[] = []
  const guard = start(vi.fn().mockImplementation(() => new Promise(done => resolvers.push(done))))
  window.dispatchEvent(new Event('focus'))
  resolvers[0]({ userId: 'alice' }); await flush(); expect(guard.surface.hidden).toBe(true)
  cleanup?.(); resolvers[1]({ userId: 'alice' }); await flush(); expect(guard.surface.hidden).toBe(true)
})
test('same-origin logout broadcasts no identity and cross-origin form does not', async () => {
  start(); await flush()
  document.body.insertAdjacentHTML('beforeend', '<form method="post" action="/api/auth/logout"></form>')
  const set = vi.spyOn(Storage.prototype, 'setItem')
  document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  expect(set).toHaveBeenCalledWith(SESSION_CHANGE_EVENT_KEY, expect.any(String))
  expect(set.mock.calls[0][1]).not.toContain('alice')
  set.mockClear()
  document.querySelector('form')!.action = 'https://elsewhere.example/api/auth/logout'
  document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true }))
  expect(set).not.toHaveBeenCalled(); set.mockRestore()
})
