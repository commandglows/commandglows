import type { APIRoute } from 'astro'
import { handleCampaignApi } from '../../../../lib/email/central/campaignApi'

export const prerender = false
export const ALL: APIRoute = ({ request, locals, params }) =>
  handleCampaignApi({ request, locals }, params.path ?? '')
