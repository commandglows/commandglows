import React, { useEffect, useState } from 'react'

interface AuthNavActionProps {
  className: string
  overviewLabel: string
  settingsLabel: string
  signInLabel: string
  signInUrl: string
  tasksLabel: string
}

export default function AuthNavAction({ className, overviewLabel, settingsLabel, signInLabel, signInUrl, tasksLabel }: AuthNavActionProps) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const french = signInUrl.startsWith('/fr/')
  useEffect(() => {
    let controller: AbortController | null = null
    const refreshSession = () => {
      controller?.abort()
      const currentController = new AbortController()
      controller = currentController
      fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', signal: currentController.signal })
      .then(async (response) => {
        if (!response.ok) return false
        const session: unknown = await response.json()
        return Boolean(session && typeof session === 'object' && 'userId' in session && typeof session.userId === 'string' && session.userId.length > 0)
      })
      .then((value) => { if (!currentController.signal.aborted) setSignedIn(value) })
      .catch(() => { if (!currentController.signal.aborted) setSignedIn(false) })
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshSession()
    }
    refreshSession()
    window.addEventListener('pageshow', refreshSession)
    window.addEventListener('focus', refreshSession)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      controller?.abort()
      window.removeEventListener('pageshow', refreshSession)
      window.removeEventListener('focus', refreshSession)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  const submitSignOut = async (event: { preventDefault: () => void }) => {
    event.preventDefault()
    setSigningOut(true)
    setSignedIn(false)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'text/html' } })
    } finally {
      window.location.replace(french ? '/fr' : '/')
    }
  }

  if (signedIn === null) return <span className={className} role="status">{french ? 'Chargement…' : 'Loading…'}</span>
  if (!signedIn) return <a href={signInUrl} className={className}>{signInLabel}</a>
  return (
    <details className="account-menu-shell relative">
      <summary className={`${className} account-menu-trigger min-h-11 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2`}>{overviewLabel}</summary>
      <div className="absolute right-0 z-50 mt-2 min-w-52 rounded-xl border border-content-border bg-content-bg-elevated p-2 text-content-text-primary shadow-lg">
        <a className="flex min-h-11 items-center rounded-lg px-3 hover:underline" href="/dashboard">{overviewLabel}</a>
        <a className="flex min-h-11 items-center rounded-lg px-3 hover:underline" href="/dashboard/taches">{tasksLabel}</a>
        <a className="flex min-h-11 items-center rounded-lg px-3 hover:underline" href="/dashboard/parametres">{settingsLabel}</a>
        <form method="post" action="/api/auth/logout" onSubmit={submitSignOut}>
          <button type="submit" disabled={signingOut} className="min-h-11 w-full rounded-lg px-3 text-left hover:underline disabled:opacity-60">{french ? 'Se déconnecter' : 'Sign out'}</button>
        </form>
      </div>
    </details>
  )
}
