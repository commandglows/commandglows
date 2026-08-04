package com.commandglows.app.ime

import android.text.InputType
import android.view.inputmethod.EditorInfo
import java.text.Normalizer

data class KeyboardInputContext(
    val fieldContext: KeyboardFieldContextMode,
    val enterLabel: String,
    val actionId: Int,
    val selectionModeAllowed: Boolean,
    val typingCorrectionsAllowed: Boolean,
)

object KeyboardInputContextResolver {
    fun resolve(editorInfo: EditorInfo?): KeyboardInputContext {
        val info = editorInfo ?: return defaultContext()
        val action = info.imeOptions and EditorInfo.IME_MASK_ACTION
        val fieldContext = contextFromInputType(info.inputType, action)
        return KeyboardInputContext(
            fieldContext = fieldContext,
            enterLabel = enterLabel(info),
            actionId = actionId(info),
            selectionModeAllowed = selectionModeAllowed(info.inputType),
            typingCorrectionsAllowed = typingCorrectionsAllowed(info, fieldContext),
        )
    }

    private fun defaultContext(): KeyboardInputContext {
        return KeyboardInputContext(
            fieldContext = KeyboardFieldContextMode.Text,
            enterLabel = "Enter",
            actionId = EditorInfo.IME_ACTION_NONE,
            selectionModeAllowed = false,
            typingCorrectionsAllowed = false,
        )
    }

    private fun contextFromInputType(
        inputType: Int,
        action: Int,
    ): KeyboardFieldContextMode {
        val klass = inputType and InputType.TYPE_MASK_CLASS
        val variation = inputType and InputType.TYPE_MASK_VARIATION
        if (klass == InputType.TYPE_CLASS_PHONE) {
            return KeyboardFieldContextMode.Phone
        }
        if (klass == InputType.TYPE_CLASS_NUMBER || klass == InputType.TYPE_CLASS_DATETIME) {
            return KeyboardFieldContextMode.Number
        }
        if (klass == InputType.TYPE_CLASS_TEXT && isPasswordVariation(variation)) {
            return KeyboardFieldContextMode.Password
        }
        if (klass == InputType.TYPE_CLASS_TEXT && variation == InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS) {
            return KeyboardFieldContextMode.Email
        }
        if (klass == InputType.TYPE_CLASS_TEXT && variation == InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS) {
            return KeyboardFieldContextMode.Email
        }
        if (klass == InputType.TYPE_CLASS_TEXT && variation == InputType.TYPE_TEXT_VARIATION_URI) {
            return KeyboardFieldContextMode.Url
        }
        if (action == EditorInfo.IME_ACTION_SEARCH) {
            return KeyboardFieldContextMode.Search
        }
        return KeyboardFieldContextMode.Text
    }

    private fun isPasswordVariation(variation: Int): Boolean {
        return variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
            variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
            variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
    }

    private fun typingCorrectionsAllowed(
        info: EditorInfo,
        fieldContext: KeyboardFieldContextMode,
    ): Boolean {
        if (fieldContext in noCorrectionContexts) {
            return false
        }
        val variation = info.inputType and InputType.TYPE_MASK_VARIATION
        if (variation == InputType.TYPE_TEXT_VARIATION_FILTER) {
            return false
        }
        if ((info.inputType and InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS) != 0) {
            return false
        }
        return !hasCorrectionSuppressionHint(info)
    }

    private fun hasCorrectionSuppressionHint(info: EditorInfo): Boolean {
        val hintText =
            listOfNotNull(
                info.hintText?.toString(),
                info.privateImeOptions,
            ).joinToString(separator = " ").normalizedForKeywordMatching()
        if (hintText.isBlank()) {
            return false
        }
        return correctionSuppressionKeywords.any(hintText::contains)
    }

    private fun enterLabel(info: EditorInfo): String {
        val action = info.imeOptions and EditorInfo.IME_MASK_ACTION
        return when {
            info.actionLabel != null -> info.actionLabel.toString()
            action == EditorInfo.IME_ACTION_SEARCH -> "Search"
            action == EditorInfo.IME_ACTION_SEND -> "Send"
            action == EditorInfo.IME_ACTION_GO -> "Go"
            action == EditorInfo.IME_ACTION_NEXT -> "Next"
            action == EditorInfo.IME_ACTION_DONE -> "Done"
            else -> "Enter"
        }
    }

    private fun actionId(info: EditorInfo): Int {
        if (info.actionLabel != null) {
            return info.actionId
        }
        return info.imeOptions and EditorInfo.IME_MASK_ACTION
    }

    private fun selectionModeAllowed(inputType: Int): Boolean {
        return (inputType and InputType.TYPE_MASK_CLASS) != InputType.TYPE_NULL
    }

    private val noCorrectionContexts =
        setOf(
            KeyboardFieldContextMode.Email,
            KeyboardFieldContextMode.Url,
            KeyboardFieldContextMode.Password,
            KeyboardFieldContextMode.Phone,
            KeyboardFieldContextMode.Number,
        )

    private val correctionSuppressionKeywords =
        listOf(
            "email",
            "e-mail",
            "username",
            "user name",
            "login",
            "identifiant",
            "handle",
            "otp",
            "2fa",
            "mfa",
            "passcode",
            "pin",
            "code",
            "verification",
            "domain",
            "domaine",
            "hostname",
            "host name",
            "url",
            "uri",
            "api key",
            "apikey",
            "token",
            "secret",
            "licence",
            "license",
            "serial",
            "iban",
            "bic",
            "swift",
            "card number",
            "numero de carte",
            "coupon",
            "promo",
        )

    private fun String.normalizedForKeywordMatching(): String {
        return Normalizer.normalize(this, Normalizer.Form.NFD)
            .replace(Regex("\\p{Mn}+"), "")
            .lowercase()
    }
}
