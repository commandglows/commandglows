/** @jsxImportSource react */
import { useState, useEffect } from "react"
import { testimonialPeople } from "@/data/testimonialPeople"

export const testimonials = testimonialPeople

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

export function TestimonialCarousel() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection("next")
      setIsAnimating(true)
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % testimonials.length)
        setIsAnimating(false)
      }, 300)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const goTo = (index: number) => {
    if (index === current) return
    setDirection(index > current ? "next" : "prev")
    setIsAnimating(true)
    setTimeout(() => {
      setCurrent(index)
      setIsAnimating(false)
    }, 300)
  }

  const t = testimonials[current]

  return (
    <div>
      <div className="relative min-h-52">
        <div
          className="text-center transition-all duration-300"
          style={{
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating
              ? `translateY(${direction === "next" ? "-20px" : "20px"})`
              : "translateY(0)",
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
          <p className="mb-4 text-sm italic leading-relaxed text-content-text-secondary dark:text-content-text-tertiary">
            &ldquo;{t.quote}&rdquo;
          </p>
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
            className={`h-2 rounded-full transition-all duration-300 ${
              index === current
                ? "w-6 bg-cyan"
                : "w-2 bg-content-bg-subtle hover:bg-content-bg-hover dark:bg-content-bg-strong dark:hover:bg-content-bg-hover"
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
