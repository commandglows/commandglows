---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "0.5.0"
project: "CommandGlows"
created: "2026-08-06"
created_at: "2026-08-06 16:50:53 UTC"
updated: "2026-08-11"
updated_at: "2026-08-11 16:36:31 UTC"
status: draft
source_skill: sg-docs
source_model: "GPT-5 Codex"
scope: "trial-then-paid-entitlements"
owner: "Diane"
confidence: high
user_story: "En tant que prospect CommandGlows, je veux essayer l'application pleinement pendant une durée claire, puis acheter pour continuer, afin d'évaluer la valeur sans qu'un accès gratuit permanent remplace la vente."
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - "commandglows_site Astro API bridge"
  - "Convex identity and entitlement ledger"
  - "commandglows_app Flutter authentication gate"
  - "Stripe Managed Payments checkout and webhooks"
  - "Clerk/Firebase suite identity bridge"
depends_on:
  - artifact: "shipglows_data/technical/payment-activation-entitlements.md"
    artifact_version: "0.7.0"
    required_status: draft
  - artifact: "shipglows_data/business/commandglows_app/product.md"
    artifact_version: "1.6.0"
    required_status: reviewed
  - artifact: "shipglows_data/business/commandglows_app/business.md"
    artifact_version: "1.5.0"
    required_status: reviewed
  - artifact: "shipglows_data/business/commandglows_app/gtm.md"
    artifact_version: "1.4.0"
    required_status: reviewed
  - artifact: "/home/claude/shipglows/skills/references/winflowz-suite-product-registry.md"
    artifact_version: "1.1.0"
    required_status: reviewed
supersedes: []
evidence:
  - "Commercial decision of 2026-08-06: CommandGlows uses trial_then_paid, not permanent freemium."
  - "Commercial decision of 2026-08-06: initial full trial is 14 days; at most two additional 14-day reactivations are permitted, for 42 days cumulative maximum."
  - "Commercial decision of 2026-08-06: the 30-day satisfaction/refund policy is distinct from technical access expiry."
  - "Commercial decision of 2026-08-06: eligibility is server-side by global identity and recognized installation; IP is a privacy-aware secondary anti-abuse signal only."
  - "Operator confirmation of 2026-08-06: there are no users to preserve, so no grandfathering or compatibility migration is required."
  - "Commercial provider decision of 2026-08-11: Stripe Managed Payments replaces Lemon Squeezy as the target Merchant of Record for CommandGlows."
  - "Repository inspection: productEntitlements has no expiry field; commandglows_app is currently granted by the default-free flow; Flutter parses entitlement status without access expiry."
next_step: "Complete the remaining anti-abuse, client journey, automated proof, and hosted payment verification before release."
---

# CommandGlows Trial-Then-Paid Entitlements

## Title

CommandGlows Trial-Then-Paid Entitlements

## Status

Partially implemented contract. It replaces the former implicit permanent-free entitlement for `commandglows_app` with a server-authoritative, full-featured 14-day trial followed by a paid access gate. The scope is deliberately CommandGlows-only: other products retain their declared policy until a separate product decision opts them into `trial_then_paid`.

## User Story

En tant que prospect CommandGlows, je veux essayer l'application pleinement pendant une durée claire, puis acheter pour continuer, afin d'évaluer la valeur sans qu'un accès gratuit permanent remplace la vente.

En tant qu'opératrice, je veux que l'essai soit difficile à contourner par de nouveaux e-mails sur le même appareil, sans fonder un refus définitif sur une adresse IP ni collecter un identifiant matériel invasif.

## Minimal Behavior Contract

Une identité globale authentifiée peut démarrer un essai CommandGlows complet de 14 jours depuis une installation reconnue. Après l'expiration, elle peut demander au maximum deux réactivations supplémentaires de 14 jours; le total de temps d'essai accordé ne dépasse jamais 42 jours. Toute décision est rendue par le backend à partir du ledger d'identité, de produit et d'installation; le client ne peut ni définir la date d'expiration ni incrémenter son compteur d'essais.

À l'expiration du dernier essai, l'application refuse les fonctions réservées et propose l'achat de l'offre CommandGlows. Un achat Stripe Managed Payments vérifié accorde l'entitlement correspondant; un remboursement, une révocation ou une fraude signalée retire l'accès selon le contrat commerce. La garantie commerciale de remboursement de 30 jours demeure une politique de vente: elle ne prolonge, ne réinitialise et ne remplace aucun essai.

## Success Behavior

- Un nouveau compte ne reçoit pas le grant permanent `commandglows_app/free`.
- Le premier essai est créé une seule fois pour le couple identité globale + produit et expire exactement 14 jours après son accord serveur.
- Une réactivation expirée est possible au plus deux fois; chaque période ajoute exactement 14 jours, sans chevauchement ni remise à zéro.
- Un même appareil, reconnu par un identifiant d'installation généré par l'application et stocké sous forme de hash côté serveur, ne peut pas obtenir un nouvel essai complet en créant un nouvel e-mail.
- Un nouveau téléphone lié à une identité qui a encore droit à l'essai peut être enregistré sans réinitialiser le compteur; le produit garde la même date d'expiration globale.
- Le snapshot d'entitlement retourne au client le statut, le type de grant, `expiresAt` quand applicable, la source et les capacités réellement accessibles.
- L'interface affiche une date d'expiration et une action cohérente: continuer l'essai, demander une réactivation éligible, ou acheter.
- Un achat Founder actif prévaut sur toute expiration d'essai. Les offres actuelles Focus, Power, Control et Command continuent de créer leur entitlement payé par webhook idempotent.
- Toute décision d'accès à une API/fonction protégée est validée côté serveur; l'horloge locale et le cache Flutter ne servent qu'à l'affichage.
- Les journaux et métriques de risque ne conservent ni adresse IP en clair, ni identifiant matériel stable, ni valeur de paiement sensible.

## Error Behavior

- Sans identité vérifiée, sans installation valide ou si le bridge est indisponible, l'essai n'est pas accordé; l'application reste dans un état de connexion/récupération clair, sans accès par défaut.
- Si une requête de démarrage ou de réactivation est répétée, elle retourne le même résultat idempotent et ne crée ni période supplémentaire ni date plus longue.
- Si l'installation est déjà associée à une autre identité ayant consommé l'essai du produit, le backend refuse le nouvel essai et retourne un motif générique non accusatoire avec le parcours achat/assistance.
- Si le signal IP déclenche une limite de vélocité ou un risque élevé, le backend bloque temporairement la création d'essai et journalise un événement pseudonymisé; il ne marque jamais une personne comme définitivement interdite sur IP seule.
- Si le snapshot local est expiré, absent, mal formé ou non vérifiable, le client fail-closed pour les capacités payantes et rafraîchit le bridge avant de proposer l'achat.
- Si un webhook commerce est invalide, non vérifié, hors catalogue ou dupliqué, aucun entitlement n'est créé ni modifié. Une transition refund/revoke/fraud vérifiée retire l'accès de manière idempotente.
- Aucune suppression de ledger ne sert à réparer un incident: les corrections sont des transitions auditables avec raison et acteur/service.

## Problem

Le système actuel accorde `commandglows_app` comme entitlement gratuit par défaut. Son modèle ne porte pas d'expiration, et le bridge Flutter ne reçoit ni ne calcule une décision d'essai. Cette situation rend impossible l'application technique de la stratégie commerciale: essai court, relances limitées, puis achat. Une simple restriction par e-mail serait facilement contournable; à l'inverse, un blocage IP ou un identifiant matériel invasif serait imprécis, fragile et disproportionné.

## Solution

Créer un ledger serveur dédié aux essais et aux installations reconnues, puis faire de ce ledger la source de vérité du snapshot d'accès. Le backend compose les grants payés, les essais actifs/expirés et les révocations selon une priorité explicite. Flutter affiche cette décision et déclenche des requêtes idempotentes signées par l'identité; il ne prend jamais seul une décision commerciale. L'anti-abus repose d'abord sur l'identité globale et l'installation reconnue, complétées par une protection de vélocité pseudonymisée. La vérification d'intégrité de plateforme peut être ajoutée comme signal renforcé sans devenir un verrou exclusif.

## Scope In

- Définir l'état `trial_then_paid` de `commandglows_app` et retirer ce produit de la liste des grants gratuits automatiques.
- Ajouter au modèle Convex les données nécessaires à un essai auditable: produit, identité globale, période/indice d'essai, début, expiration, état, idempotency key, raison et dates d'audit.
- Ajouter un registre d'installations reconnues qui stocke uniquement un identifiant d'installation rotatif/généré par l'app sous forme hachée, son produit, son environnement, son identité liée, ses dates et un niveau de confiance.
- Fournir via le bridge des mutations idempotentes `startTrial` et `reactivateTrial`, et un snapshot d'entitlement avec expiration canonique.
- Mettre à jour le résolveur d'accès pour faire prévaloir un entitlement payé actif sur l'essai, puis refuser toute capacité lorsque l'essai est expiré ou épuisé.
- Faire évoluer les modèles, parseurs, cache et écrans Flutter afin d'afficher l'expiration, le nombre de relances restantes et un CTA d'achat officiel.
- Mettre en place un chemin d'achat depuis l'app vers la page/checkout CommandGlows existant, sans faux succès local; le retour d'achat dépend du webhook puis d'un refresh de snapshot.
- Prévoir les événements de remboursement, révocation et fraude du fournisseur de paiement dans le même résolveur d'accès.
- Ajouter une limitation de vélocité courte et pseudonymisée par signal réseau, sans stocker l'IP brute ni bloquer définitivement une personne sur ce seul signal.
- Définir le contrat de migration pour l'environnement vide: ne pas créer de conversion ni de grandfathering; rendre les anciens grants gratuits existants non accordants par résolution et les conserver uniquement comme trace si une donnée de test existe.
- Ajouter tests unitaires, d'intégration bridge/Convex, Flutter et scénarios manuels de checkout/webhook.

## Scope Out

- Transformer automatiquement les autres produits Glows en essai puis paiement.
- Bloquer définitivement un utilisateur, un foyer ou une entreprise à partir d'une IP, d'une empreinte matérielle, ou d'un identifiant publicitaire.
- Collecter un IMEI, Android ID, adresse MAC, numéro de série, empreinte navigateur opaque ou toute donnée matérielle stable pour l'entitlement.
- Offrir une version gratuite permanente, des quotas freemium ou des capacités dégradées comme échappatoire après l'essai.
- Modifier les prix, les produits/prix Stripe, la garantie de remboursement de 30 jours, les conditions de vente ou les offres Founder existantes.
- Réaliser un achat réel, modifier les réglages Stripe/Clerk/Firebase en production, ou déployer sans validation opératrice.
- Implémenter la vérification Google Play Integrity comme condition de lancement initial; elle reste une extension renforcée documentée après le socle serveur.

## Constraints

- La durée de référence est le temps serveur UTC. Une période vaut 14 x 24 heures; le total ne dépasse jamais 42 x 24 heures.
- Le compteur est global par identité + produit, non par e-mail client, appareil, session ou réinstallation.
- Une installation est une preuve de continuité anti-abus, pas une identité personnelle; son identifiant est généré aléatoirement, révocable/rotatif et haché avant persistance.
- Les données de risque doivent être minimisées: hash salé/rotatif du signal réseau, fenêtre de rétention courte, accès limité et aucune décision irréversible sur le seul réseau.
- Les grants payés restent déclenchés exclusivement par le pipeline commerce signé et idempotent; le client n'écrit jamais un grant payé.
- Toute transition de statut doit avoir une source (`trial`, `commerce`, `refund`, `revoke`, `fraud`, `operator`) et une clé d'idempotence/audit.
- Le contrat de réponse du bridge doit utiliser des dates ISO 8601 UTC pour le client, alors que le backend conserve une représentation cohérente en millisecondes UTC.
- Les API existantes doivent rester fail-closed pour une capacité protégée: une absence de snapshot frais n'est pas une licence.
- Aucun secret, hash de paiement, IP brute, payload client ni jeton d'attestation ne doit apparaître dans les tests, logs, docs ou télémétrie.

## Test Contract

- `surface`: Convex schema/functions, Astro bridge API, Stripe Managed Payments webhook adapter, Flutter entitlement domain and gate UI.
- `proof_profile`: server-authoritative entitlement + identity bridge + mobile client + commerce lifecycle.
- `proof_order`: schema/resolver tests → bridge contract tests → Flutter unit/widget tests → static checks → Stripe Managed Payments test-mode webhook proof → device/browser manual proof.
- `required_scenario_ids`: `ENT-TRIAL-001` through `ENT-TRIAL-012`.
- `required_results`: every automated scenario passes; provider/device evidence that cannot be run locally is recorded as `exception_with_proof` and prevents a production-ready claim.

| Scenario | Trigger | Required observable result | Evidence |
| --- | --- | --- | --- |
| `ENT-TRIAL-001` | New verified identity and new installation start trial | One active 14-day trial is created; snapshot includes ISO `expiresAt` | Convex integration test |
| `ENT-TRIAL-002` | Repeat start request with same idempotency key | Same trial is returned; no second ledger row or extension | Convex integration test |
| `ENT-TRIAL-003` | Expired first period, eligible reactivation | Second 14-day period is created once and remaining count becomes one | Convex integration test |
| `ENT-TRIAL-004` | Two reactivations already consumed | Further reactivation is denied; no access is granted | Convex integration test |
| `ENT-TRIAL-005` | New e-mail presents recognized installation used by another identity | Trial creation is refused with generic recovery/purchase state | Convex integration test |
| `ENT-TRIAL-006` | Existing identity signs in on another installation | Installation links to same product ledger; expiry and count are unchanged | Convex integration test |
| `ENT-TRIAL-007` | Paid Founder webhook succeeds during/after trial | Paid entitlement grants access independent of trial expiry | webhook + resolver integration test |
| `ENT-TRIAL-008` | Verified refund/revoke/fraud event | Paid access is removed idempotently; exhausted trial does not return | webhook + resolver integration test |
| `ENT-TRIAL-009` | Expired/malformed/offline client snapshot | Flutter gate blocks protected flow and refreshes before CTA | Flutter unit/widget tests |
| `ENT-TRIAL-010` | Active trial snapshot | Flutter displays expiry and correct reactivation/purchase action | Flutter widget test |
| `ENT-TRIAL-011` | Network velocity threshold is exceeded | New trial is temporarily denied without raw IP persistence or permanent ban | backend security test + log review |
| `ENT-TRIAL-012` | Purchase completes in test mode | App refreshes bridge and unlocks only after verified server grant | browser/device and webhook proof |

## Dependencies

- `commandglows_site/convex/schema.ts`, identity synchronization and entitlement functions.
- `commandglows_site/convex/defaultFreeEntitlements.ts` and all callers that create default access.
- `commandglows_site/convex/bridge.ts` plus the Astro Firebase/Clerk-to-Convex bridge endpoint.
- Existing provider-agnostic offer registry and commerce grant/revoke mapping; Stripe owns CommandGlows checkout/webhooks while Lemon Squeezy remains CommunityGlows-only.
- `commandglows_app/lib/features/auth/domain/product_entitlement.dart`, bridge client/parser and authentication gate/purchase surface.
- The payment activation contract v0.3.0 and CommandGlows commercial documents listed in front matter.

## Invariants

- `commandglows_app` has no permanent free entitlement after this change.
- A trial is a time-bounded server grant, never a client-side boolean.
- At most three 14-day periods can be granted for one global identity/product ledger: initial plus two reactivations.
- A paid active grant takes precedence over trial state; a paid revoked/refunded/fraudulent grant never silently falls back to a fresh trial.
- Refund policy and access expiry are distinct concepts and must be separately named in UI, API and documentation.
- The same request/event may be delivered repeatedly without changing the outcome after its first valid application.
- IP-derived information is a temporary anti-abuse signal, not an account identifier, entitlement key or irreversible blocklist.
- All protected server capabilities validate current entitlement state; Flutter presentation cannot bypass them.
- The runtime decision remains compatible with the suite-global identity model and does not make email a primary identity key.

## Links & Consequences

- `defaultFreeEntitlements.ts` → remove `commandglows_app` from the automatic grant set; identity sync no longer unlocks the product indefinitely.
- Convex entitlement snapshot → becomes the canonical expiry contract consumed by Flutter and any future CommandGlows client.
- Flutter auth gate → evolves from status-only parsing to an explicit access state (`paid`, `trial_active`, `trial_expired_eligible`, `trial_exhausted`, `blocked_pending_refresh`).
- Stripe Managed Payments webhook → becomes the sole provider paid-access writer, with refund/revoke states evaluated alongside the trial ledger.
- Product documentation → distinguishes 14-day trial, two additional discretionary reactivations, and 30-day refund policy; public claims must not promise “free forever.”
- Future products → may reuse the generic ledger/resolver only after their business owner explicitly selects `trial_then_paid`; no implicit suite-wide behavior is introduced.

## Documentation Coherence

- Update `shipglows_data/technical/payment-activation-entitlements.md` from target contract to implementation status after verified delivery, including final table/function names and expiry response example.
- Update CommandGlows product/business/GTM documents only with implemented public wording; retain the distinction between trial and 30-day refund.
- Update the suite product registry only if shared primitives or defaults change; do not change another product's policy as a side effect.
- Update public claim register/legal or checkout copy in a separate content-reviewed patch before presenting the trial publicly.
- Record the final provider webhook proof, redacted, in the relevant release/verification artifact.

## Edge Cases

- A user starts a trial moments before clock rollover: server UTC start/end governs; client display is localized only.
- The user uninstalls/reinstalls: a secure app-scoped installation secret may survive only where platform storage permits; otherwise the identity ledger still prevents reset and the server can request reauthentication/risk review.
- The user clears app storage and signs in with a different e-mail: new installation plus a high-velocity network signal may be temporarily challenged, but only a recognized prior installation/identity link blocks an automatic retry.
- A shared family/work device: generic denial must provide purchase/assistance recovery and must not disclose that another account used the device.
- A valid payment is followed by a delayed webhook: no optimistic paid unlock; refresh/polling shows pending state until the verified event is applied.
- A refund occurs while a trial still has unused reactivations: the refund does not reset the trial ledger; any further access follows the normal remaining-trial rule only if it was not already consumed by that identity/product.
- A test/staging event arrives in production: environment is part of every idempotency and installation key; cross-environment grants are rejected.
- An operator needs manual remediation: use an audited operator transition with a reason and expiry, never direct document editing or a free permanent flag.

## Implementation Tasks

- [ ] Task 1 — Audit every current writer and reader of `productEntitlements`, default-free grants and Flutter auth snapshot; document the exact response compatibility plan.
- [ ] Task 2 — Add Convex schema/indexes for trial periods and recognized installations, with minimum-data retention and environment isolation.
- [ ] Task 3 — Implement a single server entitlement resolver that composes paid, trial, expiry and negative commerce states deterministically.
- [ ] Task 4 — Implement authenticated, idempotent `startTrial` and `reactivateTrial` bridge operations, including installation registration and generic anti-abuse responses.
- [ ] Task 5 — Remove `commandglows_app` from automatic default-free grants; preserve any empty-environment legacy records only as non-granting audit data.
- [ ] Task 6 — Extend commerce transition handling and snapshot refresh so verified purchase, refund, revoke and fraud states take effect immediately and idempotently.
- [ ] Task 7 — Update Flutter entitlement model/parser/cache and auth-gate UI for expiry, reactivation availability, pending refresh and official purchase handoff.
- [ ] Task 8 — Add privacy-minimized velocity limiting, retention job/configuration and structured security telemetry; document any platform-integrity extension separately.
- [x] Task 9 — Implement the local automated test matrix and run static/unit checks for site and Flutter. Provider-hosted and real-device scenarios remain under Task 10.
- [ ] Task 10 — Stripe Managed Payments is implemented and locally verified. Configure and perform hosted test-mode purchase/refund/revoke proof, then complete the real-device trial/reinstall/new-email checklist and release evidence.

## Implementation Status (2026-08-11)

The initial local implementation covers the commercial invariant, but not the
complete acceptance contract.

- Implemented: removal of the automatic `commandglows_app` free policy;
  trial metadata in `productEntitlements`; server-generated 14-day periods;
  a maximum of three trial attempts; server-side trial expiry resolution;
  paid-entitlement precedence; installation-hash reuse denial; a temporary
  pseudonymized network velocity window; snapshot parsing through the Astro
  bridge and Flutter; and a customer-facing restart/purchase gate.
- Implemented local proof: a `convex-test` integration matrix covers
  `ENT-TRIAL-001` through `ENT-TRIAL-007` and `ENT-TRIAL-011` across six
  tests; the complete site suite passes with 131 tests and Astro reports no
  errors. This is a deterministic JavaScript mock of Convex, not proof against
  a hosted Convex deployment.
- Implemented locally: Stripe Managed Payments checkout for all four Founder
  plans, signed exact-body webhook verification, paid/refund/dispute
  normalization, provider event idempotency, forwarding to the suite ledger,
  and a short-lived signed Firebase-to-checkout identity handoff.
- Not implemented: scheduled retention cleanup and structured risk telemetry,
  and stronger platform integrity.
- Not yet proven in a hosted environment: Stripe Managed Payments test purchase,
  signed webhook fulfillment, refund/revoke replay, real-device expiry,
  reinstall, or alternate-email behavior.

Consequently, this spec remains `draft` with a partial implementation: it
records an implemented local access slice, not a production-ready anti-abuse
or payment-launch claim.

## Acceptance Criteria

- A fresh CommandGlows account can receive exactly one 14-day trial without receiving a permanent free grant.
- The backend, not Flutter, enforces expiration and the maximum of two additional reactivations.
- An alternate e-mail on a recognized used installation cannot create another fresh trial.
- A paid, verified Founder entitlement unlocks access after a bridge refresh; refund/revoke/fraud removes it without duplicate side effects.
- The app clearly states trial status/expiry and does not imply that the 30-day refund is an access duration or an additional trial.
- No raw IP or hardware-stable identifier is stored for this feature, and IP alone never causes a permanent access ban.
- All scenarios `ENT-TRIAL-001` to `ENT-TRIAL-012` have passing or explicitly evidenced provider/device results before production release.
- No other Glows product changes behavior unless separately approved.

## Test Strategy

- Unit-test the resolver as a pure decision table over UTC dates, paid state, trial count and installation linkage.
- Integration-test Convex mutations with duplicate requests, concurrent attempts, cross-identity installation reuse, new-installation login and environment isolation.
- Contract-test the bridge JSON shape, especially ISO dates and fail-closed handling of omitted/malformed fields.
- Add Flutter unit tests for parsing/access calculation and widget tests for trial active, reactivation, exhausted, purchase pending and paid states.
- Run the repository's documented site and Flutter static/unit suites at the supported Node/Flutter versions; do not treat a missing local dependency directory as a passing test.
- Exercise signed Stripe Managed Payments test-mode lifecycle events end-to-end, retaining only redacted proof.
- Conduct manual Android proof for install, sign-in, expiry simulation through a server-controlled test clock/data fixture, reinstall, alternate e-mail and post-purchase refresh.

## Risks

- Overly aggressive device matching can lock legitimate shared-device users; mitigate with generic messaging, purchase/assistance recovery, expiry-bounded signals and auditability.
- Weak installation continuity can allow trial farming; mitigate with server identity ledger, recognized-installation linkage, idempotency and velocity limits before adding stronger attestation.
- Client-only expiry would be bypassable; mitigate by protecting every server capability and treating Flutter as display only.
- Payment event ordering/refunds can create inconsistent access; mitigate with a deterministic resolver, provider event IDs and idempotent transitions.
- Removing default-free behavior can accidentally affect another product; mitigate with product-scoped tests and an explicit allowlist of policies.
- Privacy and data-protection risk increases with anti-abuse data; mitigate by minimization, hashing, short retention, documented purpose and no raw hardware identifiers.

## Execution Notes

- This specification is implementation-ready only after the normal refinement pass confirms exact Convex function names, indexes, existing bridge response fields and test commands from the current worktree.
- Implement schema additions before removal of the default-free writer. Release the resolver and bridge compatibility first, then update Flutter, then enable the trial gate behind an explicit product-scoped rollout flag.
- Because the operator confirmed zero users, there is no legacy-user migration, notice period or grandfathering task. If any real account or payment is discovered before deployment, stop and create a compatibility amendment rather than applying this contract blindly.
- Keep the initial rollout reversible by disabling new trial creation behind the product-scoped flag; do not roll back ledger history or webhook events.

## Open Questions

None. The commercial decisions required for this scope are settled: no permanent free access, initial 14-day trial, two maximum 14-day reactivations, payment after exhaustion, 30-day refund kept distinct, and no users to preserve.

## Skill Run History

- `shipglows` routed the request to the product-entitlement and specification workflow.
- `601-sg-product-entitlements` supplied the suite identity, access and anti-abuse guardrails.
- `100-sg-spec` supplied the durable implementation-spec contract and verification structure.
- `2026-08-11 — sg-docs`: reconciled business, product, GTM and payment
  contracts with the local implementation. Recorded the remaining gaps rather
  than documenting installation/IP protections or hosted payment behavior as
  delivered.
- `2026-08-11 — sg-development + sg-engineering`: added the local
  installation-hash and network-velocity protections, customer restart and
  purchase gate, expiration-safe Firestore mirror behavior, and focused/full
  local tests. Hosted provider and device proof remain open.
- `2026-08-11 — sg-engineering / product entitlements`: added the local Convex
  integration matrix for trial creation, idempotency, restart exhaustion,
  installation reuse, identity continuity, paid precedence and network
  velocity. Six focused tests and the 118-test site suite pass; hosted Convex,
  Stripe Managed Payments and real-device evidence remain outside this proof.
- `2026-08-11 — shipglows → sg-docs`: recorded Stripe Managed Payments as the
  CommandGlows target Merchant of Record and the default for future eligible
  Glows digital products. Lemon Squeezy remains the CommunityGlows provider,
  not the CommandGlows launch target.
- `2026-08-11 — shipglows → sg-development`: implemented the local Stripe
  Managed Payments adapter, four-plan Price mapping, allowlisted promotion-code
  support, signed paid/refund/dispute webhooks and Convex forwarding. The full
  131-test site suite, Flutter analyze/tests and Astro check pass; no Stripe account, hosted environment
  or production deployment was changed.
- `2026-08-11 — sg-docs`: audited the post-implementation corpus, reconciled
  technical maps and provider contracts, migrated the remaining legacy root
  docs into canonical workflow archives, and marked the old WinGlows/Lemon
  Squeezy launch spec as superseded. Hosted provider and device proof remain
  open and are not presented as delivered.

## Current Chantier Flow

Local entitlement implementation, canonical documentation alignment, the
Convex test matrix and the Stripe Managed Payments adapter are complete. The chantier
remains open for Stripe/Convex hosted proof, retention/telemetry, stronger
platform integrity, real-device proof, and release verification.
