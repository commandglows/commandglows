/** @jsxImportSource react */
import { useEffect, useState } from "react"

interface NavItem {
  label: string
  href: string
}

interface MobileMenuProps {
  items?: NavItem[]
  signInLabel?: string
  ctaLabel?: string
  signInUrl?: string
  ctaUrl?: string
  altLangUrl?: string
  altLangLabel?: string
  forceDark?: boolean
  showThemeToggle?: boolean
}

export function MobileMenu({
  items,
  signInLabel = "Sign In",
  ctaLabel = "Get Started",
  signInUrl = "/signin",
  ctaUrl = "/products",
  altLangUrl,
  altLangLabel,
  forceDark = false,
  showThemeToggle = true,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => {
      const nextTheme =
        root.classList.contains("dark") || root.getAttribute("data-theme") === "dark"
          ? "dark"
          : "light"
      setTheme(nextTheme)
    }

    syncTheme()
    document.addEventListener("astro:page-load", syncTheme)

    return () => {
      document.removeEventListener("astro:page-load", syncTheme)
    }
  }, [])

  const applyTheme = (nextTheme: "light" | "dark") => {
    const root = document.documentElement
    root.classList.remove("dark", "light")
    root.classList.add(nextTheme)
    root.setAttribute("data-theme", nextTheme)
    window.localStorage.setItem("hs_theme", nextTheme)
    setTheme(nextTheme)
  }

  const navItems: NavItem[] = items || [
    { label: "Apps", href: "/products" },
    { label: "Courses", href: "/en/formations/" },
    { label: "Roadmap", href: "/roadmap" },
    { label: "Services", href: "/services" },
    { label: "Blog", href: "/blog" },
  ]

  return (
    <>
      <button
        className="md:hidden p-2 text-navbar-textPrimary hover:text-navbar-textPrimary dark:text-navbar-textSecondary dark:hover:text-navbar-textPrimary"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        )}
      </button>

      {open && (
        <div
          className={
            forceDark
              ? "absolute top-full left-0 right-0 mt-2 border border-navbar-drawerBorderForce bg-navbar-forceDrawerBg/96 p-4 shadow-2xl backdrop-blur-md"
              : "absolute top-full left-0 right-0 mt-2 border border-navbar-border/60 bg-navbar-drawerBg/95 p-4 shadow-lg backdrop-blur-md dark:border-navbar-drawerBorderForce dark:bg-navbar-drawerBg/95 dark:shadow-none"
          }
          style={{ borderRadius: "var(--menu-panel-radius)", animation: "var(--hero-fade-animation-fast)" }}
        >
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-3 text-sm font-medium text-navbar-textPrimary hover:text-navbar-textPrimary hover:bg-navbar-bgHover dark:text-navbar-textSecondary dark:hover:text-navbar-textPrimary dark:hover:bg-navbar-bgHover rounded-lg transition-colors"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <hr className="border-navbar-border dark:border-navbar-drawerBorderForce my-2" />
            {altLangUrl && altLangLabel && (
              <a
                href={altLangUrl}
                className="px-4 py-2 text-xs font-semibold text-navbar-textTertiary hover:text-navbar-textPrimary hover:bg-navbar-bgHover dark:text-navbar-textSecondary dark:hover:text-navbar-textPrimary dark:hover:bg-navbar-bgHover rounded-lg transition-colors"
                onClick={() => setOpen(false)}
              >
                {altLangLabel}
              </a>
            )}
            {showThemeToggle && !forceDark && (
              <button
                type="button"
                className="rounded-lg px-4 py-3 text-left text-sm font-medium text-navbar-textPrimary transition-colors hover:bg-navbar-bgHover hover:text-navbar-textPrimary dark:text-navbar-textSecondary dark:hover:bg-navbar-bgHover dark:hover:text-navbar-textPrimary"
                onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              </button>
            )}
            <a href={signInUrl} onClick={() => setOpen(false)}>
              <button className="w-full text-left px-4 py-2 text-sm font-medium text-navbar-textPrimary hover:text-navbar-textPrimary hover:bg-navbar-bgHover dark:text-navbar-textSecondary dark:hover:text-navbar-textPrimary dark:hover:bg-navbar-bgHover rounded-lg transition-colors">
                {signInLabel}
              </button>
            </a>
            <a href={ctaUrl} onClick={() => setOpen(false)}>
              <button className="w-full shimmer-btn bg-navbar-ctaBg text-navbar-ctaText hover:bg-navbar-ctaBgHover dark:bg-navbar-ctaBg dark:text-navbar-ctaText dark:hover:bg-navbar-ctaBgHover rounded-full px-4 py-2 text-sm font-medium inline-flex items-center justify-center">
                {ctaLabel}
              </button>
            </a>
          </div>
        </div>
      )}
    </>
  )
}
