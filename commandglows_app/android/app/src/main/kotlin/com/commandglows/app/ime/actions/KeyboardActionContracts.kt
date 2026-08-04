package com.commandglows.app.ime.actions

import com.commandglows.app.ime.KeyboardFieldPolicy
import com.commandglows.app.ime.KeyboardKeyAction
import com.commandglows.app.ime.KeyboardKeySpec
import com.commandglows.app.ime.KeyboardLayoutMode
import com.commandglows.app.ime.KeyboardPanelMode
import com.commandglows.app.ime.KeyboardClipboardEntry
import com.commandglows.app.ime.KeyboardTextRule

enum class KeyboardActionLongPressBehavior(
    val wireValue: String,
) {
    PinAction("pin_action"),
    AttachContextRow("attach_context_row"),
    ;

    companion object {
        fun fromRaw(raw: String?): KeyboardActionLongPressBehavior {
            return entries.firstOrNull { it.wireValue == raw } ?: AttachContextRow
        }
    }
}

enum class KeyboardActionAvailabilityPolicy {
    Always,
    ClipboardAllowed,
    VoiceAllowed,
    SnippetsAllowed,
    MediaControlsEnabled,
}

enum class KeyboardActionRowClosePolicy {
    ManualOnly,
}

data class KeyboardActionDescriptor(
    val id: String,
    val label: String,
    val glyph: String,
    val accessibilityLabel: String,
    val tapAction: KeyboardKeyAction,
    val availabilityPolicy: KeyboardActionAvailabilityPolicy = KeyboardActionAvailabilityPolicy.Always,
    val pinnable: Boolean = true,
    val adaptiveEligible: Boolean = true,
    val sensitiveInPrivate: Boolean = false,
    val rowProvider: KeyboardActionRowProvider? = null,
)

data class KeyboardActionRowSpec(
    val rowId: String,
    val dedupeKey: String,
    val items: List<KeyboardKeySpec>,
    val visiblePageKeyCount: Int? = null,
    val pagedHorizontal: Boolean = false,
    val closePolicy: KeyboardActionRowClosePolicy = KeyboardActionRowClosePolicy.ManualOnly,
    val actionSurface: Boolean = true,
)

data class KeyboardActionProviderContext(
    val descriptor: KeyboardActionDescriptor,
    val fieldPolicy: KeyboardFieldPolicy,
    val recentEmojis: List<String> = emptyList(),
    val recentSymbols: List<String> = emptyList(),
    val clipboardEntries: List<KeyboardClipboardEntry> = emptyList(),
    val snippets: List<KeyboardTextRule> = emptyList(),
)

fun interface KeyboardActionRowProvider {
    fun buildRows(context: KeyboardActionProviderContext): List<KeyboardActionRowSpec>
}

data class KeyboardAttachedActionRowState(
    val providerActionId: String,
    val rowId: String,
    val dedupeKey: String,
)

data class KeyboardActionBarState(
    val orderedActionIds: List<String> = emptyList(),
    val pinnedActionIds: Set<String> = emptySet(),
    val attachedRows: List<KeyboardAttachedActionRowState> = emptyList(),
    val rowPageById: Map<String, Int> = emptyMap(),
    val adaptiveUsageScoreById: Map<String, Long> = emptyMap(),
    val longPressBehavior: KeyboardActionLongPressBehavior = KeyboardActionLongPressBehavior.AttachContextRow,
)

data class KeyboardActionEnvironment(
    val fieldPolicy: KeyboardFieldPolicy,
    val layoutMode: KeyboardLayoutMode,
    val panelMode: KeyboardPanelMode,
    val clipboardAllowed: Boolean,
    val voiceAllowed: Boolean,
    val snippetsAllowed: Boolean,
    val mediaControlsEnabled: Boolean,
    val recentEmojis: List<String> = emptyList(),
    val recentSymbols: List<String> = emptyList(),
    val clipboardEntries: List<KeyboardClipboardEntry> = emptyList(),
    val snippets: List<KeyboardTextRule> = emptyList(),
    val customActionRows: List<KeyboardActionRowSpec> = emptyList(),
)

data class KeyboardActionTapResult(
    val nextState: KeyboardActionBarState,
    val command: KeyboardKeyAction?,
    val status: String? = null,
)

data class KeyboardActionLongPressResult(
    val nextState: KeyboardActionBarState,
    val consumed: Boolean,
    val status: String? = null,
)

data class KeyboardActionRenderSnapshot(
    val state: KeyboardActionBarState,
    val mainRow: KeyboardActionRowSpec,
    val attachedRows: List<KeyboardActionRowSpec>,
)
