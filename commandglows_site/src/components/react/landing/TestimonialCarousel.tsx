/** @jsxImportSource react */
import { useState, useEffect, useRef } from 'react'
import { testimonialPeople } from '@/data/testimonialPeople'

export const testimonials = testimonialPeople

export function getTestimonialPreview(quote: string) {
  const sentence = quote.match(/^(.+?[.!?])(?:\s+|$)/)
  return sentence ? sentence[1] : quote
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="landing-testimonial-stars flex">
      {Array.from({ length: rating }).map((_, i) => (
        <svg
          key={i}
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="var(--brand-yellow)"
          stroke="var(--brand-yellow)"
          strokeWidth="1"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export function TestimonialCarousel({ lang = 'en' }: { lang?: 'en' | 'fr' }) {
  const [current, setCurrent] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const swipeStartX = useRef<number | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % testimonials.length)
        setExpanded(false)
        setIsAnimating(false)
      }, 300)
    }, 6000)

    return () => clearInterval(timer)
  }, [])

  const goTo = (index: number) => {
    if (index === current) return
    setIsAnimating(true)
    setExpanded(false)
    setTimeout(() => {
      setCurrent(index)
      setIsAnimating(false)
    }, 300)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    swipeStartX.current = event.clientX
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null) return

    const distance = event.clientX - swipeStartX.current
    swipeStartX.current = null

    if (Math.abs(distance) < 48) return

    const nextIndex =
      distance < 0
        ? (current + 1) % testimonials.length
        : (current - 1 + testimonials.length) % testimonials.length

    goTo(nextIndex)
  }

  const t = testimonials[current]
  const preview = getTestimonialPreview(t.quote)
  const hasMore = preview.length < t.quote.length
  const readMoreLabel =
    lang === 'fr' ? 'Lire le témoignage complet' : 'Read the full testimonial'
  const showLessLabel = lang === 'fr' ? 'Réduire le témoignage' : 'Show less'

  return (
    <div>
      <div
        className="relative min-h-52 touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={() => {
          swipeStartX.current = null
        }}
      >
        <div
          className={`landing-testimonial-content text-center transition-opacity duration-300 ${
            isAnimating
              ? 'landing-testimonial-content--hidden'
              : 'landing-testimonial-content--visible'
          }`}
        >
          <div className="landing-testimonial-rating flex items-center justify-center">
            <StarRating rating={t.rating} />
          </div>
          {t.title && (
            <h3 className="landing-testimonial-title text-content-text-primary dark:text-content-text-over-dark text-base font-semibold">
              &ldquo;{t.title}&rdquo;
            </h3>
          )}
          <p className="landing-testimonial-excerpt text-content-text-secondary dark:text-content-text-tertiary text-sm leading-relaxed italic">
            &ldquo;{expanded ? t.quote : preview}&rdquo;
          </p>
          {hasMore && (
            <button
              type="button"
              className="landing-testimonial-toggle text-content-text-primary hover:text-content-text-secondary focus-visible:outline-ring dark:text-content-text-over-dark dark:hover:text-content-text-muted text-sm font-medium underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
            >
              {expanded ? showLessLabel : readMoreLabel}
            </button>
          )}
          <div className="landing-testimonial-meta flex items-center justify-center">
            {t.avatarRepresentation === 'appsumo-generic' ? (
              <span
                aria-hidden="true"
                className="bg-content-bg-subtle text-content-text-secondary dark:bg-content-bg-strong dark:text-content-text-muted flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              >
                {t.name[0]}
              </span>
            ) : (
              <img
                src={t.avatarSrc}
                alt={`${t.name} avatar`}
                className="dark:ring-content-bg-strong h-8 w-8 rounded-full object-cover ring-2 ring-white"
                loading="lazy"
              />
            )}
            <div className="text-left">
              <p className="text-content-text-secondary dark:text-content-text-muted text-sm font-medium">
                {t.name}
              </p>
              <p className="text-content-text-tertiary dark:text-content-text-muted text-xs">
                {t.role}
                {t.verified &&
                  !t.role.toLowerCase().includes('verified purchaser') && (
                    <span className="brand-text-green ml-1">
                      Verified Purchaser
                    </span>
                  )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dots navigation */}
      <div className="landing-carousel-dots flex items-center justify-center">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`landing-carousel-dots__button rounded-full transition-all duration-300 ${
              index === current
                ? 'landing-carousel-dots__button--active'
                : 'landing-carousel-dots__button--inactive'
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
            aria-pressed={index === current}
          />
        ))}
      </div>
    </div>
  )
}
