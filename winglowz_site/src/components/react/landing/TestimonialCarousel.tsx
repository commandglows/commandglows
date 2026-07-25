/** @jsxImportSource react */
import { useState, useEffect, useRef } from "react"
import { testimonialPeople } from "@/data/testimonialPeople"

export const testimonials = testimonialPeople

export function getTestimonialPreview(quote: string) {
  const sentence = quote.match(/^(.+?[.!?])(?:\s+|$)/)
  return sentence ? sentence[1] : quote
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: rating }).map((_, i) => (
        <svg key={i} className="w-4 h-4" viewBox="0 0 24 24" fill="var(--brand-yellow)" stroke="var(--brand-yellow)" strokeWidth="1">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export function TestimonialCarousel({ lang = "en" }: { lang?: "en" | "fr" }) {
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

    const nextIndex = distance < 0
      ? (current + 1) % testimonials.length
      : (current - 1 + testimonials.length) % testimonials.length

    goTo(nextIndex)
  }

  const t = testimonials[current]
  const preview = getTestimonialPreview(t.quote)
  const hasMore = preview.length < t.quote.length
  const readMoreLabel = lang === "fr" ? "Lire le témoignage complet" : "Read the full testimonial"
  const showLessLabel = lang === "fr" ? "Réduire le témoignage" : "Show less"

  return (
    <div>
      <div
        className="relative min-h-52 touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={() => { swipeStartX.current = null }}
      >
        <div
        className="text-center transition-opacity duration-300"
        style={{
          opacity: isAnimating ? 0 : 1,
        }}
        >
          <div className="flex items-center justify-center gap-1 mb-4">
            <StarRating rating={t.rating} />
          </div>
          {t.title && (
            <h3 className="mb-3 text-base font-semibold text-content-text-primary dark:text-content-text-over-dark">
              &ldquo;{t.title}&rdquo;
            </h3>
          )}
          <p className="mb-2 text-sm italic leading-relaxed text-content-text-secondary dark:text-content-text-tertiary">
            &ldquo;{expanded ? t.quote : preview}&rdquo;
          </p>
          {hasMore && (
            <button
              type="button"
              className="mb-4 text-sm font-medium text-content-text-primary underline underline-offset-4 transition-colors hover:text-content-text-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring dark:text-content-text-over-dark dark:hover:text-content-text-muted"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
            >
              {expanded ? showLessLabel : readMoreLabel}
            </button>
          )}
          <div className="flex items-center justify-center gap-2">
            {t.avatarRepresentation === "appsumo-generic" ? (
              <span
                aria-hidden="true"
                 className="flex h-8 w-8 items-center justify-center rounded-full bg-content-bg-subtle text-xs font-bold text-content-text-secondary dark:bg-content-bg-strong dark:text-content-text-muted"
              >
                {t.name[0]}
              </span>
            ) : (
              <img
                src={t.avatarSrc}
                alt={`${t.name} avatar`}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-content-bg-strong"
                loading="lazy"
              />
            )}
            <div className="text-left">
              <p className="text-sm font-medium text-content-text-secondary dark:text-content-text-muted">{t.name}</p>
              <p className="text-xs text-content-text-tertiary dark:text-content-text-muted">
                {t.role}
                {t.verified && (
                  <span className="ml-1 text-green">Verified Purchaser</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dots navigation */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`h-2 w-2 rounded-full border border-content-border transition-all duration-300 dark:border-content-border-strong ${
              index === current
                ? "w-6 border-cyan bg-cyan"
                : "bg-transparent hover:border-content-text-muted hover:bg-content-bg-hover dark:hover:bg-content-bg-hover"
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
            aria-pressed={index === current}
          />
        ))}
      </div>
    </div>
  )
}
