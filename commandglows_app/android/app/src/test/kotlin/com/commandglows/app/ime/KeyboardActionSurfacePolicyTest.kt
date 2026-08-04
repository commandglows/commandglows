package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class KeyboardActionSurfacePolicyTest {
    @Test
    fun `preferred swipe assignment falls back to the first supported direction`() {
        val assignment =
            KeyboardActionSurfacePolicy.preferredLongPressSwipeAssignment(
                KeyboardCornerAssignments(
                    right =
                        KeyboardCornerAssignment(
                            slot = KeyboardCornerSlot.Right,
                            value = KeyboardKeyValue.action(KeyboardKeyAction.NavigateWordRight),
                            label = "Word→",
                        ),
                    left =
                        KeyboardCornerAssignment(
                            slot = KeyboardCornerSlot.Left,
                            value = KeyboardKeyValue.action(KeyboardKeyAction.DeleteWordBefore),
                            label = "DelW←",
                        ),
                ),
            )

        assertNotNull(assignment)
        assertEquals("Word→", assignment?.label)
    }

    @Test
    fun `surface labels normalize navigation actions to compact glyphs`() {
        assertEquals(
            "→",
            KeyboardActionSurfacePolicy.displayLabel(
                KeyboardCornerAssignment(
                    slot = KeyboardCornerSlot.Right,
                    value = KeyboardKeyValue.action(KeyboardKeyAction.NavigateWordRight),
                    label = "Word→",
                ),
            ),
        )
        assertEquals(
            "⌫",
            KeyboardActionSurfacePolicy.displayLabel(
                KeyboardCornerAssignment(
                    slot = KeyboardCornerSlot.Left,
                    value = KeyboardKeyValue.action(KeyboardKeyAction.DeleteWordBefore),
                    label = "DelW←",
                ),
            ),
        )
        assertEquals(
            "↑",
            KeyboardActionSurfacePolicy.displayLabel(
                KeyboardCornerAssignment(
                    slot = KeyboardCornerSlot.Up,
                    value = KeyboardKeyValue.action(KeyboardKeyAction.NavigateLineUp),
                    label = "↑",
                ),
            ),
        )
    }

    @Test
    fun `surface labels keep text shortcuts unchanged`() {
        assertEquals(
            "7",
            KeyboardActionSurfacePolicy.displayLabel(
                KeyboardCornerAssignment(
                    slot = KeyboardCornerSlot.Up,
                    value = KeyboardKeyValue.text("7"),
                    label = "7",
                ),
            ),
        )
    }
}
