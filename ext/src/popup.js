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

openButton.addEventListener('click', async () => {
  openButton.disabled = true;
  const result = await chrome.runtime.sendMessage({ type: 'OPEN_COMMANDGLOWS' });
  if (result?.ok) {
    globalThis.close();
    return;
  }
  status.textContent = messageForCode(result?.code);
  openButton.disabled = false;
});

snippetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_SNIPPET',
    snippet: { trigger: triggerInput.value, content: contentInput.value },
  });
  if (!result?.ok) {
    status.textContent = result?.code === 'SNIPPET_TRIGGER_EXISTS'
      ? 'That snippet trigger already exists.'
      : 'The snippet could not be saved.';
    return;
  }
  snippetForm.reset();
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
    status.textContent = 'The dictionary entry could not be saved.';
    return;
  }
  dictionaryForm.reset();
  renderDictionary(result.dictionary);
});

actionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = await chrome.runtime.sendMessage({
    type: 'SAVE_CUSTOM_ACTION',
    action: { label: actionLabel.value, kind: actionKind.value, value: actionValue.value },
  });
  if (!result?.ok) {
    status.textContent = 'The custom action could not be saved.';
    return;
  }
  actionForm.reset();
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
    await loadState();
  } catch (_error) {
    status.textContent = 'This backup is invalid or unsupported.';
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
  for (const action of actions) {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${action.label} (${action.kind})`;
    const remove = document.createElement('button');
    remove.type = 'button';
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
  for (const entry of entries) {
    const item = document.createElement('li');
    item.textContent = `${entry.source} → ${entry.replacement}`;
    dictionaryList.append(item);
  }
}

function renderHistory(items) {
  historyList.replaceChildren();
  for (const item of items.slice(0, 10)) {
    const row = document.createElement('li');
    row.textContent = item.text;
    historyList.append(row);
  }
}

function renderSnippets(snippets) {
  snippetList.replaceChildren();
  for (const snippet of snippets) {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${snippet.trigger}: ${snippet.content}`;
    const remove = document.createElement('button');
    remove.type = 'button';
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
