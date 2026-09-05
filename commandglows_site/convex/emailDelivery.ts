import { internalAction } from './_generated/server'
import { parseEmailConfig } from './emailConfig'

/** The scheduled poll recovers persisted outbox work after request/worker failures. */
export const poll = internalAction({
  args: {},
  handler: async () => {
    if (!process.env.EMAIL_CONTROL_CONFIG) return { status: 'disabled' }
    const config = parseEmailConfig(process.env.EMAIL_CONTROL_CONFIG)
    const credential = process.env.EMAIL_DISPATCH_CREDENTIAL
    if (!credential || credential.length < 32) return { status: 'disabled' }
    let processed = 0
    let failed = 0
    for (const business of config.businesses) {
      if (!business.activated) continue
      if (!business.publicBaseUrl) throw new Error('email_worker_unconfigured')
      const url = new URL('/api/v1/email/dispatch', business.publicBaseUrl)
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error('email_worker_unconfigured')
      let response: Response
      try {
        response = await fetch(url.href, {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(45_000),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${credential}`,
          },
          body: JSON.stringify({ business_id: business.id }),
        })
      } catch {
        failed++
        continue
      }
      if (!response.ok) {
        failed++
        continue
      }
      processed++
    }
    if (failed) throw new Error('email_worker_unavailable')
    return { status: 'polled', businesses: processed }
  },
})
