import {
  canAcquireOwnership,
  createOwnershipLease,
  createRequestId,
} from './core/arbitration.js';
import { removeSnippet, upsertSnippet } from './core/snippets.js';
import { syncStatus } from './core/sync-contract.js';
import { upsertDictionaryEntry } from './core/dictionary.js';
import { addHistoryItem } from './core/history.js';
import { removeCustomAction, upsertCustomAction } from './core/custom-actions.js';
import { createLocalBackup, validateLocalBackup } from './core/backup.js';

const LEASE_KEY = 'activeOwnershipLease';
const SNIPPETS_KEY = 'snippets';
const DICTIONARY_KEY = 'dictionary';
const HISTORY_KEY = 'history';
const CUSTOM_ACTIONS_KEY = 'customActions';
const GENERATED_TOKEN_CSS_URL = chrome.runtime.getURL('src/generated/commandglows-tokens.css');

let generatedTokenCssPromise;

function loadGeneratedTokenCss() {
  generatedTokenCssPromise ??= fetch(GENERATED_TOKEN_CSS_URL).then((response) => {
    if (!response.ok) throw new Error('GENERATED_TOKEN_CSS_UNAVAILABLE');
    return response.text();
  });
  return generatedTokenCssPromise;
}

function installGeneratedTokenCss(css) {
  globalThis.__commandglowsGeneratedTokenCss = css;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'open-commandglows',
    title: 'Open CMDglows',
    contexts: ['editable', 'selection'],
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-commandglows') await openInActiveTab('shortcut');
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'open-commandglows') {
    await openInActiveTab('context-menu');
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'OPEN_COMMANDGLOWS') {
    openInActiveTab('popup').then(sendResponse);
    return true;
  }
  if (message?.type === 'LIST_SNIPPETS') {
    listSnippets().then((snippets) => sendResponse({ ok: true, snippets }));
    return true;
  }
  if (message?.type === 'SAVE_SNIPPET') {
    saveSnippet(message.snippet).then(sendResponse);
    return true;
  }
  if (message?.type === 'DELETE_SNIPPET') {
    deleteSnippet(message.id).then(sendResponse);
    return true;
  }
  if (message?.type === 'GET_SYNC_STATUS') {
    sendResponse({ ok: true, status: syncStatus() });
    return false;
  }
  if (message?.type === 'LIST_LOCAL_DATA') {
    listLocalData().then((data) => sendResponse({ ok: true, ...data }));
    return true;
  }
  if (message?.type === 'SAVE_DICTIONARY_ENTRY') {
    saveDictionaryEntry(message.entry).then(sendResponse);
    return true;
  }
  if (message?.type === 'RECORD_HISTORY') {
    recordHistory(message.item).then(sendResponse);
    return true;
  }
  if (message?.type === 'SAVE_CUSTOM_ACTION') {
    saveCustomAction(message.action).then(sendResponse);
    return true;
  }
  if (message?.type === 'DELETE_CUSTOM_ACTION') {
    deleteCustomAction(message.id).then(sendResponse);
    return true;
  }
  if (message?.type === 'EXPORT_LOCAL_BACKUP') {
    exportLocalBackup().then(sendResponse);
    return true;
  }
  if (message?.type === 'RESTORE_LOCAL_BACKUP') {
    restoreLocalBackup(message.backup).then(sendResponse);
    return true;
  }
  return false;
});

async function openInActiveTab(trigger) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isSupportedUrl(tab.url)) {
    return { ok: false, code: 'TAB_UNSUPPORTED' };
  }

  const requestId = createRequestId();
  const current = await chrome.storage.session.get(LEASE_KEY);
  if (!canAcquireOwnership(current[LEASE_KEY], requestId)) {
    return { ok: false, code: 'REQUEST_ALREADY_OWNED' };
  }

  await chrome.storage.session.set({
    [LEASE_KEY]: createOwnershipLease({ requestId, owner: 'extension' }),
  });

  try {
    const generatedTokenCss = await loadGeneratedTokenCss();
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: installGeneratedTokenCss,
      args: [generatedTokenCss],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/design-system-mapping.js', 'src/content-script.js'],
    });
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: 'OPEN_COMMANDGLOWS_PALETTE',
      requestId,
      trigger,
      snippets: await listSnippets(),
      dictionary: (await listLocalData()).dictionary,
      customActions: (await listLocalData()).customActions,
    });
    return result ?? { ok: false, code: 'NO_CONTENT_RESPONSE' };
  } catch (_error) {
    return { ok: false, code: 'INJECTION_UNAVAILABLE' };
  } finally {
    const latest = await chrome.storage.session.get(LEASE_KEY);
    if (latest[LEASE_KEY]?.requestId === requestId) {
      await chrome.storage.session.remove(LEASE_KEY);
    }
  }
}

async function listLocalData() {
  const stored = await chrome.storage.local.get([
    DICTIONARY_KEY,
    HISTORY_KEY,
    CUSTOM_ACTIONS_KEY,
  ]);
  return {
    dictionary: Array.isArray(stored[DICTIONARY_KEY]) ? stored[DICTIONARY_KEY] : [],
    history: Array.isArray(stored[HISTORY_KEY]) ? stored[HISTORY_KEY] : [],
    customActions: Array.isArray(stored[CUSTOM_ACTIONS_KEY])
      ? stored[CUSTOM_ACTIONS_KEY]
      : [],
  };
}

async function saveCustomAction(candidate) {
  try {
    const data = await listLocalData();
    const customActions = upsertCustomAction(data.customActions, candidate);
    await chrome.storage.local.set({ [CUSTOM_ACTIONS_KEY]: customActions });
    return { ok: true, customActions };
  } catch (error) {
    return { ok: false, code: error.message || 'CUSTOM_ACTION_SAVE_FAILED' };
  }
}

async function deleteCustomAction(id) {
  const data = await listLocalData();
  const customActions = removeCustomAction(data.customActions, id);
  await chrome.storage.local.set({ [CUSTOM_ACTIONS_KEY]: customActions });
  return { ok: true, customActions };
}

async function exportLocalBackup() {
  const data = await listLocalData();
  return {
    ok: true,
    backup: createLocalBackup({ ...data, snippets: await listSnippets() }),
  };
}

async function restoreLocalBackup(candidate) {
  try {
    const data = validateLocalBackup(candidate);
    await chrome.storage.local.set({
      [SNIPPETS_KEY]: data.snippets,
      [DICTIONARY_KEY]: data.dictionary,
      [CUSTOM_ACTIONS_KEY]: data.customActions,
      [HISTORY_KEY]: data.history,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, code: error.message || 'BACKUP_RESTORE_FAILED' };
  }
}

async function saveDictionaryEntry(candidate) {
  try {
    const data = await listLocalData();
    const dictionary = upsertDictionaryEntry(data.dictionary, candidate);
    await chrome.storage.local.set({ [DICTIONARY_KEY]: dictionary });
    return { ok: true, dictionary };
  } catch (error) {
    return { ok: false, code: error.message || 'DICTIONARY_SAVE_FAILED' };
  }
}

async function recordHistory(candidate) {
  const data = await listLocalData();
  const history = addHistoryItem(data.history, candidate);
  await chrome.storage.local.set({ [HISTORY_KEY]: history });
  return { ok: true, history };
}

async function listSnippets() {
  const stored = await chrome.storage.local.get(SNIPPETS_KEY);
  return Array.isArray(stored[SNIPPETS_KEY]) ? stored[SNIPPETS_KEY] : [];
}

async function saveSnippet(candidate) {
  try {
    const snippets = upsertSnippet(await listSnippets(), candidate);
    await chrome.storage.local.set({ [SNIPPETS_KEY]: snippets });
    return { ok: true, snippets };
  } catch (error) {
    return { ok: false, code: error.message || 'SNIPPET_SAVE_FAILED' };
  }
}

async function deleteSnippet(id) {
  const snippets = removeSnippet(await listSnippets(), id);
  await chrome.storage.local.set({ [SNIPPETS_KEY]: snippets });
  return { ok: true, snippets };
}

function isSupportedUrl(url = '') {
  return url.startsWith('http://') || url.startsWith('https://');
}
