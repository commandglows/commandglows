import type { APIRoute } from 'astro'
import { createShipGlowsRedirect } from '@/utils/shipglowsRedirects'

export const prerender = false

export const ALL: APIRoute = ({ url }) => createShipGlowsRedirect('/fr/shipglowz', url)
