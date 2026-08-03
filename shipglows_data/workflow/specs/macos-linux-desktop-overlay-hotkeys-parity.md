---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-31"
created_at: "2026-05-31 00:00:00 UTC"
updated: "2026-06-10"
updated_at: "2026-06-10 10:58:55 UTC"
status: reviewed
source_skill: sf-build
source_model: "GPT-5 Codex"
scope: "macos-linux-desktop-overlay-hotkeys-parity"
owner: "Diane"
confidence: medium
user_story: "En tant qu'utilisateur macOS ou Linux de WinGlows, je veux retrouver le concept d'overlay flottant, de raccourcis/quick actions et de livraison clipboard de l'app Android et de la premiere version Windows, afin d'utiliser les actions WinGlows dans mes apps desktop sans promesse d'IME."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Flutter desktop"
  - "macOS runner"
  - "Linux runner"
  - "Shared Flutter overlay UI"
  - "Desktop hotkeys"
  - "Clipboard"
  - "Text delivery"
  - "Backend-agnostic stores"
depends_on:
  - artifact: "shipglows_data/workflow/specs/windows-desktop-overlay-hotkeys-parity.md"
    artifact_version: "1.0.0"
    required_status: "reviewed"
supersedes: []
evidence:
  - "User request 2026-05-31: after Windows, implement the same parity for Linux and Mac."
  - "The first Windows version established the target pattern: shared Flutter contract plus native desktop host."
next_step: "/sf-test --local shipglows_data/workflow/verification/macos-linux-desktop-overlay-hotkeys-parity-checklist.md"
---

# Title

macOS And Linux Desktop Overlay And Hotkeys Parity

# Status

Reviewed chantier opened from Diane's 2026-05-31 parity request. First local
implementation version is in place for typed Flutter desktop overlay contracts,
macOS native host, Linux native host, docs, tests, and manual QA checklists.
Native macOS/Linux runner proof is still required before any public platform
parity claim.

# User Story

En tant qu'utilisateur macOS ou Linux de WinGlows, je veux retrouver le concept
d'overlay flottant, de raccourcis/quick actions et de livraison clipboard de
l'app Android et de la premiere version Windows, afin d'utiliser les actions WinGlows dans mes
apps desktop sans promesse d'IME.

# Minimal Behavior Contract

WinGlows doit conserver le meme modele mental desktop que Windows: une surface
Flutter partagee, appelee par une action clavier native quand la plateforme le
permet, affichée au-dessus du travail courant, capable de copier le resultat au
clipboard et de tenter une livraison automatique quand l'OS l'autorise. macOS
peut viser une livraison Command+V best-effort. Linux doit etre explicite sur
les limites Wayland/X11/compositor: clipboard fallback obligatoire, hotkey et
paste automatiques degrades tant qu'une integration systeme plus robuste n'est
pas choisie.

# Success Behavior

- Given WinGlows est lance sur macOS, when l'utilisateur utilise
  Control+Option+Space, then l'overlay peut s'afficher en fenetre flottante et
  exposer les actions produit communes.
- Given WinGlows est lance sur Linux, when l'utilisateur appelle l'action
  desktop disponible, then l'overlay peut s'afficher en keep-above et exposer
  les actions produit communes.
- Given un texte final est pret, when la livraison automatique est possible,
  then WinGlows tente de le coller dans l'app active et garde toujours une copie
  clipboard.
- Given le systeme bloque le hotkey global ou le paste synthetique, when
  l'utilisateur finit une action, then le resultat reste recuperable et l'etat
  de limitation est explicite.

# Scope In

- `DesktopOverlayBridge` Dart partage pour Windows, macOS et Linux.
- macOS native MethodChannel `winglowz_app/macos_overlay`.
- Linux native MethodChannel `winglowz_app/linux_overlay`.
- Capabilities macOS/Linux pour hote desktop overlay sans activer l'IME.
- Documentation plateforme et verification.
- QA manuelle macOS/Linux.

# Scope Out

- IME macOS ou Linux.
- Promesse de hotkey Linux universel sur tous les compositors.
- Promesse de paste automatique Linux universel.
- Store packaging, notarisation macOS, AppImage/deb/rpm.
- iOS et web.

# Constraints

- Aucun log natif ne doit contenir texte utilisateur, clipboard, audio ou secret.
- Clipboard fallback est obligatoire.
- Les limitations OS doivent etre visibles dans les status, docs et QA.
- Les donnees produit restent dans les stores Flutter/backend-agnostic.

# Implementation Notes

- macOS: `MainFlutterWindow.swift` enregistre `winglowz_app/macos_overlay`,
  utilise une fenetre flottante, un monitor Control+Option+Space, NSPasteboard,
  et un Command+V best-effort vers la derniere app active.
- Linux: `my_application.cc` enregistre `winglowz_app/linux_overlay`, utilise
  GTK keep-above, clipboard, event queue, et declare explicitement que le hotkey
  est scoped au contexte GTK dans cette premiere version.
- Flutter: `lib/core/platform/desktop_overlay_bridge.dart` porte le contrat
  commun typed status/events/delivery pour les hotes desktop.

# Verification

- `flutter test test/desktop_overlay_bridge_test.dart test/windows_overlay_bridge_test.dart`
- `flutter analyze`
- Metadata lint sur spec, docs et checklist.
- macOS manual QA sur machine macOS.
- Linux manual QA sur machine Linux, idealement Wayland et X11.

# Current Chantier Flow

sf-spec ✅ -> sf-ready ✅ -> sf-start ✅ -> sf-verify ⚠️ local Dart pass + native macOS/Linux QA pending -> sf-end ✅ -> sf-ship ✅🎯

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-31 00:00:00 UTC | sf-build | GPT-5 Codex | Opened macOS/Linux desktop overlay parity chantier and implemented first native host version. | partial: Dart checks pass; macOS/Linux native runner proof pending. | `/sf-test --local shipglows_data/workflow/verification/macos-linux-desktop-overlay-hotkeys-parity-checklist.md` |
| 2026-06-10 10:58:55 UTC | sf-ship | GPT-5 Codex | Closed and shipped macOS/Linux desktop overlay parity for native QA handoff. | shipped: local checks passed; macOS/Linux native runner proof remains open. | `/sf-test --local shipglows_data/workflow/verification/macos-linux-desktop-overlay-hotkeys-parity-checklist.md` |
