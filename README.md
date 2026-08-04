# CommandGlows

Canonical monorepo for the CommandGlows site and application surfaces.

## Repository Layout

- `commandglows_site/` - Astro site for content, account, commerce, and bridge API surfaces.
- `commandglows_app/` - Flutter Android-first app.
- `shipglows_data/` - monorepo-level governance contracts, specs, bugs, reviews, and workflow artifacts.

## Deployment Model

- GitHub source of truth: `diane-defores/commandglows` (external rename gate).
- Vercel site project uses `commandglows_site` as its Root Directory after the structural cutover.
- Vercel app project uses `commandglows_app` as its Root Directory after the structural cutover.
- Firebase CLI files for the app live under `commandglows_app/` after the structural cutover.

## Common Checks

Run checks from the affected subproject:

```bash
(cd commandglows_site && pnpm build:check)
(cd commandglows_site && pnpm test:unit)
(cd commandglows_app && flutter analyze)
(cd commandglows_app && flutter test)
```

## Working Rule

All active CommandGlows surfaces live in this single repository. The sibling legacy checkout is historical migration input only and must not be used as an active source.
