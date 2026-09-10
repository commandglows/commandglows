import type { APIRoute } from 'astro'
import { handleOperatorRelay } from '../../../lib/email/central/operatorRelay'
export const prerender = false
export const GET: APIRoute = ({ request, locals }) =>
  handleOperatorRelay(request, locals.siteAuth().userId)
export const POST: APIRoute = GET
