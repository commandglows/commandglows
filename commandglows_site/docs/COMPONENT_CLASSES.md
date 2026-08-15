# CommandGlows shared component classes

Shared classes in `src/assets/styles/global.css` provide stable component entry
points such as buttons, cards, links, badges, and branded text treatments. Their
class names are consumer APIs; their visual values must resolve through the
CommandGlows design-system contract.

## Usage

Prefer an existing shared class or project component over repeating a utility
bundle in a route or feature:

```html
<a class="btn-primary" href="/products">Découvrir les produits</a>
```

Before using a documented class, confirm that it still exists in
`src/assets/styles/global.css`. This guide does not promise future classes or
prescribe raw palette utilities.

## Changing a shared class

1. Read the canonical
   [`design-system-authority.md`](../../shipglows_data/technical/design-system-authority.md)
   and the site [design specification](./DESIGN_SPECIFICATION.md).
2. Select an existing semantic/component role, or add the role to the canonical
   manifest and registries first.
3. Compose the class from generated semantic variables, classified site
   variables, or named component variables.
4. Do not introduce a generic Tailwind palette, an arbitrary visual utility, or
   a raw color/spacing/radius/motion value as a shortcut.
5. Verify all consumers in light/dark modes and at representative mobile,
   tablet, and desktop widths. Interactive classes also require focus,
   keyboard, contrast, target-size, and reduced-motion proof.

## Naming

Use purpose-based names whose meaning can survive a palette or typography
change:

| Prefix | Purpose | Example |
| --- | --- | --- |
| `.btn-` | Action variants | `.btn-primary` |
| `.card-` | Card variants | `.card-rainbow-border` |
| `.badge-` | Status or emphasis variants | `.badge-rainbow` |
| `.link-` | Link states | `.link-active` |
| `.text-` | Text treatments | `.text-rainbow` |

Names such as `primary` and `active` refer to semantic purpose. They do not
authorize a hardcoded magenta, gray, or gradient value.

## Validation

Run from the repository root:

```powershell
uv run python tools/design_system/project_drift_guard.py --changed --format markdown
```

Then run the site build/tests and collect rendered browser evidence appropriate
to the changed components. Generated adapter files are never edited by hand.
