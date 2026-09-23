/**
 * Campaign analytics for the human-controlled delivery contract (R06).
 *
 * This module is intentionally pure.  It consumes the immutable facts stored
 * by the delivery/event ledgers and never imports provider payloads or reply
 * bodies into analytics.
 */

export type MetricEventType =
  | 'attempt'
  | 'provider_accepted'
  | 'delivered'
  | 'bounce_temporary'
  | 'bounce_permanent'
  | 'technical_failure'
  | 'complaint'
  | 'unsubscribe'
  | 'click'
  | 'reply'

export type ScannerClass = 'known' | 'suspect' | 'unknown' | 'not_applicable'

export type CampaignMetricEvent = {
  eventId: string
  businessId: string
  type: MetricEventType
  campaignId?: string
  versionId?: string
  messageId?: string
  attemptId?: string
  providerMessageId?: string
  recipientKey?: string
  segmentIds?: string[]
  mailboxProvider?: string
  occurredAt: number
  receivedAt?: number
  scannerClass?: ScannerClass
  attributed?: boolean
  correlation?: 'safe' | 'unsafe' | 'unknown'
  automated?: boolean
}

export type MetricWindow = { from: number; to: number }

export type MetricRate = {
  numerator: number
  denominator: number
  value: number | null
  window: MetricWindow
  sampleSize: number
  freshnessAt: number | null
  coverage: number
  complete: boolean
}

export type CampaignMetrics = {
  attempts: number
  providerAccepted: number
  delivered: number
  temporaryBounces: number
  permanentBounces: number
  technicalFailures: number
  complaints: number
  unsubscribes: number
  qualifiedClicks: number
  rawClicks: number
  uniqueReplies: number
  unattributed: number
  unknownMailboxProvider: number
  rates: {
    acceptance: MetricRate
    delivery: MetricRate
    temporaryBounce: MetricRate
    permanentBounce: MetricRate
    complaint: MetricRate
    unsubscribe: MetricRate
    qualifiedClick: MetricRate
    attributedReply: MetricRate
  }
  bySegment: Record<string, CampaignMetrics>
  byMailboxProvider: Record<string, CampaignMetrics>
}

const EVENT_TYPES = new Set<MetricEventType>([
  'attempt', 'provider_accepted', 'delivered', 'bounce_temporary',
  'bounce_permanent', 'technical_failure', 'complaint', 'unsubscribe',
  'click', 'reply',
])

const keyFor = (event: CampaignMetricEvent) =>
  event.attemptId || event.messageId || event.providerMessageId || event.eventId

const unique = <T>(values: T[]) => [...new Set(values)]

function rate(
  numerator: number,
  denominator: number,
  window: MetricWindow,
  sampleSize: number,
  freshnessAt: number | null,
  coverage: number,
  complete = coverage >= 1,
): MetricRate {
  return {
    numerator,
    denominator,
    value: denominator > 0 && complete ? numerator / denominator : null,
    window,
    sampleSize,
    freshnessAt,
    coverage,
    complete,
  }
}

/** Deduplicate immutable facts without allowing an event to be reassigned. */
export function deduplicateMetricEvents(events: CampaignMetricEvent[]) {
  const seen = new Set<string>()
  return events.filter((event) => {
    if (!event.eventId || !event.businessId || !EVENT_TYPES.has(event.type)) return false
    const key = `${event.businessId}:${event.eventId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function attributed(event: CampaignMetricEvent) {
  return event.attributed !== false && event.correlation !== 'unsafe' && event.correlation !== 'unknown' && Boolean(event.campaignId)
}

function project(events: CampaignMetricEvent[], window: MetricWindow, filter: (e: CampaignMetricEvent) => boolean) {
  return events.filter((event) => event.occurredAt >= window.from && event.occurredAt < window.to && filter(event))
}

function buildMetrics(events: CampaignMetricEvent[], window: MetricWindow): CampaignMetrics {
  const attempts = unique(project(events, window, (e) => e.type === 'attempt' && attributed(e)).map(keyFor))
  const delivered = unique(project(events, window, (e) => e.type === 'delivered' && attributed(e)).map(keyFor))
  const accepted = unique(project(events, window, (e) => e.type === 'provider_accepted' && attributed(e)).map(keyFor))
  const temporary = unique(project(events, window, (e) => e.type === 'bounce_temporary' && attributed(e)).map(keyFor))
  const permanent = unique(project(events, window, (e) => e.type === 'bounce_permanent' && attributed(e)).map(keyFor))
  const failures = unique(project(events, window, (e) => e.type === 'technical_failure' && attributed(e)).map(keyFor))
  const deliveryKeys = new Set(delivered)
  const engagement = (e: CampaignMetricEvent) => Boolean(e.recipientKey) && attributed(e) && deliveryKeys.has(keyFor(e))
  const complaints = unique(project(events, window, (e) => e.type === 'complaint' && engagement(e)).map((e) => e.recipientKey!))
  const unsubscribes = unique(project(events, window, (e) => e.type === 'unsubscribe' && engagement(e)).map((e) => e.recipientKey!))
  const rawClicks = unique(project(events, window, (e) => e.type === 'click' && engagement(e)).map((e) => `${e.recipientKey}:${e.messageId ?? e.providerMessageId ?? e.eventId}`)).length
  const qualifiedClicks = unique(project(events, window, (e) => e.type === 'click' && engagement(e) && (e.scannerClass === 'known' || e.scannerClass === undefined)).map((e) => e.recipientKey!)).length
  const replies = unique(project(events, window, (e) => e.type === 'reply' && Boolean(e.recipientKey) && attributed(e) && !e.automated && e.correlation === 'safe').map((e) => e.recipientKey!))
  const freshnessAt = events.length ? Math.max(...events.map((e) => e.receivedAt ?? e.occurredAt)) : null
  // Coverage is the proportion of facts in the requested window that have a
  // safe campaign attribution.  It is deliberately not inferred from the
  // last campaign seen and is capped at one when several facts describe one
  // attempt.
  const inWindowEvents = events.filter((e) => e.occurredAt >= window.from && e.occurredAt < window.to)
  const coverage = inWindowEvents.length
    ? inWindowEvents.filter((e) => attributed(e)).length / inWindowEvents.length
    : 1
  const sample = attempts.length
  const rates = {
    acceptance: rate(accepted.length, sample, window, sample, freshnessAt, coverage),
    delivery: rate(delivered.length, sample, window, sample, freshnessAt, coverage),
    temporaryBounce: rate(temporary.length, sample, window, sample, freshnessAt, coverage),
    permanentBounce: rate(permanent.length, sample, window, sample, freshnessAt, coverage),
    complaint: rate(complaints.length, delivered.length, window, delivered.length, freshnessAt, coverage),
    unsubscribe: rate(unsubscribes.length, delivered.length, window, delivered.length, freshnessAt, coverage),
    qualifiedClick: rate(qualifiedClicks, delivered.length, window, delivered.length, freshnessAt, coverage),
    attributedReply: rate(replies.length, delivered.length, window, delivered.length, freshnessAt, coverage),
  }
  const unattributed = project(events, window, (e) => !attributed(e) || e.correlation === 'unknown').length
  const unknownMailboxProvider = unique(project(events, window, (e) => attributed(e) && (!e.mailboxProvider || e.mailboxProvider === 'unknown')).map(keyFor)).length
  return { attempts: sample, providerAccepted: accepted.length, delivered: delivered.length, temporaryBounces: temporary.length, permanentBounces: permanent.length, technicalFailures: failures.length, complaints: complaints.length, unsubscribes: unsubscribes.length, qualifiedClicks, rawClicks, uniqueReplies: replies.length, unattributed, unknownMailboxProvider, rates, bySegment: {}, byMailboxProvider: {} }
}

/** Aggregate one campaign, including non-overcounting segment breakdowns. */
export function aggregateCampaignMetrics(input: { events: CampaignMetricEvent[]; businessId: string; campaignId: string; window: MetricWindow }): CampaignMetrics {
  const events = deduplicateMetricEvents(input.events).filter((e) => e.businessId === input.businessId && (e.campaignId === input.campaignId || !e.campaignId))
  // Keep events with no campaign id in the aggregate as an explicit
  // unattributed bucket; never guess their campaign from recency.
  const scoped = events.filter((e) => e.campaignId === input.campaignId || !e.campaignId)
  const result = buildMetrics(scoped, input.window)
  const segments = unique(scoped.flatMap((e) => e.segmentIds ?? []))
  for (const segment of segments) result.bySegment[segment] = buildMetrics(scoped.filter((e) => e.segmentIds?.includes(segment)), input.window)
  const providers = unique(scoped.map((e) => e.mailboxProvider || 'unknown'))
  for (const provider of providers) result.byMailboxProvider[provider] = buildMetrics(scoped.filter((e) => (e.mailboxProvider || 'unknown') === provider), input.window)
  return result
}
