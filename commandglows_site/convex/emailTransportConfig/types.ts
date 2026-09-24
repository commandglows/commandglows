export type DeliveryConfig = {
  provider: string
  mode: 'capture' | 'sandbox' | 'live'
  channels: { transactional: string; broadcast: string }
  options: Record<string, unknown>
}
export type TransportDescriptor = {
  capabilities: { externalDelivery: boolean }
  configurationPresent(delivery: DeliveryConfig): boolean
  validate(delivery: DeliveryConfig): void
  resourceKeys(delivery: DeliveryConfig): string[]
  routingIdentity(delivery: DeliveryConfig): Record<string, unknown>
}
export function invalidConfiguration(): never {
  throw new Error('configuration_unavailable')
}
