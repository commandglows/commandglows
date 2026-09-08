import type { APIRoute } from 'astro'
import { handleSupportApi } from '../../../../../lib/email/support/api'
export const prerender = false
export const ALL: APIRoute = ({ request, locals, params }) =>
  handleSupportApi({ request, locals }, params.path ?? '')
