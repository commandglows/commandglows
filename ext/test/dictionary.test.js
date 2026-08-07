import test from 'node:test';
import assert from 'node:assert/strict';

import { applyDictionary, upsertDictionaryEntry } from '../src/core/dictionary.js';

test('upserts dictionary entries by source term', () => {
  const first = upsertDictionaryEntry([], { source: 'cmd glow', replacement: 'CMDglows' }, 100);
  const updated = upsertDictionaryEntry(first, { source: 'CMD GLOW', replacement: 'CMDglows™' }, 200);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].replacement, 'CMDglows™');
});

test('applies whole-term dictionary replacements', () => {
  assert.equal(
    applyDictionary('Use cmd glow today', [{ source: 'cmd glow', replacement: 'CMDglows' }]),
    'Use CMDglows today',
  );
});
