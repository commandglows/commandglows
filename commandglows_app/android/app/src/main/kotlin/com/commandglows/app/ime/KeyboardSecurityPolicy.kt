package com.commandglows.app.ime

import android.text.InputType
import android.view.inputmethod.EditorInfo

data class KeyboardFieldPolicy(
    val privateMode: Boolean,
    val reason: String,
    val inputAllowed: Boolean,
    val voiceAllowed: Boolean,
    val clipboardAllowed: Boolean,
    val snippetsAllowed: Boolean,
    val learningAllowed: Boolean,
)

object KeyboardSecurityPolicy {
    fun evaluate(
        editorInfo: EditorInfo?,
        privacyMode: String,
        clipboardSensitiveFieldHistoryEnabled: Boolean = false,
    ): KeyboardFieldPolicy {
        if (privacyMode == KeyboardStateStore.PRIVACY_STRICT) {
            return privatePolicy("Strict privacy mode")
        }
        val info = editorInfo ?: return privatePolicy("No focused field")
        if (privacyMode != KeyboardStateStore.PRIVACY_STANDARD) {
            if (hasNoPersonalizedLearningFlag(info)) {
                return privatePolicy("Private field", clipboardSensitiveFieldHistoryEnabled)
            }
            if (hasSensitiveInputType(info.inputType)) {
                return privatePolicy("Sensitive field", clipboardSensitiveFieldHistoryEnabled)
            }
            if (hasSensitivePrivateOptions(info.privateImeOptions)) {
                return privatePolicy("Host app private field", clipboardSensitiveFieldHistoryEnabled)
            }
        }
        return KeyboardFieldPolicy(
            privateMode = false,
            reason = "Standard field",
            inputAllowed = true,
            voiceAllowed = true,
            clipboardAllowed = true,
            snippetsAllowed = true,
            learningAllowed = true,
        )
    }

    private fun privatePolicy(
        reason: String,
        clipboardAllowed: Boolean = false,
    ): KeyboardFieldPolicy =
        KeyboardFieldPolicy(
            privateMode = true,
            reason = reason,
            inputAllowed = true,
            voiceAllowed = false,
            clipboardAllowed = clipboardAllowed,
            snippetsAllowed = false,
            learningAllowed = false,
        )

    private fun hasNoPersonalizedLearningFlag(info: EditorInfo): Boolean =
        (info.imeOptions and EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING) != 0

    private fun hasSensitiveInputType(inputType: Int): Boolean {
        val variation = inputType and InputType.TYPE_MASK_VARIATION
        val klass = inputType and InputType.TYPE_MASK_CLASS
        if (klass == InputType.TYPE_CLASS_TEXT) {
            return variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
                variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
                variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
        }
        if (klass == InputType.TYPE_CLASS_NUMBER) {
            return variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD
        }
        return false
    }

    private fun hasSensitivePrivateOptions(privateImeOptions: String?): Boolean {
        val normalized = privateImeOptions?.lowercase() ?: return false
        return listOf("password", "passcode", "otp", "one_time", "one-time", "creditcard")
            .any(normalized::contains)
    }
}
