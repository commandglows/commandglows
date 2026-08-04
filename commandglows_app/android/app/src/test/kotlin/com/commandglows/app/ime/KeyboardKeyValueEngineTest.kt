package com.commandglows.app.ime

import android.view.KeyEvent
import org.junit.Assert.assertEquals
import org.junit.Test

class KeyboardKeyValueEngineTest {
    @Test
    fun `parses plain text key`() {
        val key = KeyboardKeyValueParser.parse("é")

        assertEquals(KeyboardKeyValueKind.Text, key.kind)
        assertEquals("é", key.text)
        assertEquals("é", key.label)
    }

    @Test
    fun `parses labeled quoted string key`() {
        val key = KeyboardKeyValueParser.parse("JA:'j\\'arrive'")

        assertEquals(KeyboardKeyValueKind.Text, key.kind)
        assertEquals("JA", key.label)
        assertEquals("j'arrive", key.text)
    }

    @Test
    fun `parses keyevent and action payloads`() {
        val keyEvent = KeyboardKeyValueParser.parse("keyevent:67")
        val action = KeyboardKeyValueParser.parse("Undo:action:Undo")

        assertEquals(KeyboardKeyValueKind.KeyEvent, keyEvent.kind)
        assertEquals(67, keyEvent.keyCode)
        assertEquals(KeyboardKeyValueKind.Action, action.kind)
        assertEquals(KeyboardKeyAction.Undo, action.action)
        assertEquals("Undo", action.label)
    }

    @Test
    fun `parses macro without splitting quoted commas`() {
        val macro = KeyboardKeyValueParser.parse("Macro:'a,b',keyevent:67")

        assertEquals(KeyboardKeyValueKind.Macro, macro.kind)
        assertEquals("Macro", macro.label)
        assertEquals(2, macro.macro.size)
        assertEquals("a,b", macro.macro[0].text)
        assertEquals(67, macro.macro[1].keyCode)
    }

    @Test
    fun `applies shift and control modifiers`() {
        val shifted =
            KeyboardKeyModifier.apply(
                KeyboardKeyValue.text("a"),
                setOf(KeyboardSystemModifier.Shift),
            )
        val controlled =
            KeyboardKeyModifier.apply(
                KeyboardKeyValue.text("z"),
                setOf(KeyboardSystemModifier.Ctrl),
            )
        val ctrlJ =
            KeyboardKeyModifier.apply(
                KeyboardKeyValue.text("j"),
                setOf(KeyboardSystemModifier.Ctrl),
            )

        assertEquals("A", shifted.text)
        assertEquals(KeyboardKeyValueKind.KeyEvent, controlled.kind)
        assertEquals(KeyEvent.KEYCODE_Z, controlled.keyCode)
        assertEquals(KeyboardKeyValueKind.KeyEvent, ctrlJ.kind)
        assertEquals(KeyEvent.KEYCODE_J, ctrlJ.keyCode)
    }

    @Test
    fun `modmap overrides default modifier behavior`() {
        val modMap = KeyboardModMap()
        modMap.add(
            KeyboardSystemModifier.Fn,
            KeyboardKeyValue.text("h"),
            KeyboardKeyValue.keyEvent(KeyEvent.KEYCODE_DPAD_LEFT, "Left"),
        )

        val mapped =
            KeyboardKeyModifier.apply(
                KeyboardKeyValue.text("h"),
                setOf(KeyboardSystemModifier.Fn),
                modMap,
            )

        assertEquals(KeyboardKeyValueKind.KeyEvent, mapped.kind)
        assertEquals(KeyEvent.KEYCODE_DPAD_LEFT, mapped.keyCode)
    }
}
