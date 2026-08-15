(() => {
  if (globalThis.__commandglowsDesignSystem) return;

  const generatedTokenCss = typeof globalThis.__commandglowsGeneratedTokenCss === 'string'
    ? globalThis.__commandglowsGeneratedTokenCss.trim()
    : '';
  const generatedPaletteSelector = ":host([data-commandglows-host='palette'])";
  const generatedTokensReady = generatedTokenCss.includes(generatedPaletteSelector);
  const paletteGeneratedTokenCss = generatedTokenCss.replace(
    generatedPaletteSelector,
    '.commandglows-palette',
  );

  const roles = Object.freeze({
    popup: Object.freeze({
      surface: Object.freeze({ canonical: null, fallback: '#111116' }),
      surfaceRaised: Object.freeze({ canonical: null, fallback: '#1c1c24' }),
      text: Object.freeze({ canonical: null, fallback: '#ffffff' }),
      textMuted: Object.freeze({ canonical: null, fallback: '#c2c2ce' }),
      border: Object.freeze({ canonical: null, fallback: '#555563' }),
      brand: Object.freeze({ canonical: '--cg-color-brand-website', fallback: '#ff00c8' }),
      focus: Object.freeze({ canonical: '--cg-color-brand-logo-cyan', fallback: '#00c8ff' }),
      danger: Object.freeze({ canonical: '--cg-color-brand-logo-red', fallback: '#ff5c74' }),
      onBrand: Object.freeze({ canonical: '--cg-color-neutral-black', fallback: '#000000' }),
      font: Object.freeze({
        canonical: '--cg-typography-site-body-family',
        fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }),
    }),
    palette: Object.freeze({
      // These local values preserve the isolated extension baseline for roles
      // not yet canonicalized. Shared roles are overridden below from the
      // generated adapter inside the closed Shadow Root.
      surface: Object.freeze({ canonical: null, fallback: '#111116' }),
      surfaceRaised: Object.freeze({ canonical: null, fallback: '#1c1c24' }),
      text: Object.freeze({ canonical: null, fallback: '#ffffff' }),
      textMuted: Object.freeze({ canonical: null, fallback: '#c2c2ce' }),
      border: Object.freeze({ canonical: null, fallback: '#555563' }),
      brand: Object.freeze({ canonical: 'color.brand.website', fallback: '#ff00c8' }),
      focus: Object.freeze({ canonical: 'color.brand.logo.cyan', fallback: '#00c8ff' }),
      onBrand: Object.freeze({ canonical: 'color.neutral.black', fallback: '#000000' }),
      font: Object.freeze({ canonical: 'typography.site.body.family', fallback: 'system-ui, sans-serif' }),
    }),
  });

  function popupToken(role) {
    const token = roles.popup[role];
    return token.canonical
      ? `var(${token.canonical}, ${token.fallback})`
      : token.fallback;
  }

  const popupCss = `
.commandglows-popup {
  --commandglows-popup-color-surface: ${popupToken('surface')};
  --commandglows-popup-color-surface-raised: ${popupToken('surfaceRaised')};
  --commandglows-popup-color-text: ${popupToken('text')};
  --commandglows-popup-color-text-muted: ${popupToken('textMuted')};
  --commandglows-popup-color-border: ${popupToken('border')};
  --commandglows-popup-color-brand: ${popupToken('brand')};
  --commandglows-popup-color-focus: ${popupToken('focus')};
  --commandglows-popup-color-danger: ${popupToken('danger')};
  --commandglows-popup-color-on-brand: ${popupToken('onBrand')};
  --commandglows-popup-font-body: ${popupToken('font')};
  --commandglows-popup-space-1: 4px;
  --commandglows-popup-space-2: 8px;
  --commandglows-popup-space-3: 12px;
  --commandglows-popup-space-4: 16px;
  --commandglows-popup-space-5: 20px;
  --commandglows-popup-radius-control: 10px;
  --commandglows-popup-radius-panel: 14px;
  --commandglows-popup-target-min: 44px;
  --commandglows-popup-border-width: 1px;
  --commandglows-popup-focus-width: 3px;
  --commandglows-popup-motion-fast: 120ms;
  width: min(380px, 100vw);
  min-width: 320px;
  max-height: 600px;
  margin: 0;
  overflow: auto;
  color: var(--commandglows-popup-color-text);
  background: var(--commandglows-popup-color-surface);
  font-family: var(--commandglows-popup-font-body);
  font-size: 14px;
  line-height: 1.5;
  color-scheme: dark;
}

.commandglows-popup,
.commandglows-popup * {
  box-sizing: border-box;
}

.commandglows-popup__main {
  display: grid;
  gap: var(--commandglows-popup-space-4);
  padding: var(--commandglows-popup-space-4);
}

.commandglows-popup__header,
.commandglows-popup__section,
.commandglows-popup__form,
.commandglows-popup__field {
  display: grid;
  gap: var(--commandglows-popup-space-2);
}

.commandglows-popup__header {
  gap: var(--commandglows-popup-space-1);
}

.commandglows-popup__title,
.commandglows-popup__heading,
.commandglows-popup__copy {
  margin: 0;
}

.commandglows-popup__title {
  font-size: 24px;
  line-height: 1.2;
}

.commandglows-popup__heading {
  font-size: 16px;
  line-height: 1.3;
}

.commandglows-popup__copy,
.commandglows-popup__hint,
.commandglows-popup__status {
  color: var(--commandglows-popup-color-text-muted);
}

.commandglows-popup__section {
  padding: var(--commandglows-popup-space-3);
  border: var(--commandglows-popup-border-width) solid var(--commandglows-popup-color-border);
  border-radius: var(--commandglows-popup-radius-panel);
  background: var(--commandglows-popup-color-surface-raised);
}

.commandglows-popup__field {
  font-weight: 650;
}

.commandglows-popup__input,
.commandglows-popup__select,
.commandglows-popup__button,
.commandglows-popup__file {
  min-height: var(--commandglows-popup-target-min);
  border: var(--commandglows-popup-border-width) solid var(--commandglows-popup-color-border);
  border-radius: var(--commandglows-popup-radius-control);
  color: var(--commandglows-popup-color-text);
  background: var(--commandglows-popup-color-surface);
  font: inherit;
}

.commandglows-popup__input,
.commandglows-popup__select,
.commandglows-popup__file {
  width: 100%;
  padding: var(--commandglows-popup-space-2) var(--commandglows-popup-space-3);
}

.commandglows-popup__input--multiline {
  min-height: 88px;
  resize: vertical;
}

.commandglows-popup__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--commandglows-popup-space-2) var(--commandglows-popup-space-3);
  cursor: pointer;
  font-weight: 750;
  transition: border-color var(--commandglows-popup-motion-fast) ease,
    background-color var(--commandglows-popup-motion-fast) ease;
}

.commandglows-popup__button--primary {
  border-color: var(--commandglows-popup-color-brand);
  color: var(--commandglows-popup-color-on-brand);
  background: var(--commandglows-popup-color-brand);
}

.commandglows-popup__button:hover:not(:disabled) {
  border-color: var(--commandglows-popup-color-focus);
}

.commandglows-popup__button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.commandglows-popup__button:focus-visible,
.commandglows-popup__input:focus-visible,
.commandglows-popup__select:focus-visible,
.commandglows-popup__file:focus-visible {
  outline: var(--commandglows-popup-focus-width) solid var(--commandglows-popup-color-focus);
  outline-offset: 2px;
}

.commandglows-popup__list {
  display: grid;
  gap: var(--commandglows-popup-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.commandglows-popup__list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--commandglows-popup-space-2);
  overflow-wrap: anywhere;
}

.commandglows-popup__list-item--empty {
  color: var(--commandglows-popup-color-text-muted);
}

.commandglows-popup__status {
  min-height: 21px;
  margin: 0;
}

.commandglows-popup__status[data-state='error'] {
  color: var(--commandglows-popup-color-danger);
}

@media (prefers-reduced-motion: reduce) {
  .commandglows-popup__button {
    transition: none;
  }
}
`;

  const paletteCss = `
.commandglows-palette {
  --commandglows-palette-color-surface: ${roles.palette.surface.fallback};
  --commandglows-palette-color-surface-raised: ${roles.palette.surfaceRaised.fallback};
  --commandglows-palette-color-text: ${roles.palette.text.fallback};
  --commandglows-palette-color-text-muted: ${roles.palette.textMuted.fallback};
  --commandglows-palette-color-border: ${roles.palette.border.fallback};
  --commandglows-palette-color-brand: ${roles.palette.brand.fallback};
  --commandglows-palette-color-focus: ${roles.palette.focus.fallback};
  --commandglows-palette-color-on-brand: ${roles.palette.onBrand.fallback};
  --commandglows-palette-font-body: ${roles.palette.font.fallback};
  --commandglows-palette-space-1: 4px;
  --commandglows-palette-space-2: 8px;
  --commandglows-palette-space-3: 12px;
  --commandglows-palette-space-4: 16px;
  --commandglows-palette-radius-control: 10px;
  --commandglows-palette-radius-dialog: 16px;
  --commandglows-palette-target-min: 44px;
  --commandglows-palette-border-width: 1px;
  --commandglows-palette-focus-width: 3px;
  --commandglows-palette-motion-fast: 120ms;
}

.commandglows-palette,
.commandglows-palette * {
  box-sizing: border-box;
}

.commandglows-palette {
  width: min(680px, calc(100vw - 32px));
  max-height: min(720px, calc(100vh - 32px));
  margin: auto;
  padding: 0;
  overflow: hidden;
  border: var(--commandglows-palette-border-width) solid var(--commandglows-palette-color-border);
  border-radius: var(--commandglows-palette-radius-dialog);
  color: var(--commandglows-palette-color-text);
  background: var(--commandglows-palette-color-surface);
  font-family: var(--commandglows-palette-font-body);
  font-size: 16px;
  line-height: 1.5;
  color-scheme: dark;
  pointer-events: auto;
}

.commandglows-palette::backdrop {
  background: rgb(0 0 0 / 72%);
}

.commandglows-palette__content {
  display: grid;
  gap: var(--commandglows-palette-space-4);
  max-height: inherit;
  padding: var(--commandglows-palette-space-4);
  overflow: auto;
}

.commandglows-palette__header {
  display: grid;
  gap: var(--commandglows-palette-space-1);
}

.commandglows-palette__title,
.commandglows-palette__description,
.commandglows-palette__status {
  margin: 0;
}

.commandglows-palette__title {
  font-size: 22px;
  line-height: 1.25;
}

.commandglows-palette__description,
.commandglows-palette__status {
  color: var(--commandglows-palette-color-text-muted);
}

.commandglows-palette__field {
  display: grid;
  gap: var(--commandglows-palette-space-2);
  font-weight: 700;
}

.commandglows-palette__input,
.commandglows-palette__select,
.commandglows-palette__button {
  min-height: var(--commandglows-palette-target-min);
  border: var(--commandglows-palette-border-width) solid var(--commandglows-palette-color-border);
  border-radius: var(--commandglows-palette-radius-control);
  color: var(--commandglows-palette-color-text);
  background: var(--commandglows-palette-color-surface-raised);
  font: inherit;
}

.commandglows-palette__input,
.commandglows-palette__select {
  width: 100%;
  padding: var(--commandglows-palette-space-2) var(--commandglows-palette-space-3);
}

.commandglows-palette__input {
  min-height: 144px;
  resize: vertical;
}

.commandglows-palette__actions,
.commandglows-palette__footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--commandglows-palette-space-2);
}

.commandglows-palette__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--commandglows-palette-space-2) var(--commandglows-palette-space-3);
  cursor: pointer;
  font-weight: 750;
  transition: border-color var(--commandglows-palette-motion-fast) ease,
    background-color var(--commandglows-palette-motion-fast) ease;
}

.commandglows-palette__button--primary {
  margin-inline-start: auto;
  border-color: var(--commandglows-palette-color-brand);
  color: var(--commandglows-palette-color-on-brand);
  background: var(--commandglows-palette-color-brand);
}

.commandglows-palette__button:hover:not(:disabled) {
  border-color: var(--commandglows-palette-color-focus);
}

.commandglows-palette__button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.commandglows-palette__button:focus-visible,
.commandglows-palette__input:focus-visible,
.commandglows-palette__select:focus-visible {
  outline: var(--commandglows-palette-focus-width) solid var(--commandglows-palette-color-focus);
  outline-offset: 2px;
}

@media (max-width: 520px) {
  .commandglows-palette {
    width: calc(100vw - 16px);
    max-height: calc(100vh - 16px);
  }

  .commandglows-palette__button--primary {
    margin-inline-start: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .commandglows-palette__button {
    transition: none;
  }
}
`;

  const paletteGeneratedAliasesCss = `
:host([data-commandglows-host='palette']) {
  --commandglows-palette-color-brand: var(--cg-color-brand-website);
  --commandglows-palette-color-focus: var(--cg-color-brand-logo-cyan);
  --commandglows-palette-color-on-brand: var(--cg-color-neutral-black);
  --commandglows-palette-font-body: var(--cg-typography-site-body-family);
  --commandglows-palette-space-1: var(--cg-semantic-space-unit);
  --commandglows-palette-space-2: calc(var(--cg-semantic-space-unit) * 2);
  --commandglows-palette-space-3: calc(var(--cg-semantic-space-unit) * 3);
  --commandglows-palette-space-4: calc(var(--cg-semantic-space-unit) * 4);
}
`;

  function createStyleSheet(surface) {
    const css = surface === 'popup'
      ? popupCss
      : surface === 'palette' && generatedTokensReady
        ? `${paletteGeneratedTokenCss}\n${paletteCss}\n${paletteGeneratedAliasesCss}`
        : null;
    if (!css) throw new TypeError(`Unknown CommandGlows style surface: ${surface}`);
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    return sheet;
  }

  globalThis.__commandglowsDesignSystem = Object.freeze({
    version: '1.0.0-source-mapping',
    generatedTokensReady,
    roles,
    css: Object.freeze({ popup: popupCss, palette: paletteCss }),
    createStyleSheet,
  });
})();
