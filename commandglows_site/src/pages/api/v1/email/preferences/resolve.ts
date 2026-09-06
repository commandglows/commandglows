import type { APIRoute } from 'astro'
import { handlePreferences } from '../../../../../lib/email/central/preferences'
export const prerender = false
export const GET: APIRoute = ({ request }) => handlePreferences(request)
export const POST: APIRoute = ({ request }) => handlePreferences(request)
