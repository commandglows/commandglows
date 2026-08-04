package com.commandglows.app

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.text.InputType
import android.view.accessibility.AccessibilityNodeInfo

object OverlayTextInjectionHelper {
    const val DELIVERY_POLICY_CLIPBOARD_ONLY = "clipboard_only"
    const val DELIVERY_POLICY_INJECTION_AND_CLIPBOARD = "injection_and_clipboard"

    fun deliverText(
        context: Context,
        text: String,
        deliveryPolicy: String = DELIVERY_POLICY_INJECTION_AND_CLIPBOARD,
        allowClipboardCopy: Boolean = true,
    ): Map<String, Any> {
        val normalizedText = text.trim()
        if (normalizedText.isEmpty()) {
            return mapOf(
                "injected" to false,
                "clipboardCopied" to false,
                "deliveryPolicy" to normalizedPolicy(deliveryPolicy),
                "sensitiveField" to false,
                "deliveryMode" to "empty",
                "blockedReason" to "empty_text",
            )
        }
        val dictatedText = "$normalizedText "

        var sensitiveField = false
        val injected =
            injectViaAccessibility(dictatedText) { isSensitive -> sensitiveField = isSensitive }
        val shouldCopyToClipboard =
            allowClipboardCopy &&
                shouldCopyToClipboard(
                    injectionSucceeded = injected,
                    sensitiveField = sensitiveField,
                    deliveryPolicy = deliveryPolicy,
                )
        val clipboardCopied =
            if (shouldCopyToClipboard) {
                copyToClipboard(context, dictatedText)
            } else {
                false
            }
        val deliveryMode =
            when {
                injected -> "accessibility_injection"
                clipboardCopied -> "clipboard_fallback"
                sensitiveField -> "blocked_sensitive"
                else -> "delivery_failed"
            }
        val blockedReason =
            when {
                sensitiveField -> "sensitive_field"
                injected || clipboardCopied -> "none"
                else -> "delivery_unavailable"
            }
        return mapOf(
            "injected" to injected,
            "clipboardCopied" to clipboardCopied,
            "deliveryPolicy" to normalizedPolicy(deliveryPolicy),
            "sensitiveField" to sensitiveField,
            "deliveryMode" to deliveryMode,
            "blockedReason" to blockedReason,
        )
    }

    private fun shouldCopyToClipboard(
        injectionSucceeded: Boolean,
        sensitiveField: Boolean,
        deliveryPolicy: String,
    ): Boolean {
        if (sensitiveField) {
            return false
        }
        return when (normalizedPolicy(deliveryPolicy)) {
            DELIVERY_POLICY_CLIPBOARD_ONLY -> true
            DELIVERY_POLICY_INJECTION_AND_CLIPBOARD -> !injectionSucceeded
            else -> false
        }
    }

    private fun normalizedPolicy(policy: String): String {
        return if (policy == DELIVERY_POLICY_INJECTION_AND_CLIPBOARD) {
            DELIVERY_POLICY_INJECTION_AND_CLIPBOARD
        } else {
            DELIVERY_POLICY_CLIPBOARD_ONLY
        }
    }

    private fun injectViaAccessibility(text: String, onSensitive: (Boolean) -> Unit): Boolean {
        val service = OverlayAccessibilityService.instance ?: return false
        val rootNode = service.rootInActiveWindow ?: return false
        val focusedNode = rootNode.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
        if (focusedNode == null) {
            rootNode.recycle()
            return false
        }
        onSensitive(false)
        return try {
            if (isSensitiveField(focusedNode)) {
                onSensitive(true)
                false
            } else if (!focusedNode.isEditable) {
                false
            } else {
                val args = Bundle().apply {
                    putCharSequence(
                        AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                        text,
                    )
                }
                focusedNode.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
            }
        } catch (_: Exception) {
            false
        } finally {
            focusedNode.recycle()
            rootNode.recycle()
        }
    }

    private fun isSensitiveField(node: AccessibilityNodeInfo): Boolean {
        if (node.isPassword) {
            return true
        }
        val inputType = node.inputType

        val classType = inputType and InputType.TYPE_MASK_CLASS
        val variation = inputType and InputType.TYPE_MASK_VARIATION
        val isTextPassword =
            classType == InputType.TYPE_CLASS_TEXT &&
                (
                    variation == InputType.TYPE_TEXT_VARIATION_PASSWORD ||
                        variation == InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD ||
                        variation == InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
                )
        val isNumberPassword =
            classType == InputType.TYPE_CLASS_NUMBER &&
                variation == InputType.TYPE_NUMBER_VARIATION_PASSWORD
        return isTextPassword || isNumberPassword
    }

    private fun copyToClipboard(context: Context, text: String): Boolean {
        return try {
            val clipboard =
                context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val clip = ClipData.newPlainText("CommandGlows", text)
            clipboard.setPrimaryClip(clip)
            true
        } catch (_: Exception) {
            false
        }
    }
}
