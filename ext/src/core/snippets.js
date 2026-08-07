export function normalizeSnippet(input, now = Date.now()) {
  const trigger = String(input?.trigger ?? '').trim();
  const content = String(input?.content ?? '').trim();
  if (!trigger || !content) {
    throw new TypeError('Snippet trigger and content are required');
  }
  return {
    id: String(input.id || `snippet-${now.toString(36)}-${slug(trigger)}`),
    trigger,
    content,
    updatedAt: now,
  };
}

export function upsertSnippet(snippets, candidate, now = Date.now()) {
  const normalized = normalizeSnippet(candidate, now);
  const duplicate = snippets.find(
    (snippet) =>
      snippet.id !== normalized.id &&
      snippet.trigger.toLocaleLowerCase() === normalized.trigger.toLocaleLowerCase(),
  );
  if (duplicate) throw new Error('SNIPPET_TRIGGER_EXISTS');

  const next = snippets.filter((snippet) => snippet.id !== normalized.id);
  next.push(normalized);
  return next.sort((a, b) => a.trigger.localeCompare(b.trigger));
}

export function removeSnippet(snippets, id) {
  return snippets.filter((snippet) => snippet.id !== id);
}

function slug(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}
