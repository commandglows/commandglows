import React, { useRef, useState } from 'react'
import { commerceEnvironment } from '../../../convex/commerceEventContract'

type EntitlementSummary = {
  productId: string
  plan: string
  status: string
  source: string
  environment?: string
  grantedAt: number | null
  trialExpiresAt: number | null
  updatedAt: number
}

type AccessEventSummary = {
  eventType: string
  productId: string | null
  status: string
  reason: string | null
  environment?: string
  createdAt: number
}

type LicenseAccount = {
  environment?: string
  identities?: { provider: string; providerReference: string; email: string | null; environment: string | null }[]
  eventHistoryTruncated?: boolean
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

const supportPlans = {
  commandglows_app: ['focus', 'power', 'control', 'command', 'lifetime_deal'],
  commandglows_formation: ['formation'],
  communityglows: ['lifetime_deal', 'founder_ltd', 'ltd'],
  gocharbon: ['pro', 'lifetime_deal'],
  contentglowz: ['pro', 'lifetime_deal'],
  shipglows: ['pro', 'lifetime_deal'],
  replayglows: ['pro', 'lifetime_deal'],
  temu_shopping_lists: ['pro', 'lifetime_deal'],
} as const
type SupportProduct = keyof typeof supportPlans

export default function LicenseAdminConsole() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<LicenseAccount | null>(null)
  const [reason, setReason] = useState('')
  const [productId, setProductId] = useState<SupportProduct>('communityglows')
  const [plan, setPlan] = useState<string>('lifetime_deal')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchInfo, setSearchInfo] = useState({ ambiguous: false, truncated: false })
  const [verificationTarget, setVerificationTarget] = useState<string | null>(null)
  const requestSequence = useRef(0)
  const mutationPending = useRef(false)

  async function loadDetail(globalUserId: string) {
    const sequence = ++requestSequence.current
    setDetailLoading(true)
    setReason('')
    setSelected(null)
    try {
      const response = await fetch(
        `/api/admin/licenses?globalUserId=${encodeURIComponent(globalUserId)}`,
        { headers: { Accept: 'application/json' } },
      )
      if (sequence !== requestSequence.current) return
      if (response.status === 401 || response.status === 403) {
        setSessionExpired(response.status === 401)
        setForbidden(true)
        return
      }
      if (!response.ok) throw new Error('detail_failed')
      const detail = (await response.json()) as LicenseAccount
      if (sequence !== requestSequence.current) return
      setSelected(detail)
      setVerificationTarget(null)
      const existing = detail.entitlements.find((entry) => (!detail.environment || commerceEnvironment(entry.environment ?? '') === commerceEnvironment(detail.environment)) && Object.prototype.hasOwnProperty.call(supportPlans, entry.productId))
      if (existing && (supportPlans[existing.productId as SupportProduct] as readonly string[]).includes(existing.plan)) {
        setProductId(existing.productId as SupportProduct)
        setPlan(existing.plan)
      } else {
        setProductId('communityglows')
        setPlan('lifetime_deal')
      }
    } catch (error) {
      if (sequence === requestSequence.current) throw error
    } finally {
      if (sequence === requestSequence.current) setDetailLoading(false)
    }
  }

  async function search(event: { preventDefault(): void }) {
    event.preventDefault()
    if (mutationPending.current || verificationTarget) return
    const sequence = ++requestSequence.current
    const normalized = query.trim()
    if (normalized.length < 3) {
      setMessage('Saisissez un email exact ou un identifiant reconnu.')
      return
    }

    setLoading(true)
    setMessage(null)
    setSelected(null)
    setResults([])
    setReason('')
    setSearchInfo({ ambiguous: false, truncated: false })
    try {
      const response = await fetch(
        `/api/admin/licenses?query=${encodeURIComponent(normalized)}`,
        { headers: { Accept: 'application/json' } },
      )
      if (sequence !== requestSequence.current) return
      if (response.status === 401 || response.status === 403) {
        setSessionExpired(response.status === 401)
        setForbidden(true)
        setResults([])
        return
      }
      if (!response.ok) throw new Error('search_failed')
      const data = (await response.json()) as { results: SearchResult[]; ambiguous?: boolean; truncated?: boolean }
      if (sequence !== requestSequence.current) return
      setSearchInfo({ ambiguous: !!data.ambiguous, truncated: !!data.truncated })
      setResults(data.results)
      setSelected(null)
      if (data.results.length === 0) setMessage('Aucun compte correspondant.')
      if (data.results.length === 1 && !data.ambiguous && !data.truncated) await loadDetail(data.results[0].globalUserId)
    } catch {
      setMessage('La recherche est momentanément indisponible.')
    } finally {
      setLoading(false)
    }
  }

  async function applyAction(action: 'grant' | 'revoke') {
    if (loading || detailLoading || verificationTarget || mutationPending.current) return
    if (!selected || reason.trim().length < 3) {
      setMessage('Ajoutez un motif support explicite.')
      return
    }

    setLoading(true)
    mutationPending.current = true
    const target = selected.account.globalUserId
    setMessage(null)
    try {
      const response = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          globalUserId: selected.account.globalUserId,
          productId,
          plan,
          reason: reason.trim(),
        }),
      })
      if (response.status === 401 || response.status === 403) {
        setSessionExpired(response.status === 401)
        setForbidden(true)
        return
      }
      if (!response.ok && response.status >= 400 && response.status < 500) {
        setMessage('Action refusée. Vérifiez les informations avant une nouvelle tentative.')
        return
      }
      if (!response.ok) throw new Error('action_failed')
      let result: { status?: string } = {}
      try { result = (await response.json()) as { status?: string } } catch { /* A successful HTTP response can still have an unreadable body. */ }
      setReason('')
      const outcome = result.status === 'already_active'
        ? 'Ce droit était déjà actif. Aucun nouvel accès n’a été créé.'
        : result.status === 'already_revoked'
          ? 'Ce droit était déjà révoqué. Aucun accès n’a été retiré.'
          : result.status === 'granted'
            ? 'Accès accordé et journalisé.'
            : result.status === 'revoked'
              ? 'Accès révoqué et journalisé.'
              : 'Réponse reçue, mais résultat inconnu. Vérifiez le détail et le journal avant une autre action.'
      setMessage(outcome)
      setVerificationTarget(target)
      if (!['already_active', 'already_revoked', 'granted', 'revoked'].includes(result.status ?? '')) return
      try {
        await loadDetail(target)
      } catch {
        setMessage(`${outcome} Le détail n’a pas pu être actualisé ; rechargez-le avant toute autre action.`)
      }
    } catch {
      setVerificationTarget(target)
      setMessage('Résultat inconnu. Actualisez le détail et le journal avant toute nouvelle tentative.')
    } finally {
      mutationPending.current = false
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
          {sessionExpired ? 'Connexion requise' : 'Accès administrateur requis'}
        </h2>
        <p className="text-dashboard-text-muted mt-2 text-sm">
          {sessionExpired ? 'Votre session a expiré. Reconnectez-vous puis rechargez la console.' : 'Cette console est réservée aux comptes administrateurs CommandGlows.'}
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
          Rechercher un client
        </label>
        <p className="text-dashboard-text-muted mt-1 text-sm">
          Commencez par son adresse email exacte. Vous pouvez aussi utiliser son identifiant de compte ou une référence fournisseur reconnue.
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
            disabled={loading || detailLoading || !!verificationTarget}
            className="workspace-button workspace-button-primary disabled:opacity-60"
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
      {verificationTarget && (
        <button type="button" disabled={loading || detailLoading} className="workspace-button disabled:opacity-60" onClick={() => void loadDetail(verificationTarget).then(() => setMessage('Détail et journal relus. Vérifiez l’état du droit avant toute intervention.')).catch(() => setMessage('La relecture est indisponible. Les actions restent verrouillées.'))}>
          Relire le détail et le journal
        </button>
      )}
      {searchInfo.ambiguous && <p role="status">Plusieurs comptes correspondent. Vérifiez l’identifiant et les identités avant de choisir un client.</p>}
      {searchInfo.truncated && <p role="status">Recherche limitée : les résultats ne sont pas exhaustifs. Utilisez un email exact ou un identifiant de compte.</p>}

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
                disabled={loading || !!verificationTarget}
                onClick={() => void loadDetail(account.globalUserId).catch(() => setMessage('Le détail est momentanément indisponible. Réessayez la recherche.'))}
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
              <p className="text-dashboard-text-muted text-sm">Compte client</p>
              <h2 id="license-detail-title" className="text-dashboard-text-primary text-xl font-bold">
                {selected.account.email || selected.account.globalUserId}
              </h2>
              <p className="text-dashboard-text-muted mt-1 text-sm">{selected.account.globalUserId}</p>
              <p className="text-dashboard-text-muted mt-1 text-sm">Environnement des interventions : {selected.environment || 'Non renseigné'}</p>
            </div>
            <div className="bg-dashboard-bg-subtle rounded-xl px-4 py-3">
              <span className="text-dashboard-text-muted block text-xs">Installations reconnues</span>
              <strong className="text-dashboard-text-primary text-xl">{selected.recognizedInstallationCount}</strong>
            </div>
          </div>
          {selected.identities && <ul className="text-dashboard-text-muted mt-4 text-sm" aria-label="Identités reconnues">{selected.identities.map((identity, index) => <li key={`${identity.provider}:${identity.providerReference}:${index}`}>{identity.provider} · {identity.providerReference} · {identity.email || 'Email non renseigné'} · {identity.environment || 'Environnement non renseigné'}</li>)}</ul>}

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {selected.entitlements.map((entitlement) => (
              <article key={`${entitlement.productId}:${entitlement.plan}:${entitlement.updatedAt}`} className="border-dashboard-border bg-dashboard-bg-subtle rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-dashboard-text-primary font-bold">{entitlement.productId}</h3>
                    <p className="text-dashboard-text-muted text-sm">{entitlement.plan} · {entitlement.source} · {entitlement.environment || 'Environnement non renseigné'}</p>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="support-product" className="text-dashboard-text-primary block text-sm font-bold">Produit concerné</label>
                <select id="support-product" className="border-dashboard-border bg-dashboard-bg-subtle text-dashboard-text-primary mt-2 min-h-11 w-full rounded-xl border px-3" value={productId} onChange={(event) => {
                  const nextProduct = event.target.value as SupportProduct
                  setProductId(nextProduct)
                  setPlan(supportPlans[nextProduct][0])
                }}>
                  {Object.keys(supportPlans).map((product) => <option key={product} value={product}>{product}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="support-plan" className="text-dashboard-text-primary block text-sm font-bold">Plan concerné</label>
                <select id="support-plan" className="border-dashboard-border bg-dashboard-bg-subtle text-dashboard-text-primary mt-2 min-h-11 w-full rounded-xl border px-3" value={plan} onChange={(event) => setPlan(event.target.value)}>
                  {supportPlans[productId].map((availablePlan) => <option key={availablePlan} value={availablePlan}>{availablePlan}</option>)}
                </select>
              </div>
            </div>
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
              <button type="button" disabled={loading || detailLoading || !!verificationTarget} onClick={() => void applyAction('grant')} className="workspace-button workspace-button-primary disabled:opacity-60">
                Accorder l’accès
              </button>
              <button type="button" disabled={loading || detailLoading || !!verificationTarget} onClick={() => void applyAction('revoke')} className="workspace-button disabled:opacity-60">
                Retirer l’accès
              </button>
            </div>
          </div>

          <div className="mt-7">
            <h3 className="text-dashboard-text-primary font-bold">Historique récent</h3>
            {selected.eventHistoryTruncated && <p className="text-dashboard-text-muted mt-2 text-sm">Seuls les 50 événements les plus récents sont affichés. Cet historique n’est pas exhaustif.</p>}
            {selected.events.length === 0 ? (
              <p className="text-dashboard-text-muted mt-2 text-sm">Aucun événement récent.</p>
            ) : (
              <ol className="mt-3 grid gap-2">
                {selected.events.map((event) => (
                  <li key={`${event.eventType}:${event.createdAt}`} className="border-dashboard-border border-l-2 py-2 pl-4">
                    <strong className="text-dashboard-text-primary block text-sm">{event.eventType}</strong>
                    <span className="text-dashboard-text-muted text-xs">
                      {dateLabel(event.createdAt)} · {event.status} · {event.environment || 'Environnement non renseigné'}{event.reason ? ` · ${event.reason}` : ''}
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
