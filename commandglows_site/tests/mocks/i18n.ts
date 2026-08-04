import { vi } from 'vitest';
import type { Translation } from '@/types/i18n';

// Mock des traductions UI
export const mockUI: Translation = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success'
  }
};

// Mock des traductions de la page d'accueil
export const mockHome: Translation = {
  hero: {
    title: 'Welcome',
    description: 'Test description'
  },
  features: {
    title: 'Features',
    list: ['Feature 1', 'Feature 2']
  },
  statistics: {
    hasTestimonials: true,
    hasStatistics: true,
    statisticsType: 'default',
    items: [
      { value: '100+', label: 'Users' },
      { value: '50+', label: 'Features' }
    ]
  }
};

// Mock des traductions des fonctionnalités
export const mockFeatures: Translation = {
  title: 'Features',
  list: ['Feature 1', 'Feature 2']
};

// Mock des routes
export const mockRoutes: Translation = {
  home: 'home',
  features: 'features',
  blog: 'blog'
};

// Configuration du mock avant les tests
vi.mock('@/utils/i18n', () => {
  return {
    useUI: () => Promise.resolve(mockUI),
    useTranslations: (lang: string, page: string) => {
      const translations: Record<string, Translation> = {
        home: mockHome,
        features: mockFeatures
      };
      return Promise.resolve(translations[page] || {});
    },
    useRoutes: () => Promise.resolve(mockRoutes),
    getLangFromUrl: () => 'en',
    getCurrentLocale: () => 'en',
    getLocalizedPath: () => Promise.resolve('/en/test'),
    getAlternateLinks: () => Promise.resolve([
      { href: 'https://www.commandglows.com/en/test', hreflang: 'en' },
      { href: 'https://www.commandglows.com/fr/test', hreflang: 'fr' }
    ]),
    getPageMeta: () => Promise.resolve({
      title: 'Test Page',
      description: 'Test Description',
      alternateLinks: [
        { href: 'https://www.commandglows.com/en/test', hreflang: 'en' },
        { href: 'https://www.commandglows.com/fr/test', hreflang: 'fr' }
      ]
    })
  }
});
