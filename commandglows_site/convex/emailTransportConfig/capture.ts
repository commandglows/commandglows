import { legacyResourceKeys } from './legacy'
import { invalidConfiguration, type TransportDescriptor } from './types'
export const captureDescriptor: TransportDescriptor = {
  capabilities: { externalDelivery: false },
  configurationPresent() {
    return true
  },
  validate({ mode, options }) {
    if (mode !== 'capture' || Object.keys(options).length)
      invalidConfiguration()
  },
  resourceKeys(delivery) {
    return legacyResourceKeys(delivery)
  },
  routingIdentity({ provider, mode, channels }) {
    return { provider, mode, channels }
  },
}
