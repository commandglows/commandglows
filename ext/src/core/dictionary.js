export function normalizeDictionaryEntry(input, now = Date.now()) {
  const source = String(input?.source ?? '').trim();
  const replacement = String(input?.replacement ?? '').trim();
  if (!source || !replacement) throw new TypeError('Dictionary source and replacement are required');
  return {
    id: String(input.id || `dictionary-${now.toString(36)}`),
    source,
    replacement,
    updatedAt: now,
  };
}

export function upsertDictionaryEntry(entries, candidate, now = Date.now()) {
  const normalized = normalizeDictionaryEntry(candidate, now);
  const next = entries.filter(
    (entry) => entry.id !== normalized.id && entry.source.toLocaleLowerCase() !== normalized.source.toLocaleLowerCase(),
  );
  next.push(normalized);
  return next.sort((a, b) => a.source.localeCompare(b.source));
}

export function applyDictionary(value, entries) {
  return entries.reduce((result, entry) => {
    const escaped = entry.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return result.replace(new RegExp(`\\b${escaped}\\b`, 'giu'), entry.replacement);
  }, String(value));
}
