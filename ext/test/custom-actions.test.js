import test from 'node:test';
import assert from 'node:assert/strict';

import { applyCustomAction, normalizeCustomAction } from '../src/core/custom-actions.js';

test('runs browser-compatible insert and transform actions', () => {
  const insert = normalizeCustomAction({ label: 'Greeting', kind: 'insert_text', value: 'Hello' }, 100);
  const transform = normalizeCustomAction({ label: 'Clean', kind: 'transform', value: 'clean-whitespace' }, 200);
  assert.equal(applyCustomAction(insert, 'ignored'), 'Hello');
  assert.equal(applyCustomAction(transform, 'Hello   world'), 'Hello world');
});

test('rejects desktop-only or unknown action kinds', () => {
  assert.throws(
    () => normalizeCustomAction({ label: 'Media', kind: 'media', value: 'play' }, 100),
    /supported kind/,
  );
});
