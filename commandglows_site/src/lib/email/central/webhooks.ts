import { createHmac } from 'node:crypto'
import { getServerEnv } from '../../serverEnv'
import { convexMutation, errorResponse, json, type Mutation } from './api'
import { bearer, EmailHttpError, readJson } from './security'
import { authorizeHttp } from './worker'

function webhookCredential(request: Request) {
  const header = request.headers.get('x-commandglows-email-webhook-token')
  if (header && /^[^\s]{32,4096}$/.test(header)) return header
  const authorization = request.headers.get('authorization') ?? ''
  const basic = /^Basic\s+(.+)$/i.exec(authorization)
  if (basic) {
    try {
      const decoded = Buffer.from(basic[1], 'base64').toString('utf8')
      const separator = decoded.indexOf(':')
      const password = separator >= 0 ? decoded.slice(separator + 1) : ''
      if (password && /^[^\s]{32,4096}$/.test(password)) return password
    } catch {
      throw new EmailHttpError('invalid_authorization', 401)
    }
  }
  return bearer(request)
}

function isPostmarkVerificationProbe(event: Record<string, unknown>) {
  return Number(event.ServerID) === 0
}

export async function handlePostmarkWebhook(
  request: Request,
  env = getServerEnv(),
  injected?: Mutation
) {
  try {
    const businessId = new URL(request.url).searchParams.get('business_id')
    const event = await readJson(request, 32_768)
    let credential: string
    try {
      // Configured Authorization or HttpHeaders value on the Postmark webhook.
      credential = webhookCredential(request)
    } catch (error) {
      if (isPostmarkVerificationProbe(event)) {
        return json(200, { status: 'verified_probe' })
      }
      throw error
    }
    let business: ReturnType<typeof authorizeHttp>['business']
    try {
      ;({ business } = authorizeHttp(env, credential, businessId, 'webhook'))
    } catch (error) {
      if (isPostmarkVerificationProbe(event)) {
        return json(200, { status: 'verified_probe' })
      }
      throw error
    }
    if (event.ServerID !== undefined) {
      const serverId = Number(event.ServerID)
      const postmarkVerificationProbe = isPostmarkVerificationProbe(event)
      if (serverId !== business.serverId) {
        const status = postmarkVerificationProbe
          ? 'verified_probe'
          : 'provider_server_mismatch'
        return json(200, { status })
      }
    }
    if (
      typeof event.MessageStream !== 'string' ||
      ![business.broadcastStream, business.transactionalStream].includes(
        event.MessageStream
      )
    )
      throw new EmailHttpError('invalid_stream', 422)
    const email = event.Recipient ?? event.Email
    if (typeof email !== 'string' || email.length > 254)
      throw new EmailHttpError('invalid_request', 400)
    let type = 'ignored'
    if (event.RecordType === 'Delivery') type = 'delivery'
    if (event.RecordType === 'SpamComplaint') type = 'complaint'
    if (event.RecordType === 'Bounce')
      type =
        event.Type === 'HardBounce'
          ? 'hard_bounce'
          : event.Type === 'SpamComplaint'
            ? 'complaint'
            : event.Inactive === true
              ? 'suppressed'
              : 'soft_bounce'
    if (event.RecordType === 'SubscriptionChange') {
      if (typeof event.SuppressSending !== 'boolean')
        throw new EmailHttpError('invalid_request', 400)
      type = !event.SuppressSending
        ? 'reactivate'
        : event.SuppressionReason === 'SpamComplaint'
          ? 'complaint'
          : event.SuppressionReason === 'HardBounce'
            ? 'hard_bounce'
            : event.SuppressionReason === 'ManualSuppression' &&
                event.Origin === 'Recipient'
              ? 'unsubscribe'
              : 'suppressed'
    }
    const eventDate =
      event.DeliveredAt ??
      event.BouncedAt ??
      event.ChangedAt ??
      event.ReceivedAt
    if (
      typeof eventDate !== 'string' ||
      !Number.isFinite(Date.parse(eventDate))
    )
      throw new EmailHttpError('invalid_event_time', 400)
    const providerMessageId =
      typeof event.MessageID === 'string' && event.MessageID
        ? event.MessageID
        : undefined
    if (providerMessageId && !/^[a-zA-Z0-9-]{1,128}$/.test(providerMessageId))
      throw new EmailHttpError('invalid_request', 400)
    const eventId = createHmac('sha256', credential)
      .update(
        JSON.stringify([
          business.id,
          event.RecordType,
          event.ID ?? null,
          providerMessageId ?? null,
          email.toLowerCase().trim(),
          event.MessageStream,
          eventDate,
          event.SuppressSending ?? null,
          event.SuppressionReason ?? null,
          event.Origin ?? null,
        ])
      )
      .digest('hex')
    const result = await (injected ?? convexMutation(env))('email:webhook', {
      credential,
      businessId: business.id,
      eventId,
      email,
      type,
      streamId: event.MessageStream,
      occurredAt: Date.parse(eventDate),
      ...(providerMessageId ? { providerMessageId } : {}),
      ...(event.Metadata &&
      typeof event.Metadata === 'object' &&
      'message_id' in event.Metadata &&
      typeof event.Metadata.message_id === 'string'
        ? { internalMessageId: event.Metadata.message_id }
        : {}),
    })
    return json(200, result)
  } catch (error) {
    return errorResponse(error)
  }
}
