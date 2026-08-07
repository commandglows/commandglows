import test from 'node:test';
import assert from 'node:assert/strict';

import { createSyncEnvelope, SyncMode, syncStatus } from '../src/core/sync-contract.js';

test('reports local-only without pretending account sync exists', () => {
  const status = syncStatus();
  assert.equal(status.mode, SyncMode.localOnly);
  assert.match(status.message, /not connected/i);
});

test('creates a versioned account-sync envelope without extra fields', () => {
  const envelope = createSyncEnvelope({
    userId: 'user-1',
    deviceId: 'chrome-1',
    now: 100,
    snippets: [{ id: 's1', trigger: '/hi', content: 'Hi', updatedAt: 90, secret: 'omit' }],
  });
  assert.deepEqual(envelope.snippets[0], {
    id: 's1',
    trigger: '/hi',
    content: 'Hi',
    updatedAt: 90,
  });
});
