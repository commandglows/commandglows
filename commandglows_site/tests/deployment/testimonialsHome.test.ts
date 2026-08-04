import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TestimonialCarousel } from '@/components/react/landing/TestimonialCarousel'

;(globalThis as typeof globalThis & { React: typeof React }).React = React

function readProjectFile(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('Homepage testimonial proof', () => {
  test('keeps the testimonial widget on the homepage', () => {
    const homepage = readProjectFile('src/pages/[...lang]/index.astro')
    const hero = readProjectFile('src/components/astro/landing/Hero.astro')

    expect(homepage).not.toContain('<LogoMarquee />')
    expect(hero).toContain('<LogoMarquee embedded />')
  })

  test('keeps /fr on the homepage instead of treating it as a roadmap segment', () => {
    expect(existsSync(resolve(process.cwd(), 'src/pages/[...lang]/roadmap.astro'))).toBe(true)
    expect(existsSync(resolve(process.cwd(), 'src/pages/[...lang]/[roadmap].astro'))).toBe(false)

    const homepage = readProjectFile('src/pages/[...lang]/index.astro')
    const hero = readProjectFile('src/components/astro/landing/Hero.astro')
    expect(homepage).not.toContain('<LogoMarquee />')
    expect(hero).toContain('<LogoMarquee embedded />')
  })

  test('declares both localized homepage routes without changing roadmap routes', () => {
    const homepage = readProjectFile('src/pages/[...lang]/index.astro')
    const roadmap = readProjectFile('src/pages/[...lang]/roadmap.astro')
    const hero = readProjectFile('src/components/astro/landing/Hero.astro')

    expect(homepage).toContain("{ params: { lang: 'en' }, props: { lang: 'en' as Language } }")
    expect(homepage).toContain("{ params: { lang: 'fr' }, props: { lang: 'fr' as Language } }")
    expect(homepage).not.toContain('<LogoMarquee />')
    expect(hero).toContain('<LogoMarquee embedded />')
    expect(roadmap).toContain('export const prerender = false')
  })

  test('uses only traced public BunnyCDN portraits and allows their origin', () => {
    const carousel = readProjectFile('src/components/react/landing/TestimonialCarousel.tsx')
    const testimonialPeople = readProjectFile('src/data/testimonialPeople.ts')
    const vercel = readProjectFile('vercel.json')

    expect(carousel).toContain("@/data/testimonialPeople")
    expect(testimonialPeople).toContain('https://winflowz.b-cdn.net/Florin_muresan.jpg')
    expect(testimonialPeople).toContain('https://winflowz.b-cdn.net/alex-dynapictures.png')
    expect(testimonialPeople.match(/^    name:/gm)).toHaveLength(6)
    expect(testimonialPeople).toContain("name: 'HoangV'")
    expect(testimonialPeople).toContain("name: 'Digital_Nomad'")
    expect(testimonialPeople).toContain("name: 'g273'")
    expect(testimonialPeople).toContain("name: 'lamefusioncake'")
    expect(testimonialPeople.match(/avatarRepresentation: 'appsumo-generic'/g)).toHaveLength(4)
    expect(testimonialPeople).toContain('sourceCapture')
    expect(carousel).not.toContain('images.unsplash.com')
    expect(carousel).not.toContain('/images/headshots/')
    expect(vercel).toContain('img-src')
    expect(vercel).toContain('https://winflowz.b-cdn.net')
  })

  test('uses the same authentic portraits for the bilingual hero social proof and links to the widget', () => {
    const hero = readProjectFile('src/components/astro/landing/Hero.astro')
    const testimonialPeople = readProjectFile('src/data/testimonialPeople.ts')

    expect(hero).toContain("@/data/testimonialPeople")
    expect(hero).toContain('testimonialPeople')
    expect(hero).toContain("avatarRepresentation === 'appsumo-generic'")
    expect(hero).toContain('href="#testimonials"')
    expect(hero).toContain('focus-visible:ring')
    expect(hero).toContain('prefers-reduced-motion: reduce')
    expect(hero).not.toContain('/images/headshots/')
    expect(hero).toContain("reviewsLabel: 'Avis'")
    expect(hero).toContain("reviewsLabel: 'Reviews'")
    expect(hero).toContain('{heroText.reviewsLabel}')
    expect(testimonialPeople).toContain('Florin Muresan')
    expect(testimonialPeople).toContain('Alex')
  })

  test('keeps one focusable testimonial target for both homepage locales', () => {
    const marquee = readProjectFile('src/components/astro/landing/LogoMarquee.astro')
    const homepage = readProjectFile('src/pages/[...lang]/index.astro')
    const hero = readProjectFile('src/components/astro/landing/Hero.astro')

    expect(marquee.match(/id="testimonials"/g)).toHaveLength(1)
    expect(marquee).toContain('scroll-mt-20')
    expect(marquee).toContain("embedded ? 'bg-transparent' : 'bg-content-bg-subtle dark:bg-content-bg-inverse'")
    expect(hero.indexOf('href="#testimonials"')).toBeLessThan(hero.indexOf('<LogoMarquee embedded />'))
    expect(hero.indexOf('<LogoMarquee embedded />')).toBeLessThan(hero.indexOf('<!-- Stats -->'))
    expect(homepage).toContain("{ params: { lang: 'en' }, props: { lang: 'en' as Language } }")
    expect(homepage).toContain("{ params: { lang: 'fr' }, props: { lang: 'fr' as Language } }")
  })

  test('keeps the animated carousel while allowing long reviews to expand on demand', () => {
    const carousel = readProjectFile('src/components/react/landing/TestimonialCarousel.tsx')

    expect(carousel).toContain('getTestimonialPreview')
    expect(carousel).toContain('setInterval')
    expect(carousel).toContain('expanded')
    expect(carousel).toContain('aria-expanded={expanded}')
    expect(carousel).toContain('setExpanded(false)')
    expect(carousel).toContain('onPointerDown={handlePointerDown}')
    expect(carousel).toContain('onPointerUp={handlePointerEnd}')
  })

  test('server-renders the first testimonial without a reveal visibility gate', () => {
    const marquee = readProjectFile('src/components/astro/landing/LogoMarquee.astro')
    const renderedCarousel = renderToStaticMarkup(React.createElement(TestimonialCarousel, { lang: 'fr' }))

    expect(marquee).toContain('<TestimonialCarousel client:load lang={lang} />')
    expect(marquee).not.toContain('client:only="react"')
    expect(marquee).toContain('class="landing-testimonials-carousel max-w-3xl mx-auto px-4"')
    expect(marquee).not.toContain('landing-testimonials-carousel reveal')
    expect(renderedCarousel).toContain('One of the Best Deals I Purchased All Year!')
    expect(renderedCarousel).toContain('Florin Muresan')
  })
})
