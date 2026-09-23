import { adaptProviderEvent, adaptReplyEvent } from '../../convex/emailEvents'
import {
  aggregateCampaignMetrics,
  deduplicateMetricEvents,
  type CampaignMetricEvent,
} from '../../convex/emailMetrics'

const base = {
  businessId: 'studio',
  campaignId: 'campaign',
  occurredAt: 100,
  receivedAt: 110,
}
const event = (patch: Partial<CampaignMetricEvent>): CampaignMetricEvent => ({
  ...base,
  eventId: `event-${Math.random()}`,
  type: 'attempt',
  messageId: `message-${Math.random()}`,
  recipientKey: `recipient-${Math.random()}`,
  correlation: 'safe',
  ...patch,
})

it('deduplicates immutable provider events by business and event id', () => {
  const first = event({ eventId: 'same' })
  expect(
    deduplicateMetricEvents([first, { ...first, type: 'delivered' }])
  ).toEqual([first])
  expect(
    deduplicateMetricEvents([{ ...first, businessId: 'other' }, first])
  ).toHaveLength(2)
})

it('keeps overlapping segments out of the global total and counts each recipient once', () => {
  const events = [
    event({
      eventId: 'a',
      type: 'attempt',
      messageId: 'm1',
      recipientKey: 'r1',
      segmentIds: ['vip', 'fr'],
    }),
    event({
      eventId: 'a-delivery',
      type: 'delivered',
      messageId: 'm1',
      recipientKey: 'r1',
      segmentIds: ['vip', 'fr'],
    }),
    event({
      eventId: 'b',
      type: 'attempt',
      messageId: 'm2',
      recipientKey: 'r2',
      segmentIds: ['vip'],
    }),
    event({
      eventId: 'b-delivery',
      type: 'delivered',
      messageId: 'm2',
      recipientKey: 'r2',
      segmentIds: ['vip'],
    }),
    event({
      eventId: 'b-click',
      type: 'click',
      messageId: 'm2',
      recipientKey: 'r2',
      segmentIds: ['vip'],
      scannerClass: 'known',
    }),
  ]
  const result = aggregateCampaignMetrics({
    events,
    businessId: 'studio',
    campaignId: 'campaign',
    window: { from: 0, to: 200 },
  })
  expect(result.attempts).toBe(2)
  expect(result.delivered).toBe(2)
  expect(result.qualifiedClicks).toBe(1)
  expect(result.bySegment.vip.delivered).toBe(2)
  expect(result.bySegment.fr.delivered).toBe(1)
  expect(result.rates.delivery.value).toBe(1)
})

it('preserves incomplete coverage and excludes complaints without known delivery', () => {
  const events = [
    event({
      eventId: 'attempt',
      type: 'attempt',
      messageId: 'm1',
      recipientKey: 'r1',
    }),
    event({
      eventId: 'complaint',
      type: 'complaint',
      messageId: 'm2',
      recipientKey: 'r2',
    }),
    event({
      eventId: 'late',
      type: 'reply',
      messageId: 'm3',
      recipientKey: 'r3',
      correlation: 'unknown',
    }),
  ]
  const result = aggregateCampaignMetrics({
    events,
    businessId: 'studio',
    campaignId: 'campaign',
    window: { from: 0, to: 200 },
  })
  expect(result.complaints).toBe(0)
  expect(result.uniqueReplies).toBe(0)
  expect(result.unattributed).toBe(1)
  expect(result.rates.complaint.value).toBeNull()
  expect(result.rates.complaint.numerator).toBe(0)
})

it('does not retain reply bodies and rejects automated/unattributed replies', () => {
  const reply = adaptReplyEvent({
    businessId: 'studio',
    eventId: 'reply-1',
    campaignId: 'campaign',
    messageId: 'm1',
    recipientKey: 'r1',
    body: 'private',
    automated: true,
  } as any)
  expect(reply).toMatchObject({
    type: 'reply',
    automated: true,
    correlation: 'unknown',
  })
  expect(reply).not.toHaveProperty('body')
  expect(
    adaptProviderEvent({
      businessId: 'studio',
      eventId: 'click-1',
      type: 'click',
      campaignId: 'campaign',
      messageId: 'm1',
    })
  ).toMatchObject({ scannerClass: 'unknown', mailboxProvider: 'unknown' })
})
