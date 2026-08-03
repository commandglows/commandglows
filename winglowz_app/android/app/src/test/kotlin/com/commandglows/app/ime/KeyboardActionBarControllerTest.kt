package com.commandglows.app.ime

import com.commandglows.app.ime.actions.KeyboardActionBarController
import com.commandglows.app.ime.actions.KeyboardActionBarState
import com.commandglows.app.ime.actions.KeyboardActionEnvironment
import com.commandglows.app.ime.actions.KeyboardAttachedActionRowState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyboardActionBarControllerTest {
    private val controller = KeyboardActionBarController()

    @Test
    fun `long press toggles pinned action row on and off`() {
        val pinned =
            controller.onLongPress(
                actionId = "numbers",
                state = KeyboardActionBarState(),
                environment = environment(),
            )

        assertEquals("Action pinned", pinned.status)
        assertTrue("numbers" in pinned.nextState.pinnedActionIds)
        assertTrue(pinned.nextState.attachedRows.any { it.providerActionId == "numbers" })

        val unpinned =
            controller.onLongPress(
                actionId = "numbers",
                state = pinned.nextState,
                environment = environment(),
            )

        assertEquals("Action unpinned", unpinned.status)
        assertFalse("numbers" in unpinned.nextState.pinnedActionIds)
        assertFalse(unpinned.nextState.attachedRows.any { it.providerActionId == "numbers" })
    }

    @Test
    fun `symbols accents emoji clipboard snippets and media expose pinnable rows`() {
        val actionIds = listOf("symbols", "accents", "emoji", "clipboard", "snippets", "media")

        actionIds.forEach { actionId ->
            val result =
                controller.onLongPress(
                    actionId = actionId,
                    state = KeyboardActionBarState(),
                    environment = environment(),
                )

            assertEquals("Action pinned", result.status)
            assertTrue(actionId in result.nextState.pinnedActionIds)
            assertTrue(result.nextState.attachedRows.any { it.providerActionId == actionId })
        }
    }

    @Test
    fun `pinned action ids render attached rows after state restore`() {
        val snapshot =
            controller.buildRenderSnapshot(
                state = KeyboardActionBarState(pinnedActionIds = setOf("symbols", "emoji")),
                environment = environment(),
            )

        assertTrue(snapshot.attachedRows.any { it.dedupeKey == "symbols" })
        assertTrue(snapshot.attachedRows.any { it.dedupeKey == "emoji" })
    }

    @Test
    fun `clipboard row is absent unless clip is pinned or panel is open`() {
        val snapshot =
            controller.buildRenderSnapshot(
                state =
                    KeyboardActionBarState(
                        attachedRows =
                            listOf(
                                KeyboardAttachedActionRowState("clipboard", "action-row-clipboard", "clipboard"),
                            ),
                    ),
                environment = environment(),
            )

        val clipKey = snapshot.mainRow.items.single { it.label == "Clip" }
        assertFalse(clipKey.active)
        assertFalse(clipKey.pinned)
        assertTrue(snapshot.attachedRows.none { it.dedupeKey == "clipboard" })
    }

    @Test
    fun `pinned clipboard row exposes paste actions`() {
        val snapshot =
            controller.buildRenderSnapshot(
                state = KeyboardActionBarState(pinnedActionIds = setOf("clipboard")),
                environment = environment(),
            )

        val clipKey = snapshot.mainRow.items.single { it.label == "Clip" }
        assertTrue(clipKey.active)
        assertTrue(clipKey.pinned)
        val clipboardRow = snapshot.attachedRows.single { it.dedupeKey == "clipboard" }
        assertTrue(clipboardRow.items.any { it.label == "All" && it.action == KeyboardKeyAction.SelectAll })
        assertTrue(clipboardRow.items.any { it.action == KeyboardKeyAction.CutSelection })
        assertTrue(clipboardRow.items.any { it.action == KeyboardKeyAction.CopySelection })
        assertTrue(clipboardRow.items.any { it.action == KeyboardKeyAction.PasteClipboard })
        assertTrue(clipboardRow.items.any { it.action == KeyboardKeyAction.PastePlainClipboard })
        assertTrue(clipboardRow.items.none { it.action == KeyboardKeyAction.ToggleClipboardPanel })
        assertEquals(10, clipboardRow.items.size)
        assertEquals(5, clipboardRow.items.count { it.action == KeyboardKeyAction.InsertClipboardEntry })
    }

    @Test
    fun `mode actions stay grouped before pinned action buttons`() {
        val snapshot =
            controller.buildRenderSnapshot(
                state =
                    KeyboardActionBarState(
                        pinnedActionIds = setOf("media", "emoji", "navigation"),
                        adaptiveUsageScoreById = mapOf("media" to 99L, "emoji" to 98L),
                    ),
                environment = environment(),
            )

        assertEquals(listOf("ABC", "123", "#+=", "Nav"), snapshot.mainRow.items.take(4).map { it.label })
    }

    @Test
    fun `action buttons keep catalog order instead of adaptive usage ranking`() {
        val snapshot =
            controller.buildRenderSnapshot(
                state =
                    KeyboardActionBarState(
                        adaptiveUsageScoreById =
                            mapOf(
                                "voice" to 500L,
                                "media" to 400L,
                                "clipboard" to 300L,
                                "emoji" to 200L,
                            ),
                    ),
                environment = environment(),
            )

        assertEquals(
            listOf("ABC", "123", "#+=", "Nav", "Acc", "Emoji", "Clip", "Snip", "Media", "Mic", "Prefs"),
            snapshot.mainRow.items.map { it.label },
        )
    }

    @Test
    fun `media pinned row keeps controls after stop`() {
        val snapshot =
            controller.buildRenderSnapshot(
                state = KeyboardActionBarState(pinnedActionIds = setOf("media")),
                environment = environment(),
            )

        val mediaRow = snapshot.attachedRows.single { it.dedupeKey == "media" }
        val labels = mediaRow.items.map { it.label }

        assertEquals(10, mediaRow.visiblePageKeyCount)
        assertTrue(labels.indexOf("Vol-") > labels.indexOf("Stop"))
        assertTrue(labels.indexOf("Vol+") > labels.indexOf("Stop"))
        assertTrue(labels.indexOf("Bri-") > labels.indexOf("Stop"))
        assertTrue(labels.indexOf("Bri+") > labels.indexOf("Stop"))
        assertTrue(labels.indexOf("Loop") > labels.indexOf("Stop"))
    }

    @Test
    fun `navigation pinned row keeps arrows on first page before tab`() {
        val snapshot =
            controller.buildRenderSnapshot(
                state = KeyboardActionBarState(pinnedActionIds = setOf("navigation")),
                environment = environment(),
            )

        val navigationRow = snapshot.attachedRows.single { it.dedupeKey == "navigation" }
        val firstPageLabels = navigationRow.items.take(navigationRow.visiblePageKeyCount ?: 0).map { it.label }

        assertEquals(10, navigationRow.visiblePageKeyCount)
        assertEquals(
            listOf("←", "→", "Début", "Fin", "Word←", "Word→", "Del←", "Del→", "↑", "↓"),
            firstPageLabels,
        )
        assertTrue(navigationRow.items.indexOfFirst { it.label == "Tab" } >= 10)
    }

    @Test
    fun `pinned action rows only scroll when they exceed alphabet slots`() {
        val overflowingActionIds = listOf("numbers", "symbols", "accents", "navigation", "emoji", "media")

        overflowingActionIds.forEach { actionId ->
            val snapshot =
                controller.buildRenderSnapshot(
                    state = KeyboardActionBarState(pinnedActionIds = setOf(actionId)),
                    environment = environment(),
                )

            val row = snapshot.attachedRows.single { it.dedupeKey == actionId }
            assertEquals(10, row.visiblePageKeyCount)
        }

        val shortRowsSnapshot =
            KeyboardLayoutBuilder.build(
                KeyboardLayoutRequest(
                    mode = KeyboardLayoutMode.Letters,
                    panel = KeyboardPanelMode.None,
                    shifted = false,
                    fieldContext = KeyboardFieldContextMode.Text,
                    layoutProfile = KeyboardLayoutProfile.QWERTY,
                    cornerModeEnabled = false,
                    debugTouchOverlayEnabled = false,
                    doubleSpacePeriodEnabled = true,
                    punctuationAutoSpacingEnabled = true,
                    emojiCategory = KeyboardEmojiCategory.Recents,
                    recentEmojis = emptyList(),
                    enterLabel = "Enter",
                    clipboardAllowed = true,
                    voiceAllowed = true,
                    snippetsAllowed = true,
                    suggestions = emptyList(),
                    actionBarState =
                        KeyboardActionBarState(
                            pinnedActionIds = setOf("clipboard", "snippets"),
                            attachedRows =
                                listOf(
                                    KeyboardAttachedActionRowState("clipboard", "action-row-clipboard", "clipboard"),
                                    KeyboardAttachedActionRowState("snippets", "action-row-snippets", "snippets"),
                                ),
                        ),
                ),
            )

        val clipboardRow = shortRowsSnapshot.rows.single { it.rowId == "action-row-clipboard" }
        val snippetsRow = shortRowsSnapshot.rows.single { it.rowId == "action-row-snippets" }
        assertFalse(clipboardRow.horizontalScrollable)
        assertFalse(snippetsRow.horizontalScrollable)
        assertEquals(null, clipboardRow.visiblePageKeyCount)
        assertEquals(null, snippetsRow.visiblePageKeyCount)
    }

    private fun environment(): KeyboardActionEnvironment {
        return KeyboardActionEnvironment(
            fieldPolicy =
                KeyboardFieldPolicy(
                    privateMode = false,
                    reason = "standard",
                    inputAllowed = true,
                    voiceAllowed = true,
                    clipboardAllowed = true,
                    snippetsAllowed = true,
                    learningAllowed = true,
                ),
            layoutMode = KeyboardLayoutMode.Letters,
            panelMode = KeyboardPanelMode.None,
            clipboardAllowed = true,
            voiceAllowed = true,
            snippetsAllowed = true,
            mediaControlsEnabled = true,
            clipboardEntries =
                listOf(
                    KeyboardClipboardEntry("First clip"),
                    KeyboardClipboardEntry("Second clip"),
                    KeyboardClipboardEntry("Third clip"),
                    KeyboardClipboardEntry("Fourth clip"),
                    KeyboardClipboardEntry("Fifth clip"),
                    KeyboardClipboardEntry("Sixth clip"),
                ),
        )
    }
}
