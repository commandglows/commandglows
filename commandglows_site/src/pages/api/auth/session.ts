import type { APIRoute } from 'astro'
export const prerender = false
export const GET: APIRoute = ({ locals }) => {
  const auth = locals.siteAuth()
  return new Response(JSON.stringify({ userId: auth.userId, provider: auth.provider }), {
    status: auth.unavailable ? 503 : 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Cookie' },
  })
}
