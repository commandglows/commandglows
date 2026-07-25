/** @jsxImportSource react */
import { useState, useEffect } from "react"

const items = [
  {
    label: "Categorize",
    accentClass: "landing-smart-org-accent-magenta",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M2 10h20"/></svg>
    ),
  },
  {
    label: "Discover",
    accentClass: "landing-smart-org-accent-cyan",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    ),
  },
  {
    label: "Save",
    accentClass: "landing-smart-org-accent-yellow",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
    ),
  },
]

export function SmartOrgAnim() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % items.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-3 relative">
      {items.map((item, i) => {
        const isActive = i === activeStep
        return (
          <div
            key={item.label}
            className={`landing-smart-org-item flex flex-col items-center gap-1 ${isActive ? "is-active" : ""}`}
            data-active={isActive}
          >
            <div
              className={`landing-smart-org-icon p-2 rounded-lg border ${item.accentClass}`}
              data-active={isActive}
            >
              {item.icon}
            </div>
            <span
              className={`landing-smart-org-label text-xs font-medium ${item.accentClass}`}
              data-active={isActive}
            >
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
