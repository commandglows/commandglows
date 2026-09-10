import { anyApi, cronJobs } from 'convex/server'
import { internal } from './_generated/api'
import { makeFunctionReference } from 'convex/server'

const crons = cronJobs()
crons.interval('email outbox', { minutes: 1 }, internal.emailDelivery.poll, {})
crons.interval(
  'email campaign recovery',
  { minutes: 1 },
  makeFunctionReference<'mutation'>('emailCampaigns:recover') as any,
  {}
)
crons.interval('commerce alert recovery', { minutes: 5 }, anyApi.commerceAlerts.sweep)
export default crons
