(() => {
  if (globalThis.__commandglowsContentScriptInstalled) return;
  globalThis.__commandglowsContentScriptInstalled = true;

  let lastRequestId = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'OPEN_COMMANDGLOWS_PALETTE') return false;
    if (!message.requestId || message.requestId === lastRequestId) {
      sendResponse({ ok: false, code: 'DUPLICATE_REQUEST' });
      return false;
    }
    lastRequestId = message.requestId;
    sendResponse(openPalette(
      message.requestId,
      message.snippets ?? [],
      message.dictionary ?? [],
      message.customActions ?? [],
    ));
    return false;
  });

  function openPalette(requestId, snippets, dictionary, customActions) {
    const active = document.activeElement;
    const policy = localFieldPolicy(active);
    if (!policy.allowed) return { ok: false, code: policy.reason, requestId };

    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', 'CMDglows');
    const title = document.createElement('strong');
    title.textContent = 'CMDglows';
    const input = document.createElement('textarea');
    input.setAttribute('aria-label', 'Text to insert');
    input.value = readSelection(active);
    const actions = document.createElement('div');
    const cleanButton = actionButton('Clean spacing', () => {
      input.value = cleanWhitespace(input.value);
    });
    const sentenceButton = actionButton('Sentence case', () => {
      input.value = sentenceCase(input.value);
    });
    const dictateButton = actionButton('Dictate', () => {
      startDictation(input, status);
    });
    const dictionaryButton = actionButton('Apply dictionary', () => {
      input.value = applyDictionary(input.value, dictionary);
    });
    actions.append(cleanButton, sentenceButton, dictionaryButton, dictateButton);

    const snippetSelect = document.createElement('select');
    snippetSelect.setAttribute('aria-label', 'Insert a snippet');
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Choose a snippet';
    snippetSelect.append(emptyOption);
    for (const snippet of snippets) {
      const option = document.createElement('option');
      option.value = snippet.id;
      option.textContent = snippet.trigger;
      snippetSelect.append(option);
    }
    snippetSelect.addEventListener('change', () => {
      const snippet = snippets.find((item) => item.id === snippetSelect.value);
      if (snippet) input.value = snippet.content;
    });

    const customActionSelect = document.createElement('select');
    customActionSelect.setAttribute('aria-label', 'Run a custom action');
    const customActionPlaceholder = document.createElement('option');
    customActionPlaceholder.value = '';
    customActionPlaceholder.textContent = 'Choose a custom action';
    customActionSelect.append(customActionPlaceholder);
    for (const action of customActions) {
      const option = document.createElement('option');
      option.value = action.id;
      option.textContent = action.label;
      customActionSelect.append(option);
    }
    customActionSelect.addEventListener('change', () => {
      const action = customActions.find((item) => item.id === customActionSelect.value);
      if (!action) return;
      if (action.kind === 'insert_text') input.value = action.value;
      if (action.kind === 'transform' && action.value === 'clean-whitespace') {
        input.value = cleanWhitespace(input.value);
      }
      if (action.kind === 'transform' && action.value === 'sentence-case') {
        input.value = sentenceCase(input.value);
      }
    });

    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const insertButton = document.createElement('button');
    insertButton.type = 'button';
    insertButton.textContent = 'Insert';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';

    dialog.append(
      title,
      document.createElement('br'),
      input,
      document.createElement('br'),
      actions,
      snippetSelect,
      customActionSelect,
      status,
      insertButton,
      cancelButton,
    );
    document.body.append(dialog);

    insertButton.addEventListener('click', () => {
      insertText(active, input.value);
      chrome.runtime.sendMessage({
        type: 'RECORD_HISTORY',
        item: { text: input.value, source: 'active-field' },
      });
      dialog.close();
    });
    cancelButton.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.showModal();
    input.focus();
    return { ok: true, code: 'PALETTE_OPENED', requestId };
  }

  function applyDictionary(value, entries) {
    return entries.reduce((result, entry) => {
      const escaped = entry.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return result.replace(new RegExp(`\\b${escaped}\\b`, 'giu'), entry.replacement);
    }, String(value));
  }

  function actionButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function cleanWhitespace(value) {
    return String(value)
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function sentenceCase(value) {
    const cleaned = cleanWhitespace(value);
    if (!cleaned) return '';
    return cleaned.charAt(0).toLocaleUpperCase() + cleaned.slice(1);
  }

  function startDictation(input, status) {
    const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    if (!Recognition) {
      status.textContent = 'Browser dictation is unavailable here.';
      return;
    }

    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang || navigator.language || 'en';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    status.textContent = 'Listening…';
    recognition.addEventListener('result', (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) input.value = input.value ? `${input.value} ${transcript}` : transcript;
    });
    recognition.addEventListener('error', () => {
      status.textContent = 'Dictation stopped. Existing text was preserved.';
    });
    recognition.addEventListener('end', () => {
      if (status.textContent === 'Listening…') status.textContent = 'Dictation complete.';
    });
    try {
      recognition.start();
    } catch (_error) {
      status.textContent = 'Dictation could not start. Existing text was preserved.';
    }
  }

  function localFieldPolicy(element) {
    if (!element) return { allowed: false, reason: 'NO_ACTIVE_FIELD' };
    const type = String(element.type || '').toLowerCase();
    const autocomplete = String(element.autocomplete || '').toLowerCase();
    const sensitive = new Set([
      'cc-csc',
      'cc-number',
      'current-password',
      'new-password',
      'one-time-code',
    ]);
    if (type === 'password' || sensitive.has(autocomplete)) {
      return { allowed: false, reason: 'SENSITIVE_FIELD' };
    }
    const editable =
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element.isContentEditable;
    return editable
      ? { allowed: true, reason: null }
      : { allowed: false, reason: 'FIELD_NOT_EDITABLE' };
  }

  function readSelection(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart ?? 0;
      const end = element.selectionEnd ?? start;
      return element.value.slice(start, end);
    }
    return globalThis.getSelection()?.toString() ?? '';
  }

  function insertText(element, text) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart ?? element.value.length;
      const end = element.selectionEnd ?? start;
      element.setRangeText(text, start, end, 'end');
      element.dispatchEvent(
        new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
      );
      element.focus();
      return;
    }

    element.focus();
    const selection = globalThis.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    element.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
    );
  }
})();
