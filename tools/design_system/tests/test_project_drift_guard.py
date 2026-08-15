from __future__ import annotations

import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from tools.design_system.project_drift_guard import candidate_files, load_policy, scan


class ProjectDriftGuardTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write(self, relative: str, content: str) -> None:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def policy(self, allowlist: list[dict[str, str]] | None = None) -> Path:
        path = self.root / "policy.json"
        path.write_text(
            json.dumps(
                {
                    "version": 1,
                    "generatedManifest": "design-system/tokens.json",
                    "scanRoots": ["src"],
                    "sourceExtensions": [
                        ".astro",
                        ".css",
                        ".dart",
                        ".html",
                        ".js",
                        ".kt",
                        ".ts",
                        ".tsx",
                        ".xml",
                    ],
                    "ignoredDirectoryNames": ["build"],
                    "literalAllowlist": allowlist or [],
                }
            ),
            encoding="utf-8",
        )
        return path

    def test_scans_every_registered_surface_extension(self) -> None:
        for extension in ("astro", "css", "dart", "html", "js", "kt", "ts", "tsx", "xml"):
            self.write(f"src/surface.{extension}", "const marker = true;\n")

        files = candidate_files(self.root, load_policy(self.policy()))

        self.assertEqual(9, len(files))

    def test_kotlin_and_xml_literals_are_findings(self) -> None:
        self.write("src/native/Keyboard.kt", 'val keyColor = Color.parseColor("#00F5A0")\n')
        self.write("src/native/dimens.xml", '<dimen name="key_radius">8dp</dimen>\n')

        _, findings = scan(self.root, load_policy(self.policy()))

        self.assertEqual(
            {"hardcoded color", "hardcoded Android XML dimension"},
            {finding.kind for finding in findings},
        )

    def test_theme_and_token_named_paths_are_not_implicitly_excluded(self) -> None:
        self.write("src/theme/palette_theme.kt", 'val accent = Color.parseColor("#abcdef")\n')
        self.write("src/tokens/component_tokens.css", ".button { width: 12px; }\n")

        _, findings = scan(self.root, load_policy(self.policy()))

        self.assertEqual(2, len(findings))

    def test_exact_file_allowlist_does_not_hide_another_theme_file(self) -> None:
        self.write("src/theme/legacy-theme.kt", 'val accent = Color.parseColor("#abcdef")\n')
        self.write("src/theme/new-theme.kt", 'val accent = Color.parseColor("#123456")\n')
        allowlist = [
            {
                "path": "src/theme/legacy-theme.kt",
                "mode": "file",
                "reason": "Frozen compatibility fixture.",
                "owner": "Test owner",
                "removalCondition": "Remove after fixture migration.",
            }
        ]

        _, findings = scan(self.root, load_policy(self.policy(allowlist)))

        self.assertEqual([Path("src/theme/new-theme.kt")], [finding.path for finding in findings])

    def test_css_declaration_allowlist_is_line_scoped(self) -> None:
        self.write(
            "src/styles/global.css",
            ":root {\n  --space-card: 12px;\n}\n.card { width: 12px; }\n",
        )
        allowlist = [
            {
                "path": "src/styles/global.css",
                "mode": "css-custom-properties",
                "reason": "Classified CSS token declarations.",
                "owner": "Test owner",
                "removalCondition": "Retain while local variables remain classified.",
            }
        ]

        _, findings = scan(self.root, load_policy(self.policy(allowlist)))

        self.assertEqual(1, len(findings))
        self.assertEqual(4, findings[0].line_no)

    def test_generated_outputs_are_excluded_only_by_exact_manifest_path(self) -> None:
        self.write("src/generated/exact.css", ".generated { width: 12px; }\n")
        self.write("src/generated/not-exact.css", ".consumer { width: 12px; }\n")
        self.write("design-system/adaptations.json", '{"adaptations":[],"clientAdaptations":[],"legacyUnexplained":[],"observations":[],"registryVersion":"1.0.0","unresolvedMigrationInventory":[]}\n')
        self.write("design-system/exceptions.json", '{"exceptions":[],"registryVersion":"1.0.0"}\n')
        self.write("design-system/deprecations.json", '{"compatibilityAliases":[],"deprecations":[],"registryVersion":"1.0.0"}\n')
        self.write("src/source.css", "source\n")
        source_hash = hashlib.sha256((self.root / "src/source.css").read_bytes()).hexdigest()
        manifest = {
            "$schema": "./tokens.schema.json",
            "manifestVersion": "1.0.0",
            "product": "CommandGlows",
            "status": "foundation",
            "description": "fixture",
            "layers": {
                "primitive": {"dimension.space.one": {"type": "dimension", "value": {"amount": 1, "unit": "px"}}},
                "semantic": {"space.unit": {"type": "dimension", "status": "active", "value": "{primitive.dimension.space.one}"}},
                "component": {},
            },
            "registries": {
                "adaptations": "adaptations.json",
                "exceptions": "exceptions.json",
                "deprecations": "deprecations.json",
            },
            "adapters": {
                "site": {"format": "css", "output": "src/generated/exact.css", "status": "planned", "tokens": ["semantic.space.unit"]}
            },
            "provenance": {
                "immutableBaselines": [{"source": "src/source.css", "sha256": source_hash}],
                "consumerContracts": [],
            },
        }
        self.write("design-system/tokens.json", json.dumps(manifest))

        _, findings = scan(self.root, load_policy(self.policy()))

        self.assertEqual([Path("src/generated/not-exact.css")], [finding.path for finding in findings])


if __name__ == "__main__":
    unittest.main()
