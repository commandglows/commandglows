# CMDglows Chrome extension

This directory contains the standalone Manifest V3 extension surface.

## Current slice

- `Ctrl+Alt+Space` opens CMDglows in the active editable field when Chrome owns
  the preferred shortcut.
- The toolbar popup and context menu open the same flow.
- Each trigger receives one request ID and a short ownership lease to prevent
  duplicate execution inside the extension.
- Password, OTP and payment-card fields fail closed.
- The extension uses `activeTab`; it requests no permanent host access.
- The popup manages local snippets; the active-field palette inserts them.
- The palette provides deterministic spacing cleanup and sentence casing.
- A local personal dictionary can normalize preferred words before insertion.
- The extension keeps a bounded local history of successful insertions.
- Browser-compatible custom actions can insert reusable text or run supported
  deterministic transforms; desktop-only action kinds are rejected.
- Local snippets, dictionary, custom actions and bounded history can be exported
  and restored through a validated, versioned JSON backup.
- Browser dictation is recoverable: unsupported or failed recognition keeps
  all text already present in the palette.
- The first extension phase is intentionally local-only. Account sync has a
  versioned adapter boundary for a later tranche, but Chrome-local storage is
  never presented as Android/Windows sync.

The Windows app currently registers `Ctrl+Alt+Space` globally. Dual-install
coexistence therefore requires the planned native handoff before it can be
claimed as complete: Windows remains the single registrar and transfers a
browser-context request to the extension. Do not enable two independent
shortcut handlers and call that coexistence.

## Local checks

```bash
pnpm -C ext test
pnpm -C ext check
```

## Load unpacked

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select this `ext/` directory.
4. Open a normal HTTPS page with a text field.
5. Focus the field and press `Ctrl+Alt+Space`, or use the toolbar popup.

Chrome internal pages, the Chrome Web Store and other protected surfaces do
not permit content-script injection. The extension reports those pages as
unsupported rather than requesting broader permissions.
