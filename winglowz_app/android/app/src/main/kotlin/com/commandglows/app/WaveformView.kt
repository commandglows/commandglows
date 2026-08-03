package com.commandglows.app

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
    private val pausedColor = Color.parseColor("#f59e0b")
    private val processingColor = Color.parseColor("#818cf8")

    private val paint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = accentColor
            style = Paint.Style.FILL
        }

    private var meterLevel = 0f
    private var isRecording = false
    private var isPaused = false
    private var isProcessing = false
    private var animationPhase = 0f

    fun setLevel(level: Float) {
        meterLevel = level.coerceIn(0f, 1f)
        invalidate()
    }

    fun setRecording(recording: Boolean) {
        if (isRecording == recording) {
            return
        }
        isRecording = recording
        if (recording && !isProcessing) {
            animateRecording()
        } else if (!recording && !isProcessing) {
            animationPhase = 0f
            invalidate()
        }
    }

    fun setPaused(paused: Boolean) {
        if (isPaused == paused) {
            return
        }
        isPaused = paused
        paint.color = if (paused) pausedColor else accentColor
        if (paused) {
            animationPhase = 0f
        }
        invalidate()
    }

    fun setProcessing(processing: Boolean) {
        isProcessing = processing
        paint.color = when {
            processing -> processingColor
            isPaused -> pausedColor
            else -> accentColor
        }
        if (processing) {
            animateProcessing()
        } else {
            animationPhase = 0f
            invalidate()
        }
    }

    private fun animateRecording() {
        if (!isRecording || isProcessing) {
            return
        }
        animationPhase += 0.12f
        invalidate()
        postDelayed({ animateRecording() }, 48)
    }

    private fun animateProcessing() {
        if (!isProcessing) {
            return
        }
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
                val phase = (i.toFloat() / barCount) * Math.PI.toFloat() * 2f + animationPhase
                val wave = (sin(phase.toDouble()) * 0.4f + 0.6f).toFloat()
                minBarHeight + (maxBarHeight - minBarHeight) * wave * 0.5f
            } else if (isPaused) {
                val phase = (i.toFloat() / barCount) * Math.PI.toFloat() * 2f
                val variation = (sin(phase.toDouble()) * 0.12f + 0.88f).toFloat()
                minBarHeight + (maxBarHeight - minBarHeight) * 0.18f * variation
            } else {
                val baseLevel = if (isRecording) meterLevel.coerceAtLeast(0.32f) else meterLevel
                val phase = (i.toFloat() / barCount) * Math.PI.toFloat() * 2f + animationPhase
                val variation = (sin(phase.toDouble()) * 0.28f + 0.72f).toFloat()
                minBarHeight + (maxBarHeight - minBarHeight) * baseLevel * variation
            }

            val top = centerY - barHeight / 2f
            val bottom = centerY + barHeight / 2f

            canvas.drawRoundRect(x, top, x + barWidth, bottom, cornerRadius, cornerRadius, paint)
        }
    }

    override fun onDetachedFromWindow() {
        isRecording = false
        isPaused = false
        isProcessing = false
        super.onDetachedFromWindow()
    }

    private fun dpToPx(dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            resources.displayMetrics,
        ).roundToInt()
    }
}
