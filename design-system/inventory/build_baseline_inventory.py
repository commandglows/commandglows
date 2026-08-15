"""Rebuild the read-only F0 design-system baseline from repository sources.

The script intentionally writes only inside design-system/inventory/. It does not
resolve or normalize values: F0 records current source truth so later batches can
make explicit semantic and platform-adaptation decisions.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / "design-system" / "inventory"
CSS_PATH = ROOT / "commandglows_site" / "src" / "assets" / "styles" / "global.css"
DART_TOKEN_PATH = ROOT / "commandglows_app" / "lib" / "core" / "theme" / "commandglows_theme_tokens.dart"
DART_THEME_PATH = ROOT / "commandglows_app" / "lib" / "core" / "theme" / "app_theme.dart"
KOTLIN_THEME_PATH = ROOT / "commandglows_app" / "android" / "app" / "src" / "main" / "kotlin" / "com" / "commandglows" / "app" / "ime" / "KeyboardThemeModels.kt"
EMAIL_THEME_PATH = ROOT / "commandglows_site" / "src" / "theme" / "newsletter-email-theme.ts"
EXT_POPUP_PATH = ROOT / "ext" / "src" / "popup.html"
EXT_CONTENT_PATH = ROOT / "ext" / "src" / "content-script.js"

CATEGORIES = (
    "primitive",
    "semantic",
    "component",
    "page",
    "prototype",
    "compatibility-alias",
    "unused-candidate",
)
FROZEN_ARTIFACT_SHA256 = {
    "README.md": "cc1424ada2377f809c9e7e251504725bec2be2384df756047227a22d3c84ed15",
    "cross-surface-baseline.json": "62c7aa6c973cb2ccc055600194be26e510fe3a0a4e870a027c322d9ac93b72b2",
    "site-css-custom-properties.json": "f2296eacffc731e123b102164ea360542074dc8ff4f3897ffff6e36e231c67a2",
}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def line_number(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def selector_before(text: str, offset: int) -> str:
    prefix = text[:offset]
    opening = prefix.rfind("{")
    closing = prefix.rfind("}")
    if opening < closing:
        return ""
    previous_closing = prefix.rfind("}", 0, opening)
    return " ".join(prefix[previous_closing + 1 : opening].split())[-240:]


def site_sources() -> list[Path]:
    candidates = [ROOT / "commandglows_site" / "tailwind.config.mjs"]
    for base in (ROOT / "commandglows_site" / "src", ROOT / "commandglows_site" / "idees" / "emails"):
        if base.exists():
            candidates.extend(path for path in base.rglob("*") if path.is_file())
    return sorted(set(candidates))


def classify_css(name: str, declarations: list[dict], reference_count: int) -> tuple[str, str]:
    bare = name[2:]
    selectors = " ".join(item["scope"] for item in declarations)
    values = [item["value"] for item in declarations]

    if "@theme inline" in selectors or bare.startswith("color-") or (
        bare.startswith("font-") and all(value.startswith("var(") for value in values)
    ):
        return "compatibility-alias", "Tailwind/theme adapter alias; dynamic utility consumption is not statically countable."
    if any(marker in bare for marker in ("prototype", "demo", "test-only")):
        return "prototype", "Explicit prototype/demo naming."
    if bare.startswith(("brand-", "font-family-")) or bare in {"radius", "root-font-size", "breakpoint-sm"}:
        return "primitive", "Raw brand, type, radius, or breakpoint foundation."
    if bare in {
        "background", "foreground", "border", "input", "ring", "primary", "primary-foreground",
        "secondary", "secondary-foreground", "muted", "muted-foreground", "accent",
        "accent-foreground", "destructive", "destructive-foreground", "popover",
        "popover-foreground", "surface", "link-color",
    } or bare.startswith(("site-", "status-", "content-text-", "content-bg-", "content-border-")):
        return "semantic", "Product/UI meaning is expressed independently of a single component."
    if bare.startswith(("landing-", "bio-", "termux-", "temu-", "dashboard-")):
        return "page", "Scoped to a named page or product surface."
    if bare.startswith((
        "navbar-", "btn-", "card-", "text-logo-", "scrollbar-", "keyboard-", "plugin-",
        "hero-", "eyebrow-", "media-", "avatar-", "ticker-", "pricing-", "cookie-",
        "menu-", "mega-", "banner-", "logo-", "icon-", "pulse-", "shimmer-", "overlay-",
    )):
        return "component", "Scoped to a named component or visual pattern."
    if reference_count == 0:
        return "unused-candidate", "No explicit var() reference found; review dynamic/framework consumption before removal."
    return "semantic", "Shared unnamed role with at least one explicit consumer; semantic review remains required."


def build_css_inventory() -> dict:
    text = CSS_PATH.read_text(encoding="utf-8")
    declaration_re = re.compile(r"(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+);")
    grouped: dict[str, list[dict]] = defaultdict(list)
    for match in declaration_re.finditer(text):
        grouped[match.group(1)].append({
            "line": line_number(text, match.start()),
            "scope": selector_before(text, match.start()),
            "value": match.group(2).strip(),
        })

    reference_counts: Counter[str] = Counter()
    reference_re = re.compile(r"var\(\s*(--[A-Za-z0-9_-]+)")
    for path in site_sources():
        try:
            source = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        reference_counts.update(reference_re.findall(source))

    rows = []
    for name in sorted(grouped):
        category, basis = classify_css(name, grouped[name], reference_counts[name])
        rows.append({
            "name": name,
            "category": category,
            "classification_basis": basis,
            "migration_status": "baseline-frozen",
            "reference_count": reference_counts[name],
            "declarations": grouped[name],
        })

    counts = Counter(row["category"] for row in rows)
    return {
        "schema_version": "1.0",
        "baseline_date_utc": "2026-08-14",
        "source": rel(CSS_PATH),
        "source_sha256": sha256(CSS_PATH),
        "classification_categories": list(CATEGORIES),
        "method": "Unique custom-property names; all declarations retained with source line, scope, and raw value.",
        "declaration_count": sum(len(row["declarations"]) for row in rows),
        "unique_property_count": len(rows),
        "category_counts": {category: counts[category] for category in CATEGORIES},
        "unclassified_count": sum(1 for row in rows if row["category"] not in CATEGORIES),
        "properties": rows,
    }


def dart_constants() -> list[dict]:
    text = DART_TOKEN_PATH.read_text(encoding="utf-8")
    pattern = re.compile(r"^\s*static const(?:\s+([\w<>]+))?\s+(\w+)\s*=\s*(.+?);\s*$", re.MULTILINE)
    rows = []
    for match in pattern.finditer(text):
        name, value = match.group(2), " ".join(match.group(3).split())
        if "Color(" in value or "Color." in value:
            role = "color"
        elif name.lower().startswith(("font", "typography", "lineheight", "tracking")):
            role = "typography"
        elif name.lower().startswith(("spacing", "inset")):
            role = "spacing"
        elif any(word in name.lower() for word in ("radius", "width", "height", "size", "gap", "padding", "breakpoint")):
            role = "geometry"
        elif any(word in name.lower() for word in ("duration", "animation", "motion")):
            role = "motion"
        elif any(word in name.lower() for word in ("shadow", "elevation")):
            role = "elevation"
        else:
            role = "other"
        rows.append({"name": name, "declared_type": match.group(1), "raw_value": value, "role_family": role, "line": line_number(text, match.start())})
    return rows


def kotlin_theme_fields() -> list[dict]:
    text = KOTLIN_THEME_PATH.read_text(encoding="utf-8")
    pattern = re.compile(r"^\s*val\s+(\w+)\s*:\s*([\w?]+)\s*=\s*([^,\n]+)", re.MULTILINE)
    rows = []
    for match in pattern.finditer(text):
        name, raw = match.group(1), match.group(3).strip()
        if any(word in name.lower() for word in ("color",)):
            role = "color"
        elif any(word in name.lower() for word in ("radius", "gap", "width", "blur", "offset", "depth")):
            role = "geometry"
        elif any(word in name.lower() for word in ("duration", "effect", "easing")):
            role = "motion"
        elif "opacity" in name.lower():
            role = "opacity"
        else:
            role = "data-or-behavior"
        rows.append({"name": name, "declared_type": match.group(2), "raw_default": raw, "role_family": role, "line": line_number(text, match.start())})
    return rows


def email_roles() -> list[dict]:
    text = EMAIL_THEME_PATH.read_text(encoding="utf-8")
    constants = []
    for match in re.finditer(r"^const\s+(NEWSLETTER_[A-Z_]+)\s*=\s*([^;]+);", text, re.MULTILINE):
        constants.append({"name": match.group(1), "raw_value": match.group(2).strip(), "line": line_number(text, match.start())})
    styles = []
    for name in re.findall(r"^\s{2}(\w+):\s*\{", text, re.MULTILINE):
        styles.append(name)
    return [{"constants": constants, "inline_style_roles": styles}]


def surface_inventory(css: dict) -> dict:
    dart = dart_constants()
    kotlin = kotlin_theme_fields()
    popup = EXT_POPUP_PATH.read_text(encoding="utf-8")
    content = EXT_CONTENT_PATH.read_text(encoding="utf-8")
    return {
        "schema_version": "1.0",
        "baseline_date_utc": "2026-08-14",
        "appearance_contract": "Preserve current resolved values, serialized theme data, and rendered appearance; this inventory changes no consumer.",
        "surfaces": [
            {
                "id": "site",
                "authority_sources": [rel(CSS_PATH), "commandglows_site/tailwind.config.mjs"],
                "modes": ["light", "dark", "data-theme overrides", "landing-scoped light/dark"],
                "fonts": ["Audiowide", "Space Grotesk", "Manrope", "ui-monospace fallback stack"],
                "inventory": {"css_custom_properties": css["unique_property_count"], "css_declarations": css["declaration_count"]},
            },
            {
                "id": "flutter",
                "authority_sources": [rel(DART_TOKEN_PATH), rel(DART_THEME_PATH)],
                "modes": ["ThemeData light", "ThemeData dark", "Material high-contrast/dynamic-type inputs"],
                "fonts": ["Manrope", "Cal Sans", "ui-monospace", "system fallbacks"],
                "declared_constants": dart,
            },
            {
                "id": "android-ime",
                "authority_sources": [rel(KOTLIN_THEME_PATH)],
                "modes": ["system", "catalog light/dark", "user-authored v1 theme"],
                "theme_fields": kotlin,
                "data_invariants": ["theme JSON version 1", "preset IDs", "user colors/images", "IME independence from Flutter runtime"],
            },
            {
                "id": "email",
                "authority_sources": [rel(EMAIL_THEME_PATH)],
                "delivery_constraints": ["resolved inline values", "no CSS custom-property dependency", "no JavaScript", "remote fonts not required"],
                "roles": email_roles(),
                "prototype_sources": ["commandglows_site/idees/emails/basic-email.tsx", "commandglows_site/idees/emails/weekly-signups.tsx"],
            },
            {
                "id": "extension",
                "authority_sources": [],
                "sources": [rel(EXT_POPUP_PATH), rel(EXT_CONTENT_PATH)],
                "current_state": {
                    "popup_stylesheets": popup.count("<link"),
                    "popup_style_blocks": popup.count("<style"),
                    "injected_shadow_roots": content.count("attachShadow"),
                    "injected_dialogs": content.count("createElement('dialog')"),
                },
                "finding": "No CommandGlows token adapter or style authority; popup and injected dialog use browser-native presentation.",
            },
        ],
        "exceptions": [
            {"id": "keyboard-theme-studio-fixtures", "surface": "flutter", "scope": "keyboard_theme_studio_screen.dart", "reason": "User/preset palette preview fixtures are explicitly temporary in current authority.", "status": "legacy-documented"},
            {"id": "user-authored-keyboard-theme", "surface": "android-ime", "scope": "KeyboardThemeConfig v1", "reason": "Persisted user colors/images are data, not global brand tokens.", "status": "platform-data-invariant"},
            {"id": "email-inline-values", "surface": "email", "scope": "delivered HTML", "reason": "Email clients require resolved client-safe inline values.", "status": "platform-required"},
            {"id": "generated-vercel-output", "surface": "site", "scope": "commandglows_site/.vercel/output", "reason": "Generated build output is non-authoritative and excluded.", "status": "generated-exclusion"},
        ],
        "legacy_mappings": [
            {"role": "surface/background", "sources": ["site CSS semantic variables", "Flutter ColorScheme", "Kotlin KeyboardThemeConfig", "email inline theme"], "status": "legacy-unexplained", "reason": "Parallel sources exist; equal meaning/value has not yet been proven."},
            {"role": "text/foreground", "sources": ["site CSS semantic variables", "Flutter ColorScheme", "Kotlin textColor/statusTextColor", "email text constants"], "status": "legacy-unexplained", "reason": "Role granularity and resolved parity are not yet registered."},
            {"role": "action/primary", "sources": ["site primary/brand variables", "Flutter appAction/theme primary", "Kotlin activeKeyColor", "email NEWSLETTER_PRIMARY"], "status": "legacy-unexplained", "reason": "Different product/platform meanings must not be unified by color coincidence."},
            {"role": "type/body", "sources": ["site Manrope/Space Grotesk roles", "Flutter Manrope", "email sans-serif", "extension browser default"], "status": "legacy-unexplained", "reason": "Fallback and delivery constraints require an explicit adaptation decision."},
            {"role": "radius/control", "sources": ["site radius/component variables", "Flutter radii", "Kotlin keyRadius", "email button radius", "extension browser default"], "status": "legacy-unexplained", "reason": "Density and client constraints differ; no canonical semantic mapping exists."},
            {"role": "motion/feedback", "sources": ["site animations", "Flutter durations", "Kotlin press durations/effects"], "status": "legacy-unexplained", "reason": "Behavioral equivalence and reduced-motion mapping are not yet proven."},
        ],
        "scanner_perimeter_baseline": {
            "files_scanned": 484,
            "findings": 7,
            "result": "drift candidates found",
            "coverage_note": "Current scanner result is evidence, not proof of Kotlin/XML/generated/resolved-value coverage.",
            "finding_groups": [
                {"source": "commandglows_site/src/assets/styles/global.css", "count": 3, "kind": "hardcoded CSS dimension"},
                {"source": "commandglows_site/idees/emails/basic-email.tsx", "count": 2, "kind": "hardcoded style value"},
                {"source": "commandglows_site/idees/emails/weekly-signups.tsx", "count": 2, "kind": "hardcoded style value"},
            ],
        },
        "source_checksums": {
            rel(path): sha256(path)
            for path in (CSS_PATH, DART_TOKEN_PATH, DART_THEME_PATH, KOTLIN_THEME_PATH, EMAIL_THEME_PATH, EXT_POPUP_PATH, EXT_CONTENT_PATH)
        },
    }


def json_bytes(payload: dict) -> bytes:
    return (json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=False) + "\n").encode("utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Verify the frozen artifacts without writing")
    mode.add_argument("--refresh-baseline", action="store_true", help="Explicitly replace the frozen F0 artifacts")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.check:
        stale = []
        for name, expected in FROZEN_ARTIFACT_SHA256.items():
            path = HERE / name
            actual = hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else "missing"
            if actual != expected:
                stale.append(path)
        if stale:
            for path in stale:
                print(f"stale: {path.relative_to(ROOT).as_posix()}")
            return 1
        print(f"clean: {len(FROZEN_ARTIFACT_SHA256)} frozen baseline artifact(s)")
        return 0
    css = build_css_inventory()
    surfaces = surface_inventory(css)
    summary = f"""# CommandGlows design-system baseline (F0)

Generated by `uv run python design-system/inventory/build_baseline_inventory.py`.

- Appearance contract: no token or consumer is changed by F0.
- Site CSS source: `{css['source']}` at SHA-256 `{css['source_sha256']}`.
- Custom-property declarations: **{css['declaration_count']}**.
- Unique custom properties: **{css['unique_property_count']}**.
- Unclassified properties: **{css['unclassified_count']}**.
- Categories: {', '.join(f'`{key}` {value}' for key, value in css['category_counts'].items())}.
- Official broad scanner baseline: **484 files / 7 candidates**.
- Cross-surface mappings remain `legacy-unexplained` until F1 defines the canonical semantic authority and adaptation registry.

The JSON files are the machine-readable evidence. `unused-candidate` is not permission to delete: dynamic Tailwind/framework consumption must be reviewed first. Source checksums freeze the baseline without embedding machine-specific paths.
"""
    outputs = {
        HERE / "site-css-custom-properties.json": json_bytes(css),
        HERE / "cross-surface-baseline.json": json_bytes(surfaces),
        HERE / "README.md": summary.encode("utf-8"),
    }
    if not args.refresh_baseline and any(path.exists() for path in outputs):
        raise SystemExit("refusing to overwrite frozen F0 artifacts; use --check or explicit --refresh-baseline")
    HERE.mkdir(parents=True, exist_ok=True)
    for path, content in outputs.items():
        path.write_bytes(content)
    print(f"refreshed: {len(outputs)} frozen baseline artifact(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
