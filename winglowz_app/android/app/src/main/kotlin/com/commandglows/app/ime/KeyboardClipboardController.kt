package com.commandglows.app.ime

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.view.inputmethod.InputConnection

class KeyboardClipboardController(private val context: Context) {
    private val clipboard =
        context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

    fun copySelection(inputConnection: InputConnection?): Boolean {
        val selectedText = InputConnectionEditor(inputConnection).selectedText()?.toString()?.trim()
        if (selectedText.isNullOrEmpty()) {
            return false
        }
        val clip = ClipData.newPlainText("CommandGlows selection", selectedText)
        clipboard.setPrimaryClip(clip)
        recordClipboardHistoryEntry(selectedText, "copy_selection")
        return true
    }

    fun pastePrimaryText(
        inputConnection: InputConnection?,
        allowSensitiveClip: Boolean = false,
    ): Boolean {
        val clip = clipboard.primaryClip ?: return false
        val value = primaryText() ?: return false
        val pasted = InputConnectionEditor(inputConnection).commitText(value).applied
        if (pasted && (!clip.isSensitive() || allowSensitiveClip)) {
            recordClipboardHistoryEntry(value, "paste_primary_clip")
        }
        return pasted
    }

    fun recordPrimaryClipHistoryEntry(
        action: String,
        allowSensitiveClip: Boolean = false,
    ): String? {
        val clip = clipboard.primaryClip ?: return null
        if (clip.isSensitive() && !allowSensitiveClip) {
            return null
        }
        val value = primaryText() ?: return null
        recordClipboardHistoryEntry(value, action)
        return value
    }

    fun recordClipboardHistoryEntry(content: String, action: String) {
        KeyboardClipboardEventQueue.enqueue(
            context = context,
            content = content,
            source = "keyboard_clipboard",
            action = action,
        )
    }

    fun primaryText(): String? {
        val clip = clipboard.primaryClip ?: return null
        val item = clip.getItemAt(0) ?: return null
        return item.coerceToText(context)?.toString()?.trim()?.takeIf { it.isNotBlank() }
    }

    fun primaryTextAllowedForHistory(allowSensitiveClip: Boolean = false): String? {
        val clip = clipboard.primaryClip ?: return null
        if (clip.isSensitive() && !allowSensitiveClip) {
            return null
        }
        return primaryText()
    }

    private fun ClipData.isSensitive(): Boolean {
        val extras = description.extras ?: return false
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            extras.getBoolean(ClipDescription.EXTRA_IS_SENSITIVE, false)
        } else {
            extras.getBoolean("android.content.extra.IS_SENSITIVE", false)
        }
    }
}
