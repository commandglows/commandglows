import { renderNewsletterEmail } from '../../src/lib/email/newsletter';

/**
 * Official bilingual render fixtures for the production newsletter renderer.
 * They are not a separate template or token authority.
 */
export const BASIC_EMAIL_FIXTURES = {
  en: renderNewsletterEmail({
    lang: 'en',
    content: {
      subject: 'Your CommandGlows workflow is ready',
      heading: 'A calmer Windows workflow starts here',
      intro: 'Your practical setup guide is ready.',
      body: 'Use it to reduce repeated actions and keep your tools easier to reach.',
      cta: 'Open the guide',
      footer: 'You are receiving this because you subscribed to CommandGlows updates.',
      unsubscribe: 'Unsubscribe',
    },
    ctaUrl: 'https://www.commandglows.com/windows-mastery',
    unsubscribeUrl:
      'https://www.commandglows.com/api/newsletter/unsubscribe?email=reader%40example.com&lang=en',
  }),
  fr: renderNewsletterEmail({
    lang: 'fr',
    content: {
      subject: 'Votre environnement CommandGlows est prêt',
      heading: 'Un environnement Windows plus calme commence ici',
      intro: 'Votre guide de configuration pratique est prêt.',
      body: 'Utilisez-le pour réduire les actions répétitives et garder vos outils à portée de main.',
      cta: 'Ouvrir le guide',
      footer: 'Vous recevez cet e-mail car vous êtes inscrit(e) aux actualités CommandGlows.',
      unsubscribe: 'Se désabonner',
    },
    ctaUrl: 'https://www.commandglows.com/fr/maitrise-windows',
    unsubscribeUrl:
      'https://www.commandglows.com/api/newsletter/unsubscribe?email=lecteur%40example.com&lang=fr',
  }),
} as const;

export default BASIC_EMAIL_FIXTURES;
