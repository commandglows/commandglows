import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canAcquireOwnership,
  createOwnershipLease,
  createRequestId,
  executionOwner,
  preferredShortcutOwner,
} from '../src/core/arbitration.js';

test('creates stable request IDs from supplied entropy', () => {
  assert.match(createRequestId(1000, 0.5), /^cmdglows-rs-[a-z0-9]+$/);
});

test('Windows is the single shortcut registrar when both surfaces exist', () => {
  assert.equal(
    preferredShortcutOwner({ extensionInstalled: true, windowsInstalled: true }),
    'windows',
  );
  assert.equal(
    preferredShortcutOwner({ extensionInstalled: true, windowsInstalled: false }),
    'extension',
  );
});

test('browser ownership transfers to a ready extension', () => {
  assert.equal(
    executionOwner({
      shortcutOwner: 'windows',
      chromeFocused: true,
      extensionReady: true,
      tabSupported: true,
    }),
    'extension',
  );
  assert.equal(
    executionOwner({
      shortcutOwner: 'windows',
      chromeFocused: true,
      extensionReady: false,
      tabSupported: true,
    }),
    'windows',
  );
});

test('active ownership prevents duplicate execution until expiry', () => {
  const lease = createOwnershipLease({
    requestId: 'one',
    owner: 'extension',
    now: 100,
    leaseMs: 50,
  });
  assert.equal(canAcquireOwnership(lease, 'two', 149), false);
  assert.equal(canAcquireOwnership(lease, 'two', 150), true);
  assert.equal(canAcquireOwnership(lease, 'one', 200), false);
});
