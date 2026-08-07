const SENSITIVE_AUTOCOMPLETE = new Set([
  'cc-csc',
  'cc-number',
  'current-password',
  'new-password',
  'one-time-code',
]);

export function fieldPolicy(input) {
  if (!input) return { allowed: false, reason: 'NO_ACTIVE_FIELD' };

  const type = String(input.type || '').toLowerCase();
  const autocomplete = String(input.autocomplete || '').toLowerCase();
  const privateHint = input.privateHint === true;

  if (type === 'password' || SENSITIVE_AUTOCOMPLETE.has(autocomplete) || privateHint) {
    return { allowed: false, reason: 'SENSITIVE_FIELD' };
  }
  if (!input.editable) {
    return { allowed: false, reason: 'FIELD_NOT_EDITABLE' };
  }
  return { allowed: true, reason: null };
}
