import type { APIRoute } from 'astro'
import { handleNewsletterSubscribeRequest } from '@/lib/email/central/newsletterRoutes'

export const prerender = false
export const POST: APIRoute = ({ request }) =>
  handleNewsletterSubscribeRequest(request)
