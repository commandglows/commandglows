import type { APIRoute } from 'astro'
import { handleCatalog } from '../../../../lib/email/central/catalog'
export const prerender = false
export const GET: APIRoute = ({ request }) => handleCatalog(request)
export const POST: APIRoute = GET
