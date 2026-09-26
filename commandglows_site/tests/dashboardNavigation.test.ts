import { describe, expect, test } from 'vitest'
import { getNavigation } from '@/utils/fr/navigation'

describe('dashboard navigation', () => {
  test('shows customer links for a regular user', async () => {
    const navigation = await getNavigation('fr', 'user', { showNewsletter: true })
    expect(navigation.customer.map((item) => item.href)).toEqual([
      '/fr/dashboard/', '/fr/dashboard/parametres', '/fr/account/link-existing',
    ])
    expect(navigation.administration).toEqual([])
  })

  test('only offers the newsletter console when enabled for an admin', async () => {
    const hidden = await getNavigation('en', 'admin', { showNewsletter: false })
    expect(hidden.administration.map((item) => item.href)).toEqual(['/dashboard/licences'])

    const enabled = await getNavigation('en', 'admin', { showNewsletter: true })
    expect(enabled.administration.map((item) => item.href)).toEqual([
      '/dashboard/newsletters', '/dashboard/licences',
    ])
  })
})
