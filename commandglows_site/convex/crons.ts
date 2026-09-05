import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()
crons.interval('email outbox', { minutes: 1 }, internal.emailDelivery.poll, {})
export default crons
