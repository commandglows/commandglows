import { captureDescriptor } from './capture'
import { postmarkDescriptor } from './postmark'
import { invalidConfiguration, type TransportDescriptor } from './types'
const descriptors: Record<string, TransportDescriptor> = {
  capture: captureDescriptor,
  postmark: postmarkDescriptor,
}
export function getTransportDescriptor(provider: string): TransportDescriptor {
  if (!Object.prototype.hasOwnProperty.call(descriptors, provider))
    invalidConfiguration()
  return descriptors[provider]
}
