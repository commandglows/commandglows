package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Test

class KeyboardGestureClassifierTest {
    private val thresholds =
        GestureThresholds(
            tapSlopPx = 10f,
            cornerThresholdPx = 16f,
            returnCenterRadiusPx = 12f,
        )

    @Test
    fun `classifies tap as primary`() {
        val selection =
            KeyboardGestureClassifier.classify(
                sample =
                    GestureSample(
                        startX = 100f,
                        startY = 100f,
                        endX = 106f,
                        endY = 102f,
                        maxDistanceFromStart = 6.5f,
                    ),
                thresholds = thresholds,
            )

        assertEquals(GestureSelection.PrimaryTap, selection)
    }

    @Test
    fun `classifies top right swipe`() {
        val selection =
            KeyboardGestureClassifier.classify(
                sample =
                    GestureSample(
                        startX = 100f,
                        startY = 100f,
                        endX = 132f,
                        endY = 72f,
                        maxDistanceFromStart = 42f,
                    ),
                thresholds = thresholds,
            )

        assertEquals(GestureSelection.TopRight, selection)
    }

    @Test
    fun `classifies cardinal up swipe`() {
        val selection =
            KeyboardGestureClassifier.classify(
                sample =
                    GestureSample(
                        startX = 100f,
                        startY = 100f,
                        endX = 102f,
                        endY = 58f,
                        maxDistanceFromStart = 46f,
                    ),
                thresholds = thresholds,
            )

        assertEquals(GestureSelection.Up, selection)
    }

    @Test
    fun `classifies cardinal left swipe`() {
        val selection =
            KeyboardGestureClassifier.classify(
                sample =
                    GestureSample(
                        startX = 100f,
                        startY = 100f,
                        endX = 54f,
                        endY = 96f,
                        maxDistanceFromStart = 46f,
                    ),
                thresholds = thresholds,
            )

        assertEquals(GestureSelection.Left, selection)
    }

    @Test
    fun `classifies ambiguous sector as canceled`() {
        val selection =
            KeyboardGestureClassifier.classify(
                sample =
                    GestureSample(
                        startX = 100f,
                        startY = 100f,
                        endX = 126f,
                        endY = 87f,
                        maxDistanceFromStart = 31f,
                    ),
                thresholds = thresholds,
            )

        assertEquals(GestureSelection.Canceled, selection)
    }

    @Test
    fun `classifies return to center as canceled`() {
        val selection =
            KeyboardGestureClassifier.classify(
                sample =
                    GestureSample(
                        startX = 100f,
                        startY = 100f,
                        endX = 104f,
                        endY = 97f,
                        maxDistanceFromStart = 45f,
                    ),
                thresholds = thresholds,
            )

        assertEquals(GestureSelection.Canceled, selection)
    }
}
