import type { APIRoute } from 'astro'
import { handleDispatch } from '../../../../lib/email/central/worker'
export const prerender = false
export const POST: APIRoute = ({ request }) => handleDispatch(request)
