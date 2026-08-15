const openButton = document.querySelector('#open');
const status = document.querySelector('#status');
const snippetForm = document.querySelector('#snippet-form');
const triggerInput = document.querySelector('#trigger');
const contentInput = document.querySelector('#content');
const snippetList = document.querySelector('#snippets');
const syncStatus = document.querySelector('#sync-status');
const dictionaryForm = document.querySelector('#dictionary-form');
const dictionarySource = document.querySelector('#dictionary-source');
const dictionaryReplacement = document.querySelector('#dictionary-replacement');
const dictionaryList = document.querySelector('#dictionary');
const historyList = document.querySelector('#history');
const actionForm = document.querySelector('#action-form');
const actionLabel = document.querySelector('#action-label');
const actionKind = document.querySelector('#action-kind');
const actionValue = document.querySelector('#action-value');
const actionList = document.querySelector('#actions');
const exportBackup = document.querySelector('#export-backup');
const restoreBackup = document.querySelector('#restore-backup');

document.adoptedStyleSheets = [
  ...document.adoptedStyleSheets,
  globalThis.__commandglowsDesignSystem.createStyleSheet('popup'),
];

openButton.addEventListener('click', async () => {
  openButton.disabled = true;
  openButton.setAttribute('aria-busy', 'true');
  status.dataset.state = '';
  status.textContent = 'Opening CMDglows…';
  const result = await chrome.runtime.sendMessage({ type: 'OPEN_COMMANDGLOWS' });
  if (result?.ok) {
    globalThis.close();
    return;
  }
  status.textContent = messageForCode(result?.code);
  status.dataset.state = 'error';
  openButton.disabled = false;
  openButton.removeAttribute('aria-busy');
});

snippetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_SNIPPET',
    snippet: { trigger: triggerInput.value, content: contentInput.value },
  });
  if (!result?.ok) {
    status.dataset.state = 'error';
    status.textContent = result?.code === 'SNIPPET_TRIGGER_EXISTS'
      ? 'That snippet trigger already exists.'
      : 'The snippet could not be saved.';
    return;
  }
  snippetForm.reset();
  status.dataset.state = '';
  status.textContent = 'Snippet saved.';
  renderSnippets(result.snippets);
});

dictionaryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_DICTIONARY_ENTRY',
    entry: {
      source: dictionarySource.value,
      replacement: dictionaryReplacement.value,
    },
  });
  if (!result?.ok) {
    status.dataset.state = 'error';
    status.textContent = 'The dictionary entry could not be saved.';
    return;
  }
  dictionaryForm.reset();
  status.dataset.state = '';
  status.textContent = 'Dictionary entry saved.';
  renderDictionary(result.dictionary);
});

actionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_CUSTOM_ACTION',
    action: { label: actionLabel.value, kind: actionKind.value, value: actionValue.value },
  });
  if (!result?.ok) {
    status.dataset.state = 'error';
    status.textContent = 'The custom action could not be saved.';
    return;
  }
  actionForm.reset();
  status.dataset.state = '';
  status.textContent = 'Custom action saved.';
  renderCustomActions(result.customActions);
});

exportBackup.addEventListener('click', async () => {
  const result = await chrome.runtime.sendMessage({ type: 'EXPORT_LOCAL_BACKUP' });
  if (!result?.ok) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(result.backup, null, 2)], {
    type: 'application/json',
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'commandglows-extension-backup.json';
  link.click();
  URL.revokeObjectURL(url);
});

restoreBackup.addEventListener('change', async () => {
  const file = restoreBackup.files?.[0];
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    const result = await chrome.runtime.sendMessage({ type: 'RESTORE_LOCAL_BACKUP', backup });
    if (!result?.ok) throw new Error(result?.code);
    status.textContent = 'Local backup restored.';
    status.dataset.state = '';
    await loadState();
  } catch (_error) {
    status.textContent = 'This backup is invalid or unsupported.';
    status.dataset.state = 'error';
  } finally {
    restoreBackup.value = '';
  }
});

async function loadState() {
  const [snippetResult, syncResult, localData] = await Promise.all([
    chrome.runtime.sendMessage({ type: 'LIST_SNIPPETS' }),
    chrome.runtime.sendMessage({ type: 'GET_SYNC_STATUS' }),
    chrome.runtime.sendMessage({ type: 'LIST_LOCAL_DATA' }),
  ]);
  renderSnippets(snippetResult?.snippets ?? []);
  syncStatus.textContent = syncResult?.status?.message ?? 'Sync status unavailable.';
  renderDictionary(localData?.dictionary ?? []);
  renderHistory(localData?.history ?? []);
  renderCustomActions(localData?.customActions ?? []);
}

function renderCustomActions(actions) {
  actionList.replaceChildren();
  if (!actions.length) {
    actionList.append(emptyListItem('No custom actions saved.'));
    return;
  }
  for (const action of actions) {
    const item = document.createElement('li');
    item.className = 'commandglows-popup__list-item';
    const label = document.createElement('span');
    label.textContent = `${action.label} (${action.kind})`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'commandglows-popup__button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      const result = await chrome.runtime.sendMessage({
        type: 'DELETE_CUSTOM_ACTION',
        id: action.id,
      });
      if (result?.ok) renderCustomActions(result.customActions);
    });
    item.append(label, remove);
    actionList.append(item);
  }
}

function renderDictionary(entries) {
  dictionaryList.replaceChildren();
  if (!entries.length) {
    dictionaryList.append(emptyListItem('No dictionary entries saved.'));
    return;
  }
  for (const entry of entries) {
    const item = document.createElement('li');
    item.className = 'commandglows-popup__list-item';
    item.textContent = `${entry.source} → ${entry.replacement}`;
    dictionaryList.append(item);
  }
}

function renderHistory(items) {
  historyList.replaceChildren();
  if (!items.length) {
    historyList.append(emptyListItem('No recent insertions.'));
    return;
  }
  for (const item of items.slice(0, 10)) {
    const row = document.createElement('li');
    row.className = 'commandglows-popup__list-item';
    row.textContent = item.text;
    historyList.append(row);
  }
}

function renderSnippets(snippets) {
  snippetList.replaceChildren();
  if (!snippets.length) {
    snippetList.append(emptyListItem('No snippets saved.'));
    return;
  }
  for (const snippet of snippets) {
    const item = document.createElement('li');
    item.className = 'commandglows-popup__list-item';
    const label = document.createElement('span');
    label.textContent = `${snippet.trigger}: ${snippet.content}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'commandglows-popup__button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', async () => {
      const result = await chrome.runtime.sendMessage({
        type: 'DELETE_SNIPPET',
        id: snippet.id,
      });
      if (result?.ok) renderSnippets(result.snippets);
    });
    item.append(label, remove);
    snippetList.append(item);
  }
}

function emptyListItem(message) {
  const item = document.createElement('li');
  item.className = 'commandglows-popup__list-item commandglows-popup__list-item--empty';
  item.textContent = message;
  return item;
}

function messageForCode(code) {
  switch (code) {
    case 'TAB_UNSUPPORTED':
    case 'INJECTION_UNAVAILABLE':
      return 'This page does not allow extension insertion.';
    case 'REQUEST_ALREADY_OWNED':
      return 'CMDglows is already handling a request.';
    default:
      return 'CMDglows could not open here.';
  }
}

loadState();
