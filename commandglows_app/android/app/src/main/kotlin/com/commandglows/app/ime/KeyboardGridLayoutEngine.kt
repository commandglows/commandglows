package com.commandglows.app.ime

import android.graphics.RectF
import kotlin.math.max

internal data class KeyboardKeyGeometry(
    val key: KeyboardKeySpec,
    val slotRect: RectF,
    val visualRect: RectF,
    val touchRect: RectF,
)

internal object KeyboardGridLayoutEngine {
    fun layoutFixedRow(
        row: KeyboardRowSpec,
        left: Float,
        top: Float,
        width: Float,
        height: Float,
        keyGap: Float,
        keyWidthScale: Float,
        touchClipRect: RectF? = null,
        touchBottomExtension: Float = 0f,
    ): List<KeyboardKeyGeometry> {
        if (row.keys.isEmpty() || width <= 0f || height <= 0f) {
            return emptyList()
        }
        val leadingSpan = spacerSpan(row.leadingSpan, row.leadingWeight)
        val trailingSpan = spacerSpan(row.trailingSpan, row.trailingWeight)
        val keySpans = row.keys.map { keySpan(it) }
        val totalSpan = leadingSpan + trailingSpan + keySpans.sum()
        if (totalSpan <= 0) {
            return emptyList()
        }

        val unit = width / totalSpan.toFloat()
        val innerGap = (keyGap / 2f).coerceAtLeast(0f)
        var x = left + unit * leadingSpan
        val lastIndex = row.keys.lastIndex
        return row.keys.mapIndexed { index, key ->
            val slotWidth = unit * keySpans[index]
            val slotRect = RectF(x, top, x + slotWidth, top + height)
            val visualRect =
                visualRectForSlot(
                    slotRect = slotRect,
                    leftInset = if (index == 0 && leadingSpan == 0) 0f else innerGap,
                    rightInset = if (index == lastIndex && trailingSpan == 0) 0f else innerGap,
                    keyWidthScale = keyWidthScale,
                )
            val touchRect = RectF(slotRect).apply {
                bottom += touchBottomExtension.coerceAtLeast(0f)
            }
            val clippedTouchRect = clipTouchRect(touchRect, touchClipRect)
            x += slotWidth
            KeyboardKeyGeometry(
                key = key,
                slotRect = slotRect,
                visualRect = visualRect,
                touchRect = clippedTouchRect,
            )
        }
    }

    fun layoutScrollableRow(
        row: KeyboardRowSpec,
        keyWidths: List<Float>,
        rowOffset: Float,
        left: Float,
        top: Float,
        height: Float,
        keyGap: Float,
        keyWidthScale: Float,
        touchClipRect: RectF? = null,
        touchBottomExtension: Float = 0f,
    ): List<KeyboardKeyGeometry> {
        if (row.keys.isEmpty() || keyWidths.size != row.keys.size || height <= 0f) {
            return emptyList()
        }
        val innerGap = (keyGap / 2f).coerceAtLeast(0f)
        var x = left - rowOffset
        val lastIndex = row.keys.lastIndex
        return row.keys.mapIndexed { index, key ->
            val width = keyWidths[index].coerceAtLeast(0f)
            val slotRect = RectF(x, top, x + width, top + height)
            val visualRect =
                visualRectForSlot(
                    slotRect = slotRect,
                    leftInset = if (index == 0) 0f else innerGap,
                    rightInset = if (index == lastIndex) 0f else innerGap,
                    keyWidthScale = keyWidthScale,
                )
            val touchRect = RectF(slotRect)
            touchRect.left -= if (index == 0) 0f else innerGap
            touchRect.right += if (index == lastIndex) 0f else innerGap
            touchRect.bottom += touchBottomExtension.coerceAtLeast(0f)
            val clippedTouchRect = clipTouchRect(touchRect, touchClipRect)
            x += width + keyGap
            KeyboardKeyGeometry(
                key = key,
                slotRect = slotRect,
                visualRect = visualRect,
                touchRect = clippedTouchRect,
            )
        }
    }

    private fun keySpan(key: KeyboardKeySpec): Int {
        key.span?.let { return it.coerceAtLeast(1) }
        return max(1, key.weight.toInt())
    }

    private fun spacerSpan(explicitSpan: Int?, legacyWeight: Float): Int {
        explicitSpan?.let { return it.coerceAtLeast(0) }
        if (legacyWeight <= 0f) {
            return 0
        }
        return max(1, legacyWeight.toInt())
    }

    private fun visualRectForSlot(
        slotRect: RectF,
        leftInset: Float,
        rightInset: Float,
        keyWidthScale: Float,
    ): RectF {
        val visualLeft = slotRect.left + leftInset
        val visualRight = slotRect.right - rightInset
        val usableWidth = (visualRight - visualLeft).coerceAtLeast(1f)
        val scaledWidth = (usableWidth * keyWidthScale).coerceAtLeast(1f)
        val centerX = (visualLeft + visualRight) / 2f
        return RectF(
            centerX - scaledWidth / 2f,
            slotRect.top,
            centerX + scaledWidth / 2f,
            slotRect.bottom,
        )
    }

    private fun clipTouchRect(
        rect: RectF,
        clip: RectF?,
    ): RectF {
        if (clip == null) {
            return rect
        }
        rect.left = max(rect.left, clip.left)
        rect.top = max(rect.top, clip.top)
        rect.right = minOf(rect.right, clip.right)
        rect.bottom = minOf(rect.bottom, clip.bottom)
        if (rect.right <= rect.left || rect.bottom <= rect.top) {
            rect.setEmpty()
        }
        return rect
    }
}
