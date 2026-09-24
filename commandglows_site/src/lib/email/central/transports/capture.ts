import type { EmailTransport, TransportMessage } from '../messageContract'

/** Explicit local adapter: acceptance here is capture evidence, never delivery evidence. */
export function createCaptureTransport(
  capture: (message: TransportMessage) => void
): EmailTransport {
  return {
    capabilities: {
      provider: 'capture',
      deliversToInbox: false,
      supportsIdempotency: false,
      supportsDeliveryEvents: false,
    },
    async verify() {},
    async send(message) {
      capture(structuredClone(message))
      return {
        status: 'submitted',
        providerMessageId: `capture-${message.messageId}`,
        reasonCode: 'captured_locally',
      }
    },
  }
}

/** Local capture needs no provider credentials. */
export function createConfiguredCaptureTransport(): EmailTransport {
  return createCaptureTransport(() => {})
}
