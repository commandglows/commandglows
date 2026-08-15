package com.commandglows.app

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.animation.LinearInterpolator
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.roundToInt

/**
 * Native overlay visual roles compiled directly into the Android surface.
 * They intentionally remain independent from Flutter lifecycle and preserve
 * the existing overlay and waveform appearance exactly.
 */
internal object NativeOverlayVisualTokens {
    const val PRIMARY: Int = -14326805
    const val RECORDING: Int = -1096636
    const val PAUSED: Int = -680437
    const val DANGER: Int = -2349530
    const val SUCCESS: Int = -15293622
    const val ACCENT: Int = -14494738
    const val PROCESSING: Int = -8286984
    const val SURFACE: Int = -15656921
    const val SURFACE_STROKE: Int = -13418155
    const val DISMISS_ACTIVE_STROKE: Int = -79158
    const val DISMISS_IDLE_STROKE: Int = -12102295
    const val LABEL_LETTER_SPACING: Float = 0.08f
}

class OverlayView(context: Context) : FrameLayout(context) {

    var onBubbleTap: (() -> Unit)? = null
    var onRecordStop: (() -> Unit)? = null
    var onRecordCancel: (() -> Unit)? = null
    var onRecordPause: (() -> Unit)? = null
    var onRecordResume: (() -> Unit)? = null
    var onBubbleLongPress: (() -> Unit)? = null

    private var currentState = "collapsed"
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())

    private val fabSize = dpToPx(50f)
    private val expandedWidth = dpToPx(220f)
    private val expandedHeight = dpToPx(58f)
    private val buttonSize = dpToPx(30f)
    private val waveformWidth = dpToPx(64f)
    private val cornerRadius = dpToPx(26f)

    private val primaryColor = NativeOverlayVisualTokens.PRIMARY
    private val recordingColor = NativeOverlayVisualTokens.RECORDING
    private val pausedColor = NativeOverlayVisualTokens.PAUSED
    private val dangerColor = NativeOverlayVisualTokens.DANGER
    private val successColor = NativeOverlayVisualTokens.SUCCESS
    private val accentColor = NativeOverlayVisualTokens.ACCENT
    private val processingColor = NativeOverlayVisualTokens.PROCESSING
    private val surfaceColor = NativeOverlayVisualTokens.SURFACE
    private val surfaceStrokeColor = NativeOverlayVisualTokens.SURFACE_STROKE

    private val fabView: TextView
    private val recordingChromeView: RecordingChromeView
    private val expandedContainer: LinearLayout
    private val cancelButton: TextView
    private val waveformView: WaveformView
    private val pauseButton: TextView
    private val doneButton: TextView

    init {
        fabView = TextView(context).apply {
            layoutParams = LayoutParams(fabSize, fabSize)
            text = "REC"
            textSize = 14f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            visibility = VISIBLE
            setPadding(0, 0, 0, 0)
            letterSpacing = NativeOverlayVisualTokens.LABEL_LETTER_SPACING
            contentDescription = "CommandGlows overlay. Tap to start dictation. Drag to move."
            elevation = dpToPx(8f).toFloat()
        }
        fabView.background = BubbleDrawable(primaryColor, surfaceStrokeColor)
        addView(fabView)

        recordingChromeView =
            RecordingChromeView(
                context = context,
                surfaceColor = surfaceColor,
                strokeColor = surfaceStrokeColor,
                recordingColor = recordingColor,
                pausedColor = pausedColor,
                accentColor = accentColor,
                processingColor = processingColor,
                radius = cornerRadius.toFloat(),
            ).apply {
                layoutParams = LayoutParams(expandedWidth, expandedHeight)
                visibility = GONE
            }
        addView(recordingChromeView)

        expandedContainer = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LayoutParams(expandedWidth, expandedHeight)
            gravity = Gravity.CENTER_VERTICAL
            setPadding(
                dpToPx(10f),
                dpToPx(7f),
                dpToPx(10f),
                dpToPx(7f),
            )
            visibility = GONE
            elevation = dpToPx(12f).toFloat()
            contentDescription = "CommandGlows recording controls."
        }

        cancelButton = TextView(context).apply {
            layoutParams = LinearLayout.LayoutParams(buttonSize, buttonSize).apply {
                setMargins(0, 0, dpToPx(6f), 0)
            }
            text = "X"
            textSize = 14f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            background = CircleDrawable(dangerColor)
            contentDescription = "Cancel recording"
            setOnClickListener {
                performOverlayHaptic()
                onRecordCancel?.invoke()
            }
        }
        expandedContainer.addView(cancelButton)

        waveformView = WaveformView(context).apply {
            layoutParams = LinearLayout.LayoutParams(waveformWidth, LinearLayout.LayoutParams.MATCH_PARENT)
        }
        expandedContainer.addView(waveformView)

        pauseButton = TextView(context).apply {
            layoutParams = LinearLayout.LayoutParams(buttonSize, buttonSize).apply {
                setMargins(dpToPx(6f), 0, 0, 0)
            }
            text = "II"
            textSize = 12f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            background = CircleDrawable(pausedColor)
            contentDescription = "Pause recording"
            setOnClickListener {
                performOverlayHaptic()
                if (currentState == "paused") {
                    onRecordResume?.invoke()
                } else {
                    onRecordPause?.invoke()
                }
            }
        }
        expandedContainer.addView(pauseButton)

        doneButton = TextView(context).apply {
            layoutParams = LinearLayout.LayoutParams(buttonSize, buttonSize).apply {
                setMargins(dpToPx(6f), 0, 0, 0)
            }
            text = "OK"
            textSize = 12f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            background = CircleDrawable(successColor)
            contentDescription = "Finish recording"
            setOnClickListener {
                performOverlayHaptic()
                onRecordStop?.invoke()
            }
        }
        expandedContainer.addView(doneButton)
        addView(expandedContainer)

        fabView.setOnClickListener {
            performOverlayHaptic()
            onBubbleTap?.invoke()
        }
    }

    fun getCurrentState(): String = currentState

    fun setSizeScale(scale: Float) {
        val normalized = scale.coerceIn(0.8f, 1.4f)
        scaleX = normalized
        scaleY = normalized
        pivotX = if (width > 0) width / 2f else fabSize / 2f
        pivotY = if (height > 0) height / 2f else fabSize / 2f
    }

    fun setState(state: String) {
        currentState = normalizeState(state)
        when (currentState) {
            "collapsed" -> {
                fabView.visibility = VISIBLE
                fabView.background = BubbleDrawable(primaryColor, surfaceStrokeColor)
                recordingChromeView.visibility = GONE
                recordingChromeView.stop()
                waveformView.setRecording(false)
                waveformView.setPaused(false)
                waveformView.setProcessing(false)
                expandedContainer.visibility = GONE
                layoutParams?.width = fabSize
                layoutParams?.height = fabSize
            }
            "recording" -> {
                fabView.visibility = GONE
                recordingChromeView.visibility = VISIBLE
                recordingChromeView.start(processing = false)
                expandedContainer.visibility = VISIBLE
                cancelButton.isEnabled = true
                pauseButton.isEnabled = true
                doneButton.isEnabled = true
                cancelButton.alpha = 1f
                pauseButton.alpha = 1f
                doneButton.alpha = 1f
                pauseButton.text = "II"
                pauseButton.background = CircleDrawable(pausedColor)
                pauseButton.contentDescription = "Pause recording"
                waveformView.setRecording(true)
                waveformView.setPaused(false)
                waveformView.setProcessing(false)
                layoutParams?.width = expandedWidth
                layoutParams?.height = expandedHeight
            }
            "paused" -> {
                fabView.visibility = GONE
                recordingChromeView.visibility = VISIBLE
                recordingChromeView.start(processing = false, paused = true)
                expandedContainer.visibility = VISIBLE
                cancelButton.isEnabled = true
                pauseButton.isEnabled = true
                doneButton.isEnabled = true
                cancelButton.alpha = 1f
                pauseButton.alpha = 1f
                doneButton.alpha = 1f
                pauseButton.text = ">"
                pauseButton.background = CircleDrawable(successColor)
                pauseButton.contentDescription = "Resume recording"
                waveformView.setRecording(false)
                waveformView.setPaused(true)
                waveformView.setProcessing(false)
                layoutParams?.width = expandedWidth
                layoutParams?.height = expandedHeight
            }
            "processing" -> {
                fabView.visibility = GONE
                recordingChromeView.visibility = VISIBLE
                recordingChromeView.start(processing = true, paused = false)
                expandedContainer.visibility = VISIBLE
                cancelButton.isEnabled = false
                pauseButton.isEnabled = false
                doneButton.isEnabled = false
                cancelButton.alpha = 0.35f
                pauseButton.alpha = 0.35f
                doneButton.alpha = 0.35f
                waveformView.setRecording(false)
                waveformView.setPaused(false)
                waveformView.setProcessing(true)
                layoutParams?.width = expandedWidth
                layoutParams?.height = expandedHeight
            }
            "result" -> {
                fabView.visibility = VISIBLE
                fabView.background = BubbleDrawable(successColor, surfaceStrokeColor)
                recordingChromeView.visibility = GONE
                recordingChromeView.stop()
                waveformView.setRecording(false)
                waveformView.setPaused(false)
                waveformView.setProcessing(false)
                expandedContainer.visibility = GONE
                layoutParams?.width = fabSize
                layoutParams?.height = fabSize
                handler.removeCallbacksAndMessages(null)
                handler.postDelayed({ setState("collapsed") }, 1400)
            }
        }
        requestLayout()
    }

    fun showResult() {
        setState("result")
    }

    fun updateMeter(level: Float) {
        waveformView.setLevel(level)
    }

    override fun performClick(): Boolean {
        super.performClick()
        if (currentState == "collapsed") {
            performOverlayHaptic()
            onBubbleTap?.invoke()
        }
        return true
    }

    fun emitLongPress() {
        performOverlayHaptic(HapticFeedbackConstants.LONG_PRESS)
        onBubbleLongPress?.invoke()
    }

    fun setDragHandleTouchListener(listener: View.OnTouchListener?) = Unit

    fun setBubbleTouchListener(listener: View.OnTouchListener?) {
        fabView.setOnTouchListener(listener)
    }

    fun setOverlayTouchListener(listener: View.OnTouchListener?) {
        setOnTouchListener(listener)
        fabView.setOnTouchListener(listener)
        recordingChromeView.setOnTouchListener(listener)
        expandedContainer.setOnTouchListener(listener)
        cancelButton.setOnTouchListener(listener)
        waveformView.setOnTouchListener(listener)
        pauseButton.setOnTouchListener(listener)
        doneButton.setOnTouchListener(listener)
    }

    override fun onDetachedFromWindow() {
        recordingChromeView.stop()
        super.onDetachedFromWindow()
    }

    private fun performOverlayHaptic(
        feedbackConstant: Int = HapticFeedbackConstants.VIRTUAL_KEY,
    ) {
        performHapticFeedback(feedbackConstant)
    }

    private fun normalizeState(state: String): String {
        return if (state in setOf("collapsed", "recording", "paused", "processing", "result")) {
            state
        } else {
            "collapsed"
        }
    }

    private fun dpToPx(dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            resources.displayMetrics,
        ).roundToInt()
    }

    private class RecordingChromeView(
        context: Context,
        private val surfaceColor: Int,
        private val strokeColor: Int,
        private val recordingColor: Int,
        private val pausedColor: Int,
        private val accentColor: Int,
        private val processingColor: Int,
        private val radius: Float,
    ) : View(context) {
        private val fillPaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = surfaceColor
                style = Paint.Style.FILL
            }
        private val strokePaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeCap = Paint.Cap.ROUND
            }
        private val rect = RectF()
        private var animator: ValueAnimator? = null
        private var progress = 0f
        private var processing = false
        private var paused = false

        fun start(processing: Boolean, paused: Boolean = false) {
            this.processing = processing
            this.paused = paused
            if (animator?.isStarted == true) {
                invalidate()
                return
            }
            animator =
                ValueAnimator.ofFloat(0f, 1f).apply {
                    duration = 1180L
                    repeatCount = ValueAnimator.INFINITE
                    interpolator = LinearInterpolator()
                    addUpdateListener { animation ->
                        progress = animation.animatedValue as Float
                        invalidate()
                    }
                    start()
                }
        }

        fun stop() {
            animator?.cancel()
            animator = null
            progress = 0f
            invalidate()
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            rect.set(0f, 0f, width.toFloat(), height.toFloat())
            canvas.drawRoundRect(rect, radius, radius, fillPaint)

            val activeColor = when {
                processing -> processingColor
                paused -> pausedColor
                else -> recordingColor
            }
            val pulse = if (progress <= 0.5f) progress * 2f else (1f - progress) * 2f
            val secondaryPulse = (progress + 0.42f) % 1f

            rect.inset(2f, 2f)
            strokePaint.color = alphaColor(strokeColor, 235)
            strokePaint.strokeWidth = 2f
            canvas.drawRoundRect(rect, radius, radius, strokePaint)

            val activeInset = 4f + (7f * secondaryPulse)
            val activeRect = RectF(0f, 0f, width.toFloat(), height.toFloat()).apply {
                inset(activeInset, activeInset)
            }
            strokePaint.color = alphaColor(activeColor, (125 * (1f - secondaryPulse)).toInt())
            strokePaint.strokeWidth = 2.5f + 2.5f * (1f - secondaryPulse)
            canvas.drawRoundRect(activeRect, radius, radius, strokePaint)

            val glowRect = RectF(0f, 0f, width.toFloat(), height.toFloat()).apply {
                inset(5f + 3f * pulse, 5f + 3f * pulse)
            }
            strokePaint.color = alphaColor(accentColor, 70 + (80 * pulse).toInt())
            strokePaint.strokeWidth = 2f + 2f * pulse
            canvas.drawRoundRect(glowRect, radius, radius, strokePaint)
        }

        override fun onDetachedFromWindow() {
            stop()
            super.onDetachedFromWindow()
        }

        private fun alphaColor(color: Int, alpha: Int): Int {
            return Color.argb(
                alpha.coerceIn(0, 255),
                Color.red(color),
                Color.green(color),
                Color.blue(color),
            )
        }
    }

    private class CircleDrawable(private val color: Int) : android.graphics.drawable.Drawable() {
        private val paint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = color
                style = Paint.Style.FILL
            }

        override fun draw(canvas: Canvas) {
            val cx = bounds.exactCenterX()
            val cy = bounds.exactCenterY()
            val radius = minOf(cx, cy)
            canvas.drawCircle(cx, cy, radius, paint)
        }

        override fun setAlpha(alpha: Int) {
            paint.alpha = alpha
        }

        override fun setColorFilter(cf: android.graphics.ColorFilter?) {
            paint.colorFilter = cf
        }

        @Deprecated("Deprecated in Java")
        override fun getOpacity(): Int = android.graphics.PixelFormat.TRANSLUCENT
    }

    private class BubbleDrawable(
        private val color: Int,
        private val strokeColor: Int,
    ) : android.graphics.drawable.Drawable() {
        private val fillPaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = color
                style = Paint.Style.FILL
            }
        private val strokePaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = strokeColor
                style = Paint.Style.STROKE
                strokeWidth = 2f
            }

        override fun draw(canvas: Canvas) {
            val cx = bounds.exactCenterX()
            val cy = bounds.exactCenterY()
            val radius = minOf(cx, cy)
            canvas.drawCircle(cx, cy, radius, fillPaint)
            canvas.drawCircle(cx, cy, radius - strokePaint.strokeWidth, strokePaint)
        }

        override fun setAlpha(alpha: Int) {
            fillPaint.alpha = alpha
            strokePaint.alpha = alpha
        }

        override fun setColorFilter(cf: android.graphics.ColorFilter?) {
            fillPaint.colorFilter = cf
            strokePaint.colorFilter = cf
        }

        @Deprecated("Deprecated in Java")
        override fun getOpacity(): Int = android.graphics.PixelFormat.TRANSLUCENT
    }

    private class RoundRectDrawable(
        private val color: Int,
        private val radius: Float,
        private val strokeColor: Int,
    ) : android.graphics.drawable.Drawable() {
        private val paint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = color
                style = Paint.Style.FILL
            }
        private val strokePaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = strokeColor
                style = Paint.Style.STROKE
                strokeWidth = 2f
            }
        private val rect = RectF()

        override fun draw(canvas: Canvas) {
            rect.set(bounds)
            canvas.drawRoundRect(rect, radius, radius, paint)
            rect.inset(strokePaint.strokeWidth / 2f, strokePaint.strokeWidth / 2f)
            canvas.drawRoundRect(rect, radius, radius, strokePaint)
        }

        override fun setAlpha(alpha: Int) {
            paint.alpha = alpha
            strokePaint.alpha = alpha
        }

        override fun setColorFilter(cf: android.graphics.ColorFilter?) {
            paint.colorFilter = cf
            strokePaint.colorFilter = cf
        }

        @Deprecated("Deprecated in Java")
        override fun getOpacity(): Int = android.graphics.PixelFormat.TRANSLUCENT
    }
}
