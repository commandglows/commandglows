import type { APIRoute } from 'astro'
import { handleStripeWebhook } from './stripe'

export const prerender = false
export const POST: APIRoute = async ({ request }) => handleStripeWebhook(request, 'contentglows')
