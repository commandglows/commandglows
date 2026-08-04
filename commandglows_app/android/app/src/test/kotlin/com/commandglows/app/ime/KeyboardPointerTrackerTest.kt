package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyboardPointerTrackerTest {
    @Test
    fun `tracks overlapping pointers and reverse release order`() {
        val tracker = KeyboardPointerTracker<String>()
        tracker.startPointer(pointerId = 11, keyId = "key-a", payload = "A", x = 10f, y = 20f)
        tracker.startPointer(pointerId = 42, keyId = "key-b", payload = "B", x = 30f, y = 40f)

        assertEquals(setOf("key-a", "key-b"), tracker.activeKeyIds())

        val firstReleased = tracker.removePointer(42)
        assertNotNull(firstReleased)
        assertEquals("key-b", firstReleased?.keyId)
        assertTrue(tracker.contains(11))
        assertFalse(tracker.contains(42))

        val secondReleased = tracker.removePointer(11)
        assertNotNull(secondReleased)
        assertTrue(tracker.activeStates().isEmpty())
    }

    @Test
    fun `updates only the matching pointer state on move`() {
        val tracker = KeyboardPointerTracker<String>()
        tracker.startPointer(pointerId = 1, keyId = "key-a", payload = "A", x = 0f, y = 0f)
        tracker.startPointer(pointerId = 2, keyId = "key-b", payload = "B", x = 8f, y = 8f)

        tracker.updatePosition(pointerId = 2, x = 20f, y = 8f)

        val first = tracker.get(1)
        val second = tracker.get(2)
        assertEquals(0f, first?.latestX ?: -1f, 0f)
        assertEquals(0f, first?.maxDistanceFromStart ?: -1f, 0f)
        assertEquals(20f, second?.latestX ?: -1f, 0f)
        assertTrue((second?.maxDistanceFromStart ?: 0f) > 0f)
        assertTrue((second?.totalTravelDistance ?: 0f) > 0f)
    }

    @Test
    fun `accumulates total travel even when pointer moves around`() {
        val tracker = KeyboardPointerTracker<String>()
        tracker.startPointer(pointerId = 1, keyId = "key-a", payload = "A", x = 0f, y = 0f)

        tracker.updatePosition(pointerId = 1, x = 10f, y = 0f)
        tracker.updatePosition(pointerId = 1, x = 0f, y = 0f)

        val state = tracker.get(1)
        assertEquals(20f, state?.totalTravelDistance ?: -1f, 0f)
        assertEquals(10f, state?.maxDistanceFromStart ?: -1f, 0f)
    }

    @Test
    fun `protected interaction keeps one owner and cancels incompatible pointers`() {
        val tracker = KeyboardPointerTracker<String>()
        tracker.startPointer(pointerId = 1, keyId = "key-a", payload = "A", x = 0f, y = 0f)
        tracker.startPointer(pointerId = 2, keyId = "key-space", payload = " ", x = 10f, y = 0f)
        tracker.startPointer(pointerId = 3, keyId = "key-c", payload = "C", x = 20f, y = 0f)

        val canceled = tracker.acquireProtectedInteraction(2, KeyboardProtectedInteraction.SpaceSlider)

        assertEquals(setOf(1, 3), canceled.map { it.pointerId }.toSet())
        assertEquals(2, tracker.protectedOwnerPointerId)
        assertEquals(KeyboardProtectedInteraction.SpaceSlider, tracker.protectedInteraction)
        assertEquals(listOf(2), tracker.activeStates().map { it.pointerId })
    }

    @Test
    fun `protected lock suppresses non-owner pointers and releases on owner up`() {
        val tracker = KeyboardPointerTracker<String>()
        tracker.startPointer(pointerId = 9, keyId = "delete", payload = "delete", x = 0f, y = 0f)
        tracker.acquireProtectedInteraction(9, KeyboardProtectedInteraction.LongPressRepeat)

        assertFalse(tracker.isProtectedByOtherPointer(9))
        assertTrue(tracker.isProtectedByOtherPointer(10))

        tracker.removePointer(9)

        assertNull(tracker.protectedOwnerPointerId)
        assertNull(tracker.protectedInteraction)
        assertFalse(tracker.isProtectedByOtherPointer(10))
    }

    @Test
    fun `long press tokens are pointer-owned`() {
        val tracker = KeyboardPointerTracker<String>()
        tracker.startPointer(pointerId = 4, keyId = "key-x", payload = "X", x = 2f, y = 2f)

        val first = tracker.nextLongPressToken(4)
        val second = tracker.nextLongPressToken(4)

        assertEquals(1, first)
        assertEquals(2, second)
        assertFalse(tracker.isLongPressTokenCurrent(4, 1))
        assertTrue(tracker.isLongPressTokenCurrent(4, 2))

        tracker.removePointer(4)
        assertFalse(tracker.isLongPressTokenCurrent(4, 2))
    }
}
