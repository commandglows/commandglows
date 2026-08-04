# Tasks — CommandGlows

> **Priority:** 🔴 P0 blocker · 🟠 P1 high · 🟡 P2 normal · 🟢 P3 low · ⚪ deferred
> **Status:** 📋 todo · 🔄 in progress · ✅ done · ⛔ blocked · 💤 deferred

---

## Active

## Reconciled Site Backlog

The following records were consolidated from the former nested site tracker during the canonical ShipGlows governance migration.

🟡 [CommandGlows] task: Collections for grouping group items | status: todo | area: app | id: winglowz-app-collections-group-items
🟡 [CommandGlows] task: Replace item action icons with better action menu | status: todo | area: app | id: winglowz-app-swipe-actions
🟡 [CommandGlows] task: Analyze CopyCat clipboard background flow | status: todo | area: app | id: winglowz-app-copycat-clipboard-benchmark | notes: Background clipboard detection for copied text only; persistent notification shown for transparency while the service runs in the background; battery optimization setting to stop Android from killing the process; overlay permission with a transparent overlay shown briefly during copy or immediately after to read clipboard content; accessibility service used as a background listener; service restarts after device reboot; use this as a benchmark to compare against CommandGlows clipboard tracking and identify what is already implemented vs what can be improved or inspired.
🟠 [CommandGlows] task: Clarify Quick Action arrow icons and labels | status: todo | area: app | id: winglowz-app-quick-action-arrow-icons
🟡 [CommandGlows] task: Split premium and non-premium features clearly | status: todo | area: app | id: winglowz-app-premium-scope-clarity
🟡 [CommandGlows] task: Show premium feature badges by user state | status: todo | area: app | id: winglowz-app-premium-feature-badges

🟢 [CommandGlowsApp] task: Verify persistent local clipboard fallback, search, and copy action | status: done | area: clipboard-local | id: wfz-clipboard-persistent-local-verify
🟠 [CommandGlowsApp] task: Push or ship the verified persistent local clipboard fallback changes | status: todo | area: clipboard-local | id: wfz-clipboard-persistent-local-ship
✅ [CommandGlowsApp] task: Retest Android IME clipboard bridge on physical device after APK/CI handoff | status: done | area: clipboard-ime | id: wfz-ime-clipboard-device-qa
🟠 [CommandGlowsApp] task: Redeploy the Flutter web auth patch and rerun Google plus email/password smoke on www.commandglows.com | status: todo | area: suite-auth | id: wfz-suite-auth-web-smoke
✅ [CommandGlowsApp] task: Ship cross-surface Send to actions for Voice, Clipboard, and Snippets | status: done | area: send-to-actions | id: wfz-send-to-actions
🟠 [CommandGlowsApp] task: Run Windows overlay/hotkeys native QA checklist on a Windows machine | status: todo | area: windows-overlay | id: wfz-windows-overlay-native-qa
🟡 [CommandGlowsApp] task: Fix or refine Windows overlay host after first Windows QA results | status: todo | area: windows-overlay | id: wfz-windows-overlay-qa-followup
🟠 [CommandGlowsApp] task: Run macOS overlay/hotkeys native QA checklist on a macOS machine | status: todo | area: macos-overlay | id: wfz-macos-overlay-native-qa
🟠 [CommandGlowsApp] task: Run Linux overlay/hotkeys native QA checklist on a Linux machine | status: todo | area: linux-overlay | id: wfz-linux-overlay-native-qa
✅ [CommandGlowsApp] task: Ship first local macOS/Linux desktop overlay host version for native QA handoff | status: done | area: desktop-overlay | id: wfz-macos-linux-overlay-local-ship
🟡 [CommandGlowsApp] task: Decide and implement stronger Linux global hotkey/paste integration after first Linux QA results | status: todo | area: linux-overlay | id: wfz-linux-overlay-host-followup
🟠 [CommandGlows] task: Configure Lemon Squeezy test-mode env and run hosted commerce proof for SocialGlowz LTD webhooks, idempotent replay, refund revoke, and Convex fulfillment | status: blocked | area: commerce | id: wfz-commerce-lemonsqueezy-hosted-smoke
🟠 [CommandGlowsApp] task: Retest BUG-2026-05-24-001 onboarding active-state info box on Android APK | status: fixed_pending_verify | area: onboarding | id: BUG-2026-05-24-001
✅ [CommandGlowsApp] task: Retest BUG-2026-05-24-002 clipboard edit dialog cancel/save on Android APK | status: done | area: clipboard | id: BUG-2026-05-24-002
🟢 [CommandGlowsApp] task: Reduce Android IME layout rebuilds during rapid typing | status: done | area: keyboard-ime-performance | id: wfz-ime-rapid-typing-layout-rebuild
🟡 [CommandGlowsApp] task: Verify Android IME multi-pointer rollover on hosted build and physical device | status: fixed_pending_verify | area: keyboard-ime-performance | id: wfz-ime-multipointer-touch-dispatch
🟢 [CommandGlowsApp] task: Downsample Android IME theme background images before drawing key visuals | status: done | area: keyboard-ime-visual-performance | id: wfz-ime-theme-image-downsample
🟡 [CommandGlowsApp] task: Validate Android IME image-background memory and scroll smoothness on hosted build and physical device | status: fixed_pending_verify | area: keyboard-ime-visual-performance | id: wfz-ime-theme-image-device-verify
🟢 [CommandGlowsApp] task: Remove expensive theme draft serialization from Flutter keyboard theme studio dirty checks | status: done | area: keyboard-theme-performance | id: wfz-keyboard-theme-dirty-check
🟡 [CommandGlowsApp] task: Fix keyboard theme preset auto light/dark switching after non-color theme options | status: fixed_pending_verify | area: keyboard-theme | id: BUG-2026-06-01-001
🟠 [CommandGlowsApp] task: Run Android physical-device QA for IME navigation/editing actions with the new navigation diagnostics playground (`DelW←`, `DelW→`, `DelS←`, `DelS→`, `Début`, `Fin`, `All`) and capture per-app failures/fallbacks | status: todo | area: keyboard-ime-navigation | id: wfz-ime-navigation-diagnostics-device-qa
🔴 [CommandGlowsApp] task: Specify and implement a shared ProductPageScaffold for Voice, Papier, Snippets, and Dico | status: todo | area: product-pages-components | id: wfz-product-page-scaffold
🟠 [CommandGlowsApp] task: Extract shared metric/status pill primitives and remove duplicated private metric widgets across product pages | status: todo | area: product-pages-components | id: wfz-shared-metric-status-pills
🟠 [CommandGlowsApp] task: Split oversized Flutter page widgets and studios into smaller render/controller components with focused widget tests | status: todo | area: component-architecture | id: wfz-split-god-widgets

### Site 404 Remediation

🟠 [CommandGlows] task: Repair bilingual route translation mapping | status: todo | area: site-routing | id: wfz-site-route-translation-helper | surface: commandglows_site | source: 103-sg-verify-404-audit | evidence: production crawl found broken language-switch destinations | next: 106-sg-fix
🟠 [CommandGlows] task: Restore production Roadmap routes for both locales | status: todo | area: site-roadmap | id: wfz-site-roadmap-production-routes | surface: commandglows_site | source: 103-sg-verify-404-audit | evidence: /roadmap and /fr/roadmap return 404 in production | next: 106-sg-fix
🟠 [CommandGlows] task: Fix product image public URLs across EN and FR listing and detail pages | status: todo | area: site-products | id: wfz-site-product-image-urls | surface: commandglows_site | source: 103-sg-verify-404-audit | evidence: 20 browser-loaded product image URLs return 404 | next: 106-sg-fix
🟠 [CommandGlows] task: Fix Services Astro image rendering contract | status: todo | area: site-services | id: wfz-site-services-image-rendering | surface: commandglows_site | source: 103-sg-verify-404-audit | evidence: Services pages load serialized function URLs as images | next: 106-sg-fix
🟡 [CommandGlows] task: Return correct 404 status for the French error page and serve the root favicon | status: todo | area: site-errors | id: wfz-site-error-status-favicon | surface: commandglows_site | source: 103-sg-verify-404-audit | evidence: /fr/404 returns 200 and /favicon.ico returns 404 | next: 106-sg-fix
🟠 [CommandGlows] task: Repair localized content links and aliases for blog training and Welcome pages | status: todo | area: site-i18n | id: wfz-site-localized-content-links | surface: commandglows_site | source: 103-sg-verify-404-audit | evidence: EN and FR content alternate links produce 15 production 404 destinations | paired: wfz-site-route-translation-helper | next: 106-sg-fix
🟠 [CommandGlows] task: Add an exhaustive sitemap link and browser resource 404 regression crawl | status: todo | area: site-quality | id: wfz-site-anti-404-regression | surface: commandglows_site | source: 103-sg-verify-404-audit | evidence: 23 internal destinations or resources fail in production | next: 105-sg-check
🟡 [CommandGlows] task: Align production URL and Node validation requirements in project documentation | status: todo | area: site-governance | id: wfz-site-validation-environment-docs | surface: commandglows_site | source: 103-sg-verify-404-audit | evidence: documented production host is stale and local runtime is Node 22 while package requires Node 24 | next: 300-sg-docs

---

## Migration Verification

| Pri | Task | Status |
|-----|------|--------|
| 🟠 | Rename canonical ShipGlowz surfaces to ShipGlows across governance, site routes, installers, entitlements, app references, and documentation | 🚀 shipped with validation remaining — migration-specific checks pass; 22 unrelated inherited Flutter UI/theme tests remain failing |
| ✅ | Replace Supabase target coupling with backend-agnostic contracts and Firebase first-adapter spec | ✅ done — `shipglows_data/workflow/specs/firebase-backend-agnostic-migration.md` created |
| ✅ | Reorganize legacy product docs to `shipglows_data` canonical locations and replace root path references | ✅ done — root doctrine docs (`BRANDING.md`, `BUSINESS.md`, `ARCHITECTURE.md`, etc.) replaced by canonical files |
| ✅ | Finalize identity migration to CommandGlows across app packages, docs, specs, and trackers | ✅ done — commit `bd81825` |
| ✅ | Create Firebase CLI workflow for project config, Auth/Firestore setup, rules, indexes, emulator/dev validation and GitHub Secrets/Blacksmith integration | ✅ done — GitHub OIDC/WIF wired; Firestore rules/indexes deploy proven in hosted CI (`run 25636532417`, Firestore job `75249317806`) and re-validated after IAM hardening (`run 25636936089`, Firestore job `75250395805`) |
| ✅ | Run the verification gate end-to-end: `dart format --set-exit-if-changed .`, `flutter analyze`, `flutter test`, `flutter build web` | ✅ done |
| 🟠 | Detach Supabase runtime target path (`task 7`) while preserving legacy compile compatibility until the final parity decision | ✅ done — Supabase removed from active bootstrap/providers/diagnostics; legacy adapters/tests remain in-place for compile compatibility |
| ⚪ | Retire or archive Supabase schema/tests after Firebase adapter parity is specified | 💤 deferred |
| ⚪ | Validate auth, transcriptions, snippets, dictionary, clipboard sync, and settings against a real Firebase environment | 💤 deferred — after Firebase adapter setup |
| 🟠 | Build Android IME WinGlows keyboard progressively: base native keyboard, Settings bridge, privacy gate, clipboard, media, docs, Android device QA | 🔄 in progress — custom swipe-corner keyboard, Settings bridge, privacy gate, native panels, reference-keyboard foundation/editing parity roadmap, IME subtype/lifecycle/context slice, selection/InputConnection editor slice, advanced editing actions, auto-capitalization, current-word suggestions, Snippets/Dictionary text-expander sync, key-value/parser/modifier/modmap foundations now wired into live text/keyevent/action/macro dispatch with Ctrl/Alt/Fn keys and Fn navigation modmap, touch pointer/long-press/repeat/spacebar-slider foundations, FlutterWeb/Vercel keyboard preview, Keyboard Theme Studio kickoff, and persistent local clipboard fallback/search/copy verified by `flutter analyze` + `flutter test`; full Gradle packaging is blocked on this aarch64 runner by x86_64 AAPT2, and Android physical-device clipboard/IME QA remains required |
| 🟠 | Repair Flutter Android overlay parity with native floating bubble, event bridge, accessibility delivery, and appearance settings | 🔄 in progress — native bridge and Settings controls implemented; overlay foreground-service type fix attempted for BUG-2026-05-11-001; CI APK and Android device retest still required |
| ✅ | Run the required Android-current manual platform pass and document non-Android limits | ✅ done — Android remains the only current runtime target; capability/permission limits documented; web local speech disabled; Android real-device QA remains tracked under overlay/IME tasks |

---

## Quality

| Pri | Task | Status |
|-----|------|--------|
| ✅ | Remove GitHub Actions Node.js 20 deprecation warnings from Flutter Android CI | ✅ done — `dorny/paths-filter@v4` and `actions/cache@v5` now target Node 24; tracked as `BUG-2026-05-16-005` pending hosted CI confirmation |
| 🟡 | Expand automated coverage beyond the template test for auth gate, repositories, and sync/error flows | 📋 todo |
| ✅ | Rework core documentation path governance to remove compatibility doc files at repo root and use canonical `shipglows_data` paths | ✅ done |
| ✅ | Revisit README/docs wording after verification so they reflect shipped behavior rather than migration intent | ✅ done — Firebase OIDC CI playbook added and Supabase migration docs explicitly archived/legacy |

---

## Historical completed work

> Imported from repo state so the local tracker starts with the already-shipped baseline, not an empty backlog.

| Pri | Task | Status |
|-----|------|--------|
| ✅ | Flutter multi-platform baseline and Supabase-first repository structure | ✅ done |
| ✅ | Initial Supabase migration and RLS smoke test scaffold | ✅ done |
| ✅ | Supabase migration lint in CI | ✅ done |
| ✅ | Flox Flutter environment repaired and pinned to an executable `flutter` SDK variant | ✅ done |
| ✅ | RLS smoke converted to a pgTAP-style test and wired into CI | ✅ done |
| ✅ | Added first-run onboarding, Android back-tab navigation, permission explanations and non-blocking backend diagnostic copy in Settings | ✅ done |

---

## Backlog

| Pri | Task | Status |
|-----|------|--------|
| ✅ | Use GitHub Secrets, not Doppler, for Android build configuration on Blacksmith | ✅ done |
| 🟢 | Review product/runtime scope after the verification gate before adding billing or release-surface work | 💤 deferred |
| 🟡 | Benchmark Amical against WinGlows App on global hotkey, context-aware dictation formatting, local-first/offline mode, custom vocabulary, cancel-or-retake capture UX, and floating window stability; use both the official site and AppSumo feedback/Q&A as inputs | 📋 todo |

---

## Audit Findings
<!-- Populated by /sf-audit — dated sections with Fixed: / Remaining: -->

### Audit: Design

| Pri | Task | Status |
|-----|------|--------|
| 🟠 | Validate Appearance sync against Firebase under offline/error/account-switch cases and surface pending/error status in Settings instead of swallowing persistence failures | 📋 todo |
| 🟠 | Unify product language across Auth, Settings, Shell, and CRUD surfaces so a single session does not mix French and English labels, actions, and destructive prompts | 📋 todo |
| 🟠 | Raise global button/icon minimum targets and review dense Settings controls so key actions do not default to 34-36 px hit areas | 📋 todo |
| 🟡 | Refactor typography tokens into named text roles or bundled specs (`size + line-height + tracking`) instead of a loose t-shirt scale spread across `AppTypography` and `_textTheme` | 📋 todo |
| 🟡 | Add reduced-motion handling for non-trivial motion and interaction feedback instead of relying only on raw duration/curve tokens | 📋 todo |
| 🟡 | Add a Flutter design playground/storybook screen for token inspection across light/dark modes | 📋 todo |
| 🟡 | Review wide desktop-biased dialog widths and encoded status strings in keyboard/settings flows for better responsive readability | 📋 todo |
| 🟡 | Tokenize remaining literal durations in Shell/Voice/Settings motion paths (tokens defined in AppMotion, consumer migration pending analyzer resolution) | 📋 todo |
| 🟡 | Resolve Flutter analyzer false-positive on new AppMotion getters to enable full motion token consumption | 📋 todo |

### Audit: Code

| Pri | Task | Status |
|-----|------|--------|
| 🟠 | Add route-level auth/flow guarding in `app_router.dart` so feature routes cannot be opened directly when auth and account state are required | 📋 todo |
| 🟡 | Add null-safety and error mapping around Google Sign-In credential construction in `lib/features/auth/data/firebase_auth_session_store.dart` | 📋 todo |
| 🟡 | Gate or contextualize diagnostic support export (`_backendDiagnosticText` in `settings_screen.dart`) outside explicit support/debug flows | 📋 todo |

### Audit: Components

| Pri | Task | Status |
|-----|------|--------|
| 🟠 | Treat the component audit `C` score as an active chantier under `settings-driven-design-system` until the component baseline reaches at least `B` | ✅ done — re-audit baseline raised to `B`; visual/manual review remains a design validation item, not a component-system blocker |
| 🟠 | Extract shared CRUD form/list primitives for Voice, Clipboard, Snippets, and Dictionary so repeated `Card` + `Padding` + fields + submit/refresh/list patterns do not keep drifting | ✅ done — `AppSectionCard`, `AppFormActions`, `AppEntityListHeader`, `AppEmptyStateCard`, and `AppEntityListTile` now cover the representative CRUD pages |
| 🟠 | Split `SettingsScreen` into composable settings sections for Appearance, backend diagnostics, keyboard, overlay, secrets, and platform capability rows | ✅ done — Settings rendering now uses dedicated private section widgets plus shared `AppSectionCard`/`AppStatusCard` primitives |
| 🟠 | Split keyboard editor/preview controls into smaller variant-driven widgets and replace the 16-prop `_PreviewControls` surface with grouped config objects or section components | ✅ done — `_PreviewControls` now takes grouped `value` and `actions` objects |
| 🟡 | Add explicit accessibility/focus contracts for custom keyboard corner targets and editor controls beyond basic `Semantics` labels | ✅ done — corner preview now has ordered focus traversal, semantic key/corner targets, Enter/Space activation, overlay slider semantic values, and widget-test coverage |
| 🟡 | Introduce reusable app primitives (`AppSectionCard`, `AppFormPanel`, `AppEntityListTile`, `AppStatusCard`) instead of assembling Material primitives inline on every page | ✅ done — first shared component set added under `lib/core/widgets/app_components.dart` |
| 🟡 | Move data mutation/load orchestration out of the large page state classes where practical, keeping screen widgets focused on rendering and interaction wiring | ✅ done — Settings keyboard/overlay bridge orchestration moved to `SettingsKeyboardController`/`SettingsOverlayController`, and keyboard preview/settings rendering split into dedicated part files |

### Audit: Deps

🟠 [WinGlowsApp] task: Refresh non-major Flutter pub dependencies for Firebase, Sentry, secure storage, speech, and permissions, then rerun `flutter analyze` and `flutter test` | status: todo | area: deps-currency | id: wfz-deps-nonmajor-refresh
🟡 [WinGlowsApp] task: Decide whether legacy Supabase runtime packages stay as compile-compat debt or can be isolated further from active app surfaces | status: todo | area: deps-surface | id: wfz-deps-supabase-legacy-scope
🟡 [WinGlowsApp] task: Add a project license declaration and a repeatable dependency license inventory step for Flutter pub packages | status: todo | area: deps-license | id: wfz-deps-license-inventory
🟡 [WinGlowsApp] task: Make Flutter or Dart toolchain pinning explicit for contributors outside Flox and align it with the actual SDK used in CI and local checks | status: todo | area: deps-config | id: wfz-deps-toolchain-pinning


---

<!-- central-shipglows-data-retirement: imported projects/winglowz/TASKS.md -->

## Legacy Imported From Central ShipGlows Data

The following content was preserved from `/home/claude/shipglows_data/projects/winglowz/TASKS.md` during central repository retirement. Treat it as historical backlog/context unless an item is promoted into the active section above.

# WinGlows Formation — Backlog

> Audit date: 2026-03-09
> Course: 39 pages across 8 modules (FR)
> Benchmark: Ali Abdaal LifeOS, Tiago Forte BASB, Thomas Frank, August Bradley PPV

---

## Active

🟡 [winglowz] task: Consolidate SITE and PUBLIC_SITE_URL into one canonical site URL env | status: todo | area: env-cleanup | id: wf-site-url-env-single-source

---

## Audit: Code (2026-04-07) — Score: C+

| Pri | Task | Status |
|-----|------|--------|
| ✅ | Clerk webhook: add svix signature verification + proxy to Convex HTTP | ✅ fixed |
| ✅ | Convert public Convex mutations to internalMutation (polar.ts, users.ts) | ✅ fixed |
| ✅ | API key generation: replace Math.random() with crypto.getRandomValues() | ✅ fixed |
| ✅ | Route translation drift: align routing.ts, i18n/config.ts, fr/routes.json | ✅ fixed |
| ✅ | CSP connect-src: add Convex/Clerk/Polar domains, remove unsafe-eval | ✅ fixed |
| ✅ | convex/http.ts: add Polar signature verification, fix empty catch | ✅ fixed |
| ✅ | CORS: make origin environment-aware (not hardcoded localhost) | ✅ fixed |
| ✅ | Middleware: remove unnecessary `as any` casts | ✅ fixed |
| 🟠 | `as never` casts on ConvexHttpClient calls (courseGating.ts, checkout.ts) — needs codegen | 📋 todo |
| 🟠 | Add CLERK_WEBHOOK_SECRET env var to Vercel + Convex deployment | 📋 todo |
| 🟠 | Point Clerk webhooks to Convex HTTP endpoint or Astro proxy | 📋 todo |
| 🟠 | Zero test files — write tests for courseGating, webhooks, checkout | 📋 todo |
| 🟡 | Duplicate cn() utility (lib/cn.ts + lib/utils.ts) — consolidate | 📋 todo |
| 🟡 | Duplicate Button component (ui/button.tsx vs react/ui/button.tsx) | 📋 todo |
| 🟡 | Convex client singleton in lib/convex.ts never used (4 ad-hoc instantiations) | 📋 todo |
| 🟡 | COURSE_ENTITLEMENT duplicated in courseGating.ts and convex/http.ts | 📋 todo |
| 🟡 | Dead deps: @astrojs/vue, @types/cors, astro-vtbot — remove | 📋 todo |
| 🟡 | Both astro-compress AND astro-compressor installed — pick one | 📋 todo |
| 🟡 | No .env.example file | 📋 todo |
| 🟡 | In-memory rate limiting useless on Vercel serverless | 📋 todo |
| 🟡 | No structured logging or error tracking | 📋 todo |

### Audit: Deps

| Pri | Task | Status |
|-----|------|--------|
| 🔴 | Remediate public Astro/Vercel security advisories: `path-to-regexp` ReDoS via `@astrojs/vercel`, Astro `define:vars` XSS, `@astrojs/node` SSRF/DoS/cache-poisoning advisories | ✅ done |
| 🟠 | Plan an Astro adapter/framework migration under `/sf-migrate` before major upgrades (`astro` 5→6, `@astrojs/vercel` 9→10, `@astrojs/node` 9→10, Clerk/Preline/Tailwind ecosystem majors) | ✅ done |
| 🟠 | Restore reproducible installs: commit or intentionally replace `pnpm-lock.yaml`, add `packageManager`, and pin Node runtime via `engines` or `.node-version` | 🔄 in progress |
| 🟡 | Add dependency update automation for pnpm and GitHub Actions with reviewed security updates, not silent major auto-merges | 📋 todo |
| 🟡 | Remove or justify likely-unused direct dependencies after manual verification: `@heroicons/react`, `@polar-sh/astro`, `@preline/accordion`, `@types/cors`, `@vercel/nft`, `astro-compress`, `astro-compressor`, `astro-vtbot`, `globby`, `html-minifier-terser`, `lucide-react`, `sharp-ico`, `@phosphor-icons/web`, and formatting-only packages | 📋 todo |
| 🟡 | Resolve dependency hygiene: choose one Astro compression package, document Preline Fair Use license fit, and add a project license declaration | 📋 todo |

---

## Session Notes — 2026-03-24

### Done

- [x] Public/private course gating is in place with Starlight override and private lesson route under `/dashboard/docs/...`
- [x] Public lesson previews now route to a real server checkout entrypoint at `/api/polar/checkout`
- [x] Polar webhook endpoint added at `/api/polar/webhook` with signature validation
- [x] Convex user model now supports persistent training entitlements via `courseEntitlements`
- [x] Clerk sign-in redirect flow now supports returning to checkout or the private lesson
- [x] Purchase success page now redirects back to the unlocked private lesson
- [x] Global anti-copy / anti-select scripts removed from public layouts and `/bio`
- [x] Public inspector/debug scripts removed from the public site
- [x] French Module V now has a real index page at `/fr/formations/module-5-consommer/`
- [x] Public blog page debug logs removed
- [x] Public lesson previews now have clearer value proposition, structure, and unlock CTAs
- [x] Homepage and product page copy now better matches the real WinGlows offer
- [x] Full English training content now exists across all 8 modules
- [x] Public contact email updated to `hello@winglowz.com`
- [x] Sales funnel CTAs now point to real localized destinations across landing, product, and success flows
- [x] Newsletter welcome flow now sends subscribers toward the Windows sales page
- [x] Product catalog `beta` / `coming_soon` entries now use contact or waitlist CTAs instead of dead `#` links
- [x] README, GUIDELINES, and `.env.example` now reflect the current Astro + Polar + Convex stack

### Next Prod Steps

- [ ] Configure Vercel env vars: `POLAR_ACCESS_TOKEN`, `POLAR_WINGLOWZ_PRODUCT_ID` or `POLAR_PRODUCT_ID`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`, `PUBLIC_CONVEX_URL`
- [ ] Point Polar webhooks to `POST /api/polar/webhook`
- [ ] Deploy Convex schema and mutations so `courseEntitlements` is available in production
- [ ] Run an end-to-end production test: public lesson -> sign in -> Polar checkout -> success -> `/dashboard/docs/...`
- [x] Keep `pnpm-lock.yaml` out of the commit, otherwise Vercel will switch back to `pnpm --frozen-lockfile` (currently absent from repo)

### Next UX / Content Cleanup

- [ ] Remove or modernize the legacy `/landing` page so it no longer duplicates the homepage positioning
- [ ] Continue tightening marketing claims across secondary pages, testimonials, and remaining legacy sections
- [ ] Implement a real contact flow instead of the current `mailto:` fallback
- [ ] Pre-fill contact requests with the product or beta/waitlist intent to close the loop from catalog pages

---

## Dashboard

| Module | Pages | Quality | Priority fixes |
|--------|-------|---------|---------------|
| I — Productivité | 7 | A | Exercises, sources, cross-links |
| II — Windows | 7 | A- | Cross-links, exercises |
| III — Temps & Énergie | 3 | A | Weekly review page, exercises |
| IV — Actions | 3 | B+ | Troubleshooting, tool workflow, setup guide |
| V — Consommer | 5 | B | Restructure, deepen, connect to PKM |
| VI — Connaissances | 8 | B+ | Reorder, decision trees, minimal setup, backlinks concept |
| VII — Social | 6 | A | Privacy notes, cross-links |
| VIII — Raccourcis | 1 | B | Add Slack/Teams/VSCode, deepen |
| Hub page | 1 | B | Progression path, CTA |

---

## 🔴 Critical — Missing from any professional course

- [ ] **Exercises & deliverables per module** — Every module should produce a tangible artifact (ton système de tâches, ton workflow de capture, ton template de revue hebdo). Top courses (BASB, LifeOS) all do this. Currently: zero exercises across 39 pages.
- [ ] **Weekly review as keystone habit** — Every major course converges on this as THE most important practice. We don't have a dedicated page. Add to Module III or IV: structured 60-90 min ritual (process tasks, review energy data, digital declutter, set intentions).
- [ ] **AI integration depth** — "Utilise l'IA partout" is not enough in 2026. Need concrete AI workflows: prompt templates for prioritization, AI-assisted weekly review, ChatGPT for brainstorming, AI note summarization. MIT now has a dedicated course on "Personal Productivity in the Age of AI".
- [ ] **Learning objectives** — Each page should start with "À la fin de cette leçon, tu sauras..." (2-3 bullet points). Currently: none.
- [ ] **Cross-references between modules** — Concepts repeat across modules without linking. Examples: Backwardation (M4) should reference PKM for research; Focus (M1) should link to Timeboxing (M3); Discipline habits should link to Habit trackers (M4). Currently: zero cross-links.

## 🟠 High — Would significantly improve quality

- [ ] **Module V (Consommer) restructure** — Weakest module. Pages feel disconnected. Restructure as a consumption pipeline: Trouver → Filtrer → Lire → Synthétiser. Add decision tree for tool selection.
- [ ] **Module VI reorder** — "Consommer & Réfléchir" (order 8) is foundational but listed last. Move to order 2 (after index). Current order makes reader build systems before learning how to consume intentionally.
- [ ] **"Getting Started" quick-start guide** — Top courses all have this. Add a page to Module I or hub: "Week 1: the minimum viable setup in 15 minutes. Week 4: your full system." Prevents tool overload paralysis.
- [ ] **Failure recovery** — What to do when the system breaks. No course teaches this well (identified gap across industry). Huge differentiator opportunity. Add to Module IV or III.
- [ ] **Module VI tool overload** — 30+ tools across 8 pages. Add "Minimum Viable PKM" sidebar: the 3 tools you actually need to start (ex: Flow Launcher + Obsidian + Hoarder). Decision trees instead of lists.
- [ ] **Obsidian/Logseq missing** — Module VI covers PKM but doesn't mention the two dominant PKM tools of 2025-26. No mention of backlinks, graph view, or linked thinking — which is the core innovation in modern PKM.
- [ ] **Source citations** — Several stats are unsourced: "24 min to refocus" (Gloria Mark, 2004), "66 days for habits" (Lally et al., 2009), "147 min/day social media" (outdated, now ~2h30). Add inline sources.
- [ ] **Module VIII expand** — Missing entire categories: Slack, Teams, VSCode/developer shortcuts, Windows 11-specific (Snap Layouts). Add app-specific shortcut sub-sections.

## 🟡 Medium — Would make the course great

- [ ] **"Next lesson" navigation** — Each page should end with a CTA pointing to the next page. Currently pages just end.
- [ ] **Hub page progression** — Transform formations.mdx into a visual learning path (not just a list). Show recommended order, estimated time per module, visual progress.
- [ ] **Slow productivity / burnout prevention** — Cal Newport's "Slow Productivity" (2024) is now standard. We touch on it (rest, boundaries) but don't name or develop the concept: fewer things, at a natural pace, obsess over quality.
- [ ] **Personalization guidance** — "Ce qui marche pour un influenceur YouTube ne marchera pas pour un développeur freelance." Add a page or section on identifying your productivity personality/cognitive style and adapting the system.
- [ ] **Tone consistency** — Module VII uses Starlight admonitions (:::tip, :::caution) and structured 4-week challenges. Other modules don't. Standardize engagement patterns across all modules.
- [ ] **Privacy/GDPR notes** — Several tools (Hunter.io, LinkedIn Sales Navigator, MailTrack) have privacy implications. Add brief disclaimers.
- [ ] **Reflection prompts** — End each page with "Qu'est-ce que tu vas mettre en place cette semaine ?" Module VII already does this (4-week challenges). Extend to all modules.
- [ ] **Tool pricing/dates** — Add "dernière vérification : mars 2026" to tool tables. Prices change, tools disappear.

## 🟢 Low — Nice to have

- [x] **EN training translation** — Full EN lesson set now exists under `en/formations/`
- [ ] **Image migration** — Copy images from CONTENU/ to `public/images/cours/`, fix Obsidian references
- [ ] **Community/accountability angle** — Top courses with community have 5x engagement. Even a simple groupe Facebook link + accountability partner suggestion would help.
- [ ] **Video content** — Many source notes reference YouTube videos. Consider embedding key ones or creating course-specific video content.
- [ ] **Measurable outcomes** — BASB reports "40% improvement in notetaking confidence." Define measurable claims: "saves X hours/week," "reduces email time by Y%."
- [ ] **Tiered pricing strategy** — Le contenu est le produit (pas l'affiliation). Industry standard: Basic (97-197€), Premium (297-497€ avec communauté + templates), Accompagné (697-997€ avec coaching). Module I gratuit comme vitrine.
- [x] **Paywall / gating** — Gating Starlight en place : previews publiques + auth (Clerk) + paiement (Polar.sh) + route privée `/dashboard/docs/...`
- [ ] **Cohort option** — Cohort-based courses achieve 85-96% completion vs ~30% self-paced. Consider periodic cohort launches.
- [ ] **Notion/Obsidian templates** — Downloadable templates matching each module's system (weekly review template, PKM starter, habit tracker). Valeur perçue élevée → justifie le prix.
- [ ] **Evaluate Vovsoft AI Automator for Windows-first training demos** — Test whether its local Ollama/API scheduling and batch prompt workflows can support WinGlows exercises, classroom demos, or guided automation examples without needing shared infra (added 2026-04-18).

---

## Content gaps identified (new pages to consider)

| Proposed page | Module | Rationale |
|--------------|--------|-----------|
| `revue-hebdomadaire.md` | III or IV | Keystone habit, every top course has this |
| `ia-productivite.md` | I or new | AI workflows for productivity (2026 table stakes) |
| `demarrage-rapide.md` | I (hub) | Quick-start guide, prevents overwhelm |
| `quand-le-systeme-casse.md` | IV | Failure recovery, unique differentiator |
| `productivite-lente.md` | I or III | Slow productivity / burnout prevention |
| `pensee-liee.md` | VI | Backlinks, graph view, linked thinking |
| `personnalise-ton-systeme.md` | I | Cognitive styles, adapting frameworks |

---

## Benchmarking vs top courses

| Feature | WinGlows | Ali Abdaal | Tiago Forte | Thomas Frank |
|---------|----------|------------|-------------|--------------|
| Modules | 8 | 7 | 6 | 3 |
| Pages | 39 | 38 lessons | ~30 lessons | ~15 lessons |
| Exercises | None | Workbook | Exercises/module | Exercises/module |
| Learning objectives | None | Yes | Yes | Implicit |
| Weekly review | Not taught | Core practice | Core practice | Core practice |
| AI integration | Shallow | Growing | Minimal | Growing |
| Community | None | Pro tier | 3000+ members | Skillshare |
| Cross-references | None | Some | Strong | Some |
| Quick-start | None | Workbook | App quiz | Video 1 |
| Tool-agnostic | Yes (Windows) | Yes | Yes | Notion-focused |
| Failure recovery | None | None | None | None |
| French content | Native + EN translation | EN only | EN only | EN only |

**Our advantages**: Native French (eux sont EN only), Windows-specific depth, broader scope (8 modules vs 3-7), contenu = produit principal (pas un lead magnet).
**Our gaps**: No exercises, no weekly review, no AI depth, no community, no quick-start.
**Business model**: Formation payante (tiers). Module I gratuit = vitrine. Affiliation = bonus, pas le core. Templates + communauté = valeur perçue pour tiers supérieurs.
