import { invalidConfiguration, type DeliveryConfig } from './types'
const legacyRouting = new WeakMap<DeliveryConfig, Record<string, unknown>>()
const flatKeys = [
  'transport',
  'providerMode',
  'serverId',
  'serverTokenEnv',
  'webhookCredentialEnv',
  'transactionalStream',
  'broadcastStream',
]
/** Input-only bridge for deployed profiles; business consumers see only delivery. */
export function normalizeBusinessDelivery(
  business: Record<string, any>,
  environment: string
) {
  const result = { ...business }
  if (business.delivery !== undefined) {
    if (flatKeys.some((key) => business[key] !== undefined))
      invalidConfiguration()
    return result
  }
  if (
    business.providerMode !== undefined &&
    !['Sandbox', 'Live'].includes(business.providerMode)
  )
    invalidConfiguration()
  const provider = business.transport ?? 'postmark'
  const providerMode =
    business.providerMode ?? (environment === 'sandbox' ? 'Sandbox' : 'Live')
  const delivery: DeliveryConfig = {
    provider,
    mode:
      provider === 'capture'
        ? 'capture'
        : providerMode === 'Sandbox'
          ? 'sandbox'
          : 'live',
    channels: {
      transactional: business.transactionalStream,
      broadcast: business.broadcastStream,
    },
    options:
      provider === 'capture'
        ? {}
        : Object.fromEntries(
            ['serverId', 'serverTokenEnv', 'webhookCredentialEnv']
              .filter((key) => business[key] !== undefined)
              .map((key) => [key, business[key]])
          ),
  }
  legacyRouting.set(delivery, {
    transport: provider,
    providerMode,
    serverId: business.serverId ?? null,
    serverTokenEnv: business.serverTokenEnv ?? null,
    transactionalStream: business.transactionalStream,
    broadcastStream: business.broadcastStream,
  })
  for (const key of flatKeys) delete result[key]
  result.delivery = delivery
  return result
}
export function legacyRoutingIdentity(delivery: DeliveryConfig) {
  return legacyRouting.get(delivery)
}

/** Historical capture profiles also reserved their configured provider streams. */
export function legacyResourceKeys(delivery: DeliveryConfig): string[] {
  const route = legacyRouting.get(delivery)
  return route?.serverId == null
    ? []
    : [
        `postmark:${route.serverId}:${route.transactionalStream}`,
        `postmark:${route.serverId}:${route.broadcastStream}`,
      ]
}
