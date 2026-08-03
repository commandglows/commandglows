---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-30"
created_at: "2026-05-30 20:40:38 UTC"
updated: "2026-05-30"
updated_at: "2026-05-30 20:57:13 UTC"
status: reviewed
source_skill: sf-build
source_model: "GPT-5 Codex"
scope: "cross-surface-send-to-actions"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisatrice WinGlows, je veux envoyer un élément Voix ou Clipboard vers Snippets ou Clipboard via une icône Send to, afin de transformer rapidement un texte capturé en raccourci réutilisable ou en élément clipboard sans copier-coller manuel."
risk_level: "medium"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "winglowz_app"
  - "Voice transcriptions"
  - "Clipboard history"
  - "Snippets"
  - "Shared Flutter UI"
  - "Backend-agnostic stores"
  - "Sensitive clipboard classification"
depends_on:
  - artifact: "shipglows_data/workflow/specs/app-home-feed-global-actions-search.md"
    artifact_version: "1.0.0"
    required_status: "ready"
  - artifact: "shipglows_data/workflow/specs/clipboard-backend-agnostic-api.md"
    artifact_version: "1.0.0"
    required_status: "ready"
supersedes: []
evidence:
  - "User request 2026-05-30: transform a voice or clipboard element into a snippet or clipboard item through a Send to icon."
  - "Current Voice screen lists TranscriptionRecord cards with edit/delete actions only."
  - "Current Clipboard screen lists ClipboardItemRecord cards with copy/edit/pin/delete actions only."
  - "Current SnippetStore requires trigger and content for snippet creation."
  - "Current ClipboardHistoryApi supports adding manual items with a canonical voice source and sensitive confirmation."
  - "Implemented shared Send to menu/dialog, Voice -> Snippet, Voice -> Clipboard, Clipboard -> Snippet, and snippet refresh signal."
  - "Added widget coverage for sensitive Voice -> Clipboard confirmation."
next_step: "none"
---

# Title

Cross-Surface Send To Actions

# Status

Implemented as a bounded shared Flutter slice. The product decision is clear:
each useful text item should be reusable without manual copy/paste friction. The
first slice adds send-to actions on Voice and Clipboard cards while preserving
existing stores, search/status components, and sensitive-content rules.

# User Story

En tant qu'utilisatrice WinGlows, je veux envoyer un élément Voix ou Clipboard
vers Snippets ou Clipboard via une icône Send to, afin de transformer rapidement
un texte capturé en raccourci réutilisable ou en élément clipboard sans
copier-coller manuel.

# Minimal Behavior Contract

Chaque carte Voice et Clipboard qui contient un texte réutilisable doit exposer
une action icône `Envoyer vers`. Depuis Voice, l'utilisatrice peut créer un
snippet ou ajouter le texte nettoyé au Clipboard WinGlows. Depuis Clipboard, elle
peut créer un snippet à partir du contenu. La création de snippet demande un
déclencheur explicite et laisse le contenu éditable avant création. L'envoi vers
Clipboard respecte la classification de contenu sensible et demande confirmation
quand les règles clipboard l'exigent. Les actions écrivent dans les stores
backend-agnostic déjà actifs pour la session courante et déclenchent le refresh
utile sans dupliquer, supprimer ou exposer de contenu sensible.

# Success Behavior

- Given une transcription Voice contient du texte nettoyé, when l'utilisatrice choisit `Envoyer vers -> Clipboard`, then WinGlows ajoute un item Clipboard source `voice` et affiche un feedback de réussite.
- Given une transcription Voice contient du texte nettoyé, when l'utilisatrice choisit `Envoyer vers -> Snippet`, then WinGlows ouvre un dialogue avec contenu prérempli, demande un déclencheur, puis crée un snippet.
- Given un item Clipboard contient du texte, when l'utilisatrice choisit `Envoyer vers -> Snippet`, then WinGlows ouvre le même dialogue et crée un snippet avec ce contenu.
- Given le texte envoyé au Clipboard semble sensible, when l'utilisatrice confirme, then l'item est ajouté; when elle annule, then rien n'est écrit.
- Given une action réussit, when la page cible est ouverte ou rafraîchie, then l'élément créé apparaît sans redémarrer l'app.
- Given le store actif est local ou Firebase, when l'action écrit, then elle passe par le provider courant sans couplage direct à un backend.

# Error Behavior

- Texte vide: l'action est refusée avec un message récupérable.
- Snippet sans déclencheur ou sans contenu: le bouton de création reste désactivé.
- Store Snippets ou Clipboard indisponible: afficher une erreur récupérable et conserver l'élément source.
- Contenu sensible envoyé au Clipboard sans confirmation: ne rien créer.
- Les diagnostics ne doivent jamais logger le texte envoyé, le contenu clipboard brut ou un secret.

# Scope In

- Menu `Envoyer vers` réutilisable avec icône.
- Dialogue commun de création de snippet depuis un texte source.
- Voice -> Snippet.
- Voice -> Clipboard WinGlows.
- Clipboard -> Snippet.
- Refresh signal snippets pour mettre à jour l'écran Snippets quand une création arrive depuis Voice ou Clipboard.
- Widget tests pour au moins Voice -> Clipboard et Clipboard -> Snippet.

# Scope Out

- Dictionary target.
- Clipboard item -> Clipboard duplicate/no-op.
- Navigation automatique vers la page cible après chaque action.
- Transformation IA du contenu avant création.
- Android native, Windows overlay, Gradle, APK ou device QA.

# Constraints

- Garder les surfaces Flutter partagées cohérentes avec `AppEntityCard`.
- Utiliser les stores/providers existants: `SnippetStore`, `ClipboardHistoryApi`, refresh signals.
- Ne pas introduire de dépendance externe.
- Ne pas modifier les règles de confirmation sensible clipboard.
- Ne pas faire de promesse cloud si le store courant est local-only.

# Implementation Tasks

- [x] Tâche 1 : Ajouter le widget/dialogue Send to partagé.
  - Fichiers : `lib/features/send_to/presentation/send_to_actions.dart`
  - Validate with : widget tests du menu/dialogue via les écrans appelants.

- [x] Tâche 2 : Ajouter Voice -> Snippet / Clipboard.
  - Fichiers : `lib/features/voice/presentation/voice_screen.dart`
  - Validate with : test Voice -> Clipboard et analyse Flutter.

- [x] Tâche 3 : Ajouter Clipboard -> Snippet.
  - Fichiers : `lib/features/clipboard/presentation/clipboard_screen.dart`
  - Validate with : test Clipboard -> Snippet.

- [x] Tâche 4 : Ajouter un refresh signal Snippets.
  - Fichiers : `lib/features/snippets/application/snippet_store_provider.dart`, `lib/features/snippets/presentation/snippets_screen.dart`
  - Validate with : tests existants Snippets + nouveaux tests Send to.

- [x] Tâche 5 : Documentation et trace.
  - Fichiers : `docs/technical/flutter-app.md`, spec courante.
  - Validate with : metadata lint et diff check.

# Test Plan

- `flutter test test/send_to_actions_test.dart`
- `flutter test test/page_scoped_search_test.dart`
- `flutter analyze`
- `git diff --check`
- ShipGlows metadata lint on this spec and updated docs.

# Acceptance Criteria

- [x] AC 1: Voice card exposes an `Envoyer vers` icon menu.
- [x] AC 2: Voice -> Clipboard creates a Clipboard item with source `voice`.
- [x] AC 3: Voice -> Snippet creates a snippet after trigger/content confirmation.
- [x] AC 4: Clipboard card exposes an `Envoyer vers` icon menu for Snippet.
- [x] AC 5: Clipboard -> Snippet creates a snippet after trigger/content confirmation.
- [x] AC 6: Sensitive Voice -> Clipboard content requires confirmation.
- [x] AC 7: Successful Snippet creation from another screen refreshes Snippets when it is active or reopened.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-30 20:40:38 UTC | sf-build | GPT-5 Codex | Created ready spec for cross-surface Send to actions from user request. | Ready for bounded implementation. | `/sf-start shipglows_data/workflow/specs/cross-surface-send-to-actions.md` |
| 2026-05-30 20:48:20 UTC | sf-build | GPT-5 Codex | Implemented shared Send to actions across Voice, Clipboard, Snippets, and docs. | Awaiting final local verification gates. | `/sf-verify shipglows_data/workflow/specs/cross-surface-send-to-actions.md` |
| 2026-05-30 20:48:57 UTC | sf-build | GPT-5 Codex | Reconciled metadata status after local lint feedback. | Verification gates ready to rerun. | `/sf-verify shipglows_data/workflow/specs/cross-surface-send-to-actions.md` |
| 2026-05-30 20:50:50 UTC | sf-build | GPT-5 Codex | Verified send-to widget tests including sensitive confirmation, page scoped search regression, Flutter analyze, diff check, and metadata lint. | Local verification passed. | `/sf-end shipglows_data/workflow/specs/cross-surface-send-to-actions.md` |
| 2026-05-30 20:57:13 UTC | sf-ship | GPT-5 Codex | Full close and ship selected Send to changes. | shipped | none |

# Current Chantier Flow

sf-spec: ready  
sf-ready: accepted inside sf-build  
sf-start: implemented  
sf-verify: local checks pass  
sf-end: completed  
sf-ship: shipped
