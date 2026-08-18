---
artifact: editorial_roadmap
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: commandglows
created: "2026-08-16"
updated: "2026-08-16"
status: draft
source_skill: sg-content
scope: windows-productivity-and-onboarding-editorial-roadmap
owner: Diane
confidence: high
risk_level: medium
security_impact: none
docs_impact: yes
linked_systems:
  - shipglows_data/editorial/content-map.md
  - shipglows_data/editorial/page-intent-map.md
  - shipglows_data/editorial/claim-register.md
  - commandglows_site/src/content/blog/en/
  - commandglows_site/src/content/blog/fr/
  - commandglows_site/src/content/docs/en/formations/module-2-windows/
  - commandglows_site/src/content/docs/fr/formations/module-2-windows/
depends_on:
  - shipglows_data/editorial/content-map.md
  - shipglows_data/editorial/claim-register.md
supersedes: []
evidence:
  - "Operator editorial direction 2026-08-16: use Windows productivity and developer onboarding questions to attract new CommandGlows readers."
  - "Windows Mastery is the governed flagship offer and the blog is the declared discovery and SEO surface."
next_review: "2026-09-16"
next_step: "Qualify the Wave 1 briefs, then draft matched French and English articles."
---

# Editorial Roadmap — CommandGlows

> Operational records follow the ShipGlows traffic-first task format. This roadmap plans public education; it does not authorize unsupported outcome claims or publication.

## Editorial direction

Help readers understand why a Windows work environment becomes fragile, how to make it easier to rebuild, and which concepts matter before choosing tools. Keep the language accessible: start from interruptions, lost time, confusing setup instructions, and fear of changing machines. Introduce technical vocabulary only after the reader understands the practical problem.

The blog owns discovery and qualification. Structured exercises, exhaustive procedures, and the durable learning path belong in Windows Mastery. Every article is planned as a matched French and English pair and should lead to the most relevant lesson or flagship page without pretending that one setup fits everyone.

## Wave 1 — Foundational discovery cluster

🔴 [CommandGlows] task: Pourquoi un nouveau PC de travail n'est jamais vraiment prêt | status: todo | area: windows-onboarding | id: CG-ED-WIN-01 | audience: indépendants et professionnels qui changent ou réinstallent leur PC | question: qu'est-ce qui manque entre un Windows installé et un poste réellement opérationnel ? | angle: cartographier comptes, applications, PATH, réglages, données et habitudes comme les couches d'un environnement | surface: blog FR/EN | funnel: Windows Mastery module Windows | proof: expliquer les couches sans promettre de gain de temps quantifié | next: produire le brief bilingue et l'inventaire des liens internes

🔴 [CommandGlows] task: Onboarding Windows, la checklist qui évite les oublis invisibles | status: todo | area: windows-onboarding | id: CG-ED-WIN-02 | audience: petites équipes, formateurs et personnes qui accompagnent un nouveau collègue | question: comment transmettre un poste de travail sans dépendre de la mémoire d'une seule personne ? | angle: distinguer accès, outils, configuration, validation et apprentissage | surface: blog FR/EN | funnel: Windows Mastery et newsletter | proof: présenter une méthode qualitative, sans économie chiffrée ni promesse de résultat | next: construire une checklist éditoriale réutilisable

🔴 [CommandGlows] task: PATH, terminal, CLI et SDK expliqués sans jargon | status: todo | area: developer-literacy | id: CG-ED-WIN-03 | audience: débutants qui suivent des tutoriels techniques sous Windows | question: pourquoi une commande installée reste-t-elle parfois introuvable ? | angle: raconter le trajet entre une commande saisie, le PATH, son programme et ses dépendances | surface: blog FR/EN | funnel: leçon Windows Mastery sur le terminal | proof: vérifier chaque exemple sur PowerShell actuel et séparer clairement installation et disponibilité | next: préparer un schéma simple et trois diagnostics reproductibles

🔴 [CommandGlows] task: Configurer Windows une fois ou savoir le reconstruire ? | status: todo | area: reproducible-workstation | id: CG-ED-WIN-04 | audience: utilisateurs dont le poste s'est enrichi par accumulations successives | question: une sauvegarde suffit-elle à retrouver son environnement de travail ? | angle: comparer sauvegarde de fichiers, synchronisation, liste d'applications et recette de reconstruction | surface: blog FR/EN | funnel: Windows Mastery | proof: ne pas présenter la reconstruction comme parfaitement automatique ou universelle | next: rédiger une matrice accessible sauvegarde versus reconstruction

## Wave 2 — Choice and confidence cluster

🟠 [CommandGlows] task: Changer de PC sans reconstruire son workflow à la main | status: todo | area: migration | id: CG-ED-WIN-05 | audience: utilisateurs préparant une migration ou un remplacement de machine | question: que faut-il documenter avant que l'ancien PC ne soit plus disponible ? | angle: inventaire progressif des fichiers, comptes, applications, extensions, préférences et validations | surface: blog FR/EN | funnel: checklist téléchargeable puis Windows Mastery | proof: éviter toute garantie de migration sans perte | next: définir le livrable pratique et son périmètre de sécurité

🟠 [CommandGlows] task: WinGet, sauvegarde et synchronisation, que faut-il réellement automatiser ? | status: todo | area: windows-automation | id: CG-ED-WIN-06 | audience: utilisateurs intermédiaires attirés par l'automatisation | question: quels éléments d'un poste peuvent être automatisés et lesquels demandent encore une décision humaine ? | angle: classer installation, configuration, authentification, licences et données | surface: blog FR/EN | funnel: Windows Mastery avancé | proof: vérifier les capacités actuelles des outils officiels avant rédaction | next: préparer une grille automatisable, assisté, manuel

🟠 [CommandGlows] task: WSL, machine Windows native ou conteneur, comment choisir quand on débute ? | status: todo | area: developer-onboarding | id: CG-ED-WIN-07 | audience: personnes qui démarrent une formation ou un projet de développement | question: faut-il transformer Windows en Linux pour apprendre à développer ? | angle: choisir selon le projet, les outils graphiques, le matériel et la proximité avec la production | surface: blog FR/EN | funnel: parcours développeur Windows | proof: présenter des compromis, pas un vainqueur universel | next: valider les scénarios avec des sources produit actuelles

🟠 [CommandGlows] task: Un bon onboarding apprend-il des outils ou un système ? | status: todo | area: learning-design | id: CG-ED-WIN-08 | audience: apprenants, managers et créateurs de formations | question: mémoriser des clics suffit-il quand les outils changent ? | angle: défendre les modèles mentaux, les diagnostics et la capacité de reconstruction avant la collection d'astuces | surface: blog FR/EN | funnel: page Windows Mastery | proof: formuler comme thèse pédagogique, sans prétendre démontrer des résultats non mesurés | next: construire le plan à partir des huit modules réellement disponibles

## Editorial guardrails

- Lead with a familiar Windows problem, then introduce the technical concept.
- Keep procedures that require maintenance inside training or governed checklists rather than freezing them inside broad discovery articles.
- Verify current tool behavior before publication, especially for WinGet, WSL, containers, Android, Flutter, authentication, and licensing.
- Do not claim quantified productivity, savings, flawless migration, universal compatibility, or guaranteed outcomes without evidence in the claim register.
- Publish French and English counterparts in the same release batch and link each supporting article back to the relevant Windows Mastery surface.
