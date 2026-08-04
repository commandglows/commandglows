package expo.modules.floatingoverlay

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.roundToInt

class OverlayView(context: Context) : FrameLayout(context) {

    // Callbacks
    var onBubbleTap: (() -> Unit)? = null
    var onRecordStop: (() -> Unit)? = null
    var onRecordCancel: (() -> Unit)? = null

    // State
    private var currentState = "collapsed"
    private val handler = Handler(Looper.getMainLooper())

    // Dimensions
    private val fabSize = dpToPx(44f)
    private val expandedWidth = dpToPx(200f)
    private val expandedHeight = dpToPx(48f)
    private val buttonSize = dpToPx(32f)
    private val cornerRadius = dpToPx(24f)

    // Colors
    private val primaryColor = Color.parseColor("#6366f1")   // Indigo
    private val dangerColor = Color.parseColor("#ef4444")     // Red
    private val successColor = Color.parseColor("#22c55e")    // Green
    private val accentColor = Color.parseColor("#22d3ee")     // Cyan
    private val surfaceColor = Color.parseColor("#1e293b")    // Dark surface

    // Child views
    private val fabView: TextView
    private val expandedContainer: LinearLayout
    private val cancelButton: TextView
    private val waveformView: WaveformView
    private val doneButton: TextView

    init {
        // FAB (collapsed state) — circle with mic emoji
        fabView = TextView(context).apply {
            layoutParams = LayoutParams(fabSize, fabSize)
            text = "🎙"
            textSize = 20f
            gravity = Gravity.CENTER
            visibility = VISIBLE
        }
        fabView.setBackgroundDrawable(CircleDrawable(primaryColor))
        addView(fabView)

        // Expanded container (recording state)
        expandedContainer = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LayoutParams(expandedWidth, expandedHeight)
            setPadding(dpToPx(8f), dpToPx(8f), dpToPx(8f), dpToPx(8f))
            visibility = GONE
        }
        expandedContainer.setBackgroundDrawable(RoundRectDrawable(surfaceColor, cornerRadius.toFloat()))

        // Cancel button (X)
        cancelButton = TextView(context).apply {
            layoutParams = LinearLayout.LayoutParams(buttonSize, buttonSize).apply {
                setMargins(0, 0, dpToPx(8f), 0)
            }
            text = "✕"
            textSize = 18f
            setTextColor(dangerColor)
            gravity = Gravity.CENTER
            setBackgroundDrawable(CircleDrawable(Color.parseColor("#7f1d1d")))
            setOnClickListener {
                onRecordCancel?.invoke()
            }
        }
        expandedContainer.addView(cancelButton)

        // Waveform
        waveformView = WaveformView(context).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f)
        }
        expandedContainer.addView(waveformView)

        // Done button (checkmark)
        doneButton = TextView(context).apply {
            layoutParams = LinearLayout.LayoutParams(buttonSize, buttonSize).apply {
                setMargins(dpToPx(8f), 0, 0, 0)
            }
            text = "✓"
            textSize = 18f
            setTextColor(successColor)
            gravity = Gravity.CENTER
            setBackgroundDrawable(CircleDrawable(Color.parseColor("#14532d")))
            setOnClickListener {
                onRecordStop?.invoke()
            }
        }
        expandedContainer.addView(doneButton)

        addView(expandedContainer)

        // FAB click
        fabView.setOnClickListener {
            onBubbleTap?.invoke()
        }
    }

    fun getCurrentState(): String = currentState

    fun setState(state: String) {
        currentState = state
        when (state) {
            "collapsed" -> {
                fabView.visibility = VISIBLE
                fabView.setBackgroundDrawable(CircleDrawable(primaryColor))
                expandedContainer.visibility = GONE
                layoutParams?.width = fabSize
                layoutParams?.height = fabSize
            }
            "recording" -> {
                fabView.visibility = GONE
                expandedContainer.visibility = VISIBLE
                layoutParams?.width = expandedWidth
                layoutParams?.height = expandedHeight
            }
            "processing" -> {
                fabView.visibility = GONE
                expandedContainer.visibility = VISIBLE
                cancelButton.isEnabled = false
                doneButton.isEnabled = false
                cancelButton.alpha = 0.3f
                doneButton.alpha = 0.3f
                waveformView.setProcessing(true)
            }
            "result" -> {
                fabView.visibility = VISIBLE
                fabView.setBackgroundDrawable(CircleDrawable(successColor))
                expandedContainer.visibility = GONE
                layoutParams?.width = fabSize
                layoutParams?.height = fabSize
                // Auto-collapse after 1.5s
                handler.postDelayed({
                    setState("collapsed")
                }, 1500)
            }
        }
        requestLayout()
    }

    fun updateMeter(level: Float) {
        waveformView.setLevel(level)
    }

    fun showResult(text: String) {
        setState("result")
    }

    override fun performClick(): Boolean {
        super.performClick()
        if (currentState == "collapsed") {
            onBubbleTap?.invoke()
        }
        return true
    }

    private fun dpToPx(dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, dp, resources.displayMetrics
        ).roundToInt()
    }

    // Simple circle drawable
    private class CircleDrawable(private val color: Int) : android.graphics.drawable.Drawable() {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = this@CircleDrawable.color
            style = Paint.Style.FILL
        }

        override fun draw(canvas: Canvas) {
            val cx = bounds.exactCenterX()
            val cy = bounds.exactCenterY()
            val radius = minOf(cx, cy)
            canvas.drawCircle(cx, cy, radius, paint)
        }

        override fun setAlpha(alpha: Int) { paint.alpha = alpha }
        override fun setColorFilter(cf: android.graphics.ColorFilter?) { paint.colorFilter = cf }
        @Deprecated("Deprecated in Java")
        override fun getOpacity(): Int = android.graphics.PixelFormat.TRANSLUCENT
    }

    // Rounded rect drawable
    private class RoundRectDrawable(
        private val color: Int,
        private val radius: Float
    ) : android.graphics.drawable.Drawable() {
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = this@RoundRectDrawable.color
            style = Paint.Style.FILL
        }
        private val rect = RectF()

        override fun draw(canvas: Canvas) {
            rect.set(bounds)
            canvas.drawRoundRect(rect, radius, radius, paint)
        }

        override fun setAlpha(alpha: Int) { paint.alpha = alpha }
        override fun setColorFilter(cf: android.graphics.ColorFilter?) { paint.colorFilter = cf }
        @Deprecated("Deprecated in Java")
        override fun getOpacity(): Int = android.graphics.PixelFormat.TRANSLUCENT
    }
}
