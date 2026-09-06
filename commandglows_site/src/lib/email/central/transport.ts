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

export interface EmailTransport {
  send(message: TransportMessage): Promise<DeliveryOutcome>
}

export interface PostmarkOptions {
  serverToken: string
  environment: 'sandbox' | 'production'
  allowProduction: boolean
}

/** No recipient, token or provider response body is returned in diagnostics. */
export async function sendPostmark(
  message: TransportMessage,
  options: PostmarkOptions,
  fetcher: typeof fetch = fetch
): Promise<DeliveryOutcome> {
  if (
    !options.serverToken ||
    (options.environment === 'production' && !options.allowProduction)
  ) {
    return { status: 'permanent_failure', reasonCode: 'transport_not_enabled' }
  }
  if (
    !message.streamId ||
    !message.from ||
    !message.to ||
    !message.text ||
    !message.html
  ) {
    return {
      status: 'permanent_failure',
      reasonCode: 'invalid_transport_message',
    }
  }
  let response: Response
  try {
    response = await fetcher('https://api.postmarkapp.com/email', {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Postmark-Server-Token': options.serverToken,
      },
      body: JSON.stringify({
        From: message.from,
        To: message.to,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
        MessageStream: message.streamId,
        TrackOpens: false,
        TrackLinks: 'None',
        Metadata: {
          message_id: message.messageId,
          business_id: message.businessId,
        },
      }),
    })
  } catch {
    // Postmark has no idempotency key. The server may have accepted this request.
    return { status: 'unknown', reasonCode: 'submission_unconfirmed' }
  }
  if (response.status === 429) {
    const seconds = Number(response.headers.get('retry-after'))
    return {
      status: 'retryable_failure',
      reasonCode: 'provider_rate_limited',
      retryAfterMs:
        Number.isFinite(seconds) && seconds > 0
          ? Math.min(seconds * 1000, 3_600_000)
          : 60_000,
    }
  }
  // A gateway/server failure does not prove that submission was rolled back.
  if (response.status >= 500 || response.status === 408) {
    return { status: 'unknown', reasonCode: 'provider_submission_uncertain' }
  }
  let body: { ErrorCode?: unknown; MessageID?: unknown }
  try {
    body = await response.json()
  } catch {
    return { status: 'unknown', reasonCode: 'invalid_provider_receipt' }
  }
  if (response.ok && typeof body.ErrorCode !== 'number') {
    return { status: 'unknown', reasonCode: 'invalid_provider_receipt' }
  }
  if (!response.ok || body.ErrorCode !== 0) {
    return {
      status: 'permanent_failure',
      reasonCode:
        body.ErrorCode === 406 ? 'recipient_inactive' : 'provider_rejected',
    }
  }
  if (
    typeof body.MessageID !== 'string' ||
    !/^[a-zA-Z0-9-]{1,128}$/.test(body.MessageID)
  ) {
    return { status: 'unknown', reasonCode: 'invalid_provider_receipt' }
  }
  return { status: 'submitted', providerMessageId: body.MessageID }
}

export function createPostmarkTransport(
  options: PostmarkOptions
): EmailTransport {
  return { send: (message) => sendPostmark(message, options) }
}
