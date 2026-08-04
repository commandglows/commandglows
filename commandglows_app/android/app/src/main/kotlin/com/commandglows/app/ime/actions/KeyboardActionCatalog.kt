package com.commandglows.app.ime.actions

import com.commandglows.app.ime.KeyboardKeyAction
import com.commandglows.app.ime.KeyboardKeySpec
import com.commandglows.app.ime.KeyboardLayoutMode
import com.commandglows.app.ime.KeyboardPanelMode
import com.commandglows.app.ime.KeyboardStateStore

class KeyboardActionCatalog private constructor(
    val descriptorsById: Map<String, KeyboardActionDescriptor>,
    val defaultOrder: List<String>,
    val minimalPinnedActionIds: Set<String>,
) {
    fun descriptor(actionId: String): KeyboardActionDescriptor? = descriptorsById[actionId]

    fun orderedDescriptors(ids: List<String>): List<KeyboardActionDescriptor> {
        return ids.mapNotNull { descriptorsById[it] }
    }

    fun defaultDescriptors(): List<KeyboardActionDescriptor> {
        return defaultOrder.mapNotNull { descriptorsById[it] }
    }

    fun isActionActive(
        descriptor: KeyboardActionDescriptor,
        environment: KeyboardActionEnvironment,
        state: KeyboardActionBarState,
    ): Boolean {
        return when (descriptor.id) {
            "numbers" -> environment.layoutMode == KeyboardLayoutMode.Numbers ||
                state.attachedRows.any { it.providerActionId == descriptor.id }
            "accents" -> environment.panelMode == KeyboardPanelMode.Accents ||
                state.attachedRows.any { it.providerActionId == descriptor.id }
            "symbols" -> environment.layoutMode == KeyboardLayoutMode.Symbols ||
                state.attachedRows.any { it.providerActionId == descriptor.id }
            "navigation" -> environment.layoutMode == KeyboardLayoutMode.Navigation ||
                environment.panelMode == KeyboardPanelMode.Navigation ||
                state.attachedRows.any { it.providerActionId == descriptor.id }
            "emoji" -> environment.panelMode == KeyboardPanelMode.Emoji ||
                state.attachedRows.any { it.providerActionId == descriptor.id }
            "clipboard" -> environment.panelMode == KeyboardPanelMode.Clipboard ||
                environment.panelMode == KeyboardPanelMode.ClipboardFull ||
                state.attachedRows.any { it.providerActionId == descriptor.id }
            "snippets" -> environment.panelMode == KeyboardPanelMode.Snippets ||
                state.attachedRows.any { it.providerActionId == descriptor.id }
            "media" -> environment.panelMode == KeyboardPanelMode.Media ||
                state.attachedRows.any { it.providerActionId == descriptor.id }
            "prefs" -> environment.panelMode == KeyboardPanelMode.Settings
            else -> false
        }
    }

    companion object {
        fun default(): KeyboardActionCatalog {
            val numberProvider =
                KeyboardActionRowProvider {
                    listOf(
                        KeyboardActionRowSpec(
                            rowId = "action-row-numbers",
                            dedupeKey = "numbers",
                            visiblePageKeyCount = 10,
                            pagedHorizontal = true,
                            items =
                                listOf(
                                    textActionKey("1"),
                                    textActionKey("2"),
                                    textActionKey("3"),
                                    textActionKey("4"),
                                    textActionKey("5"),
                                    textActionKey("6"),
                                    textActionKey("7"),
                                    textActionKey("8"),
                                    textActionKey("9"),
                                    textActionKey("0"),
                                    textActionKey("+"),
                                    textActionKey("-"),
                                    textActionKey("="),
                                    textActionKey("$"),
                                    textActionKey("/"),
                                    textActionKey("%"),
                                    textActionKey("(", output = "("),
                                    textActionKey(")", output = ")"),
                                    textActionKey("?"),
                                    textActionKey("!"),
                                ),
                        ),
                    )
                }

            val navigationProvider =
                KeyboardActionRowProvider {
                    listOf(
                        KeyboardActionRowSpec(
                            rowId = "action-row-navigation",
                            dedupeKey = "navigation",
                            visiblePageKeyCount = 10,
                            pagedHorizontal = true,
                            items =
                                listOf(
                                    actionRowKey("pinned-nav-left", "←", KeyboardKeyAction.NavigateCharLeft),
                                    actionRowKey("pinned-nav-right", "→", KeyboardKeyAction.NavigateCharRight),
                                    actionRowKey("pinned-nav-start", "Début", KeyboardKeyAction.NavigateLineStart, weight = 1.15f),
                                    actionRowKey("pinned-nav-end", "Fin", KeyboardKeyAction.NavigateLineEnd),
                                    actionRowKey("pinned-nav-word-left", "Word←", KeyboardKeyAction.NavigateWordLeft, weight = 1.15f),
                                    actionRowKey("pinned-nav-word-right", "Word→", KeyboardKeyAction.NavigateWordRight, weight = 1.15f),
                                    actionRowKey("pinned-nav-sent-left", "Sent←", KeyboardKeyAction.NavigateSentenceLeft, weight = 1.15f),
                                    actionRowKey("pinned-nav-sent-right", "Sent→", KeyboardKeyAction.NavigateSentenceRight, weight = 1.15f),
                                    actionRowKey("pinned-nav-del-before", "Del←", KeyboardKeyAction.Backspace),
                                    actionRowKey("pinned-nav-del-after", "Del→", KeyboardKeyAction.ForwardDelete),
                                    actionRowKey("pinned-nav-line-up", "↑", KeyboardKeyAction.NavigateLineUp),
                                    actionRowKey("pinned-nav-line-down", "↓", KeyboardKeyAction.NavigateLineDown),
                                    actionRowKey("pinned-nav-tab", "Tab", KeyboardKeyAction.InsertTab),
                                    actionRowKey("pinned-nav-del-sent-before", "DelS←", KeyboardKeyAction.DeleteSentenceBefore, weight = 1.1f),
                                    actionRowKey("pinned-nav-del-sent-after", "DelS→", KeyboardKeyAction.DeleteSentenceAfter, weight = 1.1f),
                                    actionRowKey("pinned-nav-del-word-before", "DelW←", KeyboardKeyAction.DeleteWordBefore, weight = 1.1f),
                                    actionRowKey("pinned-nav-del-word-after", "DelW→", KeyboardKeyAction.DeleteWordAfter, weight = 1.1f),
                                ),
                        ),
                    )
                }

            val symbolsProvider =
                KeyboardActionRowProvider { context ->
                    listOf(
                        KeyboardActionRowSpec(
                            rowId = "action-row-symbols",
                            dedupeKey = "symbols",
                            visiblePageKeyCount = 10,
                            pagedHorizontal = true,
                            items =
                                rankedTextValues(listOf(
                                    "[", "]", "{", "}", "#", "%", "^", "*", "+", "=",
                                    "_", "\\", "|", "~", "<", ">", "$", "€", "£", "¥",
                                    ".", ",", "?", "!", "'", "`", "•",
                                    "(", ")", "«", "»", "\"", ":", ";", "&", "@", "§",
                                    "©", "®", "™", "°", "×", "÷", "±", "≠", "≈", "∞",
                                    "…", "–", "—", "·", "¡", "¿", "‰",
                                    "←", "→", "↑", "↓", "↔", "↕", "↩", "↪", "⌫", "⌦",
                                    "✓", "✕", "★", "☆", "◆", "◇", "○", "●", "□", "■",
                                    "≤", "≥", "∑", "√", "π", "µ", "Ω",
                                ), context.recentSymbols)
                                    .map { textActionKey(it, idPrefix = "action-symbol") },
                        ),
                    )
                }

            val accentsProvider =
                KeyboardActionRowProvider { context ->
                    listOf(
                        KeyboardActionRowSpec(
                            rowId = "action-row-accents",
                            dedupeKey = "accents",
                            visiblePageKeyCount = 10,
                            pagedHorizontal = true,
                            items =
                                rankedTextValues(
                                    listOf(
                                        "é", "è", "ê", "ë", "à", "â", "ä", "ç", "ù", "û",
                                        "ü", "î", "ï", "ô", "ö", "œ", "æ", "É", "È", "Ê",
                                    ),
                                    context.recentSymbols,
                                )
                                    .map { textActionKey(it, idPrefix = "action-accent") },
                        ),
                    )
                }

            val emojiProvider =
                KeyboardActionRowProvider { context ->
                    listOf(
                        KeyboardActionRowSpec(
                            rowId = "action-row-emoji",
                            dedupeKey = "emoji",
                            visiblePageKeyCount = 10,
                            pagedHorizontal = true,
                            items =
                                rankedTextValues(
                                    listOf(
                                        "😀", "😂", "😊", "😍", "🔥", "✨", "👏", "❤️", "👍", "🙏",
                                        "✅", "💡", "🎯", "🌿", "🍔", "💻", "🥳", "🙌", "🚀", "⭐",
                                    ),
                                    context.recentEmojis,
                                )
                                    .map { textActionKey(it, idPrefix = "action-emoji") },
                        ),
                    )
                }

            val clipboardProvider =
                KeyboardActionRowProvider { context ->
                    if (context.fieldPolicy.privateMode || !context.fieldPolicy.clipboardAllowed) {
                        emptyList()
                    } else {
                        listOf(
                            KeyboardActionRowSpec(
                                rowId = "action-row-clipboard",
                                dedupeKey = "clipboard",
                                visiblePageKeyCount = 10,
                                pagedHorizontal = true,
                                items =
                                    clipboardActionKeys("clip-row") +
                                        context.clipboardEntries
                                            .filter { it.content.isNotBlank() }
                                            .distinctBy { it.content.replace(Regex("\\s+"), " ").trim().lowercase() }
                                            .take(5)
                                            .mapIndexed { index, entry -> clipboardEntryKey(index, entry.content) },
                            ),
                        )
                    }
                }

            val mediaProvider =
                KeyboardActionRowProvider {
                    listOf(
                        KeyboardActionRowSpec(
                            rowId = "action-row-media",
                            dedupeKey = "media",
                            visiblePageKeyCount = 10,
                            pagedHorizontal = true,
                            items =
                                listOf(
                                    actionRowKey("media-row-prev", "Prev", KeyboardKeyAction.MediaPrevious),
                                    actionRowKey("media-row-play", ">||", KeyboardKeyAction.MediaPlayPause, weight = 1.15f),
                                    actionRowKey("media-row-next", "Next", KeyboardKeyAction.MediaNext),
                                    actionRowKey("media-row-now", "Now", KeyboardKeyAction.MediaNowPlaying),
                                    actionRowKey("media-row-open", "App", KeyboardKeyAction.OpenMediaApp),
                                    actionRowKey("media-row-stop", "Stop", KeyboardKeyAction.MediaStop),
                                    actionRowKey("media-row-volume-down", "Vol-", KeyboardKeyAction.VolumeDown),
                                    actionRowKey("media-row-volume-up", "Vol+", KeyboardKeyAction.VolumeUp),
                                    actionRowKey("media-row-brightness-down", "Bri-", KeyboardKeyAction.BrightnessDown),
                                    actionRowKey("media-row-brightness-up", "Bri+", KeyboardKeyAction.BrightnessUp),
                                ),
                        ),
                    )
                }

            val voiceProvider =
                KeyboardActionRowProvider {
                    listOf(
                        KeyboardActionRowSpec(
                            rowId = "action-row-voice",
                            dedupeKey = "voice",
                            visiblePageKeyCount = 10,
                            pagedHorizontal = true,
                            items =
                                listOf(
                                    actionRowKey("voice-row-toggle", "Rec", KeyboardKeyAction.Voice),
                                    actionRowKey("voice-row-pause", "Pause", KeyboardKeyAction.VoicePause, weight = 1.15f),
                                    actionRowKey("voice-row-resume", "Repr.", KeyboardKeyAction.VoiceResume, weight = 1.15f),
                                    actionRowKey("voice-row-restart", "Début", KeyboardKeyAction.VoiceRestart, weight = 1.15f),
                                    actionRowKey("voice-row-cancel", "Annul.", KeyboardKeyAction.VoiceCancel, weight = 1.15f),
                                ),
                        ),
                    )
                }

            val snippetsProvider =
                KeyboardActionRowProvider { context ->
                    val snippetItems =
                        context.snippets.take(8).mapIndexed { index, snippet ->
                            KeyboardKeySpec(
                                id = "snippet-row-$index",
                                label = snippet.trigger.ifBlank { snippet.replacement.take(12) },
                                action = KeyboardKeyAction.InsertSnippetOne,
                                suggestion = snippet.replacement,
                                weight = 1.8f,
                            )
                        }
                    listOf(
                        KeyboardActionRowSpec(
                            rowId = "action-row-snippets",
                            dedupeKey = "snippets",
                            visiblePageKeyCount = 10,
                            pagedHorizontal = true,
                            items =
                                if (snippetItems.isEmpty()) {
                                    listOf(actionRowKey("snippet-open", "All", KeyboardKeyAction.OpenCommandGlowsSnippets))
                                } else {
                                    snippetItems + actionRowKey("snippet-open", "All", KeyboardKeyAction.OpenCommandGlowsSnippets)
                                },
                        ),
                    )
                }

            val descriptors =
                listOf(
                    KeyboardActionDescriptor("numbers", "123", "123", "Numbers keyboard", KeyboardKeyAction.ModeNumbers, rowProvider = numberProvider),
                    KeyboardActionDescriptor("symbols", "#+=", "#+=", "Symbols keyboard", KeyboardKeyAction.ModeSymbols, rowProvider = symbolsProvider),
                    KeyboardActionDescriptor("navigation", "Nav", "Nav", "Navigation keyboard", KeyboardKeyAction.ModeNavigation, rowProvider = navigationProvider),
                    KeyboardActionDescriptor("accents", "Acc", "Acc", "Accent panel", KeyboardKeyAction.ToggleAccentPanel, rowProvider = accentsProvider),
                    KeyboardActionDescriptor(
                        "emoji",
                        "Emoji",
                        "Emoji",
                        "Emoji panel",
                        KeyboardKeyAction.ToggleEmojiPanel,
                        sensitiveInPrivate = true,
                        rowProvider = emojiProvider,
                    ),
                    KeyboardActionDescriptor(
                        "clipboard",
                        "Clip",
                        "Clip",
                        "Clipboard actions",
                        KeyboardKeyAction.ToggleClipboardPanel,
                        availabilityPolicy = KeyboardActionAvailabilityPolicy.ClipboardAllowed,
                        sensitiveInPrivate = true,
                        rowProvider = clipboardProvider,
                    ),
                    KeyboardActionDescriptor(
                        "snippets",
                        "Snip",
                        "Snip",
                        "Snippets panel",
                        KeyboardKeyAction.ToggleSnippetsPanel,
                        availabilityPolicy = KeyboardActionAvailabilityPolicy.SnippetsAllowed,
                        sensitiveInPrivate = true,
                        rowProvider = snippetsProvider,
                    ),
                    KeyboardActionDescriptor(
                        "media",
                        "Media",
                        "Media",
                        "Media controls",
                        KeyboardKeyAction.ToggleMediaPanel,
                        availabilityPolicy = KeyboardActionAvailabilityPolicy.MediaControlsEnabled,
                        rowProvider = mediaProvider,
                    ),
                    KeyboardActionDescriptor(
                        "voice",
                        "Mic",
                        "Mic",
                        "Voice dictation",
                        KeyboardKeyAction.Voice,
                        availabilityPolicy = KeyboardActionAvailabilityPolicy.VoiceAllowed,
                        sensitiveInPrivate = true,
                        rowProvider = voiceProvider,
                    ),
                    KeyboardActionDescriptor("prefs", "Prefs", "Prefs", "Keyboard settings", KeyboardKeyAction.ToggleSettingsPanel, pinnable = false, adaptiveEligible = false),
                )

            val ids = descriptors.map { it.id }
            return KeyboardActionCatalog(
                descriptorsById = descriptors.associateBy { it.id },
                defaultOrder = ids,
                minimalPinnedActionIds = emptySet(),
            )
        }

        fun defaultLongPressBehavior(): KeyboardActionLongPressBehavior {
            return KeyboardActionLongPressBehavior.fromRaw(
                KeyboardStateStore.DEFAULT_ACTION_BAR_LONG_PRESS_BEHAVIOR,
            )
        }

        private fun textActionKey(
            label: String,
            output: String = label,
            weight: Float = 1f,
            idPrefix: String = "action-text",
        ): KeyboardKeySpec {
            return KeyboardKeySpec(
                id = "$idPrefix-${output.codePoints().toArray().joinToString("-")}",
                label = label,
                action = KeyboardKeyAction.Text,
                glyph = com.commandglows.app.ime.KeyboardKeyGlyph(primary = output),
                keyValue = com.commandglows.app.ime.KeyboardKeyValue.text(output, label),
                weight = weight,
            )
        }

        private fun actionRowKey(
            id: String,
            label: String,
            action: KeyboardKeyAction,
            weight: Float = 1f,
        ): KeyboardKeySpec {
            return KeyboardKeySpec(
                id = id,
                label = label,
                action = action,
                weight = weight,
            )
        }

        private fun clipboardActionKeys(idPrefix: String): List<KeyboardKeySpec> {
            return listOf(
                actionRowKey("$idPrefix-all", "All", KeyboardKeyAction.SelectAll),
                actionRowKey("$idPrefix-cut", "Cut", KeyboardKeyAction.CutSelection),
                actionRowKey("$idPrefix-copy", "Copy", KeyboardKeyAction.CopySelection),
                actionRowKey("$idPrefix-paste", "Paste", KeyboardKeyAction.PasteClipboard),
                actionRowKey("$idPrefix-plain", "Plain", KeyboardKeyAction.PastePlainClipboard),
            )
        }

        private fun rankedTextValues(
            values: List<String>,
            recents: List<String>,
        ): List<String> {
            val scoreByValue =
                recents
                    .distinct()
                    .mapIndexed { index, value -> value to (recents.size - index).toLong() }
                    .toMap()
            return KeyboardAdaptiveUsageRanker.rankByUsage(values, scoreByValue, idOf = { it })
        }

        private fun clipboardEntryKey(
            index: Int,
            content: String,
        ): KeyboardKeySpec {
            val normalized = content.replace(Regex("\\s+"), " ").trim()
            val label = if (normalized.length <= 18) normalized else normalized.take(17) + "..."
            return KeyboardKeySpec(
                id = "clip-row-entry-$index",
                label = label,
                action = KeyboardKeyAction.InsertClipboardEntry,
                suggestion = normalized,
                weight = 1.5f,
            )
        }
    }
}
