import test from 'node:test';
import assert from 'node:assert/strict';

import { addHistoryItem } from '../src/core/history.js';

test('records non-empty history newest first without duplicate text', () => {
  const first = addHistoryItem([], { text: 'Hello' }, 100);
  const second = addHistoryItem(first, { text: 'World' }, 200);
  const repeated = addHistoryItem(second, { text: 'Hello' }, 300);
  assert.deepEqual(repeated.map((item) => item.text), ['Hello', 'World']);
  assert.equal(repeated[0].createdAt, 300);
});

test('ignores empty history items', () => {
  assert.deepEqual(addHistoryItem([], { text: '   ' }, 100), []);
});
