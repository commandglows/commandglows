---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "CommandGlows"
created: "2026-08-07"
created_at: "2026-08-07 17:36:22 UTC"
updated: "2026-08-07"
updated_at: "2026-08-07 17:50:00 UTC"
status: reviewed
source_skill: 100-sg-spec
source_model: "GPT-5 Codex"
scope: "chrome-extension-platform-parity-and-windows-coexistence"
owner: "Diane"
confidence: high
user_story: "En tant qu'utilisateur de Chrome, je veux utiliser les workflows CommandGlows dans les champs web sans installer l'app Windows, tout en évitant les doubles déclenchements si les deux surfaces sont installées."
risk_level: high
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "ext"
  - "commandglows_app"
  - "commandglows_site"
  - "Firebase Auth and sync adapters"
  - "Chrome Web Store"
depends_on:
  - artifact: "shipglows_data/business/commandglows_app/product.md"
    artifact_version: "1.3.0"
    required_status: reviewed
  - artifact: "commandglows_app/docs/DECISIONS.md"
    artifact_version: "1.1.0"
    required_status: reviewed
supersedes: []
evidence:
  - "Operator decision 2026-08-07: start with a Chrome extension because users may not want to install a Windows app and Chrome is a discovery channel."
  - "Operator decision 2026-08-07: target as much Windows/Android feature parity as technically possible."
  - "Operator decision 2026-08-07: prevent conflicts when extension and Windows app are both installed."
  - "Chrome Extensions Manifest V3 and Chrome Web Store official documentation checked 2026-08-07."
next_step: "Continue standalone extension parity locally; account sync is deferred by operator decision."
---

# Title

Chrome Extension Platform Parity And Windows Coexistence

# Status

Reviewed product and technical contract. The standalone extension slice is in implementation; native Windows-to-extension handoff and Chrome Store proof remain open.

# User Story

En tant qu'utilisateur de Chrome, je veux dicter, transformer, retrouver et insérer mes textes avec CommandGlows directement là où j'écris, sans devoir installer l'app Windows, afin d'obtenir l'essentiel du produit avec une installation légère; si l'extension et l'app Windows sont toutes deux installées, une seule surface doit traiter et insérer chaque action.

# Minimal Behavior Contract

Quand l'utilisateur déclenche CommandGlows depuis un champ, une sélection, le menu contextuel, le popup ou un raccourci Chrome, l'extension ouvre la commande pertinente, produit un résultat prévisualisable puis l'insère une seule fois dans le champ actif ou le copie explicitement; si la page, le champ, la permission, le réseau ou la synchronisation bloque l'action, le texte déjà produit reste récupérable et la limite est expliquée; le cas facile à rater est la coexistence avec Windows, qui ne doit jamais provoquer deux captures, deux traitements, deux facturations IA ou deux insertions pour un même geste.

# Success Behavior

- L'extension est utile et complète sans app Windows.
- Le compte, l'entitlement, les snippets, le dictionnaire, l'historique, les réglages compatibles et les actions synchronisées restent cohérents avec Android/Windows.
- La sélection ou le champ actif peut être dicté, transformé ou alimenté par snippet avec aperçu et annulation.
- L'insertion est unique; le fallback copy conserve toujours le résultat.
- La présence simultanée de Windows et de l'extension ne change pas silencieusement le comportement.

# Error Behavior

- Page Chrome protégée, Chrome Web Store, page interne ou éditeur incompatible: afficher `insertion_unavailable`, garder aperçu + copy.
- Champ password, OTP, paiement ou privé: refuser capture, transformation, snippet enrichi et sync.
- Permission micro refusée: expliquer comment la réactiver sans perdre le brouillon.
- Auth/sync indisponible: conserver les données locales autorisées et signaler l'état hors ligne.
- Action IA échouée: conserver le texte source et empêcher les retries non bornés.
- Conflit de raccourci: ne pas sauvegarder silencieusement; proposer un raccourci libre.

# Problem

L'app Windows offre la meilleure intégration système mais impose une installation. Le Flutter web actuel ne fournit ni insertion contextuelle ni canal Chrome Store. Une extension peut réduire cette friction et rejoindre l'utilisateur dans ses outils web, mais une copie naïve créerait des permissions excessives, des limites non expliquées et des doubles actions avec l'hôte Windows.

# Solution

Créer une extension Chrome Manifest V3 autonome sous `ext/`, centrée sur un but unique: capturer, transformer, réutiliser et insérer du texte dans le navigateur. Réutiliser les contrats métier/backend de CommandGlows, implémenter une UI extension native au navigateur, puis appliquer un arbitrage déterministe extension/Windows.

# Scope In

- Chrome Manifest V3, popup et/ou side panel, content scripts à accès minimal.
- Auth et entitlement CommandGlows.
- Sync de snippets, dictionnaire, historique, actions et réglages compatibles.
- Dictée depuis une surface extension avec permission explicite.
- Sélection -> correction, reformulation, résumé, traduction et actions personnalisées compatibles.
- Recherche/insertion de snippets, variables déterministes et dictionnaire personnel.
- Insertion dans champs texte/contenteditable compatibles, aperçu, undo local et fallback clipboard.
- Menu contextuel et raccourcis Chrome configurables.
- États local/offline/recoverable et protections des champs sensibles.
- Télémétrie minimale, consentie et sans contenu utilisateur.
- Matrice de coexistence extension seule, Windows seul et les deux installés.

# Scope Out

- IME ou remplacement de clavier système.
- Surveillance continue du clipboard, des pages, de l'historique de navigation ou de la frappe.
- Injection système hors Chrome.
- Contrôles média système et macros desktop arbitraires dans la première tranche.
- Dépendance obligatoire à Native Messaging ou à l'app Windows.
- Firefox/Safari et publication store avant preuve Chrome.
- Lecture automatique de la page entière pour enrichir un prompt sans action et consentement explicites.

# Constraints

- But Chrome Store unique, étroit et compréhensible.
- Permissions minimales; préférer `activeTab` et l'invocation utilisateur aux host permissions permanentes.
- Aucun secret fournisseur durable dans un stockage navigateur dégradé sans contrat de sécurité accepté; préférer un service CommandGlows autorisé côté serveur pour les fonctions premium.
- Aucun contenu utilisateur dans logs, analytics, URLs ou messages d'erreur.
- Aucun code distant exécuté; bundle soumis lisible et compatible Manifest V3.
- L'extension doit rester autonome lorsque Windows est absent, fermé ou obsolète.
- La première tranche extension est `local_only`: aucun login ou sync distante
  n'est requis. Le contrat versionné reste disponible pour une tranche compte
  ultérieure sans transformer le stockage Chrome en fausse sync CommandGlows.

# Test Contract

- Profil: extension Chrome Manifest V3 + backend/auth/sync + content scripts + microphone/clipboard.
- Automatisé: lint, typecheck, unit tests des contrats, tests d'insertion DOM, arbitrage, private-field policy et sync.
- Navigateur: Chrome stable avec popup/side panel, Gmail, champs standards, contenteditable et un éditeur complexe documenté.
- Sécurité: audit permissions, CSP, stockage, logs, réseau, consentement et bundle.
- Manuel: installation unpacked, raccourcis, micro, offline, mise à jour, extension + Windows ensemble.
- Checklist cible: `shipglows_data/workflow/verification/chrome-extension-platform-parity-and-windows-coexistence-checklist.md`.

# Dependencies

- Contrats backend-agnostiques CommandGlows pour auth, entitlement, snippets, dictionnaire, historique et actions.
- Chrome Extensions Manifest V3, `activeTab`, content scripts, commands, context menus, side panel et offscreen document lorsque justifié.
- Chrome Web Store policies: single purpose, minimum permissions, disclosure, limited use and secure handling.
- Fresh-docs checked 2026-08-07 against official Chrome for Developers documentation.

# Invariants

- Une action utilisateur = un `request_id`, un propriétaire d'exécution, un propriétaire d'insertion.
- Jamais de double appel IA ou double insertion à cause de la coexistence.
- L'extension reste standalone; le bridge Windows est optionnel.
- L'utilisateur apprend un raccourci préféré; un seul runtime l'enregistre pour un contexte d'installation donné.
- Extension seule: Chrome possède le raccourci. Windows seul: l'app Windows le possède. Double installation: Windows le possède globalement et transfère la requête à l'extension pour un onglet compatible.
- L'extension possède l'action après acceptation du handoff dans un onglet compatible; Windows possède le système et les apps hors navigateur.
- Toute insertion échouée conserve un résultat copiable.
- Les champs sensibles sont fail-closed.
- Sync utilisateur opt-in et secrets BYO non synchronisés.

# Links & Consequences

- Le web Flutter reste une app web; l'extension est une surface différente avec ses propres preuves.
- Les actions partagées nécessitent un contrat versionné indépendant des widgets Flutter et de l'IME Kotlin.
- Le backend doit accepter des identifiants de requête idempotents pour éviter un double coût lors des retries.
- Les réglages doivent exposer le propriétaire des raccourcis et l'état de coexistence sans exiger le bridge natif.
- La page publique, l'onboarding et la privacy policy devront distinguer texte sélectionné, audio, page context et données synchronisées.

# Documentation Coherence

- Ajouter l'extension à la carte produit et à la matrice plateforme.
- Documenter permissions, données traitées, rétention, suppression et mode local/cloud.
- Ne publier aucune promesse de compatibilité universelle avec tous les éditeurs web avant la matrice QA.
- Documenter clairement le comportement lorsque Windows et Chrome sont installés ensemble.

# Edge Cases

- Chrome interne, Chrome Web Store, PDF viewer, iframe cross-origin, sandbox et page sans content script.
- Plusieurs fenêtres/profils Chrome et plusieurs champs actifs.
- SPA qui remonte/remplace le DOM entre sélection et insertion.
- contenteditable riche, shadow DOM, canvas editor et Google Docs-like editor.
- Composition IME, texte RTL, accents français, emoji et sélection multi-paragraphe.
- Shortcut Chrome non assigné, réservé ou identique au raccourci Windows.
- Windows app démarre ou s'arrête pendant une action extension.
- Double clic, service worker suspendu/réveillé, retry réseau et réponse tardive.
- Logout ou changement de compte pendant traitement.

# Implementation Tasks

- [ ] Tâche 1 : Extraire et versionner les contrats cross-surface
  - Fichiers : `packages/contracts/` ou contrat partagé documenté, adaptateurs `commandglows_app/`
  - Action : définir actions, snippets, dictionnaire, résultats, erreurs, capabilities, `request_id` et idempotence sans dépendance Flutter.
  - User story link : parité de données et d'actions.
  - Depends on : none.
  - Validate with : tests de sérialisation et compatibilité des versions.

- [ ] Tâche 2 : Scaffolder l'extension Chrome autonome
  - Fichiers : `ext/manifest.json`, `ext/src/**`, `ext/package.json`, configs de build/test.
  - Action : créer Manifest V3, service worker, popup/side panel, content script à accès minimal et build store-ready.
  - User story link : installation légère sans Windows.
  - Depends on : tâche 1.
  - Validate with : typecheck, tests, build unpacked et audit du manifest.

- [ ] Tâche 3 : Implémenter auth, entitlement et sync
  - Fichiers : `ext/src/auth/**`, `ext/src/data/**`, backend/bridge existant.
  - Action : session sûre, mode local explicite, sync compatible et isolation des comptes.
  - User story link : continuité Android/Windows/Chrome.
  - Depends on : tâches 1-2.
  - Validate with : tests auth, logout, offline, changement de compte et accès refusé.

- [ ] Tâche 4 : Implémenter sélection, actions et insertion récupérable
  - Fichiers : `ext/src/content/**`, `ext/src/actions/**`, `ext/src/ui/**`.
  - Action : lire uniquement le contexte déclenché, prévisualiser, remplacer/insérer/copier, undo et codes d'échec stables.
  - User story link : CommandGlows là où l'utilisateur écrit.
  - Depends on : tâches 1-3.
  - Validate with : tests DOM + matrice navigateur/éditeurs.

- [ ] Tâche 5 : Porter snippets, dictionnaire, historique et actions personnalisées compatibles
  - Fichiers : `ext/src/features/**`.
  - Action : parité des workflows et capability filtering des actions desktop/Android incompatibles.
  - User story link : maximum de parité techniquement possible.
  - Depends on : tâches 1-4.
  - Validate with : tests CRUD/recherche/insertion/sync et états incompatibles.

- [ ] Tâche 6 : Ajouter la dictée et la récupération audio/texte
  - Fichiers : `ext/src/voice/**`, surface extension/offscreen si nécessaire.
  - Action : permission micro déclenchée, capture bornée, transcription, annulation et conservation du résultat/source.
  - User story link : parité dictée.
  - Depends on : tâches 2-4.
  - Validate with : permission accept/refuse/revoke, timeout, cancel et retry borné.

- [ ] Tâche 7 : Implémenter l'arbitrage extension/Windows
  - Fichiers : `ext/src/coexistence/**`, settings extension, settings Windows si nécessaire.
  - Action : raccourci préféré unique, ownership transférable, détection du contexte navigateur et handoff natif requis uniquement en double installation.
  - User story link : aucune collision avec les deux installations.
  - Depends on : tâches 2-6.
  - Validate with : extension seule, Windows seul, les deux, app fermée, bridge absent et double-trigger simulé.

- [ ] Tâche 8 : Durcir confidentialité, store readiness et documentation
  - Fichiers : manifest, privacy/onboarding docs, tests, checklist de vérification.
  - Action : permissions minimales, disclosures, suppression des données, CSP, bundle audit et Chrome Store assets/claims.
  - User story link : découverte Chrome digne de confiance.
  - Depends on : tâches 1-7.
  - Validate with : policy checklist, security review, build production et browser QA.

# Acceptance Criteria

- [ ] AC1: sans app Windows, un utilisateur installe l'extension, se connecte ou choisit le mode autorisé, puis insère un snippet dans un champ compatible.
- [ ] AC2: une sélection peut être transformée, prévisualisée, remplacée une fois et annulée localement.
- [ ] AC3: une dictée refusée ou interrompue ne supprime aucun texte déjà produit.
- [ ] AC4: les champs password/OTP/paiement restent inaccessibles aux actions sensibles.
- [ ] AC5: une page non injectable retourne aperçu + copy avec explication.
- [ ] AC6: snippets, dictionnaire, historique et actions compatibles se synchronisent avec le même compte sans synchroniser les secrets BYO.
- [ ] AC7: extension seule et Windows seul exposent le même raccourci préféré; en double installation, un seul runtime enregistre le raccourci global.
- [ ] AC8: un trigger simulé en coexistence entraîne au plus un traitement facturable et une insertion.
- [ ] AC9: l'absence ou la panne de l'app Windows ne dégrade pas l'extension standalone.
- [ ] AC10: aucune permission permanente large n'est demandée sans nécessité documentée et consentement.
- [ ] AC11: aucun contenu sélectionné, audio, prompt ou résultat n'apparaît dans logs, analytics, URLs ou rapports d'erreur.
- [ ] AC12: Chrome stable passe la checklist sur champs standards, contenteditable, Gmail et au moins un éditeur complexe avec limites consignées.

# Test Strategy

1. Tests unitaires des contrats, capabilities, idempotence, private fields et arbitration.
2. Tests DOM d'insertion et undo sur fixtures standard/contenteditable/shadow DOM.
3. Tests intégration auth/sync/offline avec comptes isolés.
4. Build Manifest V3, audit permissions/CSP/bundle et installation unpacked.
5. QA Chrome stable des déclencheurs, dictée, clipboard et éditeurs cibles.
6. QA coexistence sur Windows avec extension seule/app seule/les deux.
7. Revue Chrome Store privacy, disclosures, listing et single-purpose avant soumission.

# Risks

- Les éditeurs riches ne partagent pas un modèle d'insertion universel.
- Une permission trop large réduit la confiance et peut bloquer la publication.
- Le stockage navigateur n'offre pas le même niveau que le keystore natif.
- Le handoff natif de coexistence est un chemin critique uniquement lorsque les deux surfaces sont installées; il doit rester absent du chemin extension-only.
- Des raccourcis ou retries mal arbitrés peuvent doubler les appels payants et l'insertion.
- La parité de fonctionnalités peut rendre le but Store illisible si elle n'est pas présentée sous un seul outcome cohérent.

# Execution Notes

- Utiliser `ext/` conformément au contrat monorepo pour une extension unique.
- Préférer `activeTab`, commandes et actions utilisateur; justifier toute host permission.
- Commencer Chrome-first, mais garder les contrats portables vers Edge/Chromium.
- L'extension ne doit pas embarquer le Flutter web comme simple wrapper.
- Les sources officielles Chrome consultées imposent transparence, permissions minimales, but unique, traitement sécurisé et divulgation des données, y compris quand elles restent locales.

# Open Questions

Aucune décision opérateur bloquante pour la readiness initiale. Les choix de librairie, bundler, UI interne et protocoles sont des décisions d'implémentation à résoudre depuis les standards du repo et les preuves Chrome.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|---|---|---|---|---|---|
| 2026-08-07 17:36:22 UTC | sg-engineering parity | GPT-5 Codex | Captured Chrome-first parity and Windows coexistence decision from operator direction. | draft spec created; implementation not started | readiness review, then scaffold `ext/` |
| 2026-08-07 18:05:00 UTC | sg-development | GPT-5 Codex | Replaced distinct shortcuts with one preferred shortcut and implemented the standalone Manifest V3 trigger, ownership lease, field policy, popup and active-field palette. | partial: extension checks and 7 focused tests pass; native Windows handoff remains unimplemented | implement and prove Windows-to-extension delegation |
| 2026-08-07 18:25:00 UTC | sg-development | GPT-5 Codex | Expanded the standalone slice with local snippet management/insertion, deterministic transforms, recoverable browser dictation and a versioned sync boundary. | partial: 15 focused tests and manifest check pass; account auth/sync, browser QA and native Windows handoff remain open | connect authenticated account sync after its extension security contract is ready |
| 2026-08-07 18:35:00 UTC | sg-development | GPT-5 Codex | Recorded operator choice to keep the first extension phase local-only. | accepted: remote account sync deferred without blocking standalone parity work | continue local extension capabilities and browser QA |
| 2026-08-07 18:45:00 UTC | sg-development | GPT-5 Codex | Added local personal dictionary application and bounded insertion history under the accepted local-only phase. | partial: 19 focused tests and manifest check pass; unpacked Chrome QA remains open | run manual Chrome QA |
| 2026-08-07 19:05:00 UTC | sg-development | GPT-5 Codex | Added browser-compatible custom actions and validated versioned local backup/restore. | partial: 24 focused tests and manifest check pass; unpacked Chrome QA remains open | run manual Chrome QA |
| 2026-08-07 19:20:00 UTC | sg-development | GPT-5 Codex | Attempted bundled Chromium unpacked-extension smoke. | partial: headless Chromium did not expose the extension target; no browser interaction claim made | run normal Chrome unpacked QA |

# Current Chantier Flow

sg-engineering parity: product decision and parity contract captured
sg-spec: reviewed and revised for one preferred shortcut
sg-ready: bounded standalone extension slice accepted; native handoff remains gated
sg-start: partial standalone extension implementation includes snippets, dictionary, insertion history, custom actions, local backup/restore, local transforms, dictation and operator-accepted local-only persistence
sg-verify: pending
sg-end: pending
sg-ship: pending
