package com.commandglows.app.ime

import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.hypot
import kotlin.math.min

data class GestureSample(
    val startX: Float,
    val startY: Float,
    val endX: Float,
    val endY: Float,
    val maxDistanceFromStart: Float,
)

data class GestureThresholds(
    val tapSlopPx: Float,
    val cornerThresholdPx: Float,
    val returnCenterRadiusPx: Float,
)

enum class GestureSelection {
    PrimaryTap,
    Up,
    Right,
    Down,
    Left,
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Canceled,
}

object KeyboardGestureClassifier {
    private const val CARDINAL_HALF_SECTOR_DEG = 22.5
    private const val DIAGONAL_HALF_SECTOR_DEG = 18.0

    fun classify(sample: GestureSample, thresholds: GestureThresholds): GestureSelection {
        val dx = sample.endX - sample.startX
        val dy = sample.endY - sample.startY
        val distance = hypot(dx.toDouble(), dy.toDouble()).toFloat()

        if (distance <= thresholds.tapSlopPx) {
            return GestureSelection.PrimaryTap
        }

        if (sample.maxDistanceFromStart > thresholds.cornerThresholdPx &&
            distance <= thresholds.returnCenterRadiusPx
        ) {
            return GestureSelection.Canceled
        }

        if (distance < thresholds.cornerThresholdPx) {
            return GestureSelection.PrimaryTap
        }

        // 0° = right, 90° = up, 180° = left, 270° = down.
        val angleDeg = ((Math.toDegrees(atan2((-dy).toDouble(), dx.toDouble())) + 360.0) % 360.0)
        nearestCardinal(angleDeg)?.let { return it }
        nearestDiagonal(angleDeg)?.let { return it }
        if (abs(dx) < thresholds.cornerThresholdPx && abs(dy) < thresholds.cornerThresholdPx) {
            return GestureSelection.PrimaryTap
        }

        return GestureSelection.Canceled
    }

    private fun nearestCardinal(angleDeg: Double): GestureSelection? {
        return when {
            distanceToAngle(angleDeg, 0.0) <= CARDINAL_HALF_SECTOR_DEG -> GestureSelection.Right
            distanceToAngle(angleDeg, 90.0) <= CARDINAL_HALF_SECTOR_DEG -> GestureSelection.Up
            distanceToAngle(angleDeg, 180.0) <= CARDINAL_HALF_SECTOR_DEG -> GestureSelection.Left
            distanceToAngle(angleDeg, 270.0) <= CARDINAL_HALF_SECTOR_DEG -> GestureSelection.Down
            else -> null
        }
    }

    private fun nearestDiagonal(angleDeg: Double): GestureSelection? {
        return when {
            distanceToAngle(angleDeg, 45.0) <= DIAGONAL_HALF_SECTOR_DEG -> GestureSelection.TopRight
            distanceToAngle(angleDeg, 135.0) <= DIAGONAL_HALF_SECTOR_DEG -> GestureSelection.TopLeft
            distanceToAngle(angleDeg, 225.0) <= DIAGONAL_HALF_SECTOR_DEG -> GestureSelection.BottomLeft
            distanceToAngle(angleDeg, 315.0) <= DIAGONAL_HALF_SECTOR_DEG -> GestureSelection.BottomRight
            else -> null
        }
    }

    private fun distanceToAngle(source: Double, target: Double): Double {
        val direct = abs(source - target)
        return min(direct, 360.0 - direct)
    }
}
