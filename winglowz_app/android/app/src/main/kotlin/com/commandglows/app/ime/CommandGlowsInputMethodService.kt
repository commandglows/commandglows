package com.commandglows.app.ime

import android.content.Intent
import android.content.SharedPreferences
import android.content.res.Configuration
import android.util.Log
import android.inputmethodservice.InputMethodService
import android.content.Context
import android.view.inputmethod.InputMethodSubtype
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import com.commandglows.app.MainActivity
import com.commandglows.app.ime.actions.KeyboardActionBarState
import java.util.Date
import kotlin.math.roundToInt

class CommandGlowsInputMethodService :
    InputMethodService(),
    CommandGlowsKeyboardView.Callbacks,
    SharedPreferences.OnSharedPreferenceChangeListener {
    private lateinit var stateStore: KeyboardStateStore
    private lateinit var mediaController: KeyboardMediaController
    private lateinit var clipboardController: KeyboardClipboardController
    private lateinit var voiceController: KeyboardVoiceController
    private var keyboardView: CommandGlowsKeyboardView? = null
    private var fieldPolicy =
        KeyboardSecurityPolicy.evaluate(null, KeyboardStateStore.PRIVACY_AUTO)
    private var inputContext = KeyboardInputContextResolver.resolve(null)
    private var selectionState = KeyboardSelectionState.Unavailable
    private val inputPackageName: String
        get() = currentInputEditorInfo?.packageName ?: "unknown"

    override fun onCreate() {
        super.onCreate()
        stateStore = KeyboardStateStore(this)
        getSharedPreferences(KeyboardStateStore.PREFERENCES_NAME, Context.MODE_PRIVATE)
            .registerOnSharedPreferenceChangeListener(this)
        mediaController = KeyboardMediaController(this)
        clipboardController = KeyboardClipboardController(this)
        voiceController =
            KeyboardVoiceController(
                context = this,
                stateStore = stateStore,
                onState = { message ->
                    keyboardView?.setStatus(
                        message,
                        isError = message == KeyboardVoiceController.MICROPHONE_PERMISSION_REQUIRED_MESSAGE,
                    )
                },
                onPermissionRequiredChanged = { required ->
                    keyboardView?.setVoicePermissionRequired(required)
                },
                onActiveChanged = { active -> keyboardView?.setVoiceRecordingActive(active) },
                onResult = { text ->
                    val editor = editor()
                    if (!editor.hasActiveConnection()) {
                        showStatus("Dictation result ignored: no active field")
                        return@KeyboardVoiceController
                    }
                    val dictatedText = "${text.trim()} "
                    val committed = editor.commitText(dictatedText)
                    if (!committed.reportFailure("Dictation text rejected by field")) {
                        return@KeyboardVoiceController
                    }
                    KeyboardVoiceEventQueue.enqueue(
                        rawText = text,
                        cleanedText = text,
                        language = java.util.Locale.getDefault().toLanguageTag(),
                    )
                },
            )
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        if (stateStore.themeMode == KeyboardStateStore.THEME_SYSTEM) {
            runServiceSafely("onConfigurationChanged") {
                applyRuntimePreferencesToView()
            }
        }
    }

    override fun onSharedPreferenceChanged(
        sharedPreferences: SharedPreferences?,
        key: String?,
    ) {
        if (
            key == KeyboardStateStore.KEY_THEME_MODE ||
                key == KeyboardStateStore.KEY_THEME_CONFIG ||
                key == KeyboardStateStore.KEY_KEYBOARD_HORIZONTAL_PADDING_PERCENT ||
                key == KeyboardStateStore.KEY_KEYBOARD_VERTICAL_PADDING_PERCENT ||
                key == KeyboardStateStore.KEY_KEY_VIBRATION_ENABLED ||
                key == KeyboardStateStore.KEY_KEY_SOUND_ENABLED ||
                key == KeyboardStateStore.KEY_KEY_SOUND_INTENSITY ||
                key == KeyboardStateStore.KEY_KEY_VIBRATION_INTENSITY ||
                key == KeyboardStateStore.KEY_CUSTOM_ACTION_BAR_ENABLED ||
                key == KeyboardStateStore.KEY_CUSTOM_ACTION_BAR_CONFIG ||
                key == KeyboardStateStore.KEY_AUTO_CLOSE_MODES_ENABLED
        ) {
            runServiceSafely("onSharedPreferenceChanged:$key") {
                applyRuntimePreferencesToView()
            }
        }
    }

    override fun onCreateInputView(): View {
        return runServiceSafely("onCreateInputView") {
            val view = CommandGlowsKeyboardView(this, this)
            keyboardView = view
            view.applyPolicy(fieldPolicy)
            applyRuntimePreferencesToView()
            view.applyInputContext(
                contextMode = inputContext.fieldContext,
                enterActionLabel = inputContext.enterLabel,
            )
            view
        } ?: View(this)
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)
        refreshInputState(attribute)
    }

    override fun onStartInputView(
        info: EditorInfo?,
        restarting: Boolean,
    ) {
        super.onStartInputView(info, restarting)
        refreshInputState(info)
    }

    override fun onCurrentInputMethodSubtypeChanged(newSubtype: InputMethodSubtype?) {
        super.onCurrentInputMethodSubtypeChanged(newSubtype)
        refreshInputState(currentInputEditorInfo)
    }

    override fun onEvaluateFullscreenMode(): Boolean {
        return false
    }

    override fun onEvaluateInputViewShown(): Boolean {
        super.onEvaluateInputViewShown()
        return true
    }

    private fun refreshInputState(attribute: EditorInfo?) {
        runServiceSafely("refreshInputState") {
            fieldPolicy =
                KeyboardSecurityPolicy.evaluate(
                    editorInfo = attribute,
                    privacyMode = stateStore.privacyMode,
                    clipboardSensitiveFieldHistoryEnabled = stateStore.clipboardSensitiveFieldHistoryEnabled,
                )
            inputContext = KeyboardInputContextResolver.resolve(attribute)
            selectionState =
                KeyboardSelectionState.fromEditorBounds(
                    selectionStart = attribute?.initialSelStart ?: -1,
                    selectionEnd = attribute?.initialSelEnd ?: -1,
                )
            keyboardView?.applyPolicy(fieldPolicy)
            applyRuntimePreferencesToView()
            keyboardView?.applyInputContext(
                contextMode = inputContext.fieldContext,
                enterActionLabel = inputContext.enterLabel,
            )
            refreshTypingAssistantState()
        }
    }

    override fun onUpdateSelection(
        oldSelStart: Int,
        oldSelEnd: Int,
        newSelStart: Int,
        newSelEnd: Int,
        candidatesStart: Int,
        candidatesEnd: Int,
    ) {
        super.onUpdateSelection(
            oldSelStart,
            oldSelEnd,
            newSelStart,
            newSelEnd,
            candidatesStart,
            candidatesEnd,
        )
        selectionState =
            KeyboardSelectionState(
                selectionStart = newSelStart,
                selectionEnd = newSelEnd,
                candidatesStart = candidatesStart,
                candidatesEnd = candidatesEnd,
            )
        refreshTypingAssistantState()
    }

    override fun onFinishInput() {
        selectionState = KeyboardSelectionState.Unavailable
        keyboardView?.cancelAllPointerGestures("finish-input")
        super.onFinishInput()
    }

    override fun onDestroy() {
        getSharedPreferences(KeyboardStateStore.PREFERENCES_NAME, Context.MODE_PRIVATE)
            .unregisterOnSharedPreferenceChangeListener(this)
        voiceController.destroy()
        super.onDestroy()
    }

    override fun onText(text: String): Boolean {
        if (!fieldPolicy.inputAllowed) {
            showStatus("Input unavailable")
            return false
        }
        val editor = editor()
        if (!editor.hasActiveConnection()) {
            showStatus("Input unavailable: no active field")
            return false
        }
        return commitWithTypingCorrections(editor, text)
    }

    override fun onEmojiInserted(emoji: String) {
        stateStore.pushEmojiRecent(emoji, privateMode = fieldPolicy.privateMode)
        applyRuntimePreferencesToView()
    }

    override fun onSymbolInserted(symbol: String) {
        stateStore.pushSymbolRecent(symbol, privateMode = fieldPolicy.privateMode)
        applyRuntimePreferencesToView()
    }

    override fun onBackspace(): Boolean {
        val editor = editor()
        if (!editor.hasActiveConnection()) {
            showStatus("Delete unavailable: no active field")
            return false
        }
        return recordNavigationDiagnostic("backspace") {
            if (selectionState.hasSelection || !editor.selectedText().isNullOrEmpty()) {
                val deleted = editor.commitText("").reportFailure("Delete selection rejected by field")
                refreshTypingAssistantState(editor)
                deleted to "selection_clear"
            } else {
                val sent = sendSoftKey(KeyEvent.KEYCODE_DEL, 0)
                if (sent) {
                    true to "soft_key_delete"
                } else {
                    val deleted = editor.deleteCodePointsBefore(1)
                    if (!deleted.applied) {
                        showStatus("Delete rejected by field")
                    }
                    refreshTypingAssistantState(editor)
                    deleted.applied to "delete_code_points_before:${deleted.name}"
                }
            }
        }
    }

    override fun onForwardDelete(): Boolean {
        val editor = editor()
        if (!editor.hasActiveConnection()) {
            showStatus("Forward delete unavailable: no active field")
            return false
        }
        return recordNavigationDiagnostic("forward_delete") {
            if (selectionState.hasSelection || !editor.selectedText().isNullOrEmpty()) {
                val deleted = editor.commitText("").reportFailure("Delete selection rejected by field")
                refreshTypingAssistantState(editor)
                deleted to "selection_clear"
            } else {
                val sent = sendSoftKey(KeyEvent.KEYCODE_FORWARD_DEL, 0)
                if (sent) {
                    true to "soft_key_forward_delete"
                } else {
                    val deleted = editor.deleteCodePointsAfter(1)
                    refreshTypingAssistantState(editor)
                    deleted.applied to "delete_code_points_after:${deleted.name}"
                }
            }
        }
    }

    override fun onDeleteWordBefore(): Boolean {
        val editor = editor()
        if (!editor.hasActiveConnection()) {
            return false
        }
        Log.d(
            TAG,
            "word delete before pressed | package=$inputPackageName | hasSelection=${selectionState.hasSelection} | selectedText=${editor.selectedText()?.isNotEmpty()}",
        )
        return recordNavigationDiagnostic("delete_word_before") {
            if (selectionState.hasSelection || !editor.selectedText().isNullOrEmpty()) {
                val deleted = editor.commitText("").reportFailure("Delete selection rejected by field")
                Log.d(TAG, "word delete before fallback-to-selection-clear | result=$deleted")
                refreshTypingAssistantState(editor)
                deleted to "selection_clear"
            } else if (isTermuxInputTarget()) {
                val sent = sendSoftKey(KeyEvent.KEYCODE_DEL, KeyEvent.META_CTRL_ON or KeyEvent.META_CTRL_LEFT_ON)
                Log.d(TAG, "word delete before termux-path | sent=$sent")
                refreshTypingAssistantState(editor)
                sent to "termux_ctrl_delete"
            } else {
                val deleted = editor.deleteWordBeforeCursor()
                if (deleted.applied) {
                    Log.d(TAG, "word delete before common-path | result=applied")
                    refreshTypingAssistantState(editor)
                    true to "delete_word_before:${deleted.name}"
                } else {
                    val sent = sendSoftKey(KeyEvent.KEYCODE_DEL, KeyEvent.META_CTRL_ON or KeyEvent.META_CTRL_LEFT_ON)
                    Log.d(TAG, "word delete before fallback-to-softkey | result=$sent")
                    refreshTypingAssistantState(editor)
                    sent to "fallback_ctrl_delete:${deleted.name}"
                }
            }
        }
    }

    override fun onDeleteWordAfter(): Boolean {
        val editor = editor()
        if (!editor.hasActiveConnection()) {
            return false
        }
        Log.d(
            TAG,
            "word delete after pressed | package=$inputPackageName | hasSelection=${selectionState.hasSelection} | selectedText=${editor.selectedText()?.isNotEmpty()}",
        )
        return recordNavigationDiagnostic("delete_word_after") {
            if (selectionState.hasSelection || !editor.selectedText().isNullOrEmpty()) {
                val deleted = editor.commitText("").reportFailure("Delete selection rejected by field")
                Log.d(TAG, "word delete after fallback-to-selection-clear | result=$deleted")
                refreshTypingAssistantState(editor)
                deleted to "selection_clear"
            } else if (isObsidianInputTarget()) {
                val sent = sendSoftKey(KeyEvent.KEYCODE_FORWARD_DEL, KeyEvent.META_CTRL_ON or KeyEvent.META_CTRL_LEFT_ON)
                Log.d(TAG, "word delete after obsidian-path | sent=$sent")
                refreshTypingAssistantState(editor)
                sent to "obsidian_ctrl_forward_delete"
            } else {
                val deleted = editor.deleteWordAfterCursor()
                if (deleted.applied) {
                    Log.d(TAG, "word delete after common-path | result=applied")
                    refreshTypingAssistantState(editor)
                    true to "delete_word_after:${deleted.name}"
                } else {
                    val sent = sendSoftKey(KeyEvent.KEYCODE_FORWARD_DEL, KeyEvent.META_CTRL_ON or KeyEvent.META_CTRL_LEFT_ON)
                    Log.d(TAG, "word delete after fallback-to-softkey | result=$sent")
                    refreshTypingAssistantState(editor)
                    sent to "fallback_ctrl_forward_delete:${deleted.name}"
                }
            }
        }
    }

    override fun onDeleteSentenceBefore(): Boolean {
        val editor = editor()
        if (!editor.hasActiveConnection()) {
            return false
        }
        return recordNavigationDiagnostic("delete_sentence_before") {
            if (selectionState.hasSelection || !editor.selectedText().isNullOrEmpty()) {
                val deleted = editor.commitText("").reportFailure("Delete selection rejected by field")
                refreshTypingAssistantState(editor)
                deleted to "selection_clear"
            } else if (isTermuxInputTarget()) {
                val sent = sendSoftKey(KeyEvent.KEYCODE_DEL, KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON or KeyEvent.META_ALT_LEFT_ON)
                refreshTypingAssistantState(editor)
                sent to "termux_ctrl_alt_delete"
            } else {
                val deleted = editor.deleteSentenceBeforeCursor()
                if (deleted.applied) {
                    refreshTypingAssistantState(editor)
                    true to "delete_sentence_before:${deleted.name}"
                } else {
                    val sent = sendSoftKey(KeyEvent.KEYCODE_DEL, KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON or KeyEvent.META_ALT_LEFT_ON)
                    refreshTypingAssistantState(editor)
                    sent to "fallback_ctrl_alt_delete:${deleted.name}"
                }
            }
        }
    }

    override fun onDeleteSentenceAfter(): Boolean {
        val editor = editor()
        if (!editor.hasActiveConnection()) {
            return false
        }
        return recordNavigationDiagnostic("delete_sentence_after") {
            if (selectionState.hasSelection || !editor.selectedText().isNullOrEmpty()) {
                val deleted = editor.commitText("").reportFailure("Delete selection rejected by field")
                refreshTypingAssistantState(editor)
                deleted to "selection_clear"
            } else {
                val deleted = editor.deleteSentenceAfterCursor()
                if (deleted.applied) {
                    refreshTypingAssistantState(editor)
                    true to "delete_sentence_after:${deleted.name}"
                } else {
                    val sent = sendSoftKey(KeyEvent.KEYCODE_FORWARD_DEL, KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON or KeyEvent.META_ALT_LEFT_ON)
                    refreshTypingAssistantState(editor)
                    sent to "fallback_ctrl_alt_forward_delete:${deleted.name}"
                }
            }
        }
    }

    override fun onEnter(): Boolean {
        if (voiceController.isListening()) {
            voiceController.stop()
            return true
        }
        val editor = editor()
        if (!editor.hasActiveConnection()) {
            showStatus("Enter unavailable: no active field")
            return false
        }
        val actionId = inputContext.actionId
        if (actionId != EditorInfo.IME_ACTION_NONE) {
            if (editor.performEditorAction(actionId).applied) {
                return true
            }
        } else {
            return sendSoftKey(KeyEvent.KEYCODE_ENTER, 0)
        }
        return sendSoftKey(KeyEvent.KEYCODE_ENTER, 0)
    }

    override fun onVoice() {
        if (!stateStore.voiceEnabled) {
            showStatus("Dictation disabled in CommandGlows settings")
            return
        }
        if (!fieldPolicy.voiceAllowed) {
            showStatus("Dictation disabled for private field")
            return
        }
        if (voiceController.isActive()) {
            voiceController.stop()
            return
        }
        if (keyboardView?.isVoicePermissionRequired() == true) {
            openMicrophoneOnboarding()
            return
        }
        voiceController.start()
    }

    override fun onVoicePause() {
        voiceController.pause()
    }

    override fun onVoiceResume() {
        if (!stateStore.voiceEnabled) {
            showStatus("Dictation disabled in CommandGlows settings")
            return
        }
        if (!fieldPolicy.voiceAllowed) {
            showStatus("Dictation disabled for private field")
            return
        }
        voiceController.resume()
    }

    override fun onVoiceRestart() {
        if (!stateStore.voiceEnabled) {
            showStatus("Dictation disabled in CommandGlows settings")
            return
        }
        if (!fieldPolicy.voiceAllowed) {
            showStatus("Dictation disabled for private field")
            return
        }
        voiceController.restart()
    }

    override fun onVoiceCancel() {
        voiceController.cancel()
    }

    override fun onCopySelection() {
        if (!fieldPolicy.clipboardAllowed) {
            showInlineStatus("Clipboard capture disabled for private field")
            return
        }
        val selectedText = editor().selectedText()?.toString()?.trim()
        val copied = clipboardController.copySelection(currentInputConnection)
        if (copied && !selectedText.isNullOrBlank()) {
            stateStore.pushClipboardEntry(selectedText)
            applyRuntimePreferencesToView()
            showInlineStatus("Selection copied")
            return
        }
        if (editor().performContextMenuAction(android.R.id.copy).applied) {
            clipboardController.recordPrimaryClipHistoryEntry(
                action = "copy_context_menu",
                allowSensitiveClip = stateStore.clipboardSensitiveFieldHistoryEnabled,
            )
                ?.let { stateStore.pushClipboardEntry(it) }
            applyRuntimePreferencesToView()
            showInlineStatus("Copy sent")
            return
        }
        if (isTermuxInputTarget() && sendTermuxClipboardShortcut(KeyEvent.KEYCODE_C)) {
            showInlineStatus("Termux copy shortcut sent")
            return
        }
        showInlineStatus("No selectable text")
    }

    override fun onCutSelection(): Boolean {
        if (!fieldPolicy.clipboardAllowed) {
            showInlineStatus("Clipboard capture disabled for private field")
            return false
        }
        if (!selectionState.hasSelection && editor().selectedText().isNullOrEmpty()) {
            if (isTermuxInputTarget() && sendTermuxClipboardShortcut(KeyEvent.KEYCODE_X)) {
                showInlineStatus("Termux cut shortcut sent")
                return true
            }
            showInlineStatus("No selectable text")
            return false
        }
        val cut = editor().performContextMenuAction(android.R.id.cut)
        if (cut.applied) {
            clipboardController.recordPrimaryClipHistoryEntry(
                action = "cut_selection",
                allowSensitiveClip = stateStore.clipboardSensitiveFieldHistoryEnabled,
            )
                ?.let { stateStore.pushClipboardEntry(it) }
            refreshTypingAssistantState()
            applyRuntimePreferencesToView()
            return true
        }
        val sent = isTermuxInputTarget() && sendTermuxClipboardShortcut(KeyEvent.KEYCODE_X)
        refreshTypingAssistantState()
        if (sent) {
            showInlineStatus("Termux cut shortcut sent")
            return true
        }
        if (!cut.applied) {
            showInlineStatus("Cut rejected by field")
        }
        return cut.applied
    }

    override fun onPasteClipboard(): Boolean {
        if (!fieldPolicy.clipboardAllowed) {
            showInlineStatus("Clipboard paste disabled for private field")
            return false
        }
        val targetPaste = editor().performContextMenuAction(android.R.id.paste)
        if (targetPaste.applied) {
            val pastedText =
                clipboardController.recordPrimaryClipHistoryEntry(
                    action = "paste_context_menu",
                    allowSensitiveClip = stateStore.clipboardSensitiveFieldHistoryEnabled,
                )
                    ?: clipboardController.primaryTextAllowedForHistory(
                        allowSensitiveClip = stateStore.clipboardSensitiveFieldHistoryEnabled,
                    )
            pastedText?.let { stateStore.pushClipboardEntry(it) }
            applyRuntimePreferencesToView()
            showInlineStatus("Clipboard paste sent")
            return true
        }
        val pasted =
            clipboardController.pastePrimaryText(
                inputConnection = currentInputConnection,
                allowSensitiveClip = stateStore.clipboardSensitiveFieldHistoryEnabled,
            )
        if (pasted) {
            clipboardController.primaryTextAllowedForHistory(
                allowSensitiveClip = stateStore.clipboardSensitiveFieldHistoryEnabled,
            )?.let { stateStore.pushClipboardEntry(it) }
            applyRuntimePreferencesToView()
        }
        showInlineStatus(if (pasted) "Clipboard pasted" else "No text clipboard")
        return pasted
    }

    override fun onPastePlainClipboard(): Boolean {
        if (!fieldPolicy.clipboardAllowed) {
            showInlineStatus("Clipboard paste disabled for private field")
            return false
        }
        val plainPaste = editor().performContextMenuAction(android.R.id.pasteAsPlainText)
        if (plainPaste.applied) {
            val pastedText =
                clipboardController.recordPrimaryClipHistoryEntry(
                    action = "paste_plain_context_menu",
                    allowSensitiveClip = stateStore.clipboardSensitiveFieldHistoryEnabled,
                )
                    ?: clipboardController.primaryTextAllowedForHistory(
                        allowSensitiveClip = stateStore.clipboardSensitiveFieldHistoryEnabled,
                    )
            pastedText?.let { stateStore.pushClipboardEntry(it) }
            applyRuntimePreferencesToView()
            showInlineStatus("Plain clipboard pasted")
            return true
        }
        return onPasteClipboard()
    }

    override fun onSelectAll(): Boolean {
        if (!inputContext.selectionModeAllowed) {
            showStatus("Selection unavailable in this field")
            return false
        }
        return recordNavigationDiagnostic("select_all") {
            val result = editor().performContextMenuAction(android.R.id.selectAll).reportFailure("Select all rejected by field")
            result to "context_menu_select_all"
        }
    }

    override fun onUndo(): Boolean {
        return recordNavigationDiagnostic("undo") {
            val result = editor().performUndo().reportFailure("Undo rejected by field")
            result to "context_menu_or_shortcut_undo"
        }
    }

    override fun onRedo(): Boolean {
        return recordNavigationDiagnostic("redo") {
            val result = editor().performRedo().reportFailure("Redo rejected by field")
            result to "context_menu_or_shortcut_redo"
        }
    }

    override fun onCancelSelection(): Boolean {
        if (!selectionState.hasSelection && editor().selectedText().isNullOrEmpty()) {
            showStatus("No active selection")
            return false
        }
        val canceled = editor().cancelSelection().reportFailure("Selection cancel rejected by field")
        refreshTypingAssistantState()
        return canceled
    }

    override fun onSuggestionSelected(suggestion: String): Boolean {
        if (!typingAssistantAllowed()) {
            return false
        }
        val editor = editor()
        if (!editor.hasActiveConnection()) {
            return false
        }
        val before = editor.textBeforeCursor(128)?.toString().orEmpty()
        val deleteCount = KeyboardTextAssistant.deleteCountForCurrentToken(before)
        val replacement = suggestion.trim()
        val result =
            if (deleteCount > 0) {
                editor.replaceTextBeforeCursor(deleteCount, "$replacement ")
            } else {
                editor.commitText("$replacement ")
            }
        refreshTypingAssistantState(editor)
        return result.reportFailure("Suggestion rejected by field")
    }

    override fun onSnippets() {
        if (!fieldPolicy.snippetsAllowed) {
            showStatus("Snippets disabled for private field")
            return
        }
        runServiceSafely("openSnippets") {
            val intent =
                Intent(this, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    putExtra("openRoute", "/snippets")
                }
            startActivity(intent)
            showStatus("Open CommandGlows snippets")
        }
    }

    override fun onSettings() {
        runServiceSafely("openSettings") {
            val intent =
                Intent(this, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    putExtra("openRoute", "/settings")
                }
            startActivity(intent)
            showStatus("Open CommandGlows preferences")
        }
    }

    override fun onThemeSettings() {
        runServiceSafely("openThemeSettings") {
            val intent =
                Intent(this, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    putExtra("openRoute", "/keyboard/theme")
                }
            startActivity(intent)
            showStatus("Open CommandGlows Keyboard Theme Studio")
        }
    }

    override fun onThemePresetSelected(presetId: String) {
        runServiceSafely("setThemePreset") {
            val config = stateStore.setThemePreset(presetId)
            applyRuntimePreferencesToView()
            showStatus("Theme ${KeyboardThemePresets.labelFor(config.presetId)}")
        }
    }

    private fun openMediaAccessOnboarding() {
        runServiceSafely("openMediaAccessOnboarding") {
            val intent =
                Intent(this, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    putExtra("openRoute", "/settings?onboarding=media")
                }
            startActivity(intent)
            showStatus("Enable media access in CommandGlows")
        }
    }

    private fun openMicrophoneOnboarding() {
        runServiceSafely("openMicrophoneOnboarding") {
            val intent =
                Intent(this, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    putExtra("openRoute", "/settings?onboarding=microphone")
                }
            startActivity(intent)
            showStatus("Open microphone onboarding")
        }
    }

    private fun openBrightnessOnboarding() {
        runServiceSafely("openBrightnessOnboarding") {
            val intent =
                Intent(this, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    putExtra("openRoute", "/settings?onboarding=brightness")
                }
            startActivity(intent)
            showStatus("Enable brightness access in CommandGlows")
        }
    }

    override fun onKeyboardPicker() {
        runServiceSafely("showKeyboardPicker") {
            val manager = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            manager.showInputMethodPicker()
            showStatus("Keyboard picker opened")
        }
    }

    override fun onMediaPlayPause() {
        if (!stateStore.mediaControlsEnabled) {
            showStatus("Media controls disabled")
            return
        }
        mediaController.playPause()
        showStatus("Play/pause sent")
    }

    override fun onMediaPrevious() {
        if (!stateStore.mediaControlsEnabled) {
            showStatus("Media controls disabled")
            return
        }
        mediaController.previous()
        showStatus("Previous sent")
    }

    override fun onMediaNext() {
        if (!stateStore.mediaControlsEnabled) {
            showStatus("Media controls disabled")
            return
        }
        mediaController.next()
        showStatus("Next sent")
    }

    override fun onMediaNowPlaying(): String {
        if (!stateStore.mediaControlsEnabled) {
            return "Now playing: media controls disabled"
        }
        val label = mediaController.nowPlayingLabel()
        if (label == KeyboardMediaController.MEDIA_ACCESS_REQUIRED) {
            openMediaAccessOnboarding()
            return "Media access required"
        }
        return label
    }

    override fun onOpenMediaApp() {
        if (!stateStore.mediaControlsEnabled) {
            showStatus("Media controls disabled")
            return
        }
        val status = mediaController.openActiveMediaApp()
        if (status == KeyboardMediaController.MEDIA_ACCESS_REQUIRED) {
            openMediaAccessOnboarding()
            return
        }
        showStatus(status)
    }

    override fun onMediaStop() {
        runMediaAction { mediaController.stop() }
    }

    override fun onVolumeDown() {
        runMediaAction { mediaController.volumeDown(stateStore.mediaVolumeStepPercent) }
    }

    override fun onVolumeUp() {
        runMediaAction { mediaController.volumeUp(stateStore.mediaVolumeStepPercent) }
    }

    override fun onBrightnessDown() {
        adjustBrightness(delta = -brightnessStepDelta())
    }

    override fun onBrightnessUp() {
        adjustBrightness(delta = brightnessStepDelta())
    }

    private fun brightnessStepDelta(): Int {
        return (255 * stateStore.mediaBrightnessStepPercent / 100f).toInt().coerceAtLeast(1)
    }

    private fun adjustBrightness(delta: Int) {
        if (!stateStore.mediaControlsEnabled) {
            showStatus("Media controls disabled")
            return
        }
        val status = mediaController.adjustBrightness(delta)
        if (status == KeyboardMediaController.BRIGHTNESS_ACCESS_REQUIRED) {
            openBrightnessOnboarding()
            return
        }
        showStatus(status)
    }

    private fun runMediaAction(action: () -> String) {
        if (!stateStore.mediaControlsEnabled) {
            showStatus("Media controls disabled")
            return
        }
        val status = action()
        if (status == KeyboardMediaController.MEDIA_ACCESS_REQUIRED) {
            openMediaAccessOnboarding()
            return
        }
        showStatus(status)
    }

    override fun onNavigateCharLeft(): Boolean = sendSoftKey(KeyEvent.KEYCODE_DPAD_LEFT, 0)

    override fun onNavigateCharRight(): Boolean = sendSoftKey(KeyEvent.KEYCODE_DPAD_RIGHT, 0)

    override fun onNavigateWordLeft(): Boolean =
        recordNavigationDiagnostic("navigate_word_left") {
            val moved = if (inputContext.selectionModeAllowed) editor().moveWordCursor(left = true).applied else false
            if (moved) {
                true to "move_word_cursor"
            } else {
                val sent = sendSoftKey(KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.META_CTRL_ON)
                sent to "fallback_ctrl_dpad_left"
            }
        }

    override fun onNavigateWordRight(): Boolean =
        recordNavigationDiagnostic("navigate_word_right") {
            val moved = if (inputContext.selectionModeAllowed) editor().moveWordCursor(left = false).applied else false
            if (moved) {
                true to "move_word_cursor"
            } else {
                val sent = sendSoftKey(KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.META_CTRL_ON)
                sent to "fallback_ctrl_dpad_right"
            }
        }

    override fun onNavigateSentenceLeft(): Boolean =
        recordNavigationDiagnostic("navigate_sentence_left") {
            val moved = if (inputContext.selectionModeAllowed) editor().moveSentenceCursor(left = true).applied else false
            if (moved) {
                true to "move_sentence_cursor"
            } else {
                val sent = sendSoftKey(KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.META_ALT_ON or KeyEvent.META_ALT_LEFT_ON)
                sent to "fallback_alt_dpad_left"
            }
        }

    override fun onNavigateSentenceRight(): Boolean =
        recordNavigationDiagnostic("navigate_sentence_right") {
            val moved = if (inputContext.selectionModeAllowed) editor().moveSentenceCursor(left = false).applied else false
            if (moved) {
                true to "move_sentence_cursor"
            } else {
                val sent = sendSoftKey(KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.META_ALT_ON or KeyEvent.META_ALT_LEFT_ON)
                sent to "fallback_alt_dpad_right"
            }
        }

    override fun onNavigateLineUp(): Boolean = sendSoftKey(KeyEvent.KEYCODE_DPAD_UP, 0)

    override fun onNavigateLineDown(): Boolean = sendSoftKey(KeyEvent.KEYCODE_DPAD_DOWN, 0)

    override fun onNavigateParagraphUp(): Boolean {
        val moved = if (inputContext.selectionModeAllowed) editor().moveParagraphCursor(up = true).applied else false
        return moved || sendSoftKey(KeyEvent.KEYCODE_DPAD_UP, KeyEvent.META_CTRL_ON)
    }

    override fun onNavigateParagraphDown(): Boolean {
        val moved = if (inputContext.selectionModeAllowed) editor().moveParagraphCursor(up = false).applied else false
        return moved || sendSoftKey(KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.META_CTRL_ON)
    }

    override fun onNavigateLineStart(): Boolean =
        recordNavigationDiagnostic("navigate_line_start") {
            if (isTermuxInputTarget()) {
                val sent = sendSoftKey(KeyEvent.KEYCODE_A, KeyEvent.META_CTRL_ON or KeyEvent.META_CTRL_LEFT_ON)
                sent to "termux_ctrl_a"
            } else {
                val moved = if (inputContext.selectionModeAllowed) editor().moveDocumentBoundary(start = true).applied else false
                if (moved) {
                    true to "move_document_boundary_start"
                } else {
                    val sent = sendSoftKey(KeyEvent.KEYCODE_MOVE_HOME, KeyEvent.META_CTRL_ON)
                    sent to "fallback_ctrl_home"
                }
            }
        }

    override fun onNavigateLineEnd(): Boolean =
        recordNavigationDiagnostic("navigate_line_end") {
            if (isTermuxInputTarget()) {
                val sent = sendSoftKey(KeyEvent.KEYCODE_E, KeyEvent.META_CTRL_ON or KeyEvent.META_CTRL_LEFT_ON)
                sent to "termux_ctrl_e"
            } else {
                val moved = if (inputContext.selectionModeAllowed) editor().moveDocumentBoundary(start = false).applied else false
                if (moved) {
                    true to "move_document_boundary_end"
                } else {
                    val sent = sendSoftKey(KeyEvent.KEYCODE_MOVE_END, KeyEvent.META_CTRL_ON)
                    sent to "fallback_ctrl_end"
                }
            }
        }

    override fun onKeyEvent(
        keyCode: Int,
        metaState: Int,
    ): Boolean = sendSoftKey(keyCode, metaState)

    override fun onLayoutProfileChanged(profile: KeyboardLayoutProfile) {
        stateStore.layoutProfile = profile
        applyRuntimePreferencesToView()
        showStatus("Layout ${profile.name}")
    }

    override fun onCornerModeChanged(enabled: Boolean) {
        stateStore.cornerModeEnabled = enabled
        applyRuntimePreferencesToView()
        showStatus(if (enabled) "Swipe gestures enabled" else "Swipe gestures disabled")
    }

    override fun onDebugTouchOverlayChanged(enabled: Boolean) {
        stateStore.debugTouchOverlayEnabled = enabled
        applyRuntimePreferencesToView()
        showStatus(if (enabled) "Touch debug enabled" else "Touch debug disabled")
    }

    override fun onKeyVibrationChanged(enabled: Boolean) {
        stateStore.keyVibrationEnabled = enabled
        applyRuntimePreferencesToView()
        showStatus(if (enabled) "Key vibration enabled" else "Key vibration disabled")
    }

    override fun onKeyVibrationModeChanged(level: Int) {
        stateStore.keyVibrationIntensity = level
        applyRuntimePreferencesToView()
        showStatus(
            when (level) {
                KeyboardStateStore.KEY_VIBRATION_INTENSITY_OFF -> "Key vibration off"
                KeyboardStateStore.KEY_VIBRATION_INTENSITY_SHORT -> "Key vibration 12 ms"
                KeyboardStateStore.KEY_VIBRATION_INTENSITY_MEDIUM -> "Key vibration 24 ms"
                KeyboardStateStore.KEY_VIBRATION_INTENSITY_LONG -> "Key vibration 40 ms"
                else -> if (stateStore.keyVibrationEnabled) "Key vibration enabled" else "Key vibration disabled"
            },
        )
    }

    override fun onKeySoundChanged(enabled: Boolean) {
        stateStore.keySoundEnabled = enabled
        applyRuntimePreferencesToView()
        showStatus(if (enabled) "Key sound enabled" else "Key sound disabled")
    }

    override fun onKeySoundModeChanged(level: Int) {
        stateStore.keySoundIntensity = level
        applyRuntimePreferencesToView()
        showStatus(
            when (level) {
                KeyboardStateStore.KEY_SOUND_INTENSITY_OFF -> "Key sound off"
                KeyboardStateStore.KEY_SOUND_INTENSITY_SHORT -> "Key sound Click"
                KeyboardStateStore.KEY_SOUND_INTENSITY_MEDIUM -> "Key sound Tick"
                KeyboardStateStore.KEY_SOUND_INTENSITY_LONG -> "Key sound Clack"
                KeyboardStateStore.KEY_SOUND_INTENSITY_EXTRA -> "Key sound Pop"
                else -> if (stateStore.keySoundEnabled) "Key sound on" else "Key sound off"
            },
        )
    }

    override fun onSpellingSuggestionsChanged(enabled: Boolean) {
        stateStore.spellingSuggestionsEnabled = enabled
        applyRuntimePreferencesToView()
        refreshTypingAssistantState()
        showStatus(if (enabled) "Suggestions enabled" else "Suggestions disabled")
    }

    override fun onSpecialKeyCornersChanged(enabled: Boolean) {
        stateStore.specialKeyCornersEnabled = enabled
        applyRuntimePreferencesToView()
        showStatus(if (enabled) "Special key gestures enabled" else "Special key gestures disabled")
    }

    override fun onFrenchLanguageChanged(enabled: Boolean) {
        stateStore.frenchLanguageEnabled = enabled
        applyRuntimePreferencesToView()
        refreshTypingAssistantState()
        showStatus(if (enabled) "French enabled" else "French disabled")
    }

    override fun onEnglishLanguageChanged(enabled: Boolean) {
        stateStore.englishLanguageEnabled = enabled
        applyRuntimePreferencesToView()
        refreshTypingAssistantState()
        showStatus(if (enabled) "English enabled" else "English disabled")
    }

    override fun onDoubleSpacePeriodChanged(enabled: Boolean) {
        stateStore.doubleSpacePeriodEnabled = enabled
        applyRuntimePreferencesToView()
        showStatus(if (enabled) "Double-space period enabled" else "Double-space period disabled")
    }

    override fun onPunctuationAutoSpacingChanged(enabled: Boolean) {
        stateStore.punctuationAutoSpacingEnabled = enabled
        applyRuntimePreferencesToView()
        showStatus(if (enabled) "Punctuation spacing enabled" else "Punctuation spacing disabled")
    }

    override fun onKeyboardHeightScaleChanged(scale: Float) {
        stateStore.keyboardHeightScale = scale
        applyRuntimePreferencesToView()
        showStatus("Keyboard height ${(stateStore.keyboardHeightScale * 100).toInt()}%")
    }

    override fun onHorizontalKeyboardPaddingChanged(scale: Float) {
        stateStore.keyboardHorizontalPaddingPercent = (scale * 100f).roundToInt().coerceIn(
            0,
            KeyboardStateStore.KEYBOARD_PADDING_PERCENT_MAX,
        )
        applyRuntimePreferencesToView()
        showStatus("Keyboard horizontal margin ${stateStore.keyboardHorizontalPaddingPercent}%")
    }

    override fun onVerticalKeyboardPaddingChanged(scale: Float) {
        stateStore.keyboardVerticalPaddingPercent = (scale * 100f).roundToInt().coerceIn(
            0,
            KeyboardStateStore.KEYBOARD_PADDING_PERCENT_MAX,
        )
        applyRuntimePreferencesToView()
        showStatus("Keyboard vertical margin ${stateStore.keyboardVerticalPaddingPercent}%")
    }

    override fun onCompactModeChanged(enabled: Boolean) {
        stateStore.compactModeEnabled = enabled
        applyRuntimePreferencesToView()
        showStatus(if (enabled) "Compact keyboard enabled" else "Compact keyboard disabled")
    }

    override fun onAutoCloseModesChanged(enabled: Boolean) {
        stateStore.autoCloseModesEnabled = enabled
        applyRuntimePreferencesToView()
        showStatus(if (enabled) "Auto close modes enabled" else "Auto close modes disabled")
    }

    override fun onActionBarStateChanged(state: KeyboardActionBarState) {
        stateStore.replaceActionBarState(state)
    }

    private fun recordNavigationDiagnostic(
        actionId: String,
        block: () -> Pair<Boolean, String>,
    ): Boolean {
        val beforeEditor = editor()
        val beforeSelected = beforeEditor.selectedText()?.toString()
        val beforeText = beforeEditor.textBeforeCursor(96)?.toString()
        val afterText = beforeEditor.textAfterCursor(96)?.toString()
        val selectionStart = selectionState.selectionStart
        val selectionEnd = selectionState.selectionEnd
        val (success, strategy) = block()
        val afterEditor = editor()
        stateStore.appendNavigationDiagnostic(
            mapOf(
                "timestamp" to Date().time,
                "actionId" to actionId,
                "success" to success,
                "strategy" to strategy,
                "packageName" to inputPackageName,
                "fieldContext" to inputContext.fieldContext.name,
                "inputActionLabel" to inputContext.enterLabel,
                "selectionModeAllowed" to inputContext.selectionModeAllowed,
                "selectionStart" to selectionStart,
                "selectionEnd" to selectionEnd,
                "hasSelection" to selectionState.hasSelection,
                "privateMode" to fieldPolicy.privateMode,
                "inputAllowed" to fieldPolicy.inputAllowed,
                "clipboardAllowed" to fieldPolicy.clipboardAllowed,
                "voiceAllowed" to fieldPolicy.voiceAllowed,
                "selectedTextBefore" to beforeSelected?.take(96),
                "selectedTextAfter" to afterEditor.selectedText()?.toString()?.take(96),
                "textBeforeCursor" to beforeText?.takeLast(96),
                "textAfterCursor" to afterText?.take(96),
            ),
        )
        return success
    }

    private fun applyRuntimePreferencesToView() {
        runServiceSafely("applyRuntimePreferencesToView") {
            val emojiRecents =
                if (fieldPolicy.privateMode) {
                    emptyList()
                } else {
                    stateStore.emojiRecents()
                }
            val symbolRecents =
                if (fieldPolicy.privateMode) {
                    emptyList()
                } else {
                    stateStore.symbolRecents()
                }
            keyboardView?.applyRuntimePreferences(
                profile = stateStore.layoutProfile,
                cornersEnabled = stateStore.cornerModeEnabled,
                debugTouchOverlay = stateStore.debugTouchOverlayEnabled,
                keyVibration = stateStore.keyVibrationIntensity,
                keySound = stateStore.keySoundIntensity,
                spellingSuggestions = stateStore.spellingSuggestionsEnabled,
                mediaControlsEnabled = stateStore.mediaControlsEnabled,
                specialKeyCorners = stateStore.specialKeyCornersEnabled,
                frenchLanguage = stateStore.frenchLanguageEnabled,
                englishLanguage = stateStore.englishLanguageEnabled,
                doubleSpacePeriod = stateStore.doubleSpacePeriodEnabled,
                punctuationAutoSpacing = stateStore.punctuationAutoSpacingEnabled,
                keyboardHeightScale = stateStore.keyboardHeightScale,
                keyboardHorizontalPaddingPercent = stateStore.keyboardHorizontalPaddingPercent,
                keyboardVerticalPaddingPercent = stateStore.keyboardVerticalPaddingPercent,
                actionRowHeightScale = stateStore.actionRowHeightScale,
                compactMode = stateStore.compactModeEnabled,
                autoCloseModes = stateStore.autoCloseModesEnabled,
                themeMode = stateStore.themeMode,
                themeConfig = stateStore.themeConfig(),
                recents = emojiRecents,
                symbolRecents = symbolRecents,
                clipboardEntries = clipboardEntriesForKeyboard(),
                snippets = stateStore.snippetRules(),
                customActionRows = stateStore.customActionRows(fieldPolicy),
                cornerConfig = stateStore.cornerConfig(),
                actionBarState = actionBarStateForCurrentField(),
                actionBarLongPressBehavior = stateStore.actionBarLongPressBehavior,
                statusBarConfig = stateStore.statusBarConfig,
                accountLabel = stateStore.accountLabel,
                accountLabelMode = stateStore.accountLabelMode,
            )
            keyboardView?.setVoicePermissionRequired(
                stateStore.voiceLastErrorCode == "permission_denied",
            )
        }
    }

    private fun actionBarStateForCurrentField(): KeyboardActionBarState {
        return stateStore.actionBarState()
    }

    private fun clipboardEntriesForKeyboard(): List<KeyboardClipboardEntry> {
        val primary = clipboardController.primaryText()
            ?.replace(Regex("\\s+"), " ")
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.let { KeyboardClipboardEntry(it) }
        return (listOfNotNull(primary) + stateStore.clipboardEntries())
            .dedupeClipboardEntriesForKeyboard()
            .take(60)
    }

    private fun List<KeyboardClipboardEntry>.dedupeClipboardEntriesForKeyboard(): List<KeyboardClipboardEntry> {
        val byKey = linkedMapOf<String, KeyboardClipboardEntry>()
        forEach { entry ->
            val normalized = entry.content.replace(Regex("\\s+"), " ").trim()
            if (normalized.isBlank()) {
                return@forEach
            }
            val key = normalized.lowercase()
            val existing = byKey[key]
            byKey[key] = KeyboardClipboardEntry(
                content = existing?.content ?: normalized,
                pinned = entry.pinned || existing?.pinned == true,
            )
        }
        return byKey.values.toList()
    }

    private fun shouldSuppressAutoCorrections(): Boolean {
        if (fieldPolicy.privateMode) {
            return true
        }
        return !inputContext.typingCorrectionsAllowed
    }

    private fun commitWithTypingCorrections(
        editor: InputConnectionEditor,
        text: String,
    ): Boolean {
        if (text.isEmpty()) {
            return true
        }

        if (!shouldSuppressAutoCorrections()) {
            if (stateStore.doubleSpacePeriodEnabled && text == " ") {
                when (applyDoubleSpacePeriod(editor)) {
                    TextCorrectionResult.Applied -> {
                        refreshTypingAssistantState(editor)
                        return true
                    }
                    TextCorrectionResult.Failed -> return false
                    TextCorrectionResult.NotApplied -> Unit
                }
            }
            if (stateStore.punctuationAutoSpacingEnabled) {
                val spaced = applyPunctuationAutoSpacing(editor, text)
                if (spaced != null) {
                    val committed = editor.commitText(spaced).reportFailure("Punctuation insertion rejected by field")
                    if (committed) {
                        applyTextExpansionAfterBoundary(editor)
                        refreshTypingAssistantState(editor)
                    }
                    return committed
                }
            }
        }

        val committed = editor.commitText(text).reportFailure("Text input rejected by field")
        if (committed) {
            applyTextExpansionAfterBoundary(editor)
            refreshTypingAssistantState(editor)
        }
        return committed
    }

    private fun applyTextExpansionAfterBoundary(editor: InputConnectionEditor): Boolean {
        if (!typingAssistantAllowed()) {
            return false
        }
        val before = editor.textBeforeCursor(192)?.toString().orEmpty()
        val match = KeyboardTextAssistant.expansionAfterBoundary(before, stateStore.textRules()) ?: return false
        val expanded =
            editor.replaceTextBeforeCursor(
                deleteBeforeCodePoints = match.deleteBeforeCodePoints,
                replacement = match.replacement,
            )
        if (expanded.applied) {
            showStatus("Shortcut expanded")
            return true
        }
        expanded.reportFailure("Shortcut expansion rejected by field")
        return false
    }

    private fun refreshTypingAssistantState(editor: InputConnectionEditor = editor()) {
        if (!editor.hasActiveConnection()) {
            keyboardView?.applyTypingAssistant(autoCapitalized = false, candidates = emptyList())
            return
        }
        val before = editor.textBeforeCursor(128)?.toString().orEmpty()
        val allowed = typingAssistantAllowed()
        keyboardView?.applyTypingAssistant(
            autoCapitalized = allowed && KeyboardTextAssistant.shouldAutoCapitalize(before),
            candidates =
                if (allowed && stateStore.spellingSuggestionsEnabled) {
                    KeyboardTextAssistant.suggestions(
                        textBeforeCursor = before,
                        rules = stateStore.textRules(),
                        frenchEnabled = stateStore.frenchLanguageEnabled,
                        englishEnabled = stateStore.englishLanguageEnabled,
                    )
                } else {
                    emptyList()
                },
        )
    }

    private fun typingAssistantAllowed(): Boolean {
        if (!fieldPolicy.inputAllowed || fieldPolicy.privateMode || !fieldPolicy.snippetsAllowed) {
            return false
        }
        if (isTermuxInputTarget()) {
            return false
        }
        return inputContext.fieldContext in setOf(KeyboardFieldContextMode.Text, KeyboardFieldContextMode.Search)
    }

    private fun applyDoubleSpacePeriod(editor: InputConnectionEditor): TextCorrectionResult {
        val before = editor.textBeforeCursor(3)?.toString().orEmpty()
        if (!before.endsWith(" ") || before.length < 2) {
            return TextCorrectionResult.NotApplied
        }
        val previous = before[before.length - 2]
        if (!previous.isLetterOrDigit()) {
            return TextCorrectionResult.NotApplied
        }
        if (!editor.deleteCodePointsBefore(1).applied) {
            showStatus("Double-space correction rejected by field")
            return TextCorrectionResult.Failed
        }
        val committed = editor.commitText(". ").reportFailure("Double-space correction rejected by field")
        return if (committed) {
            TextCorrectionResult.Applied
        } else {
            TextCorrectionResult.Failed
        }
    }

    private fun applyPunctuationAutoSpacing(
        editor: InputConnectionEditor,
        text: String,
    ): String? {
        if (text.length != 1) {
            return null
        }
        val symbol = text[0]
        val before = editor.textBeforeCursor(1)?.toString().orEmpty()
        return when (symbol) {
            ':', ';', '!', '?' -> {
                val prefix = if (before.isNotEmpty() && !before.last().isWhitespace()) " " else ""
                "$prefix$symbol "
            }
            '.', ',' -> {
                if (before.isEmpty()) {
                    symbol.toString()
                } else {
                    "$symbol "
                }
            }
            else -> null
        }
    }

    private fun sendSoftKey(
        keyCode: Int,
        metaState: Int,
    ): Boolean = editor().sendSoftKey(keyCode, metaState).applied

    private fun sendTermuxClipboardShortcut(keyCode: Int): Boolean {
        return sendSoftKey(
            keyCode = keyCode,
            metaState = KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON or KeyEvent.META_ALT_LEFT_ON,
        )
    }

    private fun isTermuxInputTarget(): Boolean {
        return currentInputEditorInfo?.packageName?.startsWith("com.termux") == true
    }

    private fun isObsidianInputTarget(): Boolean {
        return currentInputEditorInfo?.packageName?.equals("md.obsidian", ignoreCase = true) == true
    }

    private fun editor(): InputConnectionEditor = InputConnectionEditor(currentInputConnection)

    companion object {
        private const val TAG = "CommandGlowsIME"
    }

    private fun KeyboardEditorResult.reportFailure(failureStatus: String): Boolean {
        if (!applied) {
            showStatus(failureStatus)
        }
        return applied
    }

    private fun showStatus(message: String) {
        keyboardView?.setStatus(message)
    }

    private fun showInlineStatus(message: String) {
        keyboardView?.setStatus(message)
    }

    private fun <T> runServiceSafely(
        actionId: String,
        block: () -> T,
    ): T? {
        return try {
            block()
        } catch (error: Throwable) {
            KeyboardCrashReporter.report(
                context = this,
                crashContext =
                    KeyboardCrashContext(
                        actionId = actionId,
                        panel = "service",
                        mode = inputContext.fieldContext.name,
                        layoutProfile = stateStore.layoutProfile.name,
                        compactMode = stateStore.compactModeEnabled,
                        heightScale = stateStore.keyboardHeightScale,
                        themePresetId = stateStore.themeConfig().presetId,
                        themeSource = "service",
                        privateMode = fieldPolicy.privateMode,
                    ),
                error = error,
            )
            keyboardView?.setStatus("Keyboard recovered")
            null
        }
    }

    private enum class TextCorrectionResult {
        NotApplied,
        Applied,
        Failed,
    }
}
