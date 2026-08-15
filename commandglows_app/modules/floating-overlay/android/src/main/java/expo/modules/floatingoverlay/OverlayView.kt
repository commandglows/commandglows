package expo.modules.floatingoverlay

import android.content.Context
import android.graphics.Canvas
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

/**
 * Native colors owned by the standalone floating-overlay module.
 *
 * Signed ARGB integers keep this package independent from the host app while
 * preserving the exact opaque colors expected by Android drawables.
 */
internal object FloatingOverlayDesignTokens {
    const val PRIMARY_COLOR_ARGB: Int = -10262799
    const val DANGER_COLOR_ARGB: Int = -1096636
    const val SUCCESS_COLOR_ARGB: Int = -14498466
    const val ACCENT_COLOR_ARGB: Int = -14494738
    const val SURFACE_COLOR_ARGB: Int = -14800581
    const val DANGER_CONTAINER_COLOR_ARGB: Int = -8446691
    const val SUCCESS_CONTAINER_COLOR_ARGB: Int = -15445203
    const val PROCESSING_COLOR_ARGB: Int = -8286984
}

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
        fabView.setBackgroundDrawable(CircleDrawable(FloatingOverlayDesignTokens.PRIMARY_COLOR_ARGB))
        addView(fabView)

        // Expanded container (recording state)
        expandedContainer = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LayoutParams(expandedWidth, expandedHeight)
            setPadding(dpToPx(8f), dpToPx(8f), dpToPx(8f), dpToPx(8f))
            visibility = GONE
        }
        expandedContainer.setBackgroundDrawable(
            RoundRectDrawable(FloatingOverlayDesignTokens.SURFACE_COLOR_ARGB, cornerRadius.toFloat())
        )

        // Cancel button (X)
        cancelButton = TextView(context).apply {
            layoutParams = LinearLayout.LayoutParams(buttonSize, buttonSize).apply {
                setMargins(0, 0, dpToPx(8f), 0)
            }
            text = "✕"
            textSize = 18f
            setTextColor(FloatingOverlayDesignTokens.DANGER_COLOR_ARGB)
            gravity = Gravity.CENTER
            setBackgroundDrawable(
                CircleDrawable(FloatingOverlayDesignTokens.DANGER_CONTAINER_COLOR_ARGB)
            )
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
            setTextColor(FloatingOverlayDesignTokens.SUCCESS_COLOR_ARGB)
            gravity = Gravity.CENTER
            setBackgroundDrawable(
                CircleDrawable(FloatingOverlayDesignTokens.SUCCESS_CONTAINER_COLOR_ARGB)
            )
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
                fabView.setBackgroundDrawable(
                    CircleDrawable(FloatingOverlayDesignTokens.PRIMARY_COLOR_ARGB)
                )
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
                fabView.setBackgroundDrawable(
                    CircleDrawable(FloatingOverlayDesignTokens.SUCCESS_COLOR_ARGB)
                )
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
