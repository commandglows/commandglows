(() => {
  if (globalThis.__commandglowsContentScriptInstalled) return;
  globalThis.__commandglowsContentScriptInstalled = true;

  let lastRequestId = null;
  let activePalette = null;

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

    if (activePalette) {
      activePalette.focus();
      return { ok: false, code: 'PALETTE_ALREADY_OPEN', requestId };
    }

    const designSystem = globalThis.__commandglowsDesignSystem;
    if (
      !designSystem ||
      !designSystem.generatedTokensReady ||
      typeof CSSStyleSheet !== 'function'
    ) {
      return { ok: false, code: 'PALETTE_STYLE_UNAVAILABLE', requestId };
    }

    const editableState = captureEditableState(active);
    const host = document.createElement('div');
    host.dataset.commandglowsHost = 'palette';
    hardenHost(host);
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.adoptedStyleSheets = [designSystem.createStyleSheet('palette')];

    const dialog = document.createElement('dialog');
    dialog.className = 'commandglows-palette';
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'commandglows-palette-title');
    dialog.setAttribute('aria-describedby', 'commandglows-palette-description');

    const content = document.createElement('div');
    content.className = 'commandglows-palette__content';
    const header = document.createElement('header');
    header.className = 'commandglows-palette__header';
    const title = document.createElement('h2');
    title.id = 'commandglows-palette-title';
    title.className = 'commandglows-palette__title';
    title.textContent = 'CMDglows';
    const description = document.createElement('p');
    description.id = 'commandglows-palette-description';
    description.className = 'commandglows-palette__description';
    description.textContent = 'Transform or insert text in the field you were editing.';
    header.append(title, description);

    const inputLabel = document.createElement('label');
    inputLabel.className = 'commandglows-palette__field';
    inputLabel.htmlFor = 'commandglows-palette-input';
    inputLabel.textContent = 'Text to insert';
    const input = document.createElement('textarea');
    input.id = 'commandglows-palette-input';
    input.className = 'commandglows-palette__input';
    input.value = readSelection(active, editableState);
    inputLabel.append(input);

    const actions = document.createElement('div');
    actions.className = 'commandglows-palette__actions';
    actions.setAttribute('role', 'toolbar');
    actions.setAttribute('aria-label', 'Text transformations');
    const cleanButton = actionButton('Clean spacing', () => {
      input.value = cleanWhitespace(input.value);
    });
    const sentenceButton = actionButton('Sentence case', () => {
      input.value = sentenceCase(input.value);
    });
    const dictionaryButton = actionButton('Apply dictionary', () => {
      input.value = applyDictionary(input.value, dictionary);
    });

    const status = document.createElement('p');
    status.className = 'commandglows-palette__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');

    let activeRecognition = null;
    const dictateButton = actionButton('Dictate', () => {
      activeRecognition = startDictation(input, status, dictateButton, () => {
        activeRecognition = null;
      });
    });
    actions.append(cleanButton, sentenceButton, dictionaryButton, dictateButton);

    const snippetSelect = document.createElement('select');
    snippetSelect.id = 'commandglows-palette-snippet';
    snippetSelect.className = 'commandglows-palette__select';
    const snippetLabel = document.createElement('label');
    snippetLabel.className = 'commandglows-palette__field';
    snippetLabel.htmlFor = snippetSelect.id;
    snippetLabel.textContent = 'Snippet';
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
    snippetLabel.append(snippetSelect);

    const customActionSelect = document.createElement('select');
    customActionSelect.id = 'commandglows-palette-custom-action';
    customActionSelect.className = 'commandglows-palette__select';
    const customActionLabel = document.createElement('label');
    customActionLabel.className = 'commandglows-palette__field';
    customActionLabel.htmlFor = customActionSelect.id;
    customActionLabel.textContent = 'Custom action';
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
    customActionLabel.append(customActionSelect);

    const footer = document.createElement('footer');
    footer.className = 'commandglows-palette__footer';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'commandglows-palette__button';
    cancelButton.textContent = 'Cancel';
    const insertButton = document.createElement('button');
    insertButton.type = 'button';
    insertButton.className = 'commandglows-palette__button commandglows-palette__button--primary';
    insertButton.textContent = 'Insert';
    footer.append(cancelButton, insertButton);

    content.append(header, inputLabel, actions, snippetLabel, customActionLabel, status, footer);
    dialog.append(content);
    shadow.append(dialog);
    document.documentElement.append(host);

    let inserted = false;
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (activeRecognition) {
        try {
          activeRecognition.abort();
        } catch (_error) {
          // Recognition may already have ended; cleanup still continues.
        }
      }
      host.remove();
      activePalette = null;
      restoreEditableFocus(active, editableState, !inserted);
    };

    activePalette = {
      focus: () => input.focus({ preventScroll: true }),
    };

    insertButton.addEventListener('click', () => {
      inserted = true;
      insertText(active, input.value, editableState);
      chrome.runtime.sendMessage({
        type: 'RECORD_HISTORY',
        item: { text: input.value, source: 'active-field' },
      });
      dialog.close('insert');
    });
    cancelButton.addEventListener('click', () => dialog.close('cancel'));
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      dialog.close('escape');
    });
    dialog.addEventListener('keydown', (event) => trapDialogFocus(event, dialog));
    dialog.addEventListener('close', cleanup, { once: true });
    dialog.showModal();
    input.focus({ preventScroll: true });
    return { ok: true, code: 'PALETTE_OPENED', requestId };
  }

  function hardenHost(host) {
    const required = {
      position: 'fixed',
      inset: '0',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      'pointer-events': 'none',
      'z-index': '2147483647',
    };
    for (const [property, value] of Object.entries(required)) {
      host.style.setProperty(property, value, 'important');
    }
  }

  function trapDialogFocus(event, dialog) {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll(
      'button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => element.tabIndex >= 0);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = dialog.getRootNode().activeElement;
    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
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
    button.className = 'commandglows-palette__button';
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

  function startDictation(input, status, button, onEnd) {
    const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
    if (!Recognition) {
      status.textContent = 'Browser dictation is unavailable here.';
      return null;
    }

    const recognition = new Recognition();
    recognition.lang = document.documentElement.lang || navigator.language || 'en';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
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
      button.disabled = false;
      button.removeAttribute('aria-busy');
      onEnd();
    });
    try {
      recognition.start();
    } catch (_error) {
      status.textContent = 'Dictation could not start. Existing text was preserved.';
      button.disabled = false;
      button.removeAttribute('aria-busy');
      onEnd();
      return null;
    }
    return recognition;
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
    const textInputTypes = new Set(['', 'email', 'search', 'tel', 'text', 'url']);
    const editable =
      (element instanceof HTMLInputElement && textInputTypes.has(type)) ||
      element instanceof HTMLTextAreaElement ||
      element.isContentEditable;
    return editable
      ? { allowed: true, reason: null }
      : { allowed: false, reason: 'FIELD_NOT_EDITABLE' };
  }

  function captureEditableState(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return {
        kind: 'text-control',
        start: element.selectionStart ?? element.value.length,
        end: element.selectionEnd ?? element.selectionStart ?? element.value.length,
      };
    }
    const selection = globalThis.getSelection();
    if (!selection?.rangeCount) return { kind: 'contenteditable', range: null };
    const range = selection.getRangeAt(0);
    return element.contains(range.commonAncestorContainer)
      ? { kind: 'contenteditable', range: range.cloneRange() }
      : { kind: 'contenteditable', range: null };
  }

  function readSelection(element, state) {
    if (state.kind === 'text-control') {
      return element.value.slice(state.start, state.end);
    }
    return state.range?.toString() ?? '';
  }

  function insertText(element, text, state) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.setRangeText(text, state.start, state.end, 'end');
      element.dispatchEvent(
        new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
      );
      element.focus({ preventScroll: true });
      return;
    }

    element.focus({ preventScroll: true });
    const selection = globalThis.getSelection();
    const range = state.range;
    if (!selection || !range || !element.contains(range.commonAncestorContainer)) return;
    selection.removeAllRanges();
    selection.addRange(range);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    element.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
    );
  }

  function restoreEditableFocus(element, state, restoreSelection) {
    if (!element.isConnected) return;
    element.focus({ preventScroll: true });
    if (!restoreSelection) return;
    if (state.kind === 'text-control') {
      element.setSelectionRange(state.start, state.end);
      return;
    }
    if (!state.range || !element.contains(state.range.commonAncestorContainer)) return;
    const selection = globalThis.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(state.range);
  }
})();
