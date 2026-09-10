export const SESSION_CHANGE_EVENT_KEY = 'commandglows_session_changed'

/** Revalidates rendered account state; this never authorizes backend operations. */
export function installSiteSessionGuard(options: {
  window: Window; document: Document; expectedUserId: string | null
  fetchSession: (signal: AbortSignal) => Promise<unknown>
  reload: () => void; signIn: () => void
}) {
  const { window: win, document: doc, expectedUserId } = options
  const surface = doc.querySelector<HTMLElement>('main')
  const recovery = doc.querySelector<HTMLElement>('[data-session-recovery]')
  let generation = 0, disposed = false, blocked = false, controller: AbortController | undefined
  const hide = () => { if (expectedUserId && surface) surface.hidden = true }
  const invalidate = () => { generation++; controller?.abort(); hide() }
  const recover = () => {
    blocked = true; invalidate()
    if (expectedUserId && recovery) recovery.hidden = false
  }
  const check = async () => {
    if (!expectedUserId || disposed || blocked || doc.visibilityState === 'hidden') return
    invalidate()
    const current = generation
    controller = new AbortController()
    try {
      const value = await options.fetchSession(controller.signal)
      if (disposed || blocked || current !== generation) return
      if (!value || typeof value !== 'object' || !('userId' in value)) { recover(); return }
      const id = value.userId
      if (id === null) { blocked = true; options.signIn(); return }
      if (typeof id !== 'string' || !id) { recover(); return }
      if (id !== expectedUserId) { blocked = true; options.reload(); return }
      if (surface) surface.hidden = false
    } catch { if (!disposed && current === generation) recover() }
  }
  const hidden = () => { invalidate() }
  const visible = () => { if (doc.visibilityState === 'hidden') hidden(); else void check() }
  const storage = (event: StorageEvent) => {
    if (event.key === SESSION_CHANGE_EVENT_KEY) recover()
  }
  const submit = (event: Event) => {
    const form = event.target as HTMLFormElement | null
    if (!form || form.tagName !== 'FORM') return
    const action = new URL(form.action, win.location.href)
    if (action.origin !== win.location.origin || !['/api/auth/logout', '/api/auth/link'].includes(action.pathname.replace(/\/$/, '')) || form.method.toLowerCase() !== 'post') return
    recover()
    try { win.localStorage.setItem(SESSION_CHANGE_EVENT_KEY, `${Date.now()}:${Math.random()}`) } catch { /* Storage may be disabled; focus and pageshow still revalidate. */ }
  }
  win.addEventListener('pageshow', check)
  win.addEventListener('pagehide', hidden)
  win.addEventListener('focus', check)
  win.addEventListener('storage', storage)
  doc.addEventListener('visibilitychange', visible)
  doc.addEventListener('submit', submit, true)
  void check()
  return () => {
    disposed = true; generation++; controller?.abort()
    win.removeEventListener('pageshow', check); win.removeEventListener('pagehide', hidden)
    win.removeEventListener('focus', check); win.removeEventListener('storage', storage)
    doc.removeEventListener('visibilitychange', visible); doc.removeEventListener('submit', submit, true)
  }
}
