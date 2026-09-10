import type { Feature } from '@/types/roadmap'

export type PublicUpdateStatus = 'shipped' | 'improved' | 'in-progress'

export type PublicUpdate = {
  slug: string
  date: string
  productId: string
  status: PublicUpdateStatus
  title: {
    en: string
    fr: string
  }
  summary: {
    en: string
    fr: string
  }
  relatedFeatureKeys?: string[]
}

export const PUBLIC_UPDATES: PublicUpdate[] = [
  {
    slug: 'roadmap-feedback-changelog',
    date: '2026-09-09',
    productId: 'commandglows',
    status: 'shipped',
    title: {
      en: 'Roadmap, feedback, and public changelog connected',
      fr: 'Roadmap, feedback et changelog public reliés',
    },
    summary: {
      en: 'The site now exposes a public updates page, links the footer status to the latest publication, and keeps product roadmap views reachable.',
      fr: 'Le site affiche maintenant une page de nouveautés publique, relie le statut du footer à la dernière publication, et garde les vues roadmap par produit accessibles.',
    },
    relatedFeatureKeys: ['commandglows-guide-v2'],
  },
  {
    slug: 'windows-mastery-catalog-refresh',
    date: '2026-05-03',
    productId: 'commandglows',
    status: 'improved',
    title: {
      en: 'Windows Mastery catalog refresh',
      fr: 'Mise à jour du catalogue Maîtrise Windows',
    },
    summary: {
      en: 'The training pages and catalog copy were refined so visitors can understand the offer and its current state more clearly.',
      fr: 'Les pages de formation et les textes du catalogue ont été clarifiés pour mieux montrer l’offre et son état actuel.',
    },
  },
]

export function getPublishedUpdates(productId?: string) {
  const updates = productId
    ? PUBLIC_UPDATES.filter((update) => update.productId === productId)
    : PUBLIC_UPDATES

  return [...updates].sort((a, b) => b.date.localeCompare(a.date))
}

export function getLatestPublishedUpdate(productId?: string) {
  return getPublishedUpdates(productId)[0] ?? null
}

export function getUpdateUrl(lang: 'en' | 'fr') {
  return lang === 'fr' ? '/fr/nouveautes' : '/updates'
}

export function getFeatureUpdate(feature: Feature) {
  return PUBLIC_UPDATES.find((update) => {
    if (feature.updateSlug && update.slug === feature.updateSlug) {
      return true
    }

    return update.relatedFeatureKeys?.includes(feature.key)
  })
}
