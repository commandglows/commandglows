import { getPostmarkOptions } from '../../../../../convex/emailTransportConfig/postmark'
import type { ConfiguredTransportInput } from './types'
import type {
  DeliveryOutcome,
  EmailTransport,
  TransportMessage,
} from '../messageContract'
import { EmailHttpError } from '../security'
import { EMAIL_UNSUBSCRIBE_PLACEHOLDER } from '../messageContract'

const POSTMARK_UNSUBSCRIBE_PLACEHOLDER = '{{{ pm:unsubscribe }}}'

export interface PostmarkOptions {
  serverToken: string
  environment: 'sandbox' | 'production'
  allowProduction: boolean
  providerMode?: 'Sandbox' | 'Live'
  liveTestReserved?: boolean
  serverId?: number
  transactionalStream?: string
  broadcastStream?: string
}

/** No recipient, token or provider response body is returned in diagnostics. */
export async function sendPostmark(
  message: TransportMessage,
  options: PostmarkOptions,
  fetcher: typeof fetch = fetch
): Promise<DeliveryOutcome> {
  if (
    !options.serverToken ||
    (options.environment === 'production' && !options.allowProduction) ||
    (options.environment === 'sandbox' &&
      options.providerMode === 'Live' &&
      !options.liveTestReserved)
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
      redirect: 'error',
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
        HtmlBody: message.html.replaceAll(
          EMAIL_UNSUBSCRIBE_PLACEHOLDER,
          POSTMARK_UNSUBSCRIBE_PLACEHOLDER
        ),
        TextBody: message.text.replaceAll(
          EMAIL_UNSUBSCRIBE_PLACEHOLDER,
          POSTMARK_UNSUBSCRIBE_PLACEHOLDER
        ),
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
  options: PostmarkOptions,
  fetcher: typeof fetch = fetch
): EmailTransport {
  return {
    capabilities: {
      provider: 'postmark',
      deliversToInbox:
        (options.providerMode ??
          (options.environment === 'sandbox' ? 'Sandbox' : 'Live')) === 'Live',
      supportsIdempotency: false,
      supportsDeliveryEvents: true,
    },
    verify: () => verifyPostmark(options, fetcher),
    send: (message) => sendPostmark(message, options, fetcher),
  }
}

export async function verifyPostmark(
  options: PostmarkOptions,
  fetcher: typeof fetch = fetch
) {
  const providerMode =
    options.providerMode ??
    (options.environment === 'sandbox' ? 'Sandbox' : 'Live')
  const read = async (path: string) => {
    const response = await fetcher(`https://api.postmarkapp.com${path}`, {
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        'X-Postmark-Server-Token': options.serverToken,
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new EmailHttpError('transport_unavailable', 503)
    return response.json()
  }
  const server = await read('/server')
  if (server.ID !== options.serverId || server.DeliveryType !== providerMode)
    throw new EmailHttpError('provider_environment_mismatch', 503)
  const streams = await read('/message-streams')
  const transaction = streams.MessageStreams?.find(
    (s: Record<string, unknown>) => s.ID === options.transactionalStream
  )
  const broadcast = streams.MessageStreams?.find(
    (s: Record<string, unknown>) => s.ID === options.broadcastStream
  )
  if (
    transaction?.MessageStreamType !== 'Transactional' ||
    broadcast?.MessageStreamType !== 'Broadcasts' ||
    transaction.ServerID !== options.serverId ||
    broadcast.ServerID !== options.serverId ||
    transaction.ArchivedAt ||
    broadcast.ArchivedAt ||
    broadcast.SubscriptionManagementConfiguration?.UnsubscribeHandlingType !==
      'Postmark'
  )
    throw new EmailHttpError('provider_stream_mismatch', 503)
}

/** Only this adapter interprets Postmark deployment options. */
export function createConfiguredPostmarkTransport({
  config,
  business,
  env,
  allowProduction,
  liveTestReserved,
  fetcher,
}: ConfiguredTransportInput): EmailTransport {
  const options = getPostmarkOptions(business.delivery)
  const token = options.serverTokenEnv && env[options.serverTokenEnv]
  if (!token || !options.serverId)
    throw new EmailHttpError('configuration_unavailable', 503)
  return createPostmarkTransport(
    {
      serverToken: token,
      serverId: options.serverId,
      transactionalStream: business.delivery.channels.transactional,
      broadcastStream: business.delivery.channels.broadcast,
      providerMode: business.delivery.mode === 'sandbox' ? 'Sandbox' : 'Live',
      liveTestReserved,
      environment: config.environment,
      allowProduction,
    },
    fetcher
  )
}
