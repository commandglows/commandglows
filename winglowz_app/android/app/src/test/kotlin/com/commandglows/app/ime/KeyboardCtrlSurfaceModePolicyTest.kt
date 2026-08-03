package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyboardCtrlSurfaceModePolicyTest {
    @Test
    fun `simple tap keeps ctrl as modifier`() {
        assertEquals(
            KeyboardCtrlSurfaceTapAction.ActivateCtrl,
            KeyboardCtrlSurfaceModePolicy.actionForPrimaryTap(
                locked = false,
                activeModifier = null,
                lastTapAtMs = 0L,
                nowAtMs = 1000L,
                doubleTapTimeoutMs = 300L,
            ),
        )
    }

    @Test
    fun `fast second tap locks ctrl action surface`() {
        assertEquals(
            KeyboardCtrlSurfaceTapAction.LockCtrl,
            KeyboardCtrlSurfaceModePolicy.actionForPrimaryTap(
                locked = false,
                activeModifier = KeyboardSystemModifier.Ctrl,
                lastTapAtMs = 1000L,
                nowAtMs = 1200L,
                doubleTapTimeoutMs = 300L,
            ),
        )
    }

    @Test
    fun `fast third tap from locked promotes alt`() {
        assertEquals(
            KeyboardCtrlSurfaceTapAction.ActivateAlt,
            KeyboardCtrlSurfaceModePolicy.actionForPrimaryTap(
                locked = true,
                activeModifier = null,
                lastTapAtMs = 1000L,
                nowAtMs = 1200L,
                doubleTapTimeoutMs = 300L,
            ),
        )
    }

    @Test
    fun `tap after locked burst unlocks ctrl action surface`() {
        assertEquals(
            KeyboardCtrlSurfaceTapAction.UnlockSurface,
            KeyboardCtrlSurfaceModePolicy.actionForPrimaryTap(
                locked = true,
                activeModifier = null,
                lastTapAtMs = 1000L,
                nowAtMs = 1405L,
                doubleTapTimeoutMs = 300L,
            ),
        )
    }

    @Test
    fun `alt tap advances to fn`() {
        assertEquals(
            KeyboardCtrlSurfaceTapAction.ActivateFn,
            KeyboardCtrlSurfaceModePolicy.actionForPrimaryTap(
                locked = false,
                activeModifier = KeyboardSystemModifier.Alt,
                lastTapAtMs = 1000L,
                nowAtMs = 1100L,
                doubleTapTimeoutMs = 300L,
            ),
        )
    }

    @Test
    fun `long press only unlocks when the surface is locked`() {
        assertTrue(KeyboardCtrlSurfaceModePolicy.shouldUnlockOnLongPress(locked = true))
        assertFalse(KeyboardCtrlSurfaceModePolicy.shouldUnlockOnLongPress(locked = false))
    }
}
