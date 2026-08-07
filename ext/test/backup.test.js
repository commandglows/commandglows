import test from 'node:test';
import assert from 'node:assert/strict';

import { createLocalBackup, validateLocalBackup } from '../src/core/backup.js';

test('round-trips versioned local extension data', () => {
  const backup = createLocalBackup({
    snippets: [{ id: 's1', trigger: '/hi', content: 'Hi', updatedAt: 90 }],
    dictionary: [{ id: 'd1', source: 'cmd', replacement: 'CMDglows', updatedAt: 90 }],
    customActions: [{ id: 'a1', label: 'Greeting', kind: 'insert_text', value: 'Hi', updatedAt: 90 }],
    history: [{ id: 'h1', text: 'Hi', source: 'active-field', createdAt: 90 }],
  }, 100);
  assert.deepEqual(validateLocalBackup(backup), {
    snippets: [{ id: 's1', trigger: '/hi', content: 'Hi', updatedAt: 90 }],
    dictionary: [{ id: 'd1', source: 'cmd', replacement: 'CMDglows', updatedAt: 90 }],
    customActions: [{ id: 'a1', label: 'Greeting', kind: 'insert_text', value: 'Hi', updatedAt: 90 }],
    history: [{ id: 'h1', text: 'Hi', source: 'active-field', createdAt: 90 }],
  });
});

test('rejects unsupported actions inside an otherwise valid backup', () => {
  assert.throws(
    () => validateLocalBackup({
      schemaVersion: 1,
      product: 'commandglows_extension',
      snippets: [],
      dictionary: [],
      customActions: [{ label: 'Media', kind: 'media', value: 'play' }],
      history: [],
    }),
    /supported kind/,
  );
});

test('rejects unknown backup products and schema versions', () => {
  assert.throws(() => validateLocalBackup({ schemaVersion: 2 }), /SCHEMA/);
  assert.throws(
    () => validateLocalBackup({ schemaVersion: 1, product: 'other' }),
    /PRODUCT/,
  );
});
