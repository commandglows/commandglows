import {
  createShipGlowsRedirect,
  getShipGlowsRedirectLocation,
  shipglowsRedirectPaths,
  type ShipGlowsRedirectPath,
} from '@/utils/shipglowsRedirects'
import { ALL as dotfilesRoute } from '@/pages/dotfiles'
import { ALL as frenchDotfilesRoute } from '@/pages/fr/dotfiles'
import { ALL as frenchShipglowsRoute } from '@/pages/fr/shipglows'
import { ALL as frenchShipglowzRoute } from '@/pages/fr/shipglowz'
import { ALL as shipglowsRoute } from '@/pages/shipglows'
import { ALL as shipglowsScriptRoute } from '@/pages/shipglows-script'
import { ALL as shipglowzRoute } from '@/pages/shipglowz'
import { ALL as shipglowzScriptRoute } from '@/pages/shipglowz-script'
import { ALL as dotfilesScriptRoute } from '@/pages/dotfiles-script'

const routeCases = Object.entries(shipglowsRedirectPaths) as Array<
  [ShipGlowsRedirectPath, string]
>

const routeHandlers = {
  '/shipglows': shipglowsRoute,
  '/fr/shipglows': frenchShipglowsRoute,
  '/dotfiles': dotfilesRoute,
  '/fr/dotfiles': frenchDotfilesRoute,
  '/shipglows-script': shipglowsScriptRoute,
  '/dotfiles-script': dotfilesScriptRoute,
  '/shipglowz': shipglowzRoute,
  '/fr/shipglowz': frenchShipglowzRoute,
  '/shipglowz-script': shipglowzScriptRoute,
} satisfies Record<ShipGlowsRedirectPath, NonNullable<(typeof shipglowsRoute)>>

describe('ShipGlows compatibility redirects', () => {
  test.each(routeCases)('%s redirects directly to ShipGlows with status 308', (source, target) => {
    const sourceUrl = new URL(`https://www.commandglows.com${source}`)
    const response = createShipGlowsRedirect(source, sourceUrl)

    expect(response.status).toBe(308)
    expect(response.headers.get('Location')).toBe(`https://shipglows.com${target}`)
  })

  test.each(routeCases)('%s preserves the complete query string', (source, target) => {
    const query = '?format=powershell&tag=a&tag=b&empty=&encoded=a%2Fb%20c'
    const sourceUrl = new URL(`https://www.commandglows.com${source}${query}`)

    expect(getShipGlowsRedirectLocation(source, sourceUrl)).toBe(
      `https://shipglows.com${target}${query}`,
    )
  })

  test.each(routeCases)('%s controller is wired to its exact destination', async (source, target) => {
    const query = '?format=powershell&tag=a&tag=b'
    const response = await routeHandlers[source]({
      url: new URL(`https://www.commandglows.com${source}${query}`),
    } as never)

    expect(response.status).toBe(308)
    expect(response.headers.get('Location')).toBe(`https://shipglows.com${target}${query}`)
  })

  test('uses a closed exact-route map with no child or user-controlled destination', () => {
    expect(Object.keys(shipglowsRedirectPaths)).toEqual([
      '/shipglows',
      '/fr/shipglows',
      '/dotfiles',
      '/fr/dotfiles',
      '/shipglows-script',
      '/dotfiles-script',
      '/shipglowz',
      '/fr/shipglowz',
      '/shipglowz-script',
    ])
    expect(Object.keys(shipglowsRedirectPaths)).not.toContain('/shipglows/child')
    expect(() => getShipGlowsRedirectLocation(
      '/shipglows/child' as ShipGlowsRedirectPath,
      new URL('https://www.commandglows.com/shipglows/child?target=https://evil.example'),
    )).toThrow()
  })
})
