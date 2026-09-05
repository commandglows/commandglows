import type { APIRoute } from 'astro'
import { handleCommand } from '../../../../../lib/email/central/api'
export const prerender = false
export const POST: APIRoute = ({ request }) =>
  handleCommand(request, 'transactional')
