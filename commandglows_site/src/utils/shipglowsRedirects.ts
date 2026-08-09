const SHIPGLOWS_ORIGIN = 'https://shipglows.com'

export const shipglowsRedirectPaths = {
	'/shipglows': '/shipglows',
	'/fr/shipglows': '/fr/shipglows',
	'/dotfiles': '/dotfiles',
	'/fr/dotfiles': '/fr/dotfiles',
	'/shipglows-script': '/shipglows-script',
	'/dotfiles-script': '/dotfiles-script',
	'/shipglowz': '/shipglows',
	'/fr/shipglowz': '/fr/shipglows',
	'/shipglowz-script': '/shipglows-script',
} as const

export type ShipGlowsRedirectPath = keyof typeof shipglowsRedirectPaths

export function getShipGlowsRedirectLocation(
	path: ShipGlowsRedirectPath,
	sourceUrl: URL,
): string {
	if (!Object.hasOwn(shipglowsRedirectPaths, path)) {
		throw new TypeError(`Unsupported ShipGlows redirect path: ${path}`)
	}

	const destination = new URL(shipglowsRedirectPaths[path], SHIPGLOWS_ORIGIN)
	destination.search = sourceUrl.search
	return destination.href
}

export function createShipGlowsRedirect(
	path: ShipGlowsRedirectPath,
	sourceUrl: URL,
): Response {
	return new Response(null, {
		status: 308,
		headers: {
			Location: getShipGlowsRedirectLocation(path, sourceUrl),
		},
	})
}
