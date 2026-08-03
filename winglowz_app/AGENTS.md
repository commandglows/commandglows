# AGENTS.md — WinGlowz

## Local Command Guardrails

- Allowed local checks: `flutter analyze`, `flutter test`, and targeted `flutter test ...`.
- Do not run Android builds, installs, packaging, or Gradle tasks on this VM.
- Forbidden locally: `flutter build apk`, `flutter build appbundle`, `flutter run -d android`, `./gradlew ...`, `assemble*`, `bundle*`, `compile*`, and `testDebugUnitTest`.
- Android APK/IME validation must go through GitHub Actions/Blacksmith and Diane's physical-device QA.
- Vercel is the validation/deployment surface for the Flutter web app.
- Treat pure Flutter UI surfaces as shared between web and Android: cover them with targeted widget tests first, then use the Vercel Flutter web app for quick smoke validation before asking Diane to install an APK.
- Reserve Diane's physical-device APK QA for Android-native behavior or final confirmation after automated/web checks: IME, overlay service, native permissions, media/session access, brightness, notification access, keyboard clipboard capture, and device lifecycle.
- Sentry can provide runtime crash/error evidence from installed app sessions, but it does not replace Blacksmith CI for Android build validation.

## Git Commit Guardrails

- Do not create commits unless Diane explicitly asks for a commit, or unless an invoked ShipGlows chip/skill explicitly requires committing as part of its workflow.
- By default, leave changes unstaged or staged only when directly useful for review; Diane handles commits herself.
- For small visual tweaks, quick copy changes, icons, spacing, or exploratory fixes, edit the files and report the diff/checks without committing.

See `CLAUDE.md` for the broader project baseline.
