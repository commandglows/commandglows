import { anyApi, cronJobs } from 'convex/server'

const crons = cronJobs()
crons.interval('commerce alert recovery', { minutes: 5 }, anyApi.commerceAlerts.sweep)
crons.interval('email outbox', { minutes: 1 }, anyApi.emailDelivery.poll, {})
export default crons
