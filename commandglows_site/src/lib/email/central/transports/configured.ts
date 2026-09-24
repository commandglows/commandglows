import { EmailHttpError } from '../security'
import type { EmailTransport } from '../messageContract'
import type { ConfiguredTransportInput } from './types'
import { createConfiguredCaptureTransport } from './capture'
import { createConfiguredPostmarkTransport } from './postmark'

/** The composition root is the only runtime list of supported delivery adapters. */
const factories: Readonly<
  Record<string, (input: ConfiguredTransportInput) => EmailTransport>
> = {
  postmark: createConfiguredPostmarkTransport,
  capture: createConfiguredCaptureTransport,
}

export function createConfiguredTransport(
  input: ConfiguredTransportInput
): EmailTransport {
  const provider = input.business.delivery.provider
  const factory = Object.hasOwn(factories, provider)
    ? factories[provider]
    : undefined
  if (!factory) throw new EmailHttpError('configuration_unavailable', 503)
  return factory(input)
}
