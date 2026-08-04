package expo.modules.floatingoverlay

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.TypedValue
import android.view.View
import kotlin.math.roundToInt
import kotlin.math.sin

class WaveformView(context: Context) : View(context) {

    private val barCount = 12
    private val barWidth = dpToPx(3f).toFloat()
    private val barGap = dpToPx(2f).toFloat()
    private val minBarHeight = dpToPx(4f).toFloat()
    private val maxBarHeight = dpToPx(28f).toFloat()
    private val cornerRadius = barWidth / 2f

    private val accentColor = Color.parseColor("#22d3ee")
    private val processingColor = Color.parseColor("#818cf8")

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = accentColor
        style = Paint.Style.FILL
    }

    private var meterLevel = 0f
    private var isProcessing = false
    private var animationPhase = 0f

    fun setLevel(level: Float) {
        meterLevel = level.coerceIn(0f, 1f)
        invalidate()
    }

    fun setProcessing(processing: Boolean) {
        isProcessing = processing
        if (processing) {
            paint.color = processingColor
            animateProcessing()
        } else {
            paint.color = accentColor
        }
        invalidate()
    }

    private fun animateProcessing() {
        if (!isProcessing) return
        animationPhase += 0.15f
        invalidate()
        postDelayed({ animateProcessing() }, 50)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        val totalBarsWidth = barCount * barWidth + (barCount - 1) * barGap
        val startX = (width - totalBarsWidth) / 2f
        val centerY = height / 2f

        for (i in 0 until barCount) {
            val x = startX + i * (barWidth + barGap)

            val barHeight = if (isProcessing) {
                // Smooth wave animation for processing
                val phase = (i.toFloat() / barCount) * Math.PI.toFloat() * 2f + animationPhase
                val wave = (sin(phase.toDouble()) * 0.4f + 0.6f).toFloat()
                minBarHeight + (maxBarHeight - minBarHeight) * wave * 0.5f
            } else {
                // Live metering
                val phase = (i.toFloat() / barCount) * Math.PI.toFloat() * 2f
                val variation = (sin((phase + System.currentTimeMillis() / 200.0).toFloat()) * 0.3f + 0.7f)
                minBarHeight + (maxBarHeight - minBarHeight) * meterLevel * variation
            }

            val top = centerY - barHeight / 2f
            val bottom = centerY + barHeight / 2f

            canvas.drawRoundRect(
                x, top, x + barWidth, bottom,
                cornerRadius, cornerRadius, paint
            )
        }
    }

    private fun dpToPx(dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, dp, resources.displayMetrics
        ).roundToInt()
    }
}
