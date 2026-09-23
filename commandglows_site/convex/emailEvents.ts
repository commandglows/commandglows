/** Provider adapters for campaign analytics.  Bodies and arbitrary payloads are never retained. */
import type { CampaignMetricEvent, MetricEventType, ScannerClass } from './emailMetrics'

export type ProviderEventInput = {
  businessId: string
  eventId: string
  type: string
  messageId?: string
  providerMessageId?: string
  campaignId?: string
  versionId?: string
  recipientKey?: string
  segmentIds?: string[]
  mailboxProvider?: string
  occurredAt?: number
  receivedAt?: number
  scannerClass?: ScannerClass
  correlation?: CampaignMetricEvent['correlation']
  automated?: boolean
  attributed?: boolean
}

const typeMap: Record<string, MetricEventType> = {
  delivery: 'delivered', delivered: 'delivered',
  accepted: 'provider_accepted', provider_accepted: 'provider_accepted',
  bounce: 'bounce_permanent', hard_bounce: 'bounce_permanent', soft_bounce: 'bounce_temporary',
  complaint: 'complaint', spam_complaint: 'complaint', unsubscribe: 'unsubscribe',
  click: 'click', reply: 'reply', attempt: 'attempt', failure: 'technical_failure',
  technical_failure: 'technical_failure',
}

/** Normalize a provider fact to the minimal privacy-safe analytics envelope. */
export function adaptProviderEvent(input: ProviderEventInput): CampaignMetricEvent | null {
  const type = typeMap[input.type.toLowerCase()]
  if (!type || !input.businessId || !input.eventId) return null
  if (type === 'reply' && (input.automated || input.correlation !== 'safe')) {
    return {
      eventId: input.eventId,
      businessId: input.businessId,
      type,
      campaignId: input.campaignId,
      versionId: input.versionId,
      messageId: input.messageId,
      providerMessageId: input.providerMessageId,
      recipientKey: input.recipientKey,
      segmentIds: input.segmentIds,
      mailboxProvider: input.mailboxProvider || 'unknown',
      occurredAt: input.occurredAt ?? input.receivedAt ?? Date.now(),
      receivedAt: input.receivedAt,
      scannerClass: 'not_applicable',
      correlation: input.correlation ?? 'unknown',
      attributed: input.attributed,
      automated: input.automated,
    }
  }
  return {
    eventId: input.eventId,
    businessId: input.businessId,
    type,
    campaignId: input.campaignId,
    versionId: input.versionId,
    messageId: input.messageId,
    providerMessageId: input.providerMessageId,
    recipientKey: input.recipientKey,
    segmentIds: input.segmentIds ? [...new Set(input.segmentIds)] : undefined,
    mailboxProvider: input.mailboxProvider || 'unknown',
    occurredAt: input.occurredAt ?? input.receivedAt ?? Date.now(),
    receivedAt: input.receivedAt,
    scannerClass: type === 'click' ? input.scannerClass ?? 'unknown' : 'not_applicable',
    correlation: input.correlation ?? (input.campaignId ? 'safe' : 'unknown'),
    attributed: input.attributed,
    automated: input.automated,
  }
}

/** Reply adapter deliberately emits metadata only; no subject/body is retained. */
export function adaptReplyEvent(input: Omit<ProviderEventInput, 'type'> & { automated?: boolean; correlation?: CampaignMetricEvent['correlation'] }) {
  return adaptProviderEvent({ ...input, type: 'reply', correlation: input.correlation ?? 'unknown' })
}
