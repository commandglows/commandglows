import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../src/content-script.js', import.meta.url), 'utf8');
const mappingSource = await readFile(new URL('../src/design-system-mapping.js', import.meta.url), 'utf8');
const popupHtml = await readFile(new URL('../src/popup.html', import.meta.url), 'utf8');
const popupSource = await readFile(new URL('../src/popup.js', import.meta.url), 'utf8');
const hostileFixture = await readFile(new URL('./hostile-isolation-fixture.html', import.meta.url), 'utf8');

function loadMapping() {
  const context = vm.createContext({});
  vm.runInContext(mappingSource, context, { filename: 'design-system-mapping.js' });
  return context.__commandglowsDesignSystem;
}

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16) / 255);
  const linear = channels.map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test('popup and palette styles use local namespaces and local-only assets', () => {
  const mapping = loadMapping();
  assert.equal(mapping.version, '1.0.0-source-mapping');

  for (const [surface, css] of Object.entries(mapping.css)) {
    const declarations = [...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map((match) => match[1]);
    assert.ok(declarations.length > 0);
    assert.ok(declarations.every((name) => name.startsWith(`--commandglows-${surface}-`)));
    assert.doesNotMatch(css, /(?:https?:|@import|url\s*\()/i);
  }

  assert.doesNotMatch(mapping.css.palette, /var\(\s*--cg-/i);
  assert.match(mapping.css.popup, /var\(--cg-color-brand-website, #ff00c8\)/);
});

test('fallback colors meet text, control, and visible-focus contrast thresholds', () => {
  const { popup, palette } = loadMapping().roles;
  for (const roles of [popup, palette]) {
    assert.ok(contrast(roles.text.fallback, roles.surface.fallback) >= 4.5);
    assert.ok(contrast(roles.textMuted.fallback, roles.surface.fallback) >= 4.5);
    assert.ok(contrast(roles.onBrand.fallback, roles.brand.fallback) >= 4.5);
    assert.ok(contrast(roles.focus.fallback, roles.surface.fallback) >= 3);
  }
});

test('interactive styling preserves target size, focus visibility, and reduced motion', () => {
  const mapping = loadMapping();
  for (const css of Object.values(mapping.css)) {
    assert.match(css, /target-min:\s*44px/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  }
});

test('injected palette is closed, host-hardened, modal, and never falls back to light DOM', () => {
  assert.match(source, /attachShadow\(\{ mode: 'closed' \}\)/);
  assert.match(source, /shadow\.append\(dialog\)/);
  assert.doesNotMatch(source, /document\.(?:body|documentElement)\.append\(dialog\)/);
  assert.match(source, /host\.dataset\.commandglowsHost = 'palette'/);
  assert.match(source, /host\.style\.setProperty\(property, value, 'important'\)/);
  for (const property of ['position', 'inset', 'display', 'visibility', 'opacity', 'pointer-events', 'z-index']) {
    assert.match(source, new RegExp(`['"]?${property}['"]?\\s*:`));
  }
  assert.match(source, /dialog\.showModal\(\)/);
  assert.match(source, /dialog\.addEventListener\('cancel'/);
  assert.match(source, /dialog\.addEventListener\('close', cleanup/);
  assert.match(source, /host\.remove\(\)/);
});

test('palette retains native focus behavior and restores the originating editable state', () => {
  assert.match(source, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /event\.key !== 'Tab'/);
  assert.match(source, /event\.shiftKey && current === first/);
  assert.match(source, /!event\.shiftKey && current === last/);
  assert.match(source, /dialog\.close\('escape'\)/);
  assert.match(source, /restoreEditableFocus\(active, editableState, !inserted\)/);
  assert.match(source, /setSelectionRange\(state\.start, state\.end\)/);
  assert.match(source, /textInputTypes = new Set\(\['', 'email', 'search', 'tel', 'text', 'url'\]\)/);
});

test('popup has explicit labels, live status, local style code, and namespaced selectors', () => {
  assert.match(popupHtml, /<body class="commandglows-popup">/);
  assert.match(popupHtml, /aria-live="polite" aria-atomic="true"/);
  assert.match(popupHtml, /<label[^>]+for="trigger"/);
  assert.match(popupHtml, /<label[^>]+for="restore-backup"/);
  assert.match(popupHtml, /<script src="design-system-mapping\.js"><\/script>/);
  assert.doesNotMatch(popupHtml, /(?:src|href)="https?:/i);
  assert.match(popupSource, /createStyleSheet\('popup'\)/);
});

test('hostile fixture covers global elements, canonical-looking variables, and host suppression', () => {
  assert.match(hostileFixture, /\*\s*,/);
  assert.match(hostileFixture, /--cg-color-brand-website/);
  assert.match(hostileFixture, /--commandglows-palette-color-surface/);
  assert.match(hostileFixture, /\[data-commandglows-host\]/);
  assert.match(hostileFixture, /display:\s*none\s*!important/);
});
