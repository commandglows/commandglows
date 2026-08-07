import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeSnippet, removeSnippet, upsertSnippet } from '../src/core/snippets.js';

test('normalizes and stores snippets deterministically', () => {
  const snippet = normalizeSnippet({ trigger: ' /hello ', content: ' Bonjour ! ' }, 100);
  assert.equal(snippet.trigger, '/hello');
  assert.equal(snippet.content, 'Bonjour !');
  assert.match(snippet.id, /^snippet-2s-/);
});

test('rejects duplicate triggers case-insensitively', () => {
  const current = [normalizeSnippet({ trigger: '/hello', content: 'One' }, 100)];
  assert.throws(
    () => upsertSnippet(current, { trigger: '/HELLO', content: 'Two' }, 200),
    /SNIPPET_TRIGGER_EXISTS/,
  );
});

test('removes only the selected snippet', () => {
  assert.deepEqual(removeSnippet([{ id: 'a' }, { id: 'b' }], 'a'), [{ id: 'b' }]);
});
