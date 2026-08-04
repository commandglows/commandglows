package com.commandglows.app.ime

import kotlin.math.abs

internal object KeyboardLongPressSwipePolicy {
    private val targetSelections =
        listOf(
            GestureSelection.Up,
            GestureSelection.Right,
            GestureSelection.Down,
            GestureSelection.Left,
        )

    /**
     * Contract: exit-based long-press swipe dispatch may start only when the
     * pointer actually left the origin key and no protected interaction or
     * prior long-press branch already owns the gesture.
     */
    fun canActivateFromKeyExit(
        consumedByProtectedInteraction: Boolean,
        longPressTriggered: Boolean,
        keyEnabled: Boolean,
        pointerInsideStartKey: Boolean,
    ): Boolean {
        return !consumedByProtectedInteraction &&
            !longPressTriggered &&
            keyEnabled &&
            !pointerInsideStartKey
    }

    /**
     * Contract: Ctrl-row swipe launch is allowed only from the designated
     * launch row and only while row/panel scrolling is not owning the pointer.
     */
    fun canLaunchCtrlSwipeFromRow(
        startRowIndex: Int?,
        ctrlRowIndex: Int?,
        rowScrollable: Boolean,
        panelScrollable: Boolean,
    ): Boolean {
        return startRowIndex != null &&
            ctrlRowIndex != null &&
            startRowIndex == ctrlRowIndex &&
            !rowScrollable &&
            !panelScrollable
    }

    /**
     * Contract: space-origin horizontal gestures keep cursor-slider semantics
     * and must not be reclassified as swipe-dispatch launch.
     */
    fun shouldPreserveSpaceSliderGesture(
        startKeyIsSpace: Boolean,
        dx: Float,
        dy: Float,
        spaceSlideStartPx: Float,
    ): Boolean {
        return startKeyIsSpace &&
            abs(dx) >= spaceSlideStartPx &&
            abs(dx) >= abs(dy) * 1.25f
    }

    /**
     * Contract: the target key decides which directional assignment wins once
     * it is hovered during long-press swipe dispatch. Candidate order is the
     * canonical behavior map for the IME gesture model.
     */
    fun chooseTargetSelection(
        candidates: Collection<GestureSelection>,
        targetX: Float,
        targetY: Float,
        centerX: Float,
        centerY: Float,
    ): GestureSelection? {
        return targetSelections.firstOrNull { it in candidates }
    }

    fun shouldRepeatGestureSelection(
        selection: GestureSelection,
        value: KeyboardKeyValue,
        repeatingActions: Set<KeyboardKeyAction>,
    ): Boolean {
        if (selection == GestureSelection.PrimaryTap || selection == GestureSelection.Canceled) {
            return false
        }
        return value.kind == KeyboardKeyValueKind.Action && value.action in repeatingActions
    }
}
