package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyboardLongPressSwipePolicyTest {
    @Test
    fun `does not activate while pointer stays inside the start key`() {
        val activate =
            KeyboardLongPressSwipePolicy.canActivateFromKeyExit(
                consumedByProtectedInteraction = false,
                longPressTriggered = false,
                keyEnabled = true,
                pointerInsideStartKey = true,
            )

        assertFalse(activate)
    }

    @Test
    fun `does not activate after an immobile long press consumed the action`() {
        val activate =
            KeyboardLongPressSwipePolicy.canActivateFromKeyExit(
                consumedByProtectedInteraction = false,
                longPressTriggered = true,
                keyEnabled = true,
                pointerInsideStartKey = false,
            )

        assertFalse(activate)
    }

    @Test
    fun `activates only when an eligible pointer exits before long press consumption`() {
        val activate =
            KeyboardLongPressSwipePolicy.canActivateFromKeyExit(
                consumedByProtectedInteraction = false,
                longPressTriggered = false,
                keyEnabled = true,
                pointerInsideStartKey = false,
            )

        assertTrue(activate)
    }

    @Test
    fun `ctrl swipe can launch from any non-scrollable frame in the ctrl row`() {
        assertTrue(
            KeyboardLongPressSwipePolicy.canLaunchCtrlSwipeFromRow(
                startRowIndex = 4,
                ctrlRowIndex = 4,
                rowScrollable = false,
                panelScrollable = false,
            ),
        )
    }

    @Test
    fun `ctrl swipe row launcher ignores other rows and scrollable surfaces`() {
        assertFalse(
            KeyboardLongPressSwipePolicy.canLaunchCtrlSwipeFromRow(
                startRowIndex = 2,
                ctrlRowIndex = 4,
                rowScrollable = false,
                panelScrollable = false,
            ),
        )
        assertFalse(
            KeyboardLongPressSwipePolicy.canLaunchCtrlSwipeFromRow(
                startRowIndex = 4,
                ctrlRowIndex = 4,
                rowScrollable = true,
                panelScrollable = false,
            ),
        )
        assertFalse(
            KeyboardLongPressSwipePolicy.canLaunchCtrlSwipeFromRow(
                startRowIndex = 4,
                ctrlRowIndex = 4,
                rowScrollable = false,
                panelScrollable = true,
            ),
        )
    }

    @Test
    fun `space horizontal slider keeps priority over ctrl row swipe launcher`() {
        assertTrue(
            KeyboardLongPressSwipePolicy.shouldPreserveSpaceSliderGesture(
                startKeyIsSpace = true,
                dx = 24f,
                dy = 4f,
                spaceSlideStartPx = 18f,
            ),
        )
        assertFalse(
            KeyboardLongPressSwipePolicy.shouldPreserveSpaceSliderGesture(
                startKeyIsSpace = true,
                dx = 12f,
                dy = 2f,
                spaceSlideStartPx = 18f,
            ),
        )
        assertFalse(
            KeyboardLongPressSwipePolicy.shouldPreserveSpaceSliderGesture(
                startKeyIsSpace = true,
                dx = 24f,
                dy = 24f,
                spaceSlideStartPx = 18f,
            ),
        )
        assertFalse(
            KeyboardLongPressSwipePolicy.shouldPreserveSpaceSliderGesture(
                startKeyIsSpace = false,
                dx = 24f,
                dy = 4f,
                spaceSlideStartPx = 18f,
            ),
        )
    }

    @Test
    fun `space vertical swipe stays eligible for ctrl row launcher`() {
        assertFalse(
            KeyboardLongPressSwipePolicy.shouldPreserveSpaceSliderGesture(
                startKeyIsSpace = true,
                dx = 4f,
                dy = 24f,
                spaceSlideStartPx = 18f,
            ),
        )
        assertTrue(
            KeyboardLongPressSwipePolicy.canLaunchCtrlSwipeFromRow(
                startRowIndex = 4,
                ctrlRowIndex = 4,
                rowScrollable = false,
                panelScrollable = false,
            ),
        )
    }

    @Test
    fun `chooses the only target action even when the pointer is centered`() {
        val selection =
            KeyboardLongPressSwipePolicy.chooseTargetSelection(
                candidates = listOf(GestureSelection.Up),
                targetX = 50f,
                targetY = 50f,
                centerX = 50f,
                centerY = 50f,
            )

        assertEquals(GestureSelection.Up, selection)
    }

    @Test
    fun `chooses the first available target action by priority`() {
        val right =
            KeyboardLongPressSwipePolicy.chooseTargetSelection(
                candidates = listOf(GestureSelection.Left, GestureSelection.Right),
                targetX = 24f,
                targetY = 50f,
                centerX = 50f,
                centerY = 50f,
            )
        val up =
            KeyboardLongPressSwipePolicy.chooseTargetSelection(
                candidates = listOf(GestureSelection.Down, GestureSelection.Up),
                targetX = 76f,
                targetY = 50f,
                centerX = 50f,
                centerY = 50f,
            )

        assertEquals(GestureSelection.Right, right)
        assertEquals(GestureSelection.Up, up)
    }

    @Test
    fun `ignores pointer side once priority has resolved the action`() {
        val leftSide =
            KeyboardLongPressSwipePolicy.chooseTargetSelection(
                candidates = listOf(GestureSelection.Up, GestureSelection.Down),
                targetX = 50f,
                targetY = 24f,
                centerX = 50f,
                centerY = 50f,
            )
        val rightSide =
            KeyboardLongPressSwipePolicy.chooseTargetSelection(
                candidates = listOf(GestureSelection.Up, GestureSelection.Down),
                targetX = 50f,
                targetY = 76f,
                centerX = 50f,
                centerY = 50f,
            )

        assertEquals(GestureSelection.Up, leftSide)
        assertEquals(GestureSelection.Up, rightSide)
    }

    @Test
    fun `repeats only gesture navigation and deletion actions`() {
        val repeatableActions =
            setOf(
                KeyboardKeyAction.Backspace,
                KeyboardKeyAction.DeleteWordAfter,
                KeyboardKeyAction.NavigateLineUp,
                KeyboardKeyAction.NavigateLineEnd,
                KeyboardKeyAction.NavigateWordRight,
            )

        assertTrue(
            KeyboardLongPressSwipePolicy.shouldRepeatGestureSelection(
                selection = GestureSelection.Up,
                value = KeyboardKeyValue.action(KeyboardKeyAction.NavigateLineUp),
                repeatingActions = repeatableActions,
            ),
        )
        assertTrue(
            KeyboardLongPressSwipePolicy.shouldRepeatGestureSelection(
                selection = GestureSelection.Right,
                value = KeyboardKeyValue.action(KeyboardKeyAction.DeleteWordAfter),
                repeatingActions = repeatableActions,
            ),
        )
        assertTrue(
            KeyboardLongPressSwipePolicy.shouldRepeatGestureSelection(
                selection = GestureSelection.Down,
                value = KeyboardKeyValue.action(KeyboardKeyAction.NavigateLineEnd),
                repeatingActions = repeatableActions,
            ),
        )
        assertFalse(
            KeyboardLongPressSwipePolicy.shouldRepeatGestureSelection(
                selection = GestureSelection.PrimaryTap,
                value = KeyboardKeyValue.action(KeyboardKeyAction.NavigateLineUp),
                repeatingActions = repeatableActions,
            ),
        )
        assertFalse(
            KeyboardLongPressSwipePolicy.shouldRepeatGestureSelection(
                selection = GestureSelection.BottomRight,
                value = KeyboardKeyValue.text("/"),
                repeatingActions = repeatableActions,
            ),
        )
        assertFalse(
            KeyboardLongPressSwipePolicy.shouldRepeatGestureSelection(
                selection = GestureSelection.TopLeft,
                value = KeyboardKeyValue.action(KeyboardKeyAction.PasteClipboard),
                repeatingActions = repeatableActions,
            ),
        )
    }
}
