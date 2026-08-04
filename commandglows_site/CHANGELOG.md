# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Added canonical ShipGlows pages, installer endpoint, generated shell and PowerShell installers, and permanent compatibility redirects from the former ShipGlowz routes.

### Changed
- Canonicalized suite installer variables, repository paths, product identifiers, entitlements, public copy, and documentation to ShipGlows while retaining bounded legacy fallbacks.

## [2026-05-03]

### Changed
- Reframed homepage and SEO copy around verifiable WinGlows training metrics: 8 modules, 40 lessons, 2 languages, and 200+ tested tips/tools.
- Updated AppSumo social proof wording to reflect dozens of 5-star reviews while keeping the existing testimonial block intact.
- Aligned public FAQ, lead magnet, and pricing copy to avoid unsupported free-trial, user-volume, performance, and 24/7 support claims.

## [2026-04-13]

### Added
- Dedicated bilingual Windows sales-page funnel at `/fr/maitrise-windows` and `/windows-mastery`
- Funnel strategy documents under `CONTENU/xxxTunnel/` covering messaging spine, avatar matrix, landing wireframe, sales-page draft, and email campaign copy
- Reusable FR/EN Windows Mastery email campaign assets under `idees/emails/winglowz-windows-mastery/`
- `.env.example` documenting the current Clerk, Polar, Convex, Resend, and app configuration variables
- `shipglows_data/technical/guidelines.md` to capture project-specific engineering and funnel maintenance rules

### Changed
- Redirect homepage hero, final CTA, and paid pricing CTA into the new Windows sales page while keeping the free plan linked to the course preview hub
- Point the WinGlows product entry and product listing links to the dedicated Windows sales page
- Continue consolidating `CONTENU/` source notes into compact future-source briefs and align additional FR/EN premium lesson files with the published course
- Refresh `README.md` so routes, scripts, environment variables, and project structure match the live codebase
- Route newsletter welcome emails toward the Windows sales page and tighten the copy around the current offer
- Turn product catalog `beta` / `coming_soon` entries into real contact or waitlist CTAs instead of dead-end placeholders
- Localize review links and purchase success follow-up links so FR and EN users stay in the right funnel
- Remove the dead third tab from product detail pages and keep only the rendered panels

### Fixed
- Keep paid funnel entry points aligned across homepage, pricing, product copy, and dedicated sales-page routes in both French and English
- Restore a working hero purchase CTA on the landing page
- Prevent `GoalFlowz` and other non-available products from appearing directly purchasable with broken links

### Added
- Server checkout route for training unlocks at `/api/polar/checkout`
- Signed Polar webhook route at `/api/polar/webhook`
- Persistent course entitlements on Convex users via `courseEntitlements`
- Full English translation set for the 8 WinGlows training modules
- Convex HTTP endpoint for Clerk webhooks with svix signature verification (`/clerk/events`)
- HMAC signature verification on Polar webhook handler in Convex HTTP

### Changed
- Clean up unused docs and legacy files (AUTH_ANALYSIS, BRANDING_SPECIFICATION, copilot-instructions)
- Remove Dependabot configuration
- Simplify README
- Update `shipglows_data/business/branding.md` wording
- Route Starlight lesson previews to the Polar checkout flow instead of the product offer page
- Update Clerk sign-in flow so `next` can return to checkout or the private lesson
- Update purchase success page copy and redirect behavior for course unlocks
- Extend Convex Polar handlers to link customers and grant training access after payment
- Remove global anti-copy / anti-select behavior from public layouts and `/bio`
- Add a real index page for the French Module V training section
- Improve public lesson previews with clearer titles, value framing, and unlock CTAs
- Rewrite homepage and core product copy to match the real WinGlows offer more closely
- Make the English training hub honest about the current EN content state
- Update public-facing contact email references to `hello@winglowz.com`
- Restore the English training hub as a full course index now that all EN lessons exist
- Gate only premium training lessons while keeping Module I publicly accessible
- Overhaul FR and EN training content across all 8 modules (expanded lessons, restructured sections)
- Consolidate and trim CONTENU/ source Markdown files to match published lesson content
- Update cookie consent to reflect essential-only cookie usage (no analytics)
- Update privacy policy text to remove analytics references, clarify authentication data collection
- Convert Astro webhook routes to thin proxies that forward to Convex HTTP endpoints
- Expand Module VI training content (consume & reflect, media & files, recall & search)

### Fixed
- Fix course gating so the unlock flow persists access after payment instead of relying only on subscription state
- Fix sign-in redirect handling by disabling prerender on the sign-in page
- Remove public inspector/debug script injections and delete unused inspector assets
- Remove public blog and alert debug logs
- Fix route translation drift between routing.ts, i18n/config.ts, and fr/routes.json (disclaimer, terms, copyright, roadmap)
- Fix CORS origin hardcoded to localhost — now environment-aware
- Fix middleware unnecessary `as any` type casts

### Security
- Convert public Convex mutations to `internalMutation` (polar.ts, users.ts) — no longer callable from browser clients
- Remove 3 duplicate public mutations from polar.ts that bypassed internal-only access
- Replace `Math.random()` with `crypto.getRandomValues()` for API key generation
- Fix CSP: add connect-src for Convex/Clerk/Polar, remove `unsafe-eval` from script-src, add font-src and img-src
- Add Clerk webhook signature verification (svix HMAC) — was previously unprotected

### Removed
- Remove legacy TASKS.md content
- Remove PostHog analytics script from MainLayout
- Remove analytics opt-out UI from the privacy page
- Remove sendBeacon tracking fallback from LandingLayout

## [0.9.0] — 2026-03-17

### Added
- CLAUDE.md project instructions for Claude Code
- `shipglows_data/business/branding.md` comprehensive brand guidelines
- `shipglows_data/business/business.md` business model documentation
- `shipglows_data/technical/guidelines.md` development guidelines
- Starlight documentation: 8 training modules (productivity, Windows config, time management, actions, content consumption, knowledge management, social tools, keyboard shortcuts)
- Privacy policy page with bilingual support (EN/FR)
- ShipGlows inspector and Eruda debug tools for development

### Changed
- Restructure CONTENU/ course content with metadata headers
- Update astro.config.mjs with new integrations
- Update landing layout with additional scripts

## [0.8.0] — 2026-03-09

### Added
- Draft field for blog content schema
- Future pubDate filtering (posts with future dates hidden from listings)

## [0.7.0] — 2026-02-24

### Added
- Bilingual /bio link-in-bio page (EN + FR)

## [0.6.0] — 2026-02-23

### Added
- Astro-native landing page components replacing React versions (Hero, BentoGrid, Pricing, Footer, Navbar, LogoMarquee, FinalCTA)
- LeadMagnet component for email capture
- Polar.sh payment integration (Convex function)
- Resend newsletter integration (Convex function + Clerk webhook HTTP router)
- Newsletter subscribe/unsubscribe API endpoints
- CGV (Terms of Service) page with bilingual translations (EN/FR)
- 5 English blog posts (blog-1, post-1 through post-4)
- SVG illustrations for service pages (Chrome extensions, Obsidian plugins, productivity suite, Windows mastery)
- CookieConsent banner component
- TestimonialCarousel React component
- KeyboardShortcutAnim, PluginActivityTicker, SmartOrgAnim interactive React components
- MobileMenu React component
- SPEC-gtm.md go-to-market specification

### Changed
- Rewrite landing page from React/Framer Motion to Astro components with targeted React islands
- Update navigation structure with expanded menu items
- Improve ContactSection layout
- Refine FAQ content
- Update global CSS with new design tokens

### Removed
- React landing page components (hero, bento-grid, footer, navbar, pricing, logo-marquee, final-cta, smooth-scroll)

## [0.5.0] — 2026-02-13

### Added
- Convex backend schema (users, apiKeys, features) with Clerk webhook integration
- React landing page with Framer Motion animations (Hero, BentoGrid, Testimonials carousel, Pricing with billing toggle)
- Brand color system from animated logo gradient
- v0.md listing deleted v0 projects for regeneration
- CONTENU/ directory with Windows productivity course content

### Changed
- Replace Supabase with Convex + Clerk for authentication and backend
- Archive old landing page at /landing route

### Removed
- All Supabase auth, API keys, payment, and OAuth code
- OAuth button components (Facebook, Github, Google)
- AuthenticationIsland component
- Unused NewsletterSection component

## [0.4.0] — 2026-01-25

### Added
- Squashed history initial commit with full application structure
- Roadmap page with Kanban board, feature cards, project navigation, and voting
- Starlight documentation setup with custom theme, hero, and site title components
- i18n system (EN/FR) with translation files for all pages
- FAQ component
- PricingSection with PricingCard blocks
- Service pages with content collections
- Blog system with French posts (blog-1, post-1 through post-3)
- Dashboard pages (main, settings, tasks)
- Authentication pages (signin, register, recover)
- Legal pages: copyright, disclaimer, legal notices, privacy policy
- API routes for auth, features, payments, API key management
- LanguagePicker component
- TestimonialFolio and testimonial components
- BrandLogo with TextLogo CSS component
- Contact section with form
- Products section with scroll bar
- PrimaryCTA and SecondaryCTA button components
- Supabase integration for auth and data
- BMAD project management framework

## [0.3.0] — 2025-12-01

### Added
- Comprehensive branding specification document
- Code comments across core modules for maintainability
- Copilot instructions for repository onboarding

### Fixed
- Light mode navbar: add subtle shadow and border
- Typography progression in pricing section
- Mobile spacing and typography for better readability

### Changed
- Replace PNG logo with CSS TextLogo in FooterSection, NavbarMegaMenu, and SiteTitle

## [0.2.0] — 2025-11-29

### Added
- French 404 page and About Us pages with translations

### Fixed
- Hamburger menu not working after Astro View Transitions (HSCollapse initialization)
- Build error with lazy initialization for Supabase client and fallback env vars
- Vercel deployment by removing invalid routes config
- JSON syntax error in en/home.json

### Changed
- Update Astro and Starlight packages with breaking changes fix
- Update dependencies: vitest 4.x, nanoid 5.x, sharp 0.34.x, postcss 8.5.x, jsdom 27.x, prettier-plugin-tailwindcss 0.7.x
- Disable edge middleware

## [0.1.0] — 2025-01-10

### Added
- i18n internationalization system (EN/FR)
- Blog system with working post pages
- Language picker component
- Prerendering configuration
- ScrewFast branding replaced with WinGlows branding

### Changed
- Replace ScrewFast template references with WinGlows

## [0.0.2] — 2024-12-20

### Added
- Roadmap page with per-project views
- Dark mode improvements
- Product descriptions with scroll bar
- Legal pages (mentions legales)
- Supabase registration (register via Supabase)
- Dashboard page
- OAuth authentication
- Supabase API integration

### Fixed
- Registration modal
- Button styling
- TypeScript errors

### Changed
- Improve dark mode across roadmap and other pages

## [0.0.1] — 2024-10-27

### Added
- Initial project setup from ScrewFast Astro template (via Vercel)
- Custom logo and brand link colors
- Base component library (FeaturesGeneral, FeaturesNavs, FeaturesStats, Navbar, Footer, Hero)
- Starlight documentation integration
- Tailwind CSS configuration
- Lenis smooth scroll
