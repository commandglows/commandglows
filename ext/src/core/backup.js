export const BACKUP_SCHEMA_VERSION = 1;

export function createLocalBackup(data, now = Date.now()) {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    product: 'commandglows_extension',
    exportedAt: now,
    snippets: array(data.snippets),
    dictionary: array(data.dictionary),
    customActions: array(data.customActions),
    history: array(data.history),
  };
}

export function validateLocalBackup(value) {
  if (!value || value.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error('BACKUP_SCHEMA_UNSUPPORTED');
  }
  if (value.product !== 'commandglows_extension') {
    throw new Error('BACKUP_PRODUCT_INVALID');
  }
  for (const key of ['snippets', 'dictionary', 'customActions', 'history']) {
    if (!Array.isArray(value[key])) throw new Error('BACKUP_DATA_INVALID');
  }
  const snippets = value.snippets.map((item) =>
    normalizeSnippet(item, validTimestamp(item.updatedAt)),
  );
  const dictionary = value.dictionary.map((item) =>
    normalizeDictionaryEntry(item, validTimestamp(item.updatedAt)),
  );
  const customActions = value.customActions.map((item) =>
    normalizeCustomAction(item, validTimestamp(item.updatedAt)),
  );
  const history = value.history
    .slice(0, 50)
    .reverse()
    .reduce(
      (items, item) =>
        addHistoryItem(
          items,
          { id: item.id, text: item.text, source: item.source },
          validTimestamp(item.createdAt),
        ),
      [],
    );
  return {
    snippets,
    dictionary,
    customActions,
    history,
  };
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function validTimestamp(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : Date.now();
}
import { normalizeCustomAction } from './custom-actions.js';
import { normalizeDictionaryEntry } from './dictionary.js';
import { addHistoryItem } from './history.js';
import { normalizeSnippet } from './snippets.js';
