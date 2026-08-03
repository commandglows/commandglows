import { getLocalizedPath } from './routing'
import type { Language } from '@/types'

interface NavigationLink {
  name: string
  url: string
}

interface FooterSection {
  section: string
  links: NavigationLink[]
}

interface SocialLinks {
  facebook: string
  twitter: string
  github: string
  linkedin: string
  instagram: string
}

export function getNavLinks(lang: Language = 'en'): NavigationLink[] {
  return [
    { name: lang === 'fr' ? 'Applications' : 'Apps', url: getLocalizedPath(lang, 'products') },
    { name: lang === 'fr' ? 'Formations' : 'Courses', url: lang === 'fr' ? '/fr/formations/' : '/en/formations/' },
    { name: 'Roadmap', url: getLocalizedPath(lang, 'roadmap') },
    { name: 'Services', url: getLocalizedPath(lang, 'services') },
    { name: 'Blog', url: getLocalizedPath(lang, 'blog') },
    { name: 'Contact', url: getLocalizedPath(lang, 'contact') },
  ]
}

export function getFooterLinks(lang: Language = 'en'): FooterSection[] {
  return [
    {
      section: lang === 'fr' ? 'Écosystème' : 'Ecosystem',
      links: [
        { name: lang === 'fr' ? 'Formations' : 'Courses', url: lang === 'fr' ? '/fr/formations/' : '/en/formations/' },
        { name: lang === 'fr' ? 'Apps & Plugins' : 'Apps & Plugins', url: getLocalizedPath(lang, 'products') },
        { name: 'Services', url: getLocalizedPath(lang, 'services') },
        { name: 'Roadmap', url: getLocalizedPath(lang, 'roadmap') },
      ],
    },
    {
      section: lang === 'fr' ? 'Produits' : 'Products',
      links: [
        { name: 'ObsiFlowz', url: getLocalizedPath(lang, 'products') },
        { name: 'ReplayGlowz', url: getLocalizedPath(lang, 'products') },
        { name: 'Windows Mastery', url: getLocalizedPath(lang, 'products') },
        { name: lang === 'fr' ? 'Suite Productivité' : 'Productivity Suite', url: getLocalizedPath(lang, 'products') },
      ],
    },
    {
      section: lang === 'fr' ? 'Entreprise' : 'Company',
      links: [
        { name: lang === 'fr' ? 'À propos' : 'About Us', url: getLocalizedPath(lang, 'about') },
        { name: 'Blog', url: getLocalizedPath(lang, 'blog') },
        { name: 'Contact', url: getLocalizedPath(lang, 'contact') },
      ],
    },
    {
      section: lang === 'fr' ? 'Légal' : 'Legal',
      links: [
        { name: lang === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy', url: getLocalizedPath(lang, 'privacy') },
        { name: lang === 'fr' ? 'CGU' : 'Terms of Service', url: getLocalizedPath(lang, 'terms') },
        { name: lang === 'fr' ? 'Mentions légales' : 'Legal Notice', url: getLocalizedPath(lang, 'legal') },
        { name: lang === 'fr' ? "Droits d'auteur" : 'Copyright', url: getLocalizedPath(lang, 'copyright') },
        { name: lang === 'fr' ? 'Clause de non-responsabilité' : 'Disclaimer', url: getLocalizedPath(lang, 'disclaimer') },
      ],
    },
  ]
}

export const socialLinks: SocialLinks = {
  facebook: '#',
  twitter: '#',
  github: 'https://github.com/diane-defores/commandglows',
  linkedin: '#',
  instagram: '#',
}

export default {
  getNavLinks,
  getFooterLinks,
  socialLinks,
}
