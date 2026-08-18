import { useState } from 'react'

type EntitlementSummary = {
  productId: string
  plan: string
  status: string
  source: string
  grantedAt: number | null
  trialExpiresAt: number | null
  updatedAt: number
}

type AccessEventSummary = {
  eventType: string
  productId: string | null
  status: string
  reason: string | null
  createdAt: number
}

type LicenseAccount = {
  account: {
    globalUserId: string
    email: string | null
    createdAt: number
    updatedAt: number
  }
  entitlements: EntitlementSummary[]
  events: AccessEventSummary[]
  recognizedInstallationCount: number
}

type SearchResult = {
  globalUserId: string
  email: string | null
  entitlementCount: number
  activeEntitlementCount: number
  recognizedInstallationCount: number
  updatedAt: number
}

const dateLabel = (value: number | null) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(value)
    : 'Non renseignée'

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    active: 'Active',
    trialing: 'Essai actif',
    revoked: 'Révoquée',
    refunded: 'Remboursée',
    expired: 'Expirée',
    pending_review: 'À vérifier',
  }
  return labels[status] ?? status
}

export default function LicenseAdminConsole() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<LicenseAccount | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)

  async function loadDetail(globalUserId: string) {
    const response = await fetch(
      `/api/admin/licenses?globalUserId=${encodeURIComponent(globalUserId)}`,
      { headers: { Accept: 'application/json' } },
    )
    if (response.status === 403) {
      setForbidden(true)
      return
    }
    if (!response.ok) throw new Error('detail_failed')
    setSelected((await response.json()) as LicenseAccount)
  }

  async function search(event: { preventDefault(): void }) {
    event.preventDefault()
    const normalized = query.trim()
    if (normalized.length < 3) {
      setMessage('Saisissez un email exact ou un identifiant reconnu.')
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const response = await fetch(
        `/api/admin/licenses?query=${encodeURIComponent(normalized)}`,
        { headers: { Accept: 'application/json' } },
      )
      if (response.status === 403) {
        setForbidden(true)
        setResults([])
        return
      }
      if (!response.ok) throw new Error('search_failed')
      const data = (await response.json()) as { results: SearchResult[] }
      setResults(data.results)
      setSelected(null)
      if (data.results.length === 0) setMessage('Aucun compte correspondant.')
      if (data.results.length === 1) await loadDetail(data.results[0].globalUserId)
    } catch {
      setMessage('La recherche est momentanément indisponible.')
    } finally {
      setLoading(false)
    }
  }

  async function applyAction(action: 'grant' | 'revoke') {
    if (!selected || reason.trim().length < 3) {
      setMessage('Ajoutez un motif support explicite.')
      return
    }

    setLoading(true)
    setMessage(null)
    try {
      const entitlement = selected.entitlements.find(
        (entry) => entry.productId === 'communityglows',
      )
      const response = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          globalUserId: selected.account.globalUserId,
          productId: 'communityglows',
          plan: entitlement?.plan ?? 'lifetime_deal',
          reason: reason.trim(),
        }),
      })
      if (response.status === 403) {
        setForbidden(true)
        return
      }
      if (!response.ok) throw new Error('action_failed')
      setReason('')
      setMessage(
        action === 'grant'
          ? 'Accès accordé et journalisé.'
          : 'Accès révoqué et journalisé.',
      )
      await loadDetail(selected.account.globalUserId)
    } catch {
      setMessage('L’action n’a pas pu être appliquée. Aucun état local n’a été supposé.')
    } finally {
      setLoading(false)
    }
  }

  if (forbidden) {
    return (
      <section
        className="border-dashboard-border bg-dashboard-bg-elevated rounded-2xl border p-6 shadow-sm"
        role="alert"
      >
        <h2 className="text-dashboard-text-primary text-lg font-bold">
          Accès administrateur requis
        </h2>
        <p className="text-dashboard-text-muted mt-2 text-sm">
          Cette console est réservée aux comptes administrateurs CommandGlows.
        </p>
      </section>
    )
  }

  return (
    <div className="grid gap-6">
      <form
        onSubmit={search}
        className="border-dashboard-border bg-dashboard-bg-elevated rounded-2xl border p-5 shadow-sm"
      >
        <label htmlFor="license-search" className="text-dashboard-text-primary block text-sm font-bold">
          Rechercher une licence
        </label>
        <p className="text-dashboard-text-muted mt-1 text-sm">
          Email exact, identifiant global ou référence fournisseur reconnue.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            id="license-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="border-dashboard-border bg-dashboard-bg-subtle text-dashboard-text-primary focus-visible:outline-navbar-ring min-h-11 flex-1 rounded-xl border px-4 focus-visible:outline-2 focus-visible:outline-offset-2"
            maxLength={160}
            autoComplete="off"
            placeholder="cliente@exemple.com"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-magenta text-button-text-primary focus-visible:outline-navbar-ring min-h-11 rounded-xl px-5 font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {loading ? 'Recherche…' : 'Rechercher'}
          </button>
        </div>
      </form>

      {message && (
        <p className="border-dashboard-border bg-dashboard-bg-subtle text-dashboard-text-primary rounded-xl border px-4 py-3 text-sm" aria-live="polite">
          {message}
        </p>
      )}

      {results.length > 0 && (
        <section aria-labelledby="license-results-title">
          <h2 id="license-results-title" className="text-dashboard-text-primary text-lg font-bold">
            Comptes correspondants
          </h2>
          <div className="mt-3 grid gap-3">
            {results.map((account) => (
              <button
                key={account.globalUserId}
                type="button"
                onClick={() => void loadDetail(account.globalUserId)}
                className="border-dashboard-border bg-dashboard-bg-elevated hover:bg-dashboard-bg-hover focus-visible:outline-navbar-ring rounded-2xl border p-4 text-left shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span className="text-dashboard-text-primary block font-bold">
                  {account.email || account.globalUserId}
                </span>
                <span className="text-dashboard-text-muted mt-1 block text-sm">
                  {account.globalUserId} · {account.entitlementCount} droit(s) · {account.recognizedInstallationCount} installation(s)
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {selected && (
        <section className="border-dashboard-border bg-dashboard-bg-elevated rounded-2xl border p-5 shadow-sm" aria-labelledby="license-detail-title">
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <div>
              <p className="text-dashboard-text-muted text-sm">Compte canonique</p>
              <h2 id="license-detail-title" className="text-dashboard-text-primary text-xl font-bold">
                {selected.account.email || selected.account.globalUserId}
              </h2>
              <p className="text-dashboard-text-muted mt-1 text-sm">{selected.account.globalUserId}</p>
            </div>
            <div className="bg-dashboard-bg-subtle rounded-xl px-4 py-3">
              <span className="text-dashboard-text-muted block text-xs">Installations reconnues</span>
              <strong className="text-dashboard-text-primary text-xl">{selected.recognizedInstallationCount}</strong>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {selected.entitlements.map((entitlement) => (
              <article key={`${entitlement.productId}:${entitlement.plan}:${entitlement.updatedAt}`} className="border-dashboard-border bg-dashboard-bg-subtle rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-dashboard-text-primary font-bold">{entitlement.productId}</h3>
                    <p className="text-dashboard-text-muted text-sm">{entitlement.plan} · {entitlement.source}</p>
                  </div>
                  <span className="border-dashboard-border text-dashboard-text-primary rounded-full border px-3 py-1 text-xs font-bold">{statusLabel(entitlement.status)}</span>
                </div>
                <dl className="text-dashboard-text-muted mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt>Accès activé</dt>
                    <dd className="text-dashboard-text-primary font-semibold">{dateLabel(entitlement.grantedAt)}</dd>
                  </div>
                  {entitlement.trialExpiresAt && (
                    <div className="flex justify-between gap-3">
                      <dt>Fin d’essai</dt>
                      <dd className="text-dashboard-text-primary font-semibold">{dateLabel(entitlement.trialExpiresAt)}</dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>

          <div className="mt-6">
            <label htmlFor="support-reason" className="text-dashboard-text-primary block text-sm font-bold">
              Motif support obligatoire
            </label>
            <textarea
              id="support-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="border-dashboard-border bg-dashboard-bg-subtle text-dashboard-text-primary focus-visible:outline-navbar-ring mt-2 min-h-24 w-full rounded-xl border p-3 focus-visible:outline-2 focus-visible:outline-offset-2"
              maxLength={500}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="button" disabled={loading} onClick={() => void applyAction('grant')} className="bg-brand-magenta text-button-text-primary focus-visible:outline-navbar-ring min-h-11 rounded-xl px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
                Accorder l’accès
              </button>
              <button type="button" disabled={loading} onClick={() => void applyAction('revoke')} className="border-dashboard-border text-dashboard-text-primary hover:bg-dashboard-bg-hover focus-visible:outline-navbar-ring min-h-11 rounded-xl border px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
                Révoquer l’accès
              </button>
            </div>
          </div>

          <div className="mt-7">
            <h3 className="text-dashboard-text-primary font-bold">Historique récent</h3>
            {selected.events.length === 0 ? (
              <p className="text-dashboard-text-muted mt-2 text-sm">Aucun événement récent.</p>
            ) : (
              <ol className="mt-3 grid gap-2">
                {selected.events.map((event) => (
                  <li key={`${event.eventType}:${event.createdAt}`} className="border-dashboard-border border-l-2 py-2 pl-4">
                    <strong className="text-dashboard-text-primary block text-sm">{event.eventType}</strong>
                    <span className="text-dashboard-text-muted text-xs">
                      {dateLabel(event.createdAt)} · {event.status}{event.reason ? ` · ${event.reason}` : ''}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
