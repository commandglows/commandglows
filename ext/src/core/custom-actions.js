import { applyTransform } from './transforms.js';

const ACTION_KINDS = new Set(['insert_text', 'transform']);
const TRANSFORM_IDS = new Set(['clean-whitespace', 'sentence-case']);

export function normalizeCustomAction(input, now = Date.now()) {
  const label = String(input?.label ?? '').trim();
  const kind = String(input?.kind ?? '').trim();
  const value = String(input?.value ?? '').trim();
  if (!label || !ACTION_KINDS.has(kind) || !value) {
    throw new TypeError('Custom action label, supported kind and value are required');
  }
  if (kind === 'transform' && !TRANSFORM_IDS.has(value)) {
    throw new Error('CUSTOM_ACTION_TRANSFORM_UNSUPPORTED');
  }
  return {
    id: String(input.id || `action-${now.toString(36)}`),
    label,
    kind,
    value,
    updatedAt: now,
  };
}

export function upsertCustomAction(actions, candidate, now = Date.now()) {
  const normalized = normalizeCustomAction(candidate, now);
  const next = actions.filter((action) => action.id !== normalized.id);
  next.push(normalized);
  return next.sort((a, b) => a.label.localeCompare(b.label));
}

export function removeCustomAction(actions, id) {
  return actions.filter((action) => action.id !== id);
}

export function applyCustomAction(action, currentValue, locale = 'en') {
  if (action.kind === 'insert_text') return action.value;
  if (action.kind === 'transform') return applyTransform(action.value, currentValue, locale);
  throw new Error('CUSTOM_ACTION_KIND_UNSUPPORTED');
}
