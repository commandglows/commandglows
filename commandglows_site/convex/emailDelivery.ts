import { internalAction } from './_generated/server'
import { anyApi } from 'convex/server'
import { authorize, parseEmailConfig } from './emailConfig'

/** The scheduled poll recovers persisted outbox work after request/worker failures. */
export const poll = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!process.env.EMAIL_CONTROL_CONFIG) return { status: 'disabled' }
    const config = parseEmailConfig(process.env.EMAIL_CONTROL_CONFIG)
    const credential = process.env.EMAIL_DISPATCH_CREDENTIAL
    if (!credential || credential.length < 32) return { status: 'disabled' }
    let processed = 0
    let failed = 0
    for (const business of config.businesses) {
      if (!business.activated) continue
      let campaignDispatch = false
      try {
        authorize(credential, business.id, 'campaign_dispatch')
        campaignDispatch = true
      } catch {
        /* Existing dispatch-only clients remain supported. */
      }
      if (campaignDispatch) {
        try {
          await ctx.runMutation(anyApi.emailCampaigns.pump, {
            credential,
            businessId: business.id,
          })
        } catch {
          failed++
        }
      }
      let url: URL
      try {
        if (!business.publicBaseUrl)
          throw new Error('email_worker_unconfigured')
        url = new URL('/api/v1/email/dispatch', business.publicBaseUrl)
        if (url.protocol !== 'https:' || url.username || url.password)
          throw new Error('email_worker_unconfigured')
      } catch {
        failed++
        continue
      }
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
