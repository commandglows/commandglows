import test from 'node:test';
import assert from 'node:assert/strict';

import { applyTransform, cleanWhitespace, sentenceCase } from '../src/core/transforms.js';

test('cleans repeated spacing while preserving paragraphs', () => {
  assert.equal(cleanWhitespace('  Hello   world\n\n\nNext  '), 'Hello world\n\nNext');
});

test('applies locale-aware sentence casing', () => {
  assert.equal(sentenceCase('écrire plus vite', 'fr'), 'Écrire plus vite');
});

test('rejects unsupported transforms', () => {
  assert.throws(() => applyTransform('unknown', 'text'), /TRANSFORM_UNSUPPORTED/);
});
