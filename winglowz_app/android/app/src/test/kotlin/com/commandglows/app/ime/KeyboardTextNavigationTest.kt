package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyboardTextNavigationTest {
    @Test
    fun `previous word boundary skips whitespace and current word`() {
        val text = "hello  world again"

        assertEquals(13, KeyboardTextNavigation.previousWordBoundary(text, 14))
        assertEquals(7, KeyboardTextNavigation.previousWordBoundary(text, 13))
        assertEquals(0, KeyboardTextNavigation.previousWordBoundary(text, 5))
    }

    @Test
    fun `next word boundary skips current word and whitespace`() {
        val text = "hello  world again"

        assertEquals(7, KeyboardTextNavigation.nextWordBoundary(text, 0))
        assertEquals(13, KeyboardTextNavigation.nextWordBoundary(text, 7))
        assertEquals(text.length, KeyboardTextNavigation.nextWordBoundary(text, 13))
    }

    @Test
    fun `line boundaries target current paragraph line`() {
        val text = "first line\nsecond line\nthird"

        assertEquals(11, KeyboardTextNavigation.lineBoundary(text, 14, start = true))
        assertEquals(22, KeyboardTextNavigation.lineBoundary(text, 14, start = false))
        assertEquals(0, KeyboardTextNavigation.lineBoundary(text, 4, start = true))
        assertEquals(text.length, KeyboardTextNavigation.lineBoundary(text, 24, start = false))
    }

    @Test
    fun `paragraph boundaries target blank-line separated paragraphs`() {
        val text = "first paragraph\n\nsecond paragraph\n\nthird paragraph"
        val secondStart = text.indexOf("second")
        val thirdStart = text.indexOf("third")

        assertEquals(secondStart, KeyboardTextNavigation.paragraphBoundary(text, secondStart + 4, up = true))
        assertEquals(0, KeyboardTextNavigation.paragraphBoundary(text, secondStart, up = true))
        assertEquals(thirdStart, KeyboardTextNavigation.paragraphBoundary(text, secondStart, up = false))
        assertEquals(text.length, KeyboardTextNavigation.paragraphBoundary(text, thirdStart, up = false))
    }

    @Test
    fun `selection state marks ranges only when bounds are valid and different`() {
        val selected = KeyboardSelectionState.fromEditorBounds(2, 5)
        val cursor = KeyboardSelectionState.fromEditorBounds(5, 5)
        val unavailable = KeyboardSelectionState.fromEditorBounds(-1, -1)

        assertTrue(selected.isAvailable)
        assertTrue(selected.hasSelection)
        assertTrue(cursor.isAvailable)
        assertFalse(cursor.hasSelection)
        assertFalse(unavailable.isAvailable)
    }
}
