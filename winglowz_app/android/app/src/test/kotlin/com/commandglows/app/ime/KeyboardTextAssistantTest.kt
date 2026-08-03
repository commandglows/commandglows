package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyboardTextAssistantTest {
    private val rules =
        listOf(
            KeyboardTextRule(trigger = "ja", replacement = "j'arrive", caseSensitive = false),
            KeyboardTextRule(trigger = "ADR", replacement = "Adresse", caseSensitive = true),
        )

    @Test
    fun `auto capitalization is enabled at start and after sentence punctuation`() {
        assertTrue(KeyboardTextAssistant.shouldAutoCapitalize(""))
        assertTrue(KeyboardTextAssistant.shouldAutoCapitalize("bonjour. "))
        assertTrue(KeyboardTextAssistant.shouldAutoCapitalize("quoi ? "))
        assertFalse(KeyboardTextAssistant.shouldAutoCapitalize("bonjour "))
    }

    @Test
    fun `expansion replaces shortcut and keeps typed boundary`() {
        val match = KeyboardTextAssistant.expansionAfterBoundary("je pars ja ", rules)

        assertEquals(3, match?.deleteBeforeCodePoints)
        assertEquals("j'arrive ", match?.replacement)
    }

    @Test
    fun `expansion respects case sensitive rules`() {
        assertNull(KeyboardTextAssistant.expansionAfterBoundary("adr ", rules))

        val match = KeyboardTextAssistant.expansionAfterBoundary("ADR ", rules)

        assertEquals("Adresse ", match?.replacement)
    }

    @Test
    fun `suggestions include user replacements and defaults`() {
        val custom = KeyboardTextAssistant.suggestions("ja", rules)
        val defaults = KeyboardTextAssistant.suggestions("bon", rules)

        assertEquals("j'arrive", custom.first())
        assertTrue(defaults.contains("bonjour"))
    }

    @Test
    fun `suggestions filter built in defaults by enabled languages`() {
        val frenchOnly =
            KeyboardTextAssistant.suggestions(
                textBeforeCursor = "he",
                rules = rules,
                frenchEnabled = true,
                englishEnabled = false,
            )
        val englishOnly =
            KeyboardTextAssistant.suggestions(
                textBeforeCursor = "he",
                rules = rules,
                frenchEnabled = false,
                englishEnabled = true,
            )

        assertFalse(frenchOnly.contains("hello"))
        assertTrue(englishOnly.contains("hello"))
    }
}
