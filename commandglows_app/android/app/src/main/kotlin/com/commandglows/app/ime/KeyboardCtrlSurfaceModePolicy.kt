package com.commandglows.app.ime

internal enum class KeyboardCtrlSurfaceTapAction {
    ActivateCtrl,
    LockCtrl,
    ActivateAlt,
    ActivateFn,
    UnlockSurface,
}

internal object KeyboardCtrlSurfaceModePolicy {
    fun actionForPrimaryTap(
        locked: Boolean,
        activeModifier: KeyboardSystemModifier?,
        lastTapAtMs: Long,
        nowAtMs: Long,
        doubleTapTimeoutMs: Long,
    ): KeyboardCtrlSurfaceTapAction {
        if (activeModifier == KeyboardSystemModifier.Ctrl) {
            return KeyboardCtrlSurfaceTapAction.LockCtrl
        }
        if (activeModifier == KeyboardSystemModifier.Alt) {
            return KeyboardCtrlSurfaceTapAction.ActivateFn
        }
        if (activeModifier == KeyboardSystemModifier.Fn) {
            return KeyboardCtrlSurfaceTapAction.ActivateCtrl
        }
        if (locked) {
            val stillCycling =
                lastTapAtMs > 0L &&
                    nowAtMs >= lastTapAtMs &&
                    nowAtMs - lastTapAtMs <= doubleTapTimeoutMs
            return if (stillCycling) {
                KeyboardCtrlSurfaceTapAction.ActivateAlt
            } else {
                KeyboardCtrlSurfaceTapAction.UnlockSurface
            }
        }
        return KeyboardCtrlSurfaceTapAction.ActivateCtrl
    }

    fun shouldUnlockOnLongPress(locked: Boolean): Boolean = locked
}
