import { anyApi, cronJobs } from 'convex/server'

const crons = cronJobs()
crons.interval('commerce alert recovery', { minutes: 5 }, anyApi.commerceAlerts.sweep)
export default crons
