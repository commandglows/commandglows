#!/usr/bin/env python3
"""Validate and deterministically generate CommandGlows token adapters.

The implementation intentionally uses only the Python standard library so CI
and platform builds do not gain a package-manager dependency. Product adapters
remain planned until their owning migration batches activate them.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
from typing import Any, Iterable, Mapping


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = REPO_ROOT / "design-system" / "tokens.json"
TOKEN_ID = re.compile(r"^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$")
REFERENCE = re.compile(r"^\{(primitive|semantic|component)\.([a-z][a-z0-9]*(?:\.[a-z0-9]+)+)\}$")
HEX_COLOR = re.compile(r"^#[0-9a-f]{6}(?:[0-9a-f]{2})?$")
SEMVER = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
SHA256 = re.compile(r"^[0-9a-f]{64}$")
SAFE_PATH = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/\-]*$")
TOKEN_TYPES = {"color", "dimension", "duration", "number", "fontFamily", "cubicBezier", "string"}
SURFACES = ("site", "flutter", "android-ime", "email", "extension")
FORMATS = {"resolved-json", "css", "dart", "kotlin", "typescript", "extension-css"}


class ValidationError(ValueError):
    """Raised for a manifest or registry contract violation."""


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True, separators=(",", ": ")) + "\n"


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValidationError(f"{path.name}: cannot load JSON: {exc}") from exc


def _require_object(value: Any, path: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValidationError(f"{path}: expected object")
    return value


def _require_keys(value: Mapping[str, Any], required: set[str], allowed: set[str], path: str) -> None:
    missing = sorted(required - value.keys())
    unknown = sorted(value.keys() - allowed)
    if missing:
        raise ValidationError(f"{path}: missing keys: {', '.join(missing)}")
    if unknown:
        raise ValidationError(f"{path}: unknown keys: {', '.join(unknown)}")


def _safe_relative_path(raw: Any, path: str) -> Path:
    if not isinstance(raw, str) or not SAFE_PATH.fullmatch(raw):
        raise ValidationError(f"{path}: expected safe repository-relative path")
    relative = Path(raw)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValidationError(f"{path}: path must remain inside the repository")
    return relative


def _validate_literal(token_type: str, value: Any, path: str) -> None:
    if token_type == "color":
        if not isinstance(value, str) or not HEX_COLOR.fullmatch(value):
            raise ValidationError(f"{path}: color must be lowercase #rrggbb or #rrggbbaa")
        return
    if token_type in {"dimension", "duration"}:
        obj = _require_object(value, path)
        _require_keys(obj, {"amount", "unit"}, {"amount", "unit"}, path)
        amount = obj["amount"]
        allowed_units = {"px", "rem", "em", "%"} if token_type == "dimension" else {"ms", "s"}
        if isinstance(amount, bool) or not isinstance(amount, (int, float)):
            raise ValidationError(f"{path}.amount: expected finite number")
        if not (-1_000_000 <= float(amount) <= 1_000_000):
            raise ValidationError(f"{path}.amount: outside supported bounds")
        if obj["unit"] not in allowed_units:
            raise ValidationError(f"{path}.unit: unsupported {token_type} unit")
        return
    if token_type == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValidationError(f"{path}: expected number")
        return
    if token_type == "fontFamily":
        if not isinstance(value, list) or not value or not all(isinstance(item, str) and item.strip() for item in value):
            raise ValidationError(f"{path}: expected non-empty font-family list")
        if any(any(char in item for char in "{};\n\r") for item in value):
            raise ValidationError(f"{path}: unsafe font-family value")
        return
    if token_type == "cubicBezier":
        if not isinstance(value, list) or len(value) != 4 or any(isinstance(item, bool) or not isinstance(item, (int, float)) for item in value):
            raise ValidationError(f"{path}: expected four numeric cubic-bezier points")
        return
    if token_type == "string":
        if not isinstance(value, str) or not value or any(char in value for char in "\n\r\x00"):
            raise ValidationError(f"{path}: expected bounded single-line string")
        return
    raise ValidationError(f"{path}: unsupported token type {token_type!r}")


def _read_registry(manifest_path: Path, raw_path: Any, label: str) -> tuple[Path, dict[str, Any]]:
    relative = _safe_relative_path(raw_path, f"registries.{label}")
    base = manifest_path.parent.resolve()
    target = (base / relative).resolve()
    if target.parent != base:
        raise ValidationError(f"registries.{label}: registry must be adjacent to the manifest")
    return target, _require_object(load_json(target), target.name)


def load_bundle(manifest_path: Path) -> dict[str, Any]:
    manifest_path = manifest_path.resolve()
    manifest = _require_object(load_json(manifest_path), manifest_path.name)
    registries = _require_object(manifest.get("registries"), "registries")
    _require_keys(registries, {"adaptations", "exceptions", "deprecations"}, {"adaptations", "exceptions", "deprecations"}, "registries")
    bundle: dict[str, Any] = {"manifest": manifest, "manifest_path": manifest_path}
    for label in ("adaptations", "exceptions", "deprecations"):
        path, data = _read_registry(manifest_path, registries[label], label)
        bundle[label] = data
        bundle[f"{label}_path"] = path
    validate_bundle(bundle)
    return bundle


def validate_bundle(bundle: Mapping[str, Any]) -> None:
    manifest = _require_object(bundle["manifest"], "manifest")
    top_required = {"$schema", "manifestVersion", "product", "status", "description", "layers", "registries", "adapters", "provenance"}
    _require_keys(manifest, top_required, top_required, "manifest")
    if manifest["$schema"] != "./tokens.schema.json":
        raise ValidationError("manifest.$schema: must reference ./tokens.schema.json")
    if not isinstance(manifest["manifestVersion"], str) or not SEMVER.fullmatch(manifest["manifestVersion"]):
        raise ValidationError("manifest.manifestVersion: expected semantic version")
    if manifest["product"] != "CommandGlows":
        raise ValidationError("manifest.product: expected CommandGlows")
    if manifest["status"] not in {"foundation", "active", "deprecated"}:
        raise ValidationError("manifest.status: unsupported status")
    if not isinstance(manifest["description"], str) or not manifest["description"].strip():
        raise ValidationError("manifest.description: expected text")

    layers = _require_object(manifest["layers"], "layers")
    _require_keys(layers, {"primitive", "semantic", "component"}, {"primitive", "semantic", "component"}, "layers")
    for layer in ("primitive", "semantic", "component"):
        _require_object(layers[layer], f"layers.{layer}")

    all_tokens: dict[tuple[str, str], dict[str, Any]] = {}
    for layer, tokens in layers.items():
        for token_id, raw_token in tokens.items():
            if not isinstance(token_id, str) or not TOKEN_ID.fullmatch(token_id):
                raise ValidationError(f"layers.{layer}: invalid token id {token_id!r}")
            token = _require_object(raw_token, f"layers.{layer}.{token_id}")
            allowed = {"type", "value", "description"}
            required = {"type", "value"}
            if layer == "semantic":
                allowed |= {"status", "reason", "legacySources"}
                required = {"type", "status"}
            _require_keys(token, required, allowed, f"layers.{layer}.{token_id}")
            if token["type"] not in TOKEN_TYPES:
                raise ValidationError(f"layers.{layer}.{token_id}.type: unsupported token type")
            all_tokens[(layer, token_id)] = token

    for token_id, token in layers["primitive"].items():
        if isinstance(token["value"], str) and REFERENCE.fullmatch(token["value"]):
            raise ValidationError(f"layers.primitive.{token_id}.value: primitives cannot reference another token")
        _validate_literal(token["type"], token["value"], f"layers.primitive.{token_id}.value")

    component_graph: dict[str, str | None] = {}
    for layer in ("semantic", "component"):
        for token_id, token in layers[layer].items():
            token_path = f"layers.{layer}.{token_id}"
            if layer == "semantic" and token["status"] == "legacy-unexplained":
                _require_keys(token, {"type", "status", "reason", "legacySources"}, {"type", "status", "reason", "legacySources", "description"}, token_path)
                if not isinstance(token["reason"], str) or not token["reason"].strip():
                    raise ValidationError(f"{token_path}.reason: expected text")
                if not isinstance(token["legacySources"], list) or len(token["legacySources"]) < 2:
                    raise ValidationError(f"{token_path}.legacySources: expected at least two sources")
                continue
            if "value" not in token:
                raise ValidationError(f"{token_path}.value: required for resolved token")
            match = REFERENCE.fullmatch(token["value"]) if isinstance(token["value"], str) else None
            if not match:
                raise ValidationError(f"{token_path}.value: expected token reference")
            target_layer, target_id = match.groups()
            allowed_layers = {"primitive"} if layer == "semantic" else {"semantic", "component"}
            if target_layer not in allowed_layers:
                raise ValidationError(f"{token_path}.value: invalid {layer} -> {target_layer} layer reference")
            target = all_tokens.get((target_layer, target_id))
            if target is None:
                raise ValidationError(f"{token_path}.value: unknown token {target_layer}.{target_id}")
            if target["type"] != token["type"]:
                raise ValidationError(f"{token_path}.value: type mismatch with {target_layer}.{target_id}")
            if target_layer == "semantic" and target.get("status") != "active":
                raise ValidationError(f"{token_path}.value: cannot consume unresolved semantic token")
            if layer == "component":
                component_graph[token_id] = target_id if target_layer == "component" else None

    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(token_id: str) -> None:
        if token_id in visiting:
            raise ValidationError(f"layers.component.{token_id}: component reference cycle")
        if token_id in visited:
            return
        visiting.add(token_id)
        target = component_graph.get(token_id)
        if target is not None:
            visit(target)
        visiting.remove(token_id)
        visited.add(token_id)

    for token_id in component_graph:
        visit(token_id)

    _validate_adapters(manifest["adapters"], layers)
    manifest_path = Path(bundle["manifest_path"])
    _validate_provenance(manifest["provenance"], manifest_path.parent.parent)
    _validate_adaptations(bundle["adaptations"], layers)
    _validate_exceptions(bundle["exceptions"])
    _validate_deprecations(bundle["deprecations"], layers)


def _validate_adapters(raw: Any, layers: Mapping[str, Any]) -> None:
    adapters = _require_object(raw, "adapters")
    if not adapters:
        raise ValidationError("adapters: expected at least one adapter")
    outputs: set[Path] = set()
    for adapter_id, raw_adapter in adapters.items():
        if not isinstance(adapter_id, str) or not re.fullmatch(r"[a-z][a-z0-9-]*", adapter_id):
            raise ValidationError(f"adapters: invalid adapter id {adapter_id!r}")
        adapter = _require_object(raw_adapter, f"adapters.{adapter_id}")
        required = {"format", "output", "status", "tokens"}
        _require_keys(adapter, required, required, f"adapters.{adapter_id}")
        if adapter["format"] not in FORMATS:
            raise ValidationError(f"adapters.{adapter_id}.format: unsupported format")
        if adapter["status"] not in {"active", "planned", "deprecated"}:
            raise ValidationError(f"adapters.{adapter_id}.status: unsupported status")
        output = _safe_relative_path(adapter["output"], f"adapters.{adapter_id}.output")
        if output in outputs:
            raise ValidationError(f"adapters.{adapter_id}.output: duplicate adapter output")
        outputs.add(output)
        if not isinstance(adapter["tokens"], list) or len(adapter["tokens"]) != len(set(adapter["tokens"])):
            raise ValidationError(f"adapters.{adapter_id}.tokens: expected unique token list")
        for qualified in adapter["tokens"]:
            if not isinstance(qualified, str) or "." not in qualified:
                raise ValidationError(f"adapters.{adapter_id}.tokens: invalid token reference")
            layer, token_id = qualified.split(".", 1)
            token = layers.get(layer, {}).get(token_id)
            if token is None:
                raise ValidationError(f"adapters.{adapter_id}.tokens: unknown token {qualified}")
            if layer == "semantic" and token.get("status") != "active":
                raise ValidationError(f"adapters.{adapter_id}.tokens: unresolved token {qualified}")


def _resolve_evidence_source(raw: Any, path: str, repo_root: Path) -> tuple[Path, Path]:
    relative = _safe_relative_path(raw, f"{path}.source")
    resolved_root = repo_root.resolve()
    source = (resolved_root / relative).resolve()
    if resolved_root not in source.parents:
        raise ValidationError(f"{path}.source: target escapes repository")
    if not source.is_file():
        raise ValidationError(f"{path}.source: source does not exist")
    return relative, source


def _validate_provenance(raw: Any, repo_root: Path) -> None:
    provenance = _require_object(raw, "provenance")
    required = {"immutableBaselines", "consumerContracts"}
    _require_keys(provenance, required, required, "provenance")

    baselines = provenance["immutableBaselines"]
    if not isinstance(baselines, list) or not baselines:
        raise ValidationError("provenance.immutableBaselines: expected non-empty list")
    for index, raw_entry in enumerate(baselines):
        path = f"provenance.immutableBaselines[{index}]"
        entry = _require_object(raw_entry, path)
        _require_keys(entry, {"source", "sha256"}, {"source", "sha256"}, path)
        if not isinstance(entry["sha256"], str) or not SHA256.fullmatch(entry["sha256"]):
            raise ValidationError(f"{path}.sha256: expected lowercase SHA-256")
        relative, source = _resolve_evidence_source(entry["source"], path, repo_root)
        actual = hashlib.sha256(source.read_bytes()).hexdigest()
        if actual != entry["sha256"]:
            raise ValidationError(f"{path}.sha256: provenance mismatch for {relative.as_posix()}")

    contracts = provenance["consumerContracts"]
    if not isinstance(contracts, list):
        raise ValidationError("provenance.consumerContracts: expected list")
    for index, raw_entry in enumerate(contracts):
        path = f"provenance.consumerContracts[{index}]"
        entry = _require_object(raw_entry, path)
        _require_keys(entry, {"source", "contract"}, {"source", "contract"}, path)
        if not isinstance(entry["contract"], str) or not entry["contract"].strip():
            raise ValidationError(f"{path}.contract: expected text")
        _resolve_evidence_source(entry["source"], path, repo_root)


def _validate_adaptations(raw: Any, layers: Mapping[str, Any]) -> None:
    registry = _require_object(raw, "adaptations registry")
    allowed = {"registryVersion", "adaptations", "clientAdaptations", "legacyUnexplained", "observations", "unresolvedMigrationInventory"}
    _require_keys(registry, allowed, allowed, "adaptations registry")
    if not SEMVER.fullmatch(str(registry["registryVersion"])):
        raise ValidationError("adaptations.registryVersion: expected semantic version")
    adaptations = registry["adaptations"]
    if not isinstance(adaptations, list):
        raise ValidationError("adaptations.adaptations: expected list")
    adaptation_keys: set[tuple[str, str]] = set()
    for index, raw_entry in enumerate(adaptations):
        path = f"adaptations[{index}]"
        entry = _require_object(raw_entry, path)
        required = {"id", "token", "surface", "value", "rationale", "owner", "proof", "reviewOrRemovalCondition"}
        _require_keys(entry, required, required, path)
        token = layers["semantic"].get(entry["token"])
        if token is None or token.get("status") != "active":
            raise ValidationError(f"{path}.token: adaptation requires an active semantic token")
        if entry["surface"] not in SURFACES:
            raise ValidationError(f"{path}.surface: unsupported surface")
        key = (entry["token"], entry["surface"])
        if key in adaptation_keys:
            raise ValidationError(f"{path}: duplicate token/surface adaptation")
        adaptation_keys.add(key)
        _validate_literal(token["type"], entry["value"], f"{path}.value")
        for field in ("id", "rationale", "owner", "proof", "reviewOrRemovalCondition"):
            if not isinstance(entry[field], str) or not entry[field].strip():
                raise ValidationError(f"{path}.{field}: expected text")

    client_adaptations = registry["clientAdaptations"]
    if not isinstance(client_adaptations, list):
        raise ValidationError("adaptations.clientAdaptations: expected list")
    for index, raw_entry in enumerate(client_adaptations):
        path = f"clientAdaptations[{index}]"
        entry = _require_object(raw_entry, path)
        required = {"id", "surface", "scope", "values", "rationale", "owner", "proof", "reviewOrRemovalCondition"}
        _require_keys(entry, required, required, path)
        if entry["surface"] not in SURFACES:
            raise ValidationError(f"{path}.surface: unsupported surface")
        values = _require_object(entry["values"], f"{path}.values")
        for name, raw_value in values.items():
            value_path = f"{path}.values.{name}"
            value = _require_object(raw_value, value_path)
            _require_keys(value, {"type", "value"}, {"type", "value"}, value_path)
            _validate_literal(value["type"], value["value"], f"{value_path}.value")

    legacy = registry["legacyUnexplained"]
    if not isinstance(legacy, list):
        raise ValidationError("adaptations.legacyUnexplained: expected list")
    for index, raw_entry in enumerate(legacy):
        path = f"legacyUnexplained[{index}]"
        entry = _require_object(raw_entry, path)
        _require_keys(entry, {"role", "sources", "reason"}, {"role", "sources", "reason"}, path)
        if not isinstance(entry["sources"], list) or len(entry["sources"]) < 2:
            raise ValidationError(f"{path}.sources: expected at least two legacy sources")

    observations = registry["observations"]
    if not isinstance(observations, list):
        raise ValidationError("adaptations.observations: expected list")
    resolved = resolve_tokens(layers)
    for index, raw_observation in enumerate(observations):
        path = f"observations[{index}]"
        observation = _require_object(raw_observation, path)
        _require_keys(observation, {"token", "surfaceValues"}, {"token", "surfaceValues"}, path)
        token_id = observation["token"]
        token = layers["semantic"].get(token_id)
        if token is None or token.get("status") != "active":
            raise ValidationError(f"{path}.token: observation requires an active semantic token")
        surface_values = _require_object(observation["surfaceValues"], f"{path}.surfaceValues")
        for surface, value in surface_values.items():
            if surface not in SURFACES:
                raise ValidationError(f"{path}.surfaceValues.{surface}: unsupported surface")
            _validate_literal(token["type"], value, f"{path}.surfaceValues.{surface}")
            if value != resolved[("semantic", token_id)] and (token_id, surface) not in adaptation_keys:
                raise ValidationError(f"{path}: unexplained parity mismatch for {token_id} on {surface}")

    inventory = registry["unresolvedMigrationInventory"]
    if not isinstance(inventory, list):
        raise ValidationError("adaptations.unresolvedMigrationInventory: expected list")
    for index, raw_entry in enumerate(inventory):
        path = f"unresolvedMigrationInventory[{index}]"
        entry = _require_object(raw_entry, path)
        required = {"id", "status", "findingCount", "groups", "owner", "proof", "reason", "resolutionCondition"}
        _require_keys(entry, required, required, path)
        if entry["status"] != "unresolved" or not isinstance(entry["findingCount"], int):
            raise ValidationError(f"{path}: expected unresolved integer inventory")
        groups = entry["groups"]
        if not isinstance(groups, list) or sum(group.get("count", -1) for group in groups if isinstance(group, dict)) != entry["findingCount"]:
            raise ValidationError(f"{path}.groups: counts must equal findingCount")


def _validate_exceptions(raw: Any) -> None:
    registry = _require_object(raw, "exceptions registry")
    _require_keys(registry, {"registryVersion", "exceptions"}, {"registryVersion", "exceptions"}, "exceptions registry")
    if not SEMVER.fullmatch(str(registry["registryVersion"])):
        raise ValidationError("exceptions.registryVersion: expected semantic version")
    if not isinstance(registry["exceptions"], list):
        raise ValidationError("exceptions.exceptions: expected list")
    seen: set[str] = set()
    required = {"id", "surface", "scope", "reason", "proof", "owner", "reviewOrRemovalCondition"}
    for index, raw_entry in enumerate(registry["exceptions"]):
        path = f"exceptions[{index}]"
        entry = _require_object(raw_entry, path)
        _require_keys(entry, required, required, path)
        if entry["id"] in seen:
            raise ValidationError(f"{path}.id: duplicate exception id")
        seen.add(entry["id"])
        for field in required:
            if not isinstance(entry[field], str) or not entry[field].strip():
                raise ValidationError(f"{path}.{field}: expected text")


def _validate_deprecations(raw: Any, layers: Mapping[str, Any]) -> None:
    registry = _require_object(raw, "deprecations registry")
    allowed = {"registryVersion", "deprecations", "compatibilityAliases"}
    _require_keys(registry, allowed, allowed, "deprecations registry")
    if not SEMVER.fullmatch(str(registry["registryVersion"])):
        raise ValidationError("deprecations.registryVersion: expected semantic version")
    for field in ("deprecations", "compatibilityAliases"):
        if not isinstance(registry[field], list):
            raise ValidationError(f"deprecations.{field}: expected list")
    required = {"id", "owner", "targetToken", "consumerCount", "removalCondition", "surface", "alias", "aliasKind"}
    for index, raw_entry in enumerate(registry["compatibilityAliases"]):
        path = f"compatibilityAliases[{index}]"
        entry = _require_object(raw_entry, path)
        _require_keys(entry, required, required, path)
        if not isinstance(entry["consumerCount"], int) or isinstance(entry["consumerCount"], bool) or entry["consumerCount"] < 0:
            raise ValidationError(f"{path}.consumerCount: expected non-negative integer")
        if entry["surface"] not in SURFACES or entry["aliasKind"] not in {"css-custom-property", "typescript-key"}:
            raise ValidationError(f"{path}: unsupported compatibility alias surface/kind")
        if not any(entry["targetToken"] in layer for layer in (layers["primitive"], layers["semantic"], layers["component"])):
            raise ValidationError(f"{path}.targetToken: unknown target")
    deprecation_required = {"id", "deprecatedToken", "targetToken", "owner", "removalCondition"}
    for index, raw_entry in enumerate(registry["deprecations"]):
        path = f"deprecations[{index}]"
        entry = _require_object(raw_entry, path)
        _require_keys(entry, deprecation_required, deprecation_required, path)
        if entry["targetToken"] not in layers["semantic"]:
            raise ValidationError(f"{path}.targetToken: unknown semantic target")


def resolve_tokens(layers: Mapping[str, Mapping[str, Mapping[str, Any]]]) -> dict[tuple[str, str], Any]:
    resolved: dict[tuple[str, str], Any] = {}

    def resolve(layer: str, token_id: str) -> Any:
        key = (layer, token_id)
        if key in resolved:
            return resolved[key]
        token = layers[layer][token_id]
        value = token.get("value")
        match = REFERENCE.fullmatch(value) if isinstance(value, str) else None
        if match:
            value = resolve(*match.groups())
        resolved[key] = value
        return value

    for layer in ("primitive", "semantic", "component"):
        for token_id, token in layers[layer].items():
            if layer == "semantic" and token.get("status") != "active":
                continue
            resolve(layer, token_id)
    return resolved


def bundle_digest(bundle: Mapping[str, Any]) -> str:
    source = "".join(canonical_json(bundle[key]) for key in ("manifest", "adaptations", "exceptions", "deprecations"))
    return hashlib.sha256(source.encode("utf-8")).hexdigest()


def resolved_matrix(bundle: Mapping[str, Any]) -> dict[str, Any]:
    manifest = bundle["manifest"]
    layers = manifest["layers"]
    resolved = resolve_tokens(layers)
    adaptations = {(entry["token"], entry["surface"]): entry for entry in bundle["adaptations"]["adaptations"]}
    tokens: dict[str, Any] = {}
    for layer in ("primitive", "semantic", "component"):
        for token_id, token in sorted(layers[layer].items()):
            if layer == "semantic" and token.get("status") != "active":
                continue
            base_value = resolved[(layer, token_id)]
            surface_values: dict[str, Any] = {}
            for surface in SURFACES:
                adaptation = adaptations.get((token_id, surface)) if layer == "semantic" else None
                surface_values[surface] = adaptation["value"] if adaptation else base_value
            tokens[f"{layer}.{token_id}"] = {
                "surfaceValues": surface_values,
                "type": token["type"]
            }
    return {
        "legacyUnexplained": bundle["adaptations"]["legacyUnexplained"],
        "manifestDigest": bundle_digest(bundle),
        "manifestVersion": manifest["manifestVersion"],
        "product": manifest["product"],
        "provenance": "Generated by tools/design_system/generate_tokens.py; do not edit.",
        "tokens": tokens
    }


def _css_value(value: Any) -> str:
    if isinstance(value, dict):
        return f"{value['amount']:g}{value['unit']}"
    if isinstance(value, list):
        if len(value) == 4 and all(isinstance(item, (int, float)) for item in value):
            return "cubic-bezier(" + ", ".join(f"{item:g}" for item in value) + ")"
        return ", ".join(f'"{item}"' if " " in item else item for item in value)
    return str(value)


def _surface_values(bundle: Mapping[str, Any], surface: str) -> dict[str, Any]:
    matrix = resolved_matrix(bundle)
    return {key: value["surfaceValues"].get(surface) for key, value in matrix["tokens"].items()}


def _adapter_values(bundle: Mapping[str, Any], adapter_id: str) -> dict[str, Any]:
    all_values = _surface_values(bundle, adapter_id if adapter_id in SURFACES else "site")
    selected = bundle["manifest"]["adapters"][adapter_id]["tokens"]
    values = {key: all_values[key] for key in selected}
    for alias in bundle["deprecations"]["compatibilityAliases"]:
        if alias["surface"] == adapter_id and alias["aliasKind"] == "typescript-key":
            for layer in ("semantic", "component", "primitive"):
                target = f"{layer}.{alias['targetToken']}"
                if target in values:
                    values[alias["alias"]] = values.pop(target)
                    break
    return values


def _identifier(key: str) -> str:
    parts = re.split(r"[^A-Za-z0-9]+", key)
    return parts[0].lower() + "".join(part[:1].upper() + part[1:] for part in parts[1:])


def _dart_literal(token_type: str, value: Any) -> tuple[str, str]:
    if token_type == "color":
        return "Color", f"Color(0x{value[1:].upper() if len(value) == 9 else 'FF' + value[1:].upper()})"
    if token_type == "dimension":
        return "double", f"{float(value['amount']):.1f}"
    if token_type == "duration":
        amount = int(value["amount"] * (1000 if value["unit"] == "s" else 1))
        return "Duration", f"Duration(milliseconds: {amount})"
    if token_type == "fontFamily":
        return "List<String>", "<String>[" + ", ".join(json.dumps(item) for item in value) + "]"
    if token_type == "number":
        return "double", f"{float(value):.1f}"
    return "String", json.dumps(_css_value(value))


def _kotlin_literal(token_type: str, value: Any) -> tuple[str, str]:
    if token_type == "color":
        raw = value[1:] if len(value) == 9 else "ff" + value[1:]
        signed = int(raw, 16)
        if signed >= 2**31:
            signed -= 2**32
        return "Int", str(signed)
    if token_type == "dimension":
        return "Float", f"{float(value['amount']):g}f"
    if token_type == "duration":
        amount = int(value["amount"] * (1000 if value["unit"] == "s" else 1))
        return "Int", str(amount)
    if token_type == "number":
        return "Double", f"{float(value):g}"
    if token_type == "fontFamily":
        return "List<String>", "listOf(" + ", ".join(json.dumps(item) for item in value) + ")"
    return "String", json.dumps(_css_value(value))


def render_adapter(bundle: Mapping[str, Any], adapter_id: str) -> bytes:
    adapter = bundle["manifest"]["adapters"][adapter_id]
    output_format = adapter["format"]
    digest = bundle_digest(bundle)
    version = bundle["manifest"]["manifestVersion"]
    if output_format == "resolved-json":
        content = canonical_json(resolved_matrix(bundle))
    else:
        surface = adapter_id if adapter_id in SURFACES else "site"
        values = _adapter_values(bundle, adapter_id)
        header = f"Generated from CommandGlows tokens {version} ({digest}); do not edit."
        if output_format in {"css", "extension-css"}:
            declarations_list = [f"  --cg-{key.replace('.', '-')}: {_css_value(value)};" for key, value in sorted(values.items())]
            for alias in bundle["deprecations"]["compatibilityAliases"]:
                if alias["surface"] == adapter_id and alias["aliasKind"] == "css-custom-property":
                    target = next(key for key in values if key.endswith("." + alias["targetToken"]))
                    declarations_list.append(f"  {alias['alias']}: var(--cg-{target.replace('.', '-')});")
            declarations = "\n".join(declarations_list)
            selector = ":root" if output_format == "css" else ".commandglows-popup"
            content = f"/* {header} */\n{selector} {{\n{declarations}\n}}\n"
            if output_format == "extension-css":
                content += f"\n:host([data-commandglows-host='palette']) {{\n{declarations}\n}}\n"
        elif output_format == "typescript":
            type_lines = []
            for key, value in sorted(values.items()):
                token_type = next(matrix["type"] for matrix_key, matrix in resolved_matrix(bundle)["tokens"].items() if matrix_key.endswith("." + ("typography.body.family" if key == "semantic.typography.email.body.family" else key.split(".", 1)[1])))
                ts_type = "string" if token_type == "color" else "readonly string[]" if token_type == "fontFamily" else "Readonly<{ amount: number; unit: 'px' }>"
                type_lines.append(f"  readonly {json.dumps(key)}: {ts_type};")
            payload = canonical_json(values).rstrip()
            client = next(entry for entry in bundle["adaptations"]["clientAdaptations"] if entry["surface"] == "email")
            client_values = {name: raw["value"]["amount"] if raw["type"] == "dimension" else raw["value"] for name, raw in client["values"].items()}
            content = f"// {header}\nexport interface EmailAdapterTokenSource {{\n" + "\n".join(type_lines) + f"\n}}\n\nexport const EMAIL_TOKENS = {payload} as const satisfies EmailAdapterTokenSource;\n\nexport const EMAIL_CLIENT_ADAPTATIONS = {canonical_json(client_values).rstrip()} as const;\n"
        elif output_format == "dart":
            matrix = resolved_matrix(bundle)["tokens"]
            lines = []
            for key, value in sorted(values.items()):
                dart_type, literal = _dart_literal(matrix[key]["type"], value)
                lines.append(f"  static const {dart_type} {_identifier(key)} = {literal};")
            content = f"// {header}\nimport 'package:flutter/material.dart';\n\nabstract final class CommandGlowsGeneratedTokens {{\n" + "\n".join(lines) + "\n}\n"
        elif output_format == "kotlin":
            matrix = resolved_matrix(bundle)["tokens"]
            lines = []
            for key, value in sorted(values.items()):
                kotlin_type, literal = _kotlin_literal(matrix[key]["type"], value)
                declaration = "const val" if kotlin_type in {"Int", "Float", "Double", "String"} else "val"
                lines.append(f"    {declaration} {re.sub(r'[^A-Za-z0-9]+', '_', key).upper()}: {kotlin_type} = {literal}")
            content = f"// {header}\npackage com.commandglows.app.ime.generated\n\ninternal object CommandGlowsTokens {{\n" + "\n".join(lines) + "\n}\n"
        else:  # Defensive; schema validation already rejects this.
            raise ValidationError(f"adapters.{adapter_id}.format: unsupported format")
    return content.replace("\r\n", "\n").encode("utf-8")


def select_adapters(manifest: Mapping[str, Any], platform: str | None, all_targets: bool) -> list[str]:
    adapters = manifest["adapters"]
    if platform:
        if platform not in adapters:
            raise ValidationError(f"unknown adapter {platform!r}; choose: {', '.join(sorted(adapters))}")
        return [platform]
    if all_targets:
        return sorted(adapters)
    return sorted(adapter_id for adapter_id, adapter in adapters.items() if adapter["status"] == "active")


def build_outputs(bundle: Mapping[str, Any], adapter_ids: Iterable[str], output_root: Path) -> dict[Path, bytes]:
    outputs: dict[Path, bytes] = {}
    root = output_root.resolve()
    for adapter_id in adapter_ids:
        relative = _safe_relative_path(bundle["manifest"]["adapters"][adapter_id]["output"], f"adapters.{adapter_id}.output")
        target = (root / relative).resolve()
        if root != target and root not in target.parents:
            raise ValidationError(f"adapters.{adapter_id}.output: target escapes output root")
        outputs[target] = render_adapter(bundle, adapter_id)
    return outputs


def check_outputs(outputs: Mapping[Path, bytes]) -> list[Path]:
    stale: list[Path] = []
    for target, content in sorted(outputs.items(), key=lambda item: str(item[0])):
        try:
            current = target.read_bytes()
        except FileNotFoundError:
            stale.append(target)
            continue
        if current != content:
            stale.append(target)
    return stale


def write_outputs_atomically(outputs: Mapping[Path, bytes], output_root: Path) -> None:
    if not outputs:
        return
    root = output_root.resolve()
    root.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix=".design-system-stage-", dir=root))
    originals: dict[Path, bytes | None] = {}
    replaced: list[Path] = []
    try:
        staged: dict[Path, Path] = {}
        for target, content in outputs.items():
            relative = target.relative_to(root)
            staged_target = stage / relative
            staged_target.parent.mkdir(parents=True, exist_ok=True)
            staged_target.write_bytes(content)
            if staged_target.read_bytes() != content:
                raise OSError(f"staging verification failed for {relative.as_posix()}")
            staged[target] = staged_target
            originals[target] = target.read_bytes() if target.exists() else None
        for target in sorted(staged, key=str):
            target.parent.mkdir(parents=True, exist_ok=True)
            os.replace(staged[target], target)
            replaced.append(target)
    except OSError:
        for target in reversed(replaced):
            original = originals[target]
            if original is None:
                target.unlink(missing_ok=True)
            else:
                restore = stage / ".rollback" / target.relative_to(root)
                restore.parent.mkdir(parents=True, exist_ok=True)
                restore.write_bytes(original)
                os.replace(restore, target)
        raise
    finally:
        shutil.rmtree(stage, ignore_errors=True)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument("--platform", help="Generate or check exactly one registered adapter")
    selection.add_argument("--all", action="store_true", help="Select every active and planned adapter")
    parser.add_argument("--check", action="store_true", help="Fail when selected output differs; never write")
    parser.add_argument("--dry-run", action="store_true", help="Resolve outputs and print hashes; never write")
    parser.add_argument("--validate-only", action="store_true", help="Validate schema and registries without rendering")
    parser.add_argument("--output-root", type=Path, default=REPO_ROOT, help="Override the repository root for fixtures")
    parser.add_argument("--allow-platform-writes", action="store_true", help="Required guard for an --all write transaction")
    args = parser.parse_args(argv)
    if args.validate_only and (args.platform or args.all or args.check or args.dry_run):
        parser.error("--validate-only cannot be combined with generation options")
    if args.check and args.dry_run:
        parser.error("--check and --dry-run are mutually exclusive")
    if args.all and not (args.check or args.dry_run or args.allow_platform_writes):
        parser.error("--all write mode requires --allow-platform-writes")
    return args


def main(argv: list[str] | None = None) -> int:
    try:
        args = parse_args(argv)
        bundle = load_bundle(args.manifest)
        if args.validate_only:
            print(f"valid: CommandGlows design-system manifest {bundle['manifest']['manifestVersion']}")
            return 0
        adapter_ids = select_adapters(bundle["manifest"], args.platform, args.all)
        outputs = build_outputs(bundle, adapter_ids, args.output_root)
        if args.check:
            stale = check_outputs(outputs)
            if stale:
                for path in stale:
                    try:
                        display = path.relative_to(args.output_root.resolve()).as_posix()
                    except ValueError:
                        display = path.name
                    print(f"stale: {display}", file=sys.stderr)
                return 1
            print(f"clean: {len(outputs)} generated output(s)")
            return 0
        if args.dry_run:
            summary = {
                str(path.relative_to(args.output_root.resolve())).replace("\\", "/"): hashlib.sha256(content).hexdigest()
                for path, content in sorted(outputs.items(), key=lambda item: str(item[0]))
            }
            print(canonical_json(summary), end="")
            return 0
        write_outputs_atomically(outputs, args.output_root)
        print(f"generated: {len(outputs)} output(s)")
        return 0
    except ValidationError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except OSError as exc:
        print(f"error: generation transaction failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
