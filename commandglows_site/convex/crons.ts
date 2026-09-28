import { anyApi, cronJobs } from 'convex/server'

const crons = cronJobs()
crons.interval('commerce alert recovery', { minutes: 5 }, anyApi.commerceAlerts.sweep)
crons.daily('commerce alert retention', { hourUTC: 3, minuteUTC: 17 }, anyApi.commerceAlertRetention.purgeExpired)
crons.interval('email outbox', { minutes: 1 }, anyApi.emailDelivery.poll, {})
crons.interval('expired site sessions', { minutes: 15 }, anyApi.siteSessions.cleanup, {})
export default crons
