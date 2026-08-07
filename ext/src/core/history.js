export function addHistoryItem(items, candidate, now = Date.now(), limit = 50) {
  const text = String(candidate?.text ?? '').trim();
  if (!text) return items;
  const item = {
    id: String(candidate.id || `history-${now.toString(36)}`),
    text,
    source: String(candidate.source || 'extension'),
    createdAt: now,
  };
  return [item, ...items.filter((existing) => existing.text !== text)].slice(0, limit);
}
