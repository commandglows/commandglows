import {
  invalidConfiguration,
  type DeliveryConfig,
  type TransportDescriptor,
} from './types'
export const postmarkDescriptor: TransportDescriptor = {
  capabilities: { externalDelivery: true },
  configurationPresent({ options }) {
    return Boolean(options.serverId && options.serverTokenEnv)
  },
  validate({ mode, channels, options }) {
    if (
      !['sandbox', 'live'].includes(mode) ||
      channels.transactional === channels.broadcast
    )
      invalidConfiguration()
    if (
      Object.keys(options).some(
        (key) =>
          !['serverId', 'serverTokenEnv', 'webhookCredentialEnv'].includes(key)
      )
    )
      invalidConfiguration()
    if (
      options.serverId !== undefined &&
      (!Number.isSafeInteger(options.serverId) || Number(options.serverId) < 1)
    )
      invalidConfiguration()
    for (const key of ['serverTokenEnv', 'webhookCredentialEnv'])
      if (
        options[key] !== undefined &&
        (typeof options[key] !== 'string' ||
          !/^EMAIL_[A-Z0-9_]+$/.test(options[key] as string))
      )
        invalidConfiguration()
  },
  resourceKeys({ channels, options }) {
    return options.serverId === undefined
      ? []
      : [
          `postmark:${options.serverId}:${channels.transactional}`,
          `postmark:${options.serverId}:${channels.broadcast}`,
        ]
  },
  routingIdentity({ mode, channels, options }) {
    return {
      transport: 'postmark',
      providerMode: mode === 'sandbox' ? 'Sandbox' : 'Live',
      serverId: options.serverId ?? null,
      serverTokenEnv: options.serverTokenEnv ?? null,
      transactionalStream: channels.transactional,
      broadcastStream: channels.broadcast,
    }
  },
}

export type PostmarkOptions = {
  serverId?: number
  serverTokenEnv?: string
  webhookCredentialEnv?: string
}
export function getPostmarkOptions(delivery: DeliveryConfig): PostmarkOptions {
  if (delivery.provider !== 'postmark') invalidConfiguration()
  postmarkDescriptor.validate(delivery)
  return delivery.options as PostmarkOptions
}
