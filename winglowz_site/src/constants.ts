import ogImageSrc from '@/assets/images/CommandGlows.png'

const SITE_THEME_COLOR = 'gold'
const SITE_MANIFEST_THEME_COLOR = 'black'
const SITE_MANIFEST_BACKGROUND_COLOR = 'white'
const SITE_SOCIAL_IMAGE_WIDTH = 1200
const SITE_SOCIAL_IMAGE_HEIGHT = 600
const SITE_SOCIAL_IMAGE_TYPE = 'image/png'

export const SITE = {
  name: 'CommandGlows',
  title: 'CommandGlows - Productivity Apps & Training',
  description:
    'Windows training in 8 modules, Obsidian plugins, and Chrome tools for building a practical workflow.',
  author: 'Diane Defores',
  authorName: 'Diane Defores',
  url: 'https://www.commandglows.com',
  domain: 'www.commandglows.com',
  githubUrl: 'https://github.com/diane-defores/commandglows',
  ogImage: '/images/CommandGlows.png',
  emails: {
    contact: 'hello@commandglows.com',
    support: 'support@commandglows.com',
    legal: 'legal@commandglows.com',
    privacy: 'privacy@commandglows.com',
    copyright: 'copyright@commandglows.com',
    newsletter: 'newsletter@commandglows.com',
  },
}

export function getSiteUrl(path = '/') {
  return new URL(path, SITE.url).toString()
}

export function getLocalizedSiteUrl(lang: 'en' | 'fr', path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (lang === 'fr') {
    return getSiteUrl(`/fr${normalizedPath === '/' ? '' : normalizedPath}`)
  }

  return getSiteUrl(normalizedPath)
}

export const SEO = {
  title: SITE.title,
  description: SITE.description,
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    inLanguage: 'en-US',
    '@id': SITE.url,
    url: SITE.url,
    name: SITE.title,
    description: SITE.description,
    isPartOf: {
      '@type': 'WebSite',
      url: SITE.url,
      name: SITE.title,
      description: SITE.description,
    },
  },
}

export const OG = {
  locale: 'en_US',
  type: 'website',
  url: SITE.url,
  title: `CommandGlows - Productivity Apps & Training`,
  description:
    'Windows training in 8 modules, Obsidian plugins, and Chrome tools for building a practical workflow.',
  image: ogImageSrc,
}

export const SITE_VISUAL_TOKENS = {
  themeMeta: {
    website: SITE_THEME_COLOR,
    manifestTheme: SITE_MANIFEST_THEME_COLOR,
    manifestBackground: SITE_MANIFEST_BACKGROUND_COLOR,
    manifestDescription: OG.description,
    twitterCard: 'summary_large_image',
  },
  socialImage: {
    width: SITE_SOCIAL_IMAGE_WIDTH,
    height: SITE_SOCIAL_IMAGE_HEIGHT,
    type: SITE_SOCIAL_IMAGE_TYPE,
  },
  manifestIcons: {
    sizes: [192, 512],
  },
  bio: {
    avatarSize: 96,
    socialIconSize: 26,
    footerYear: 2026,
  },
}
