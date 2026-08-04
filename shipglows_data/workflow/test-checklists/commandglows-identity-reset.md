---
artifact: verification_checklist
metadata_schema_version: "1.0"
artifact_version: "0.1.0"
project: "CommandGlows"
created: "2026-08-04"
updated: "2026-08-04"
status: draft
source_skill: 102-sg-start
scope: "commandglows-identity-reset-manual-proof"
owner: "Diane"
confidence: medium
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "commandglows_site"
  - "commandglows_app"
  - "shipglows_data/workflow/specs/commandglows-clean-identity-reset.md"
depends_on:
  - "shipglows_data/workflow/specs/commandglows-clean-identity-reset.md"
supersedes: []
evidence: []
next_step: "/103-sg-verify commandglows-clean-identity-reset"
---

# CommandGlows identity reset — manual proof checklist

Use only redacted evidence. Do not paste secrets, tokens, cookies, signing
material, private user data, payment payloads, or raw provider credentials.

| Scenario | Result | Evidence / date | Owner |
| --- | --- | --- | --- |
| `ID-ROOT-001` clone, paths, CI, artifacts, remote | NOT_RUN | — | agent |
| `ID-SITE-001` apex/www redirect, canonical/hreflang/sitemap, EN/FR pages | NOT_RUN | — | agent |
| `ID-AUTH-001` Clerk + Google/Firebase auth origins/callbacks | NOT_RUN | — | agent/operator |
| `ID-APP-001` Flutter launch, copy, entitlements, diagnostics header | NOT_RUN | — | agent |
| `ID-ANDROID-001` CI-signed install, IME, permissions, core action | NOT_RUN | — | operator/device |
| `ID-WINDOWS-001` installer, executable, labels, launch | NOT_RUN | — | operator/Windows |
| `ID-PROVIDER-001` CDN, checkout/webhook/refund, email, Sentry | NOT_RUN | — | agent/operator |
| `ID-GOV-001` active docs and operator commands | NOT_RUN | — | agent |
| `ID-ASSET-001` icons, screenshots, social/store media, CDN objects | NOT_RUN | — | agent/operator |
| `ID-HISTORY-001` allowlist scan and exception reasons | NOT_RUN | — | agent |
| `ID-FAIL-001` unavailable prerequisite stops cutover safely | NOT_RUN | — | agent |

## Evidence rules

- A local check can prove source/config/path coherence but cannot prove an
  external console, store, DNS, email, CDN, device, or production state.
- `exception_with_proof` must name the unavailable surface, why it is outside
  the current environment, the redacted evidence collected, and the recovery
  owner/action.
- A scenario is `PASS` only when its required observable result is captured;
  otherwise it remains `NOT_RUN` or `PARTIAL`.
