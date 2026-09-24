import type { EmailConfig } from '../../../../../convex/emailConfig'

/** Common context passed to a registered adapter; provider options stay opaque. */
export interface ConfiguredTransportInput {
  config: EmailConfig
  business: EmailConfig['businesses'][number]
  env: Record<string, string | undefined>
  allowProduction: boolean
  liveTestReserved: boolean
  fetcher: typeof fetch
}
