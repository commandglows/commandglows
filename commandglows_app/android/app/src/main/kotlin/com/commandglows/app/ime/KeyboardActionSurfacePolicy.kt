package com.commandglows.app.ime

internal object KeyboardActionSurfacePolicy {
    fun preferredLongPressSwipeAssignment(
        assignments: KeyboardCornerAssignments,
    ): KeyboardCornerAssignment? {
        return listOfNotNull(
            assignments.up,
            assignments.right,
            assignments.down,
            assignments.left,
        ).firstOrNull()
    }

    fun displayLabel(assignment: KeyboardCornerAssignment): String {
        val action = assignment.value.action
        if (assignment.value.kind == KeyboardKeyValueKind.Action && action != null) {
            return when (action) {
                KeyboardKeyAction.NavigateCharLeft,
                KeyboardKeyAction.NavigateWordLeft,
                KeyboardKeyAction.NavigateSentenceLeft,
                KeyboardKeyAction.NavigateLineStart,
                -> "←"
                KeyboardKeyAction.NavigateCharRight,
                KeyboardKeyAction.NavigateWordRight,
                KeyboardKeyAction.NavigateSentenceRight,
                KeyboardKeyAction.NavigateLineEnd,
                -> "→"
                KeyboardKeyAction.NavigateLineUp,
                KeyboardKeyAction.NavigateParagraphUp,
                -> "↑"
                KeyboardKeyAction.NavigateLineDown,
                KeyboardKeyAction.NavigateParagraphDown,
                -> "↓"
                KeyboardKeyAction.DeleteWordBefore -> "⌫"
                KeyboardKeyAction.DeleteWordAfter -> "⌦"
                KeyboardKeyAction.Undo -> "↶"
                KeyboardKeyAction.Redo -> "↷"
                else -> assignment.label
            }
        }
        return assignment.label
    }
}
