package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyboardCornerShortcutsTest {
    @Test
    fun `smart french corners are the default preset`() {
        val aKey = keyById("letter-a")
        val eKey = keyById("letter-e")
        val rKey = keyById("letter-r")
        val fKey = keyById("letter-f")
        val cKey = keyById("letter-c")
        val vKey = keyById("letter-v")
        val gKey = keyById("letter-g")
        val hKey = keyById("letter-h")
        val pKey = keyById("letter-p")
        val oKey = keyById("letter-o")
        val wKey = keyById("letter-w")
        val sKey = keyById("letter-s")
        val bKey = keyById("letter-b")
        val nKey = keyById("letter-n")
        val jKey = keyById("letter-j")
        val lKey = keyById("letter-l")
        val uKey = keyById("letter-u")
        val zKey = keyById("letter-z")
        val delKey = keyById("del-letter-row", specialKeyCorners = true)

        assertNull(aKey.cornerAssignments.topLeft)
        assertEquals("@", aKey.cornerAssignments.topRight?.label)
        assertNull(aKey.cornerAssignments.bottomLeft)
        assertNull(eKey.cornerAssignments.topLeft)
        assertNull(eKey.cornerAssignments.topRight)
        assertEquals("1", rKey.cornerAssignments.up?.label)
        assertEquals("↓", rKey.cornerAssignments.down?.label)
        assertEquals("8", cKey.cornerAssignments.up?.label)
        assertEquals("9", vKey.cornerAssignments.up?.label)
        assertEquals("#", vKey.cornerAssignments.down?.label)
        assertEquals("5", gKey.cornerAssignments.up?.label)
        assertEquals("W←", gKey.cornerAssignments.left?.label)
        assertEquals("W→", gKey.cornerAssignments.right?.label)
        assertEquals("%", cKey.cornerAssignments.bottomLeft?.label)
        assertEquals("6", hKey.cornerAssignments.up?.label)
        assertEquals("DelW\n←", hKey.cornerAssignments.left?.label)
        assertEquals("DelW\n→", hKey.cornerAssignments.right?.label)
        assertEquals("0", bKey.cornerAssignments.up?.label)
        assertEquals("/", bKey.cornerAssignments.bottomRight?.label)
        assertNull(uKey.cornerAssignments.topLeft)
        assertNull(uKey.cornerAssignments.topRight)
        assertEquals("Début", fKey.cornerAssignments.left?.label)
        assertEquals("Fin", fKey.cornerAssignments.right?.label)
        assertEquals("↓", uKey.cornerAssignments.down?.label)
        assertEquals("📋", pKey.cornerAssignments.topLeft?.label)
        assertNull(pKey.cornerAssignments.bottomRight)
        assertNull(oKey.cornerAssignments.left)
        assertNull(oKey.cornerAssignments.right)
        assertEquals("-", nKey.cornerAssignments.topLeft?.label)
        assertEquals("_", nKey.cornerAssignments.topRight?.label)
        assertNull(jKey.cornerAssignments.bottomLeft)
        assertNull(jKey.cornerAssignments.bottomRight)
        assertEquals(":", lKey.cornerAssignments.topLeft?.label)
        assertEquals(";", lKey.cornerAssignments.topRight?.label)
        assertEquals("\$", lKey.cornerAssignments.bottomLeft?.label)
        assertEquals("€", lKey.cornerAssignments.bottomRight?.label)
        assertNull(hKey.cornerAssignments.topLeft)
        assertNull(hKey.cornerAssignments.topRight)
        assertNull(hKey.cornerAssignments.bottomLeft)
        assertNull(hKey.cornerAssignments.bottomRight)
        assertNull(wKey.cornerAssignments.up)
        assertNull(wKey.cornerAssignments.down)
        assertNull(sKey.cornerAssignments.left)
        assertNull(sKey.cornerAssignments.right)
        assertNull(zKey.cornerAssignments.up)
        assertNull(zKey.cornerAssignments.down)
        assertNull(zKey.cornerAssignments.left)
        assertNull(zKey.cornerAssignments.right)
        assertNull(zKey.cornerAssignments.bottomLeft)
        assertNull(zKey.cornerAssignments.bottomRight)
        assertEquals("Del→", delKey.cornerAssignments.up?.label)
        assertEquals(KeyboardKeyAction.PasteClipboard, pKey.cornerAssignments.topLeft?.value?.action)
        assertEquals(KeyboardKeyAction.ForwardDelete, delKey.cornerAssignments.up?.value?.action)
        assertEquals("/", bKey.cornerAssignments.down?.value?.text)
        assertEquals(KeyboardKeyAction.NavigateLineStart, fKey.cornerAssignments.left?.value?.action)
        assertEquals(KeyboardKeyAction.NavigateLineEnd, fKey.cornerAssignments.right?.value?.action)
        assertEquals(KeyboardKeyAction.NavigateLineDown, uKey.cornerAssignments.down?.value?.action)
        assertEquals(KeyboardKeyAction.NavigateLineDown, rKey.cornerAssignments.down?.value?.action)
        assertEquals(KeyboardKeyAction.DeleteWordBefore, hKey.cornerAssignments.left?.value?.action)
        assertEquals(KeyboardKeyAction.DeleteWordAfter, hKey.cornerAssignments.right?.value?.action)
        assertNull(cKey.cornerAssignments.down)
        assertNull(vKey.cornerAssignments.down)
        assertNull(gKey.cornerAssignments.down)
        assertNull(hKey.cornerAssignments.down)
    }

    @Test
    fun `user override wins over the active preset for one slot only`() {
        val config =
            KeyboardCornerConfig(
                overrides =
                    listOf(
                        KeyboardCornerShortcut(
                            keyId = "letter-a",
                            slot = KeyboardCornerSlot.TopLeft,
                            expression = "A+: 'aa'",
                            label = "A+",
                        ),
                    ),
            )
        val key = keyById("letter-a", config = config)

        assertEquals("A+", key.cornerAssignments.topLeft?.label)
        assertEquals("aa", key.cornerAssignments.topLeft?.value?.text)
        assertEquals("@", key.cornerAssignments.topRight?.label)
    }

    @Test
    fun `smart french corners also resolve on azerty layout`() {
        val aKey = keyById("letter-a", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val fKey = keyById("letter-f", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val rKey = keyById("letter-r", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val zKey = keyById("letter-z", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val wKey = keyById("letter-w", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val sKey = keyById("letter-s", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val dKey = keyById("letter-d", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val eKey = keyById("letter-e", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val uKey = keyById("letter-u", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val hKey = keyById("letter-h", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val jKey = keyById("letter-j", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val cKey = keyById("letter-c", layoutProfile = KeyboardLayoutProfile.AZERTY)
        val vKey = keyById("letter-v", layoutProfile = KeyboardLayoutProfile.AZERTY)

        assertEquals("à", aKey.cornerAssignments.topLeft?.label)
        assertEquals("@", aKey.cornerAssignments.topRight?.label)
        assertEquals("é", eKey.cornerAssignments.topLeft?.label)
        assertEquals("è", eKey.cornerAssignments.topRight?.label)
        assertNull(eKey.cornerAssignments.up)
        assertNull(eKey.cornerAssignments.down)
        assertNull(eKey.cornerAssignments.bottomLeft)
        assertNull(eKey.cornerAssignments.bottomRight)
        assertEquals("ù", uKey.cornerAssignments.topLeft?.label)
        assertNull(uKey.cornerAssignments.topRight)
        assertNull(uKey.cornerAssignments.up)
        assertNull(uKey.cornerAssignments.down)
        assertEquals("?", uKey.cornerAssignments.bottomLeft?.label)
        assertEquals("!", uKey.cornerAssignments.bottomRight?.label)
        assertEquals("↑", dKey.cornerAssignments.up?.label)
        assertEquals("↓", dKey.cornerAssignments.down?.label)
        assertEquals("Début", fKey.cornerAssignments.left?.label)
        assertEquals("Fin", fKey.cornerAssignments.right?.label)
        assertNull(rKey.cornerAssignments.down)
        assertEquals("ç", cKey.cornerAssignments.topLeft?.label)
        assertNull(cKey.cornerAssignments.topRight)
        assertEquals("%", cKey.cornerAssignments.bottomLeft?.label)
        assertEquals("W←", gKey.cornerAssignments.left?.label)
        assertEquals("W→", gKey.cornerAssignments.right?.label)
        assertEquals("#", vKey.cornerAssignments.down?.label)
        assertEquals("DelW\n←", hKey.cornerAssignments.left?.label)
        assertEquals("DelW\n→", hKey.cornerAssignments.right?.label)
        assertNull(wKey.cornerAssignments.down)
        assertNull(zKey.cornerAssignments.up)
        assertNull(zKey.cornerAssignments.down)
        assertNull(zKey.cornerAssignments.bottomLeft)
        assertNull(zKey.cornerAssignments.bottomRight)
        assertNull(zKey.cornerAssignments.left)
        assertNull(zKey.cornerAssignments.right)
        assertNull(sKey.cornerAssignments.left)
        assertNull(sKey.cornerAssignments.right)
        assertEquals("←", dKey.cornerAssignments.left?.label)
        assertEquals("→", dKey.cornerAssignments.right?.label)
        assertEquals("←", jKey.cornerAssignments.left?.label)
        assertEquals("→", jKey.cornerAssignments.right?.label)
        assertEquals("?", jKey.cornerAssignments.bottomLeft?.label)
        assertEquals("!", jKey.cornerAssignments.bottomRight?.label)
        assertEquals(KeyboardKeyAction.NavigateLineUp, eKey.cornerAssignments.up?.value?.action)
        assertEquals(KeyboardKeyAction.NavigateLineStart, fKey.cornerAssignments.left?.value?.action)
        assertEquals(KeyboardKeyAction.NavigateLineEnd, fKey.cornerAssignments.right?.value?.action)
        assertEquals("/", bKey.cornerAssignments.down?.value?.text)
        assertEquals(KeyboardKeyAction.DeleteWordBefore, hKey.cornerAssignments.left?.value?.action)
        assertEquals(KeyboardKeyAction.DeleteWordAfter, hKey.cornerAssignments.right?.value?.action)
        assertEquals("?", uKey.cornerAssignments.bottomLeft?.label)
        assertEquals("!", uKey.cornerAssignments.bottomRight?.label)
        assertEquals(KeyboardKeyAction.NavigateLineUp, dKey.cornerAssignments.up?.value?.action)
        assertEquals(KeyboardKeyAction.NavigateLineDown, dKey.cornerAssignments.down?.value?.action)
        assertNull(cKey.cornerAssignments.down)
        assertNull(vKey.cornerAssignments.down)
        assertEquals(KeyboardKeyAction.NavigateCharLeft, dKey.cornerAssignments.left?.value?.action)
        assertEquals(KeyboardKeyAction.NavigateCharRight, jKey.cornerAssignments.right?.value?.action)
    }

    @Test
    fun `azerty e d u and j shortcuts ignore special-key toggle`() {
        val eKey = keyById("letter-e", layoutProfile = KeyboardLayoutProfile.AZERTY, specialKeyCorners = false)
        val dKey = keyById("letter-d", layoutProfile = KeyboardLayoutProfile.AZERTY, specialKeyCorners = false)
        val uKey = keyById("letter-u", layoutProfile = KeyboardLayoutProfile.AZERTY, specialKeyCorners = false)
        val jKey = keyById("letter-j", layoutProfile = KeyboardLayoutProfile.AZERTY, specialKeyCorners = false)

        assertNull(eKey.cornerAssignments.up)
        assertNull(eKey.cornerAssignments.down)
        assertEquals("↑", dKey.cornerAssignments.up?.label)
        assertEquals("↓", dKey.cornerAssignments.down?.label)
        assertEquals("←", dKey.cornerAssignments.left?.label)
        assertEquals("→", dKey.cornerAssignments.right?.label)
        assertNull(uKey.cornerAssignments.up)
        assertNull(uKey.cornerAssignments.down)
        assertEquals("↑", jKey.cornerAssignments.up?.label)
        assertEquals("↓", jKey.cornerAssignments.down?.label)
        assertNull(jKey.cornerAssignments.bottomLeft)
        assertNull(jKey.cornerAssignments.bottomRight)
    }

    @Test
    fun `special key corner assignments are bounded by special key toggle`() {
        val config =
            KeyboardCornerConfig(
                overrides =
                    listOf(
                        KeyboardCornerShortcut(
                            keyId = "modifier-ctrl",
                            slot = KeyboardCornerSlot.TopLeft,
                            expression = "Tab:keyevent:61",
                        ),
                    ),
            )

        val disabled = keyById("modifier-ctrl", config = config, specialKeyCorners = false)
        val enabled = keyById("modifier-ctrl", config = config, specialKeyCorners = true)

        assertTrue(disabled.cornerAssignments.isEmpty())
        assertEquals("Tab", enabled.cornerAssignments.topLeft?.label)
    }

    @Test
    fun `private fields suppress sensitive corner actions without hiding text accents`() {
        val config =
            KeyboardCornerConfig(
                overrides =
                    listOf(
                        KeyboardCornerShortcut(
                            keyId = "letter-j",
                            slot = KeyboardCornerSlot.TopLeft,
                            expression = "JA:'j\\'arrive'",
                            label = "JA",
                            sensitive = true,
                        ),
                    ),
            )

        val sensitive = keyById("letter-j", config = config, fieldPolicy = privatePolicy())
        val accent = keyById(
            "letter-e",
            config = config,
            fieldPolicy = privatePolicy(),
            layoutProfile = KeyboardLayoutProfile.AZERTY,
        )

        assertNull(sensitive.cornerAssignments.topLeft)
        assertEquals("é", accent.cornerAssignments.topLeft?.label)
    }

    @Test
    fun `corrupt stored json falls back to default config`() {
        val config = KeyboardCornerConfig.fromJson("{not-json")

        assertEquals(KeyboardCornerPresets.FRENCH_ACCENTS, config.presetId)
        assertTrue(config.overrides.isEmpty())
    }

    @Test
    fun `new directional slots parse from json map`() {
        val config =
            KeyboardCornerConfig.fromMap(
                mapOf(
                    "presetId" to KeyboardCornerPresets.NONE,
                    "overrides" to
                        listOf(
                            mapOf(
                                "keyId" to "letter-h",
                                "slot" to "up",
                                "expression" to "action:NavigateLineUp",
                                "label" to "↑",
                            ),
                        ),
                ),
            )

        val resolved = keyById("letter-h", config = config)
        assertEquals("↑", resolved.cornerAssignments.up?.label)
        assertEquals(KeyboardKeyAction.NavigateLineUp, resolved.cornerAssignments.up?.value?.action)
    }

    private fun keyById(
        keyId: String,
        config: KeyboardCornerConfig = KeyboardCornerConfig(),
        specialKeyCorners: Boolean = false,
        fieldPolicy: KeyboardFieldPolicy = publicPolicy(),
        layoutProfile: KeyboardLayoutProfile = KeyboardLayoutProfile.QWERTY,
    ): KeyboardKeySpec {
        val snapshot =
            KeyboardLayoutBuilder.build(
                KeyboardLayoutRequest(
                    mode = KeyboardLayoutMode.Letters,
                    panel = KeyboardPanelMode.None,
                    shifted = false,
                    fieldContext = KeyboardFieldContextMode.Text,
                    layoutProfile = layoutProfile,
                    cornerModeEnabled = true,
                    debugTouchOverlayEnabled = false,
                    specialKeyCornersEnabled = specialKeyCorners,
                    doubleSpacePeriodEnabled = true,
                    punctuationAutoSpacingEnabled = true,
                    emojiCategory = KeyboardEmojiCategory.Recents,
                    recentEmojis = emptyList(),
                    enterLabel = "Enter",
                    clipboardAllowed = fieldPolicy.clipboardAllowed,
                    voiceAllowed = fieldPolicy.voiceAllowed,
                    snippetsAllowed = fieldPolicy.snippetsAllowed,
                    suggestions = emptyList(),
                    cornerConfig = config,
                    fieldPolicy = fieldPolicy,
                ),
            )
        return snapshot.rows.flatMap { it.keys }.first { it.id == keyId }
    }

    private fun publicPolicy(): KeyboardFieldPolicy {
        return KeyboardFieldPolicy(
            privateMode = false,
            reason = "Test field",
            inputAllowed = true,
            voiceAllowed = true,
            clipboardAllowed = true,
            snippetsAllowed = true,
            learningAllowed = true,
        )
    }

    private fun privatePolicy(): KeyboardFieldPolicy {
        return KeyboardFieldPolicy(
            privateMode = true,
            reason = "Private test field",
            inputAllowed = true,
            voiceAllowed = false,
            clipboardAllowed = false,
            snippetsAllowed = false,
            learningAllowed = false,
        )
    }
}
