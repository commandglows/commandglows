import { createHmac } from 'node:crypto'
import { getServerEnv } from '../../serverEnv'
import { convexMutation, errorResponse, json, type Mutation } from './api'
import { bearer, EmailHttpError, readJson } from './security'
import { authorizeHttp } from './worker'

export async function handlePostmarkWebhook(
  request: Request,
  env = getServerEnv(),
  injected?: Mutation
) {
  try {
    // Configured Authorization header on the Postmark webhook. Verify before reading PII.
    const credential = bearer(request)
    const businessId = new URL(request.url).searchParams.get('business_id')
    const { business } = authorizeHttp(env, credential, businessId, 'webhook')
    const event = await readJson(request, 32_768)
    if (event.ServerID !== undefined && event.ServerID !== business.serverId)
      throw new EmailHttpError('forbidden', 403)
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
