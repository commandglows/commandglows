import type { APIRoute } from 'astro'
import { handleOperations } from '../../../../lib/email/central/operations'
export const prerender = false
export const GET: APIRoute = ({ request }) => handleOperations(request)
export const POST: APIRoute = ({ request }) => handleOperations(request)
