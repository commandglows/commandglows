# WinGlowz

Canonical monorepo for the WinGlowz site and application surfaces.

## Repository Layout

- `winglowz_site/` - Astro site for content, account, commerce, and bridge API surfaces.
- `winglowz_app/` - Flutter Android-first app.
- `shipglows_data/` - monorepo-level governance contracts, specs, bugs, reviews, and workflow artifacts.

## Deployment Model

- GitHub source of truth: `diane-defores/winglowz`
- Vercel site project uses `winglowz_site` as its Root Directory.
- Vercel app project uses `winglowz_app` as its Root Directory when the Flutter web surface is deployed.
- Firebase CLI files for the app live under `winglowz_app/`.

## Common Checks

Run checks from the affected subproject:

```bash
(cd winglowz_site && pnpm build:check)
(cd winglowz_site && pnpm test:unit)
(cd winglowz_app && flutter analyze)
(cd winglowz_app && flutter test)
```

## Working Rule

All active WinGlowz surfaces live in this single repository. The sibling `/home/claude/winglowz_app` checkout is a migration source and fallback until the monorepo migration is verified and shipped.
