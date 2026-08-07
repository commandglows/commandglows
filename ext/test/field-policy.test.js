import test from 'node:test';
import assert from 'node:assert/strict';

import { fieldPolicy } from '../src/core/field-policy.js';

test('allows ordinary editable fields', () => {
  assert.deepEqual(fieldPolicy({ editable: true, type: 'text' }), {
    allowed: true,
    reason: null,
  });
});

test('blocks passwords and one-time codes', () => {
  assert.equal(
    fieldPolicy({ editable: true, type: 'password' }).reason,
    'SENSITIVE_FIELD',
  );
  assert.equal(
    fieldPolicy({ editable: true, autocomplete: 'one-time-code' }).reason,
    'SENSITIVE_FIELD',
  );
});

test('blocks non-editable targets', () => {
  assert.deepEqual(fieldPolicy({ editable: false }), {
    allowed: false,
    reason: 'FIELD_NOT_EDITABLE',
  });
});
