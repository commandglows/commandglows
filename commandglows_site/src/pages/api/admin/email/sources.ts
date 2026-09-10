import type { APIRoute } from 'astro'
import { handleReaderApi } from '../../../../lib/email/readerApi'
export const prerender = false
export const ALL: APIRoute = (context) => handleReaderApi(context)
