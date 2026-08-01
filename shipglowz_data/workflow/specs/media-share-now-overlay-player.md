---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "WinGlows"
created: "2026-05-16"
created_at: "2026-05-16 17:24:54 UTC"
updated: "2026-05-16"
updated_at: "2026-05-16 17:24:54 UTC"
status: reviewed
source_skill: sf-spec
source_model: "GPT-5 Codex"
scope: "feature"
owner: "Diane"
confidence: medium
user_story: "En tant qu’utilisatrice du clavier WinGlows, je veux partager une vidéo depuis YouTube ou une autre app vers WinGlows, puis la retrouver dans la barre Media avec vignette et overlay lecteur, afin de regarder une vidéo compacte pendant que je travaille."
risk_level: "high"
security_impact: "yes"
docs_impact: "yes"
linked_systems:
  - "Android share target"
  - "Android overlay foreground service"
  - "Android IME keyboard media panel"
  - "Android MediaSession"
  - "YouTube IFrame Player API"
  - "Flutter settings/onboarding diagnostics"
  - "Local keyboard/shared media persistence"
depends_on:
  - artifact: "CLAUDE.md"
    artifact_version: "1.2.0"
    required_status: "reviewed"
  - artifact: "shipglowz_data/workflow/specs/android-ime-winglowz_app-keyboard.md"
    artifact_version: "unknown"
    required_status: "unknown"
  - artifact: "shipglowz_data/workflow/specs/android-overlay-flutter-parity-repair.md"
    artifact_version: "unknown"
    required_status: "unknown"
supersedes: []
evidence:
  - "User request 2026-05-16: share YouTube videos into WinGlows, show them in Media/Now, and open a small overlay player instead of embedding WebView in the IME."
  - "Android docs: PiP is owned by the app Activity that enters PiP; PiP controls are provided by that app/media session."
  - "YouTube Help: YouTube PiP depends on YouTube settings, account/content eligibility, and leaving YouTube while video is playing."
  - "YouTube IFrame API docs: embeds can be controlled via JavaScript but require a real web/player surface and minimum viewport constraints."
next_step: "/sf-spec media share now overlay player"
---

# Title

Media Share Now Overlay Player

# Status

Draft. Spec is ready for product review, then `/sf-ready media share now overlay player` before implementation.

# User Story

En tant qu’utilisatrice du clavier WinGlows, je veux partager une vidéo depuis YouTube ou une autre app vers WinGlows, puis la retrouver dans la barre Media avec vignette et overlay lecteur, afin de regarder une vidéo compacte pendant que je travaille.

# Minimal Behavior Contract

WinGlows accepts shared media links through Android `ACTION_SEND`, stores the latest supported shared media item locally, displays it in the keyboard Media `Now` surface with title/thumbnail/link metadata, and opens a separate WinGlows overlay player when the user taps the media preview. If an embeddable player cannot load, the overlay falls back to thumbnail + title + `Open` action. If a native PiP launch path is available for the source app, `Open` should prefer the path most likely to preserve/trigger PiP; otherwise it opens the source URL/app normally. The IME must never host a WebView/video player directly.

# Success Behavior

- Sharing a YouTube video URL to WinGlows adds or updates a single “shared media” item.
- Sharing a generic video URL from another app, including IceDrive when it exposes a shareable URL, adds the link as a generic shared media item.
- The Media panel `Now` row can show either active media session metadata or the latest shared media item.
- For YouTube shared media, `Now` shows a title when available and a thumbnail generated from the video ID.
- Tapping the thumbnail/preview opens a WinGlows overlay player, not an IME-embedded player.
- The overlay player is positioned near the keyboard/overlay working area, remains movable/resizable enough to avoid covering critical input, and has an obvious close/minimize path.
- If the YouTube embed loads, playback happens inside the overlay WebView/player container.
- If the embed fails, is too small, blocks autoplay, blocks playback, or violates constraints, the overlay displays thumbnail + title + `Open` fallback.
- Media controls already in the keyboard remain available: play/pause, next, previous, volume, brightness, stop, loop/shuffle where supported.

# Error Behavior

- Unsupported share payload: show app feedback `Unsupported media link` and do not overwrite the last valid media item.
- Empty or malformed URL: show `No media link found` and do not update stored media.
- Overlay permission missing: route to existing overlay onboarding/settings flow before attempting player overlay.
- YouTube embed blocked: show fallback card with `Open` and log diagnostic event without crashing the IME or overlay service.
- Source app does not support PiP or shared URL cannot reopen the source app: `Open` launches a browser/source app chooser or the source app URL normally.
- Network unavailable: show thumbnail if cached/derivable; otherwise show title/URL fallback and `Open`.
- Sensitive field active in IME: do not leak current typed text into media diagnostics; shared media metadata remains independent from text input.

# Problem

WinGlows already has a powerful Media panel, but watching long-running videos while working requires leaving the current app or relying on YouTube PiP behavior controlled by YouTube. The user wants a keyboard-adjacent workflow: share a video into WinGlows, keep the title visible in Media/Now, and optionally open a compact player overlay near the keyboard. Directly embedding a player inside the IME is high-risk for stability, focus, privacy, and rendering. A separate overlay player reuses the app’s existing overlay architecture while keeping the IME lightweight.

# Solution

Implement a share-target and shared-media pipeline. Android share intents store a normalized `SharedMediaItem`. The keyboard Media `Now` card renders active session metadata plus the latest shared-media thumbnail. Tapping the thumbnail starts a new overlay mode dedicated to media preview/player. The overlay attempts an embedded YouTube IFrame/WebView player only for supported YouTube URLs and falls back to a thumbnail + `Open` action. Generic links, including IceDrive shares, use thumbnail/title if available and always provide `Open`.

# Scope In

- Android `ACTION_SEND` and `ACTION_SEND_MULTIPLE` intake for text URLs from YouTube and generic apps.
- YouTube URL parser for `youtube.com/watch`, `youtu.be`, `youtube.com/shorts`, and common share URL variants.
- Generic media URL capture for apps like IceDrive when they share an HTTP(S) link.
- Local persistence for latest shared media item and small recent list if simple to support.
- Keyboard Media panel updates for shared media title/thumbnail preview.
- Overlay service extension or sibling overlay mode for media player/card.
- YouTube embed experiment inside overlay only, behind a feature flag.
- Fallback `Open` action that prefers source/PiP-friendly launch behavior when feasible.
- Diagnostics for share intake, overlay open, player load, fallback, and user close.
- Android manual QA plan.

# Scope Out

- No WebView/video player inside `WinGlowzInputMethodService` or IME view.
- No attempt to capture, resize, or control YouTube’s own PiP window.
- No bypass of YouTube Premium/content restrictions, DRM, ads, branding, or player controls.
- No guaranteed playback for YouTube Shorts if YouTube/IFrame/source app blocks it.
- No background audio/video feature outside user-visible overlay/player surfaces.
- No cloud sync of shared media history in the first implementation.
- No downloading/caching video streams.
- No scraping private app content from IceDrive or any source app; only consume user-shared URLs/text.

# Constraints

- Android PiP belongs to the activity that enters PiP; WinGlows cannot resize or embed another app’s PiP window.
- Existing project mode is hybrid; web can be checked on Vercel, but Android overlay/IME must be validated manually on a real phone.
- Overlay requires `SYSTEM_ALERT_WINDOW` and existing overlay permission flow.
- YouTube IFrame API is a web embed API and must respect viewport/player requirements and YouTube terms.
- The IME must remain responsive; all network/WebView/player work must live outside the IME service.
- Any overlay player must have a clear close path and must not block the user from dismissing the keyboard.
- Shared URLs are user-provided untrusted input; store only sanitized metadata and never execute arbitrary JS from shared links except the controlled YouTube embed page.

# Dependencies

- Local code:
  - `android/app/src/main/AndroidManifest.xml` for share target and service/activity declarations.
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt` for intent handling and MethodChannel bridges.
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayForegroundService.kt` for overlay lifecycle and window positioning.
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardMediaController.kt` for active media metadata and controls.
  - `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt` and `WinGlowzKeyboardView.kt` for Media/Now UI.
  - `KeyboardStateStore.kt` or a new shared-media store for local persistence.
  - Flutter settings/onboarding/diagnostics for overlay/player feature flag and debugging.
- External docs, fresh-docs checked:
  - Android PiP official docs: https://developer.android.com/develop/ui/views/picture-in-picture
  - Android MediaSession official docs: https://developer.android.com/media/media3/session/control-playback
  - YouTube IFrame Player API docs: https://developers.google.com/youtube/iframe_api_reference
  - YouTube PiP Help: https://support.google.com/youtube/answer/7552722?hl=en-GB

# Invariants

- IME never instantiates WebView or video player.
- Overlay player failure cannot crash or freeze the keyboard.
- Shared-media item persists across keyboard restarts until replaced or cleared.
- Media controls continue to work for active media sessions independent of shared-media card state.
- User can always close the overlay player from the overlay and from the keyboard Media panel.
- Diagnostics redact secrets and do not include typed field contents.

# Links & Consequences

- Product: turns Media panel into a lightweight “watch while working” workflow.
- Privacy/security: introducing URL intake and WebView overlay increases attack surface; must sanitize URLs, restrict embeds, and avoid arbitrary content execution.
- UX: avoids putting heavy playback inside the IME while preserving a keyboard-adjacent experience.
- Permissions: overlay permission becomes a prerequisite for player overlay; media notification access is still only needed for active media session metadata, not for shared link display.
- Performance: WebView/player must be lazy-created and destroyed on close to avoid battery/memory drain.
- Compatibility: YouTube Shorts, music content, private videos, age-restricted videos, DRM, or embedded playback restrictions may fall back to `Open`.

# Documentation Coherence

- Update Android feature docs or README section for Media controls once implemented.
- Update settings/onboarding copy if a new `Media overlay player` experimental toggle is added.
- Update QA checklist to include YouTube long video, YouTube Shorts fallback, and generic shared URL/IceDrive share.
- Add changelog entry when shipped.

# Edge Cases

- YouTube URL includes playlist, timestamp, tracking params, shorts path, mobile host, or share redirect.
- Shared payload contains multiple URLs; choose first supported media URL and report if others ignored.
- IceDrive shares a private URL that requires auth; card stores link but overlay cannot embed it.
- Overlay permission is revoked while media overlay is open.
- Keyboard is hidden while media overlay remains visible; overlay should remain user-controlled or auto-collapse based on explicit product choice in implementation.
- Active MediaSession title differs from shared media title; UI must make it clear whether it is showing live `Now` or shared media.
- YouTube embed viewport is below minimum useful size; show thumbnail fallback instead of a broken tiny player.
- YouTube autoplay is blocked; show play overlay/fallback status, not a blank player.
- Device rotation or keyboard height changes while overlay is open.

# Implementation Tasks

- [ ] Task 1: Add shared media domain model and parser.
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/media/SharedMediaItem.kt`
  - Action : Create data model with source app/package, original URL, normalized URL, media type, provider, video ID when YouTube, title, thumbnail URL, received timestamp, and open intent hints.
  - User story link : Captures the video shared by the user.
  - Depends on : None.
  - Validate with : Kotlin unit tests for YouTube and generic URL parsing if Android unit infra allows; otherwise pure parser test in JVM module.
  - Notes : YouTube thumbnail URL can be derived as `https://img.youtube.com/vi/<id>/hqdefault.jpg` for standard IDs; keep fallback for unavailable thumbnails.

- [ ] Task 2: Register Android share target.
  - Fichier : `android/app/src/main/AndroidManifest.xml`
  - Action : Add `ACTION_SEND` and optional `ACTION_SEND_MULTIPLE` intent filters for `text/plain` and `text/uri-list` to `MainActivity` or a dedicated transparent receiver Activity.
  - User story link : Makes WinGlows appear in Android share sheet.
  - Depends on : Task 1.
  - Validate with : Share from YouTube and browser to WinGlows on Android APK.
  - Notes : If `MainActivity` handles share, preserve existing `openRoute` behavior.

- [ ] Task 3: Handle share intents and persist shared media.
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/MainActivity.kt`
  - Action : Parse `Intent.EXTRA_TEXT`, `Intent.EXTRA_STREAM`, and clip data where applicable; create `SharedMediaItem`; save to local store; emit diagnostics; route user to a lightweight confirmation screen or Settings/Media route if app is opened.
  - User story link : Stores the user-shared video for the keyboard.
  - Depends on : Task 1 and Task 2.
  - Validate with : Share URL updates keyboard status map and survives app restart.
  - Notes : Do not fetch untrusted remote content in the share receiver path; keep it fast.

- [ ] Task 4: Add shared media persistence/store.
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardStateStore.kt` or new `SharedMediaStore.kt`
  - Action : Store latest item and optionally recent 5 items in SharedPreferences JSON with size limit and schema version.
  - User story link : Media card remains available after sharing.
  - Depends on : Task 1.
  - Validate with : Save/load malformed JSON fallback and item replacement tests.
  - Notes : Keep storage local-only for first release.

- [ ] Task 5: Surface shared media in keyboard Media/Now.
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/KeyboardLayoutModels.kt`
  - Action : Extend media panel request/snapshot to include shared media title/thumbnail indicator and render a Now row/card with title left and preview affordance right.
  - User story link : User sees shared video in the keyboard media area.
  - Depends on : Task 4.
  - Validate with : Manual APK: after share, Media panel shows shared video even if no active media session exists.
  - Notes : Existing active `Now` label remains; define precedence clearly: active playing session first, shared media fallback, or dual label if space allows.

- [ ] Task 6: Add thumbnail/open action callbacks in IME.
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/ime/WinGlowzKeyboardView.kt` and `WinGlowzInputMethodService.kt`
  - Action : Add action for `OpenSharedMediaOverlay` and optionally `OpenSharedMediaSource`; tap preview starts overlay player command.
  - User story link : Tapping the preview opens overlay player.
  - Depends on : Task 5.
  - Validate with : Tapping preview starts overlay or routes to overlay permission onboarding if missing.
  - Notes : Do not start WebView/player inside IME.

- [ ] Task 7: Extend overlay service with media overlay mode.
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/OverlayForegroundService.kt`
  - Action : Add actions such as `ACTION_SHOW_MEDIA_PLAYER`, `ACTION_HIDE_MEDIA_PLAYER`, extras for shared media item, and overlay UI state separate from voice recording state.
  - User story link : Provides the actual keyboard-adjacent player/card surface.
  - Depends on : Task 6.
  - Validate with : Overlay can show media card without starting voice recording and can close cleanly.
  - Notes : Avoid conflating recording overlay with media overlay state; reuse positioning/drag infrastructure where safe.

- [ ] Task 8: Implement overlay fallback card.
  - Fichier : New native view or Flutter overlay-compatible view under `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/overlay/MediaOverlayView.kt`
  - Action : Render title, provider, thumbnail image if available, `Open`, `Close`, and small status text.
  - User story link : User always has a useful media surface even if embed fails.
  - Depends on : Task 7.
  - Validate with : Generic IceDrive/browser URL shows fallback card and opens source URL.
  - Notes : Loading remote thumbnails should be bounded, cancellable, and cached minimally or skipped if too heavy.

- [ ] Task 9: Implement experimental YouTube overlay player.
  - Fichier : `android/app/src/main/kotlin/com/winglowz_app/winglowz_app/overlay/MediaOverlayPlayerView.kt`
  - Action : Create WebView-backed YouTube IFrame embed for supported YouTube video IDs behind feature flag `experimentalMediaOverlayPlayer`.
  - User story link : Allows compact video playback near keyboard where YouTube permits embedding.
  - Depends on : Task 8.
  - Validate with : Long YouTube video embed loads or gracefully falls back; Shorts fallback behavior is accepted if embed blocks.
  - Notes : Respect YouTube IFrame minimum viewport constraints; do not hide required branding/controls if YouTube requires them. Disable arbitrary navigation outside controlled YouTube embed origins.

- [ ] Task 10: Add Open/PiP-friendly fallback.
  - Fichier : `OverlayForegroundService.kt` or `SharedMediaOpenController.kt`
  - Action : Implement `Open` to use source app package or URL intent; for YouTube, prefer YouTube deep link when installed. Document that WinGlows cannot force YouTube PiP, but opening YouTube with PiP settings enabled can let the user trigger PiP by leaving YouTube.
  - User story link : Provides a useful fallback distinct from the existing active media app button.
  - Depends on : Task 8.
  - Validate with : Open from YouTube shared card opens YouTube video; generic URL opens chooser/browser/source app.
  - Notes : Do not simulate Home button or accessibility gestures to force PiP.

- [ ] Task 11: Add settings toggle and diagnostics.
  - Fichier : `lib/features/settings/presentation/settings_screen.dart`, `lib/features/keyboard/domain/keyboard_models.dart`, `android/.../KeyboardStateStore.kt`
  - Action : Add experimental toggle, status fields for shared media presence, overlay player enabled, last player error, and last share source.
  - User story link : User/operator can debug and disable the feature.
  - Depends on : Tasks 4, 7, 9.
  - Validate with : Diagnostics include shared media fields and no sensitive typed content.
  - Notes : Default the experimental player to off if implementation risk is high; fallback card can remain on.

- [ ] Task 12: Add manual QA and bug tracking.
  - Fichier : `shipglowz_data/workflow/TEST_LOG.md` and `bugs/` as needed during implementation.
  - Action : Create QA checklist for YouTube long video, YouTube Shorts fallback, generic browser URL, IceDrive URL if available, overlay permission missing, overlay close, keyboard hidden, and rotation.
  - User story link : Confirms the feature works on real Android device.
  - Depends on : All implementation tasks.
  - Validate with : Manual Android APK QA by Diane.
  - Notes : Web/Vercel cannot validate Android overlay/IME behavior.

# Acceptance Criteria

- [ ] WinGlows appears in Android share sheet for text links from YouTube.
- [ ] Sharing a YouTube long-form video stores a shared media item with provider `youtube`, video ID, normalized URL, and thumbnail URL.
- [ ] Sharing a YouTube Shorts URL stores the item and either embeds if supported or falls back without error.
- [ ] Sharing a generic HTTP(S) video/link, including IceDrive when it provides a URL, stores a generic item and displays fallback card.
- [ ] Media panel displays shared media in `Now` when no active session metadata is preferred, and never breaks existing active YouTube title display.
- [ ] Tapping shared media preview starts overlay media mode, not an IME WebView.
- [ ] Overlay missing permission routes to existing overlay permission flow.
- [ ] Overlay fallback card can open source URL/app and close cleanly.
- [ ] Experimental YouTube embed either loads or falls back with a visible status; no blank permanent overlay.
- [ ] Keyboard remains responsive while overlay player/card is open.
- [ ] Diagnostics include last shared media provider/source and last overlay player status.
- [ ] No shared media URL parsing path executes arbitrary JS or loads arbitrary untrusted HTML in WebView.

# Test Strategy

- Local static checks:
  - `flutter analyze`
  - `git diff --check`
  - `cd android && ./gradlew :app:compileDebugKotlin -x :app:processDebugResources`
- Parser tests:
  - YouTube watch URL.
  - `youtu.be` URL.
  - Shorts URL.
  - URL with timestamp/playlist/query params.
  - Generic HTTP URL.
  - Malformed text.
- Manual Android QA:
  - Share YouTube long video to WinGlows; open keyboard Media; see card.
  - Tap card; overlay opens.
  - If experimental player enabled, verify embed or fallback.
  - Tap `Open`; YouTube video opens.
  - Share YouTube Shorts; verify safe fallback.
  - Share IceDrive video/link; verify generic card and `Open`.
  - Revoke overlay permission; tap card; verify onboarding/settings redirection.
  - Rotate device and hide/show keyboard while overlay open.
  - Verify Media controls still work for active playback.

# Risks

- High: WebView/video inside overlay can increase memory, battery use, and crash surface.
- High: YouTube embed terms/constraints may reject tiny, hidden, or control-less players; implementation must not hide required controls/branding.
- Medium: YouTube Shorts or music content may not support PiP/embed behavior; fallback required.
- Medium: Generic apps like IceDrive may share private/authenticated URLs that cannot be embedded; fallback `Open` is the expected behavior.
- Medium: Overlay and IME interaction can cause focus/touch conflicts if overlay overlaps input fields.
- Low: Thumbnail derivation may fail for unavailable/private videos; fallback text card is acceptable.

# Execution Notes

- Fresh-docs verdict: `fresh-docs checked`.
- Android PiP docs confirm PiP is an app Activity feature and the system shows controls from that app/media session; WinGlows should not try to control another app’s PiP window.
- Android PiP docs note small PiP UI has limited interaction and recommends minimal UI, supporting the overlay/fallback-card approach rather than dense controls in the video surface.
- YouTube IFrame docs allow embedding/control via JavaScript but define web/player requirements, including viewport constraints. Treat overlay embed as experimental.
- YouTube Help confirms PiP behavior depends on YouTube settings/account/content categories and is triggered by leaving YouTube while video is playing; WinGlows can provide `Open`, not force PiP.
- Avoid “force PiP” hacks such as simulating Home or accessibility gestures.
- Prefer a dedicated media overlay mode over adding media concerns to the voice recording state machine.

# Open Questions

- None blocking for spec review. Product choice before implementation: whether the experimental YouTube overlay player starts disabled by default or enabled for internal builds only. Recommended: disabled by default, fallback card enabled.

# Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-05-16 17:24:54 | sf-spec | GPT-5 Codex | Created spec for shared video intake, Media Now card, and overlay player fallback architecture. | draft | /sf-ready media share now overlay player |
| 2026-05-16 18:12:53 | sf-ready | GPT-5 Codex | Reviewed readiness gate for shared media intake, Media Now card, YouTube overlay player, fallback behavior, docs freshness, and security scope. | not ready | /sf-spec media share now overlay player |

# Current Chantier Flow

| Step | Status | Notes |
|------|--------|-------|
| sf-spec | done | Draft spec created and grounded in Android/YouTube docs plus current WinGlows overlay/IME code. |
| sf-ready | not ready | Blocks: Media Now precedence is not fully specified, experimental player default is left as a product choice before implementation, and several high-risk WebView/share-intent security controls need more concrete implementation constraints. |
| sf-start | pending | Implement after readiness. |
| sf-verify | pending | Verify against acceptance criteria. |
| sf-end | pending | Close implementation task and docs. |
| sf-ship | pending | Ship after checks and Android manual QA plan. |
