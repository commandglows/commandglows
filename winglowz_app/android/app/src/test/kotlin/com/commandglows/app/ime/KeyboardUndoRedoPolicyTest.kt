package com.commandglows.app.ime

import android.view.KeyEvent
import org.junit.Assert.assertEquals
import org.junit.Test

class KeyboardUndoRedoPolicyTest {
    @Test
    fun `undo uses standard ctrl z shortcut fallback`() {
        assertEquals(
            listOf(
                KeyboardEditorShortcut(
                    KeyEvent.KEYCODE_Z,
                    KeyEvent.META_CTRL_ON or KeyEvent.META_CTRL_LEFT_ON,
                ),
            ),
            KeyboardUndoRedoPolicy.UndoShortcuts,
        )
    }

    @Test
    fun `redo tries ctrl shift z before ctrl y shortcut fallback`() {
        assertEquals(
            listOf(
                KeyboardEditorShortcut(
                    KeyEvent.KEYCODE_Z,
                    KeyEvent.META_CTRL_ON or
                        KeyEvent.META_CTRL_LEFT_ON or
                        KeyEvent.META_SHIFT_ON or
                        KeyEvent.META_SHIFT_LEFT_ON,
                ),
                KeyboardEditorShortcut(
                    KeyEvent.KEYCODE_Y,
                    KeyEvent.META_CTRL_ON or KeyEvent.META_CTRL_LEFT_ON,
                ),
            ),
            KeyboardUndoRedoPolicy.RedoShortcuts,
        )
    }
}
