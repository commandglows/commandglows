from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from pathlib import Path
import sys
import tempfile
import unittest


TOOLS_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = TOOLS_DIR.parents[1]
sys.path.insert(0, str(TOOLS_DIR))

from generate_tokens import (  # noqa: E402
    ValidationError,
    _validate_provenance,
    bundle_digest,
    build_outputs,
    check_outputs,
    load_bundle,
    render_adapter,
    validate_bundle,
    write_outputs_atomically,
)


MANIFEST = REPO_ROOT / "design-system" / "tokens.json"


class TokenFoundationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.bundle = load_bundle(MANIFEST)

    def test_schema_is_valid_json_and_manifest_validates(self) -> None:
        schema = json.loads((MANIFEST.parent / "tokens.schema.json").read_text(encoding="utf-8"))
        self.assertEqual("https://json-schema.org/draft/2020-12/schema", schema["$schema"])
        validate_bundle(self.bundle)

    def test_generation_is_byte_deterministic(self) -> None:
        first = render_adapter(self.bundle, "resolved-matrix")
        second = render_adapter(self.bundle, "resolved-matrix")
        self.assertEqual(first, second)
        self.assertNotIn(b"\r\n", first)

    def test_generated_adapters_embed_the_canonical_bundle_digest(self) -> None:
        digest = bundle_digest(self.bundle).encode("ascii")
        self.assertIn(digest, render_adapter(self.bundle, "site"))
        resolved = json.loads(render_adapter(self.bundle, "resolved-matrix"))
        self.assertEqual(digest.decode("ascii"), resolved["manifestDigest"])

    def test_mutable_consumer_content_is_not_a_provenance_hash_gate(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            baseline = root / "baseline.json"
            consumer = root / "consumer.css"
            baseline.write_text("frozen\n", encoding="utf-8")
            consumer.write_text("first\n", encoding="utf-8")
            provenance = {
                "immutableBaselines": [
                    {
                        "source": "baseline.json",
                        "sha256": hashlib.sha256(baseline.read_bytes()).hexdigest(),
                    }
                ],
                "consumerContracts": [
                    {"source": "consumer.css", "contract": "Consumes generated aliases."}
                ],
            }

            _validate_provenance(provenance, root)
            consumer.write_text("second\n", encoding="utf-8")
            _validate_provenance(provenance, root)

    def test_immutable_baseline_content_remains_hash_gated(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            baseline = root / "baseline.json"
            baseline.write_text("frozen\n", encoding="utf-8")
            provenance = {
                "immutableBaselines": [
                    {
                        "source": "baseline.json",
                        "sha256": hashlib.sha256(baseline.read_bytes()).hexdigest(),
                    }
                ],
                "consumerContracts": [],
            }

            baseline.write_text("mutated\n", encoding="utf-8")
            with self.assertRaisesRegex(ValidationError, "provenance mismatch"):
                _validate_provenance(provenance, root)

    def test_consumer_contract_requires_an_existing_path_but_no_hash(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            baseline = root / "baseline.json"
            baseline.write_text("frozen\n", encoding="utf-8")
            provenance = {
                "immutableBaselines": [
                    {
                        "source": "baseline.json",
                        "sha256": hashlib.sha256(baseline.read_bytes()).hexdigest(),
                    }
                ],
                "consumerContracts": [
                    {"source": "missing.css", "contract": "Consumes generated aliases."}
                ],
            }

            with self.assertRaisesRegex(ValidationError, "source does not exist"):
                _validate_provenance(provenance, root)

    def test_write_then_check_and_stale_detection(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            outputs = build_outputs(self.bundle, ["resolved-matrix"], root)
            write_outputs_atomically(outputs, root)
            self.assertEqual([], check_outputs(outputs))
            target = next(iter(outputs))
            target.write_text("stale\n", encoding="utf-8")
            self.assertEqual([target], check_outputs(outputs))

    def test_target_scoping_does_not_touch_another_adapter(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            other = root / "commandglows_site" / "src" / "theme" / "generated" / "email-tokens.ts"
            other.parent.mkdir(parents=True)
            other.write_text("sentinel\n", encoding="utf-8")
            outputs = build_outputs(self.bundle, ["site"], root)
            write_outputs_atomically(outputs, root)
            self.assertEqual("sentinel\n", other.read_text(encoding="utf-8"))

    def test_unknown_manifest_field_fails_closed(self) -> None:
        invalid = deepcopy(self.bundle)
        invalid["manifest"]["unexpected"] = True
        with self.assertRaisesRegex(ValidationError, "unknown keys"):
            validate_bundle(invalid)

    def test_invalid_layer_reference_fails_closed(self) -> None:
        invalid = deepcopy(self.bundle)
        invalid["manifest"]["layers"]["semantic"]["color.brand.website"]["value"] = "{component.email.button.background}"
        with self.assertRaisesRegex(ValidationError, "invalid semantic -> component"):
            validate_bundle(invalid)

    def test_component_cycle_fails_closed(self) -> None:
        invalid = deepcopy(self.bundle)
        components = invalid["manifest"]["layers"]["component"]
        components["test.cycle.one"] = {"type": "color", "value": "{component.test.cycle.two}"}
        components["test.cycle.two"] = {"type": "color", "value": "{component.test.cycle.one}"}
        with self.assertRaisesRegex(ValidationError, "reference cycle"):
            validate_bundle(invalid)

    def test_unexplained_parity_mismatch_fails_closed(self) -> None:
        invalid = deepcopy(self.bundle)
        invalid["adaptations"]["observations"] = [
            {
                "token": "color.brand.website",
                "surfaceValues": {"site": "#ff00c8", "email": "#000000"},
            }
        ]
        with self.assertRaisesRegex(ValidationError, "unexplained parity mismatch"):
            validate_bundle(invalid)

    def test_validation_failure_leaves_existing_output_untouched(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "design-system" / "resolved-values.json"
            target.parent.mkdir(parents=True)
            target.write_bytes(b"last-known-good\n")
            invalid = deepcopy(self.bundle)
            invalid["manifest"]["layers"]["primitive"]["color.brand.red"]["value"] = "unsafe;value"
            with self.assertRaises(ValidationError):
                validate_bundle(invalid)
            self.assertEqual(b"last-known-good\n", target.read_bytes())


if __name__ == "__main__":
    unittest.main()
