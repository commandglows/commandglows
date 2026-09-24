export type DeliveryOutcome = {
  status: 'submitted' | 'retryable_failure' | 'permanent_failure' | 'unknown'
  providerMessageId?: string
  reasonCode?: string
  retryAfterMs?: number
}

export interface TransportMessage {
  messageId: string
  businessId: string
  to: string
  from: string
  streamId: string
  streamClass: 'transactional' | 'broadcast'
  subject: string
  html: string
  text: string
}

export interface TransportCapabilities {
  provider: string
  deliversToInbox: boolean
  supportsIdempotency: boolean
  supportsDeliveryEvents: boolean
}
export interface EmailTransport {
  capabilities: TransportCapabilities
  verify(): Promise<void>
  send(message: TransportMessage): Promise<DeliveryOutcome>
}

export const EMAIL_UNSUBSCRIBE_PLACEHOLDER = '{{{ email:unsubscribe }}}'
