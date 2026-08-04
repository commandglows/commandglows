import type { APIRoute } from 'astro'

export const prerender = false

/**
 * Polar webhook proxy — forwards to Convex HTTP endpoint
 * which handles signature verification and calls internal mutations.
 *
 * This proxy exists so existing webhook URLs continue to work.
 * For new setups, point Polar webhooks directly at:
 *   https://<deployment>.convex.site/polar/events
 */
export const POST: APIRoute = async ({ request }) => {
	const convexUrl = import.meta.env.PUBLIC_CONVEX_URL
	if (!convexUrl || convexUrl === 'https://PLACEHOLDER.convex.cloud') {
		return new Response('Convex is not configured', { status: 500 })
	}

	const convexSiteUrl = convexUrl.replace('.convex.cloud', '.convex.site')
	const body = await request.text()

	try {
		const response = await fetch(`${convexSiteUrl}/polar/events`, {
			method: 'POST',
			body,
			headers: {
				'Content-Type': 'application/json',
				'webhook-id': request.headers.get('webhook-id') ?? '',
				'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
				'webhook-signature': request.headers.get('webhook-signature') ?? '',
			},
		})

		const responseBody = await response.text()
		return new Response(responseBody, { status: response.status })
	} catch (error) {
		console.error('Failed to forward Polar webhook to Convex:', error)
		return new Response('Webhook forwarding failed', { status: 500 })
	}
}
