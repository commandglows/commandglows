import type { Language } from '@/types'

interface NavigationItem {
  name: string
  href: string
  icon: string
}

interface Navigation {
  customer: NavigationItem[]
  administration: NavigationItem[]
}

const icons = {
  overview: `<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`,
  settings: `<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8a4 4 0 100 8 4 4 0 000-8zm8 4a8 8 0 01-.1 1.3l1.5 1.2-1.5 2.6-1.8-.6a8.2 8.2 0 01-2.2 1.3l-.3 1.9h-3l-.3-1.9a8.2 8.2 0 01-2.2-1.3l-1.8.6-1.5-2.6 1.5-1.2A8 8 0 019 12c0-.4 0-.9.1-1.3L7.6 9.5l1.5-2.6 1.8.6a8.2 8.2 0 012.2-1.3l.3-1.9h3l.3 1.9a8.2 8.2 0 012.2 1.3l1.8-.6 1.5 2.6-1.5 1.2c.1.4.1.9.1 1.3z" /></svg>`,
  recovery: `<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 12h10M7 17h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>`,
  newsletter: `<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5h16v14H4zM4 5l8 7 8-7" /></svg>`,
  licenses: `<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l7 3v5c0 4.5-2.9 8.6-7 10-4.1-1.4-7-5.5-7-10V6l7-3zM9 12l2 2 4-4" /></svg>`,
}

export async function getNavigation(
  lang: Language = 'fr',
  role?: 'admin' | 'user',
  options: { showNewsletter?: boolean } = {},
): Promise<Navigation> {
  const customer: NavigationItem[] = [
    {
      name: lang === 'fr' ? "Vue d'ensemble" : 'Overview',
      href: lang === 'fr' ? '/fr/dashboard/' : '/dashboard',
      icon: icons.overview,
    },
    {
      name: lang === 'fr' ? 'Paramètres du compte' : 'Account settings',
      href: lang === 'fr' ? '/fr/dashboard/parametres' : '/dashboard/settings',
      icon: icons.settings,
    },
    {
      name: lang === 'fr' ? 'Retrouver mes achats' : 'Recover purchases',
      href: lang === 'fr' ? '/fr/account/link-existing' : '/account/link-existing',
      icon: icons.recovery,
    },
  ]

  const administration: NavigationItem[] = role === 'admin'
    ? [
        ...(options.showNewsletter ? [{
          name: 'Newsletters',
          href: lang === 'fr' ? '/fr/dashboard/newsletters' : '/dashboard/newsletters',
          icon: icons.newsletter,
        }] : []),
        {
          name: lang === 'fr' ? 'Console licences' : 'License console',
          href: '/dashboard/licences',
          icon: icons.licenses,
        },
      ]
    : []

  return { customer, administration }
}
