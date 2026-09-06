import type { APIRoute } from 'astro'
import { handlePostmarkWebhook } from '../../../../../lib/email/central/webhooks'
export const prerender = false
export const POST: APIRoute = ({ request }) => handlePostmarkWebhook(request)
