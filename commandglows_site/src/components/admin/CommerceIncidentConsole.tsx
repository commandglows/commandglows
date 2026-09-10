import React, { useCallback, useEffect, useRef, useState } from 'react'

type Incident = {
  _id: string; receiptId?: string; kind?: string; providerEventId: string; productId: string; sourceRef?: string;
  status: string; reason?: string; attempts: number; ingressAttempts?: number; queueState: string;
  ownerId?: string; dueAt: number; version: number; overdue: boolean;
  alerts: { id: string; status: string; error: string | null; attempts: number; emailState?: string | null }[];
}
type Candidate = { handoffId: string; productId: string; providerOrderId: string | null; sourceRef: string; checkoutState: string }
type Action = { _id: string; action: string; reason: string; operatorId: string; createdAt: number }
type Detail = { incident: Incident; actions: Action[]; historyTruncated: boolean }
const panel = 'border-dashboard-border bg-dashboard-bg-elevated rounded-2xl border p-5 shadow-sm'
const button = 'border-dashboard-border text-dashboard-text-primary hover:bg-dashboard-bg-hover focus-visible:outline-navbar-ring min-h-11 rounded-xl border px-4 py-2 font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2'
const input = 'border-dashboard-border bg-dashboard-bg-subtle text-dashboard-text-primary focus-visible:outline-navbar-ring min-h-11 w-full rounded-xl border p-3 focus-visible:outline-2 focus-visible:outline-offset-2'
const date = (value: number) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(value)
const label = (value: string) => ({ open: 'À traiter', escalated: 'Escaladé', resolved: 'Résolu', pending: 'À envoyer',
  queued: 'À envoyer', sending: 'Envoi en cours', submitted: 'Transport accepté', unknown: 'Statut transport à vérifier',
  delivering: 'Envoi en cours', delivered: 'Transport accepté', failed: 'Échec de notification', pending_review: 'Vérification nécessaire',
  granted: 'Accès accordé', revoked: 'Accès retiré', suspended: 'Accès suspendu', awaiting_payment: 'Paiement en attente', ingress_failed: 'Événement à récupérer', checkout_unverified: 'Paiement non vérifié — consulter Stripe',
}[value] ?? value)

export default function CommerceIncidentConsole() {
  const [view, setView] = useState<'active' | 'resolved' | 'missing'>('active')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [done, setDone] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [environment, setEnvironment] = useState('')
  const [watchdogStale, setWatchdogStale] = useState(false)
  const loadSequence = useRef(0)
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')
  const [eventId, setEventId] = useState('')
  const [sessionId, setSessionId] = useState('')

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { cache: 'no-store', ...init })
    if (response.status === 401 || response.status === 403) { setForbidden(true); throw new Error('Accès administrateur requis.') }
    if (response.status === 409) throw new Error('Le dossier a changé. Actualisez-le avant une nouvelle action.')
    if (!response.ok) throw new Error('L’opération a échoué. Vérifiez la configuration, les preuves et le dossier, puis réessayez.')
    return response.json()
  }, [])
  const load = useCallback(async (nextCursor: string | null = null) => {
    const sequence = ++loadSequence.current
    const data = await request(`/api/admin/commerce?view=${view}${nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ''}`)
    if (sequence !== loadSequence.current) return
    setEnvironment(data.environment)
    if (typeof data.alertChannelConfigured === 'boolean') setConfigured(data.alertChannelConfigured)
    if (data.watchdog) setWatchdogStale(data.watchdog.stale)
    if (view === 'missing') setCandidates((previous) => nextCursor ? [...previous, ...data.page] : data.page)
    else setIncidents((previous) => nextCursor ? [...previous, ...data.page] : data.page)
    setCursor(data.continueCursor)
    setDone(data.isDone)
  }, [request, view])
  async function refresh() {
    setBusy(true); setError('')
    try { await load(); if (detail) setDetail(await request(`/api/admin/commerce?incidentId=${encodeURIComponent(detail.incident._id)}`)) }
    catch (failure) { setError((failure as Error).message) } finally { setBusy(false) }
  }
  useEffect(() => {
    let active = true
    setDetail(null); setError(''); setBusy(true)
    load().catch((failure) => { if (active) setError(failure.message) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false; loadSequence.current++ }
  }, [load])
  useEffect(() => {
    if (detail || !done || view !== 'active') return
    const timer = window.setInterval(() => {
      if (!document.hidden) void load().catch(() => setError('Actualisation indisponible. Utilisez Actualiser pour réessayer.'))
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [detail, done, view, load])

  async function select(incident: Incident) {
    setBusy(true); setError(''); setReason(''); setEvidence(''); setMessage('')
    try { setDetail(await request(`/api/admin/commerce?incidentId=${encodeURIComponent(incident._id)}`)) }
    catch (failure) { setError((failure as Error).message) } finally { setBusy(false) }
  }
  async function act(action: string) {
    if (reason.trim().length < 3) { setError('Ajoutez un motif précis avant de poursuivre.'); return }
    setBusy(true); setError(''); setMessage('')
    try {
      const data = await request('/api/admin/commerce', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, evidenceReference: evidence, eventId, sessionId,
          incidentId: detail?.incident._id, expectedVersion: detail?.incident.version, expectedAttempts: detail?.incident.attempts }) })
      setMessage(action === 'dry_run'
        ? data.eligible ? 'Reprise autorisée. Cette vérification ne modifie aucun droit.' : 'Reprise indisponible. Récupérez la preuve fournisseur ou escaladez le dossier.'
        : `Opération enregistrée. ${label(data.status ?? data.result?.status ?? 'À vérifier dans le dossier')}`)
      await load()
      if (detail) setDetail(await request(`/api/admin/commerce?incidentId=${encodeURIComponent(detail.incident._id)}`))
    } catch (failure) { setError((failure as Error).message) } finally { setBusy(false) }
  }

  if (forbidden) return <section className={panel} role="alert"><h2 className="text-dashboard-text-primary text-lg font-bold">Administration commerce réservée aux administrateurs</h2></section>
  return <section className="grid gap-5" aria-labelledby="commerce-operations-title" aria-busy={busy}>
    <div className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="commerce-operations-title" className="text-dashboard-text-primary text-xl font-bold">Suivi des achats et incidents</h2>
          <p className="text-dashboard-text-muted mt-2 text-sm">{environment || 'Environnement en cours de vérification'} · Les dossiers sans compte identifié restent visibles. La permanence commerce prend en charge les dossiers non affectés.</p></div>
        <button className={button} disabled={busy} onClick={() => void refresh()}>Actualiser</button>
      </div>
      {configured === false && <p className="text-dashboard-text-primary mt-4 text-sm" role="alert">Canal d’alerte non configuré. Assurez la permanence manuelle et configurez puis vérifiez la réception avant le lancement.</p>}
      {watchdogStale && <p className="text-dashboard-text-primary mt-4 text-sm" role="alert">Surveillance automatique non vérifiée depuis plus de 15 minutes. Consultez les tâches planifiées Convex et assurez le contrôle manuel des sessions Stripe.</p>}
      <nav className="mt-4 flex flex-wrap gap-3" aria-label="Files commerce">
        {(['active', 'resolved', 'missing'] as const).map((entry) => <button key={entry} className={button} aria-pressed={view === entry} disabled={busy} onClick={() => setView(entry)}>
          {{ active: 'À traiter', resolved: 'Résolus', missing: 'Événements absents à vérifier' }[entry]}</button>)}
      </nav>
    </div>
    {error && <p className={panel} role="alert">{error}</p>}
    {message && <p className={panel} role="status">{message}</p>}
    {view !== 'missing' ? <div className="grid gap-3">
      {!busy && incidents.length === 0 && <p className={panel}>Aucun dossier dans cette page.</p>}
      {incidents.map((incident) => <article className={panel} key={incident._id}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div>
          <h3 className="text-dashboard-text-primary font-bold">{incident.productId} · {label(incident.queueState)}{incident.overdue ? ' · Échéance dépassée' : ''}</h3>
          <p className="text-dashboard-text-muted mt-2 break-all text-sm">{incident._id} · {incident.providerEventId}</p>
          <p className="text-dashboard-text-muted mt-2 text-sm">{label(incident.status)} · {incident.reason ?? 'Motif à vérifier'} · {incident.attempts} tentative(s)</p>
          <p className="text-dashboard-text-muted mt-2 text-sm">Responsable : {incident.ownerId ?? 'Permanence commerce — à affecter'} · Échéance : {date(incident.dueAt)}</p>
          {incident.alerts?.map((alert) => {
            const transportState = alert.emailState && alert.emailState !== 'queued' ? alert.emailState : alert.status
            return <p key={alert.id} className="text-dashboard-text-muted mt-2 text-sm">Notification : {label(transportState)} · {alert.attempts} essai(s){alert.error ? ` · ${alert.error}` : ''}</p>
          })}
        </div><button className={button} disabled={busy} onClick={() => void select(incident)}>Ouvrir le dossier</button></div>
      </article>)}
    </div> : <div className="grid gap-3"><p className={panel}>Ces sessions anciennes n’ont pas de reçu de paiement. Un abandon est possible : vérifiez Stripe avant toute conclusion. Parcourez toutes les pages, y compris les pages vides.</p>
      {!busy && candidates.length === 0 && <p className={panel}>Aucune session à vérifier dans cette page.</p>}
      {candidates.map((candidate) => <article className={panel} key={candidate.handoffId}>
        <h3 className="text-dashboard-text-primary font-bold">{candidate.productId} · Paiement non vérifié</h3>
        <p className="text-dashboard-text-muted mt-2 break-all text-sm">{candidate.sourceRef} · {candidate.providerOrderId ?? 'Session non rattachée'} · {candidate.checkoutState}</p>
      </article>)}
    </div>}
    {!done && <button className={button} disabled={busy} onClick={() => {
      setBusy(true); void load(cursor).catch((failure) => setError(failure.message)).finally(() => setBusy(false))
    }}>Afficher la page suivante</button>}
    {detail && <div className={panel}>
      <h3 className="text-dashboard-text-primary text-lg font-bold">Dossier {detail.incident._id}</h3>
      <p className="text-dashboard-text-muted mt-2 text-sm">{label(detail.incident.status)} · Version {detail.incident.version} · {detail.incident.attempts} tentative(s). Une clôture support ne modifie ni le reçu ni les droits.</p>
      {!detail.incident.receiptId && <p className="text-dashboard-text-muted mt-2 text-sm">{detail.incident.kind === 'checkout_verification'
        ? `Paiement non vérifié. Retrouvez la session correspondant à ${detail.incident.sourceRef} dans Stripe, puis récupérez son événement exact. La référence checkout affichée est interne et ne doit pas être saisie comme identifiant Stripe.`
        : `Aucun reçu normalisé. Récupérez l’événement ${detail.incident.providerEventId} depuis Stripe avec le formulaire ci-dessous.`}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button className={button} disabled={busy} onClick={() => void act('claim')}>Prendre en charge</button>
        <button className={button} disabled={busy || !detail.incident.receiptId || detail.incident.status !== 'pending_review'} onClick={() => void act('dry_run')}>Vérifier la reprise</button>
        <button className={button} disabled={busy || !detail.incident.receiptId || detail.incident.status !== 'pending_review' || detail.incident.attempts >= 5} onClick={() => void act('retry')}>Reprendre le traitement</button>
        <button className={button} disabled={busy || !detail.incident.receiptId || detail.incident.status !== 'pending_review' || detail.incident.attempts !== 5} onClick={() => void act('recover')}>Vérifier Stripe et effectuer l’ultime reprise</button>
        <button className={button} disabled={busy} onClick={() => void act('escalate')}>Escalader</button>
        <button className={button} disabled={busy} onClick={() => void act('retry_alert')}>Relancer la notification</button>
      </div>
      <label className="text-dashboard-text-primary mt-4 block text-sm font-bold" htmlFor="commerce-evidence">Référence de résolution externe vérifiée</label>
      <input className={`${input} mt-2`} id="commerce-evidence" value={evidence} maxLength={500} onChange={(event) => setEvidence(event.target.value)} placeholder="Dossier support ou preuve fournisseur, sans secret" />
      <p className="text-dashboard-text-muted mt-2 text-sm">Clôturez uniquement après traitement effectif de l’acheteur. Décrivez le résultat dans le motif ; la référence permet à un autre opérateur de le vérifier.</p>
      <button className={`${button} mt-3`} disabled={busy || evidence.trim().length < 3} onClick={() => void act('resolve')}>Clôturer le dossier sans modifier les droits</button>
      <h4 className="text-dashboard-text-primary mt-5 font-bold">Historique des opérations</h4>
      <ol className="mt-3 grid gap-2">{detail.actions.map((action) => <li key={action._id} className="text-dashboard-text-muted break-words text-sm">{date(action.createdAt)} · {action.operatorId} · {action.action} · {action.reason}</li>)}</ol>
      {detail.historyTruncated && <p className="text-dashboard-text-muted mt-2 text-sm">Les 50 dernières actions sont affichées. L’historique complet est conservé dans le journal opérateur.</p>}
    </div>}
    <div className={panel}>
      <label htmlFor="commerce-reason" className="text-dashboard-text-primary block font-bold">Motif obligatoire pour toute opération</label>
      <textarea id="commerce-reason" className={`${input} mt-2`} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="Vérification réalisée, traitement attendu et référence utile. Aucun secret ni donnée bancaire." />
      <h3 className="text-dashboard-text-primary mt-5 font-bold">Récupérer un événement manquant</h3>
      <p className="text-dashboard-text-muted mt-2 text-sm">Copiez l’identifiant exact dans Stripe. Le serveur récupère et vérifie les preuves avant de traiter l’achat. Un événement déjà reçu conserve son résultat.</p>
      <label htmlFor="commerce-event" className="text-dashboard-text-primary mt-3 block text-sm">Identifiant d’événement Stripe</label>
      <input id="commerce-event" className={`${input} mt-2`} value={eventId} maxLength={255} onChange={(event) => setEventId(event.target.value)} placeholder="evt_…" />
      <button className={`${button} mt-3`} disabled={busy || !eventId.startsWith('evt_')} onClick={() => void act('reconcile')}>Vérifier et récupérer l’événement</button>
      <label htmlFor="commerce-session" className="text-dashboard-text-primary mt-5 block text-sm">Session Stripe terminée dont le rattachement a échoué</label>
      <input id="commerce-session" className={`${input} mt-2`} value={sessionId} maxLength={255} onChange={(event) => setSessionId(event.target.value)} placeholder="cs_…" />
      <button className={`${button} mt-3`} disabled={busy || !sessionId.startsWith('cs_')} onClick={() => void act('repair_checkout')}>Vérifier et réparer le rattachement</button>
    </div>
  </section>
}
