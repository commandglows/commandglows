package expo.modules.floatingoverlay

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.accessibility.AccessibilityNodeInfo

object TextInjectionHelper {

    fun inject(context: Context, text: String): Boolean {
        // Tier 1: Try accessibility service injection
        if (TextInjectionAccessibilityService.instance != null) {
            val injected = injectViaAccessibility(text)
            if (injected) return true
        }

        // Tier 2: Clipboard fallback
        copyToClipboard(context, text)
        return false
    }

    private fun injectViaAccessibility(text: String): Boolean {
        val service = TextInjectionAccessibilityService.instance ?: return false

        try {
            val rootNode = service.rootInActiveWindow ?: return false
            val focusedNode = rootNode.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
                ?: return false

            if (!focusedNode.isEditable) {
                focusedNode.recycle()
                rootNode.recycle()
                return false
            }

            // Try ACTION_SET_TEXT first (most reliable)
            val args = Bundle().apply {
                putCharSequence(
                    AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,
                    text
                )
            }
            val success = focusedNode.performAction(
                AccessibilityNodeInfo.ACTION_SET_TEXT,
                args
            )

            focusedNode.recycle()
            rootNode.recycle()
            return success
        } catch (e: Exception) {
            return false
        }
    }

    private fun copyToClipboard(context: Context, text: String) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("CommandGlows", text)
        clipboard.setPrimaryClip(clip)
    }
}
