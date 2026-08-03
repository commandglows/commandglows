---
artifact: test_checklist
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-06-12"
updated: "2026-06-12"
status: draft
source_skill: 100-sf-spec
scope: "android micro transcription hardening manual verification"
owner: "Diane"
confidence: "high"
risk_level: "high"
security_impact: "yes"
docs_impact: "no"
linked_systems:
  - "Android IME keyboard"
  - "Android overlay"
  - "Accessibility delivery"
  - "Transcription history"
depends_on:
  - "shipglows_data/workflow/specs/android-micro-transcription-pipeline-hardening.md"
supersedes: []
evidence: []
next_step: "/103-sf-verify shipglows_data/workflow/specs/android-micro-transcription-pipeline-hardening.md"
---

# Android Micro/Transcription Pipeline Hardening Checklist

## Purpose

Manual Android verification for the microphone/transcription hardening chantier.

## Scenarios

- `AMP-001` Permission micro refusée
  - Preconditions: overlay permission accordée, `RECORD_AUDIO` refusée
  - Steps:
    - tenter un démarrage IME
    - tenter un démarrage overlay
  - Expected results:
    - aucun état `recording` trompeur
    - message/résultat récupérable
    - aucun item transcription créé

- `AMP-002` Overlay hors app avec transcription persistée
  - Preconditions: overlay + micro accordés, accessibilité activée si nécessaire
  - Steps:
    - démarrer une dictée overlay hors de WinGlows
    - prononcer une phrase simple
    - terminer proprement
    - rouvrir WinGlows
  - Expected results:
    - une transcription `source=overlay` apparaît une seule fois
    - aucun doublon après refresh

- `AMP-003` Dictée IME avec transcription persistée
  - Preconditions: IME WinGlows actif, micro accordé
  - Steps:
    - démarrer une dictée depuis le clavier
    - prononcer une phrase simple
    - terminer proprement
    - ouvrir l’historique vocal
  - Expected results:
    - une transcription `source=keyboard` apparaît une seule fois
    - aucun doublon après resync

- `AMP-004` Champ sensible
  - Preconditions: accessibilité active, champ mot de passe/OTP disponible
  - Steps:
    - tenter une livraison texte vers un champ sensible
  - Expected results:
    - aucune injection automatique
    - aucune copie clipboard automatique
    - retour diagnostic/récupérable cohérent

- `AMP-005` Concurrence IME/overlay
  - Preconditions: une session micro déjà active sur une surface
  - Steps:
    - tenter de démarrer l’autre surface
  - Expected results:
    - le second démarrage est refusé proprement
    - aucune double capture micro
    - l’état de la première session reste cohérent
