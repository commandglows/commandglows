export const recommendationImages = [
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240722170602641.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240722170641349.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240722170715647.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240722170731648.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240722170751387.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104159259.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104159444.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104159810.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104200332.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104200667.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104201197.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104202977.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723104203154.webp',
  'https://winflowz.b-cdn.net/desktop%20enhanced%20t%C3%A9moignages-20240723143802609.webp',
].map((src, index) => ({
  src,
  alt: `Capture de recommandation ${index + 1}`,
}))

export const recommendationSections = [
  {
    key: 'time',
    title: {
      fr: 'Ils ont surtout aimé gagner du temps',
      en: 'What they loved most: saving time',
    },
    summary: {
      fr: 'Le premier bénéfice revient tout le temps: moins de recherche, moins d’hésitation, moins de dispersion.',
      en: 'The first benefit keeps coming back: less searching, less hesitation, less friction.',
    },
    imageIndexes: [0, 1, 2, 3],
  },
  {
    key: 'quality',
    title: {
      fr: 'Ils ont aussi salué la qualité de la recherche et de la présentation',
      en: 'They also praised the research and presentation',
    },
    summary: {
      fr: 'Les captures montrent un produit perçu comme structuré, crédible et utile, pas juste “joli”.',
      en: 'The captures show a product seen as structured, credible, and useful, not just “pretty”.',
    },
    imageIndexes: [4, 5, 6, 7, 8],
  },
  {
    key: 'origin',
    title: {
      fr: 'Le lancement AppSumo de juillet 2024 a validé l’idée',
      en: 'The July 2024 AppSumo launch validated the idea',
    },
    summary: {
      fr: 'À l’origine, le projet venait d’un template Notion puis d’un petit produit de 200 astuces Windows, avant de devenir une formation plus ambitieuse.',
      en: 'The project started as a Notion template and a small 200-tip Windows product before becoming a larger course.',
    },
    imageIndexes: [9, 10, 11, 12, 13],
  },
] as const
