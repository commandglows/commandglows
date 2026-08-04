---
artifact: exploration_report
metadata_schema_version: "1.0"
artifact_version: "1.0.1"
project: "WinGlowz"
created: "2026-05-17"
updated: "2026-05-17"
status: draft
source_skill: sf-explore
scope: "root-apps-firebase-offline-realtime-app-check-fit"
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "WinGlowz Android app"
  - "ContentGlowz app"
  - "ReplayGlowz app"
  - "SocialGlowz"
  - "NoteFinderz"
  - "GoCharbon"
  - "Nantes Gratuit"
  - "VoiceFlowz legacy naming"
  - "Firebase"
  - "Firestore"
  - "Firebase App Check"
  - "Convex"
  - "Clerk"
  - "Supabase"
evidence:
  - "/home/claude/winglowz_app/README.md"
  - "/home/claude/winglowz_app/pubspec.yaml"
  - "/home/claude/contentglowz/contentglowz_app/README.md"
  - "/home/claude/contentglowz/contentglowz_app/pubspec.yaml"
  - "/home/claude/replayglowz/replayglowz_app/README.md"
  - "/home/claude/replayglowz/replayglowz_app/pubspec.yaml"
  - "/home/claude/socialglowz/README.md"
  - "/home/claude/socialglowz/package.json"
  - "/home/claude/shipglows_data/projects/socialflow/TASKS.md"
  - "/home/claude/notefinderz/README.md"
  - "/home/claude/notefinderz/package.json"
  - "/home/claude/gocharbon/package.json"
  - "/home/claude/shipglows_data/projects/nantes-gratuit/TASKS.md"
depends_on:
  - "/home/claude/shipglows_data/projects/winglowz/docs/technical/suite-authentication.md@1.0.0"
supersedes: []
next_step: "/sf-spec firebase-fit-per-product if a migration is selected"
---

# Exploration Report: Root Apps Firebase Fit

## Starting Question

Which apps under `/home/claude` would actually benefit from Firebase because of
offline, realtime, mobile security, or App Check needs?

## Short Answer

Do not migrate every app to Firebase by default.

Firebase is strongest when a product is mobile-first, needs a managed
offline-first sync model, uses Firebase backend products directly, or needs
Android app attestation through App Check. Apps already using Convex for
realtime or a custom Clerk/FastAPI offline queue should only move if a concrete
product capability justifies the migration cost.

## What "App Check" Means

Firebase App Check is not user login. It verifies that requests are coming from
the authentic app or an acceptable device/app environment before Firebase
backends accept those requests.

For Android, App Check commonly uses Play Integrity. This is useful when the app
uses Firebase resources such as Firestore, Realtime Database, Storage, callable
Cloud Functions, or supported custom backend verification. It does not replace
Security Rules, server authorization, or entitlement checks.

## Product Classification

| Product | Current signal | Firebase fit | Recommendation |
| --- | --- | --- | --- |
| WinGlowz app, formerly VoiceFlowz / VoiceFlows | Flutter Android-first, Firebase Auth and Firestore dependencies, README says Firebase first adapter and cloud sync pending Firebase validation; historical VoiceFlowz tracker maps to this app | High | Keep Firebase for the app adapter. Add App Check when Firestore/Storage/Functions are production-gated. |
| ContentGlowz app | Flutter app, Clerk web auth, FastAPI backend, offline cache, replay queue, temp-ID reconciliation already documented | Medium | Do not migrate just because it is Flutter. Evaluate Firebase only for a new feature that needs native realtime collaboration, cross-device live sync, or Firebase-backed file/media sync. |
| ReplayGlowz app | Flutter web app, Firebase Auth, Convex backend subscriptions, transcript worker talks through Convex | Medium-high, already partial | Keep Firebase Auth plus Convex. Firebase data migration is not needed while Convex owns realtime state and orchestration. |
| SocialGlowz | Vue/Tauri/WebView app, Convex Auth, cloud-backed sync, durable Convex sync queue, WebSocket subscriptions | Medium | Convex already solves realtime/sync. Revisit Firebase only if Android native attestation, Firebase-hosted data, or stronger mobile backend protection becomes a product requirement. |
| NoteFinderz | Astro/Vue, Clerk auth, Convex backend for user data/submissions/feeds/webhooks | Low-medium | Keep Clerk plus Convex. Firebase is not a better default unless a native/offline app is added. |
| WinGlowz site / Formation | Existing Clerk/Convex/Polar work and suite identity decision | Low for app data, high only as mobile bridge | Keep Clerk as suite identity. Firebase remains the Android bridge, not the web account center. |
| GoCharbon | Astro/content-style package, no obvious auth/realtime backend in package | Low | No Firebase migration signal. |
| ContentGlowz site | Astro landing/site surface | Low | No Firebase migration signal. |
| ReplayGlowz site | Astro landing/site surface | Low | No Firebase migration signal. |
| Nantes Gratuit | Supabase Auth/RLS/Storage/Edge Functions tracker | Medium only if mobile/offline becomes central | Keep Supabase unless a mobile offline/realtime app spec is created. |
| GoCharbon Quiz | Tracker shows FastAPI/Convex drift | Unknown | Clean the backend architecture first; do not add Firebase before resolving FastAPI vs Convex ownership. |
| Quit Coke | Astro, Clerk, Polar, RevenueCat tracker | Low | No Firebase migration signal unless native app offline behavior becomes central. |

## Decision Rule

Use Firebase when at least two of these are true:

- The app is Android-first or Flutter mobile-first.
- Product value depends on offline edits that later sync cleanly.
- Product value depends on realtime collaboration, live status, or cross-device
  state updates.
- The app stores user data directly in Firebase products such as Firestore or
  Storage.
- Abuse resistance from App Check / Play Integrity matters for production.
- The product has no existing backend that already solves these needs cleanly.

Do not use Firebase only because the app is Flutter. Flutter is only a runtime.
The deciding factor is the product data behavior and security boundary.

## Practical Recommendation

Keep the current suite auth decision:

- Clerk remains the long-term suite identity center.
- Firebase remains the WinGlowz Android adapter.
- Product access remains server-owned entitlements.

Add a per-product Firebase review only for apps with real mobile offline/realtime
needs:

1. WinGlowz app: proceed with Firebase, Firestore rules, emulator proof, Android
   QA, and App Check planning.
2. Legacy VoiceFlowz / VoiceFlows docs should be treated as old naming for the
   current WinGlowz app, not as a separate product to migrate.
3. ContentGlowz app: no immediate migration; document specific missing offline
   or realtime features before deciding.
4. SocialGlowz and ReplayGlowz: keep Convex for realtime unless Firebase-backed
   mobile security becomes a hard requirement.

## Internet Research

- Firebase App Check overview, accessed 2026-05-17:
  https://firebase.google.com/docs/app-check
- Firebase App Check with Play Integrity on Android, accessed 2026-05-17:
  https://firebase.google.com/docs/app-check/android/play-integrity-provider
- Firestore offline persistence, accessed 2026-05-17:
  https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Firestore realtime updates, accessed 2026-05-17:
  https://firebase.google.com/docs/firestore/query-data/listen

## Risks And Unknowns

- The filesystem scan found active root apps and project trackers, not a complete
  production inventory.
- Some projects may have private deployment/backend code outside the local paths
  inspected here.
- App Check protects Firebase-supported resources directly; custom backends need
  explicit App Check token verification if they should benefit from it.
- Migrating an app with working offline queues to Firebase can reduce custom
  maintenance, but it can also create a costly data/security rules rewrite.

## Handoff

No migration should start from this report alone. If a product is selected, write
a focused spec with:

- product-specific offline/realtime user stories;
- current backend owner;
- migration blast radius;
- auth bridge impact;
- data model and security rules;
- App Check enforcement plan;
- device and emulator verification gates.
