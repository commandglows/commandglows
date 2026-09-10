import type { APIRoute } from 'astro'
import { handleCampaigns } from '../../../../lib/email/central/campaigns'
export const prerender = false
export const GET: APIRoute = ({ request }) => handleCampaigns(request)
export const POST: APIRoute = ({ request }) => handleCampaigns(request)
