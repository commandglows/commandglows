#!/usr/bin/env python3
"""CommandGlows-specific design-literal coverage guard.

The shared ShipGlows scanner remains useful broad evidence. This guard closes
the project-specific language and path gaps without treating words such as
``theme`` or ``token`` as an implicit exemption. Checked-in generated outputs
are excluded only by their exact manifest paths; ``generate_tokens.py --check``
owns their provenance and stale-output validation.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping

try:
    from tools.design_system.generate_tokens import DEFAULT_MANIFEST, load_bundle
except ModuleNotFoundError:  # Direct execution from tools/design_system/.
    from generate_tokens import DEFAULT_MANIFEST, load_bundle


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_POLICY = Path(__file__).with_name("project_drift_policy.json")
SAFE_RELATIVE_PATH = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/\-]*$")


@dataclass(frozen=True)
class Pattern:
    name: str
    regex: re.Pattern[str]


PATTERNS = (
    Pattern(
        "hardcoded color",
        re.compile(
            r"(#[0-9a-fA-F]{3,8}\b|\brgba?\((?!\s*var\()|\bhsla?\((?!\s*var\()|\boklch\((?!\s*var\()|"
            r"\bColor\(0x[0-9a-fA-F]{6,8}\)|\bColors\.[A-Za-z]|"
            r"\bColor\.parseColor\(\s*[\"']#[0-9a-fA-F]{3,8}[\"']\s*\)|"
            r"\b0x[0-9a-fA-F]{8}\b)"
        ),
    ),
    Pattern(
        "hardcoded CSS dimension",
        re.compile(
            r"(?<![-\w])(font-size|line-height|letter-spacing|gap|row-gap|column-gap|padding|padding-[a-z]+|"
            r"margin|margin-[a-z]+|inset|top|right|bottom|left|width|height|min-width|max-width|"
            r"min-height|max-height|border-radius|z-index)\s*:\s*-?"
            r"(?!0(?:[;,\s)]|px|rem|em|%))[0-9]+(?:\.[0-9]+)?(?:px|rem|em|vh|vw|dvh|svh|lvh|%)?"
        ),
    ),
    Pattern(
        "hardcoded programmatic style value",
        re.compile(
            r"(?<![-\w])(fontSize|lineHeight|letterSpacing|gap|padding|padding[A-Z][A-Za-z]*|margin|"
            r"margin[A-Z][A-Za-z]*|borderRadius|cornerRadius|keyRadius|elevation|shadowRadius|"
            r"shadowOpacity|zIndex|height|width|top|right|bottom|left|inset)\s*[:=]\s*-?"
            r"(?!0(?:[;,\s})]))[0-9]+(?:\.[0-9]+)?(?:f|F)?"
        ),
    ),
    Pattern(
        "hardcoded Android XML dimension",
        re.compile(
            r"(?:<dimen\b[^>]*>\s*-?[0-9]+(?:\.[0-9]+)?(?:dp|sp|px)\s*</dimen>|"
            r"(?:android:)?(?:padding(?:Start|End|Top|Bottom|Horizontal|Vertical)?|layout_width|"
            r"layout_height|minWidth|minHeight|textSize|elevation|translation[XY]|cornerRadius)\s*=\s*"
            r"[\"']-?[0-9]+(?:\.[0-9]+)?(?:dp|sp|px)[\"'])"
        ),
    ),
    Pattern("hardcoded shadow", re.compile(r"\bbox-shadow\s*:\s*(?![^;]*var\()[^;]+")),
    Pattern(
        "hardcoded motion",
        re.compile(
            r"\b(transition|animation)(?:-[a-z-]+)?\s*:\s*(?!var\()[^;]*(?:\d+ms|\d+\.\d+s|\d+s)"
        ),
    ),
    Pattern(
        "Tailwind arbitrary visual utility",
        re.compile(
            r"\b(?:bg|text|border|shadow|rounded|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|"
            r"top|right|bottom|left|inset|w|h|min-w|max-w|min-h|max-h|z)-\[[^\]]+\]"
        ),
    ),
)


class PolicyError(ValueError):
    """Raised when the project guard policy is malformed."""


@dataclass(frozen=True)
class AllowlistEntry:
    path: Path
    mode: str
    reason: str
    owner: str
    removal_condition: str
    pattern: re.Pattern[str] | None = None


@dataclass(frozen=True)
class Policy:
    scan_roots: tuple[Path, ...]
    extensions: frozenset[str]
    ignored_directory_names: frozenset[str]
    generated_manifest: Path
    allowlist: tuple[AllowlistEntry, ...]


@dataclass(frozen=True)
class Finding:
    path: Path
    line_no: int
    kind: str
    evidence: str


def _safe_path(raw: Any, field: str) -> Path:
    if not isinstance(raw, str) or not SAFE_RELATIVE_PATH.fullmatch(raw):
        raise PolicyError(f"{field}: expected a safe repository-relative path")
    path = Path(raw)
    if path.is_absolute() or ".." in path.parts:
        raise PolicyError(f"{field}: path must remain inside the repository")
    return path


def _require_text(entry: Mapping[str, Any], field: str, prefix: str) -> str:
    value = entry.get(field)
    if not isinstance(value, str) or not value.strip():
        raise PolicyError(f"{prefix}.{field}: expected non-empty text")
    return value


def load_policy(path: Path) -> Policy:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PolicyError(f"cannot load policy {path}: {exc}") from exc
    if not isinstance(raw, dict) or raw.get("version") != 1:
        raise PolicyError("policy.version: expected 1")

    raw_roots = raw.get("scanRoots")
    raw_extensions = raw.get("sourceExtensions")
    raw_ignored = raw.get("ignoredDirectoryNames")
    raw_allowlist = raw.get("literalAllowlist")
    if not isinstance(raw_roots, list) or not raw_roots:
        raise PolicyError("policy.scanRoots: expected a non-empty list")
    if not isinstance(raw_extensions, list) or not raw_extensions:
        raise PolicyError("policy.sourceExtensions: expected a non-empty list")
    if not isinstance(raw_ignored, list):
        raise PolicyError("policy.ignoredDirectoryNames: expected a list")
    if not isinstance(raw_allowlist, list):
        raise PolicyError("policy.literalAllowlist: expected a list")

    extensions: set[str] = set()
    for index, extension in enumerate(raw_extensions):
        if not isinstance(extension, str) or not re.fullmatch(r"\.[a-z0-9]+", extension):
            raise PolicyError(f"policy.sourceExtensions[{index}]: invalid extension")
        extensions.add(extension)
    ignored: set[str] = set()
    for index, name in enumerate(raw_ignored):
        if not isinstance(name, str) or not name or "/" in name or "\\" in name:
            raise PolicyError(f"policy.ignoredDirectoryNames[{index}]: invalid directory name")
        ignored.add(name)

    allowlist: list[AllowlistEntry] = []
    seen_paths_modes: set[tuple[Path, str]] = set()
    for index, item in enumerate(raw_allowlist):
        prefix = f"policy.literalAllowlist[{index}]"
        if not isinstance(item, dict):
            raise PolicyError(f"{prefix}: expected object")
        mode = item.get("mode")
        if mode not in {"file", "match", "css-custom-properties"}:
            raise PolicyError(f"{prefix}.mode: unsupported mode")
        entry_path = _safe_path(item.get("path"), f"{prefix}.path")
        key = (entry_path, mode)
        if key in seen_paths_modes:
            raise PolicyError(f"{prefix}: duplicate path/mode entry")
        seen_paths_modes.add(key)
        compiled: re.Pattern[str] | None = None
        if mode == "match":
            expression = _require_text(item, "pattern", prefix)
            try:
                compiled = re.compile(expression)
            except re.error as exc:
                raise PolicyError(f"{prefix}.pattern: invalid regex: {exc}") from exc
        allowlist.append(
            AllowlistEntry(
                path=entry_path,
                mode=mode,
                reason=_require_text(item, "reason", prefix),
                owner=_require_text(item, "owner", prefix),
                removal_condition=_require_text(item, "removalCondition", prefix),
                pattern=compiled,
            )
        )

    return Policy(
        scan_roots=tuple(_safe_path(value, f"policy.scanRoots[{index}]") for index, value in enumerate(raw_roots)),
        extensions=frozenset(extensions),
        ignored_directory_names=frozenset(ignored),
        generated_manifest=_safe_path(raw.get("generatedManifest"), "policy.generatedManifest"),
        allowlist=tuple(allowlist),
    )


def _git_paths(root: Path) -> set[Path]:
    paths: set[Path] = set()
    for args in (
        ["diff", "--name-only", "--diff-filter=ACMR", "HEAD"],
        ["ls-files", "--others", "--exclude-standard"],
    ):
        try:
            result = subprocess.run(
                ["git", *args],
                cwd=root,
                check=True,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
            )
        except (OSError, subprocess.CalledProcessError):
            continue
        paths.update(Path(line.strip()) for line in result.stdout.splitlines() if line.strip())
    return paths


def generated_output_paths(root: Path, policy: Policy) -> frozenset[Path]:
    manifest = root / policy.generated_manifest
    if not manifest.exists():
        return frozenset()
    bundle = load_bundle(manifest)
    adapters = bundle["manifest"]["adapters"]
    return frozenset(Path(adapter["output"]) for adapter in adapters.values())


def candidate_files(root: Path, policy: Policy, *, changed: bool = False) -> list[Path]:
    generated = generated_output_paths(root, policy)
    candidates: set[Path] = set()
    changed_paths = _git_paths(root) if changed else None
    for relative_root in policy.scan_roots:
        source_root = root / relative_root
        if not source_root.exists():
            continue
        for path in source_root.rglob("*"):
            if not path.is_file():
                continue
            relative = path.relative_to(root)
            if changed_paths is not None and relative not in changed_paths:
                continue
            if path.suffix.lower() not in policy.extensions:
                continue
            if any(part in policy.ignored_directory_names for part in relative.parts):
                continue
            if relative in generated:
                continue
            candidates.add(path)
    return sorted(candidates)


def _is_comment_or_empty(line: str) -> bool:
    stripped = line.strip()
    return not stripped or stripped.startswith(("//", "/*", "*", "<!--", "# "))


def _allowlisted(relative: Path, line: str, entries: Iterable[AllowlistEntry]) -> bool:
    for entry in entries:
        if relative != entry.path:
            continue
        if entry.mode == "file":
            return True
        if entry.mode == "match" and entry.pattern is not None and entry.pattern.search(line):
            return True
        if entry.mode == "css-custom-properties" and re.match(r"^\s*--[a-zA-Z0-9_-]+\s*:", line):
            return True
    return False


def scan_file(root: Path, path: Path, policy: Policy) -> list[Finding]:
    relative = path.relative_to(root)
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except UnicodeDecodeError:
        return []
    findings: list[Finding] = []
    for line_no, line in enumerate(lines, start=1):
        if _is_comment_or_empty(line) or _allowlisted(relative, line, policy.allowlist):
            continue
        for pattern in PATTERNS:
            if pattern.regex.search(line):
                findings.append(Finding(relative, line_no, pattern.name, line.strip()))
                break
    return findings


def scan(root: Path, policy: Policy, *, changed: bool = False) -> tuple[list[Path], list[Finding]]:
    files = candidate_files(root, policy, changed=changed)
    findings = [finding for path in files for finding in scan_file(root, path, policy)]
    return files, findings


def render(files: list[Path], findings: list[Finding], policy: Policy, *, markdown: bool, maximum: int) -> None:
    if markdown:
        print("# CommandGlows Project Design-System Drift Guard")
        print()
        print(f"- Files scanned: {len(files)}")
        print(f"- Findings: {len(findings)}")
        print(f"- Explicit allowlist entries: {len(policy.allowlist)}")
        print("- Generated outputs: delegated to `generate_tokens.py --check`")
        print(f"- Result: {'pass' if not findings else 'unexplained drift candidates found'}")
        if findings:
            print()
            print("| File | Line | Kind | Evidence |")
            print("| --- | ---: | --- | --- |")
            for finding in findings[:maximum]:
                evidence = finding.evidence.replace("|", "\\|")
                print(f"| `{finding.path.as_posix()}` | {finding.line_no} | {finding.kind} | `{evidence}` |")
        return
    print("CommandGlows project design-system drift guard")
    print(f"Files scanned: {len(files)}")
    print(f"Findings: {len(findings)}")
    print(f"Explicit allowlist entries: {len(policy.allowlist)}")
    print("Generated outputs: delegated to generate_tokens.py --check")
    for finding in findings[:maximum]:
        print(f"{finding.path.as_posix()}:{finding.line_no}: {finding.kind}: {finding.evidence}")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=REPO_ROOT)
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--changed", action="store_true")
    parser.add_argument("--format", choices=("text", "markdown"), default="text")
    parser.add_argument("--warn-only", action="store_true")
    parser.add_argument("--max-findings", type=int, default=120)
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    root = args.root.resolve()
    policy_path = args.policy if args.policy.is_absolute() else root / args.policy
    try:
        policy = load_policy(policy_path.resolve())
        files, findings = scan(root, policy, changed=args.changed)
    except (PolicyError, ValueError) as exc:
        print(f"policy error: {exc}", file=sys.stderr)
        return 2
    render(files, findings, policy, markdown=args.format == "markdown", maximum=args.max_findings)
    return 0 if not findings or args.warn_only else 1


if __name__ == "__main__":
    sys.exit(main())
