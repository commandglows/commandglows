package com.commandglows.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import kotlin.math.abs
import kotlin.math.roundToInt

class OverlayForegroundService : Service() {
    companion object {
        const val ACTION_START = "com.commandglows.app.overlay.START"
        const val ACTION_STOP = "com.commandglows.app.overlay.STOP"
        const val ACTION_CANCEL = "com.commandglows.app.overlay.CANCEL"
        const val ACTION_PAUSE = "com.commandglows.app.overlay.PAUSE"
        const val ACTION_RESUME = "com.commandglows.app.overlay.RESUME"
        const val ACTION_SET_STATE = "com.commandglows.app.overlay.SET_STATE"
        const val ACTION_UPDATE_METER = "com.commandglows.app.overlay.UPDATE_METER"
        const val ACTION_SET_RESULT_TEXT = "com.commandglows.app.overlay.SET_RESULT_TEXT"
        const val ACTION_DELIVER_TEXT = "com.commandglows.app.overlay.DELIVER_TEXT"
        const val ACTION_SET_APPEARANCE = "com.commandglows.app.overlay.SET_APPEARANCE"
        const val EXTRA_STATE = "state"
        const val EXTRA_LEVEL = "level"
        const val EXTRA_TEXT = "text"
        const val EXTRA_SIZE_SCALE = "sizeScale"
        const val EXTRA_OPACITY = "opacity"

        private const val NOTIFICATION_ID = 71011
        private const val notificationChannelId = "commandglows_app_overlay_recording"
        private const val notificationChannelName = "CommandGlows Overlay Recording"
        private const val TAG = "CommandGlowsOverlay"

        private const val defaultCollapsedWidth = 50
        private const val initialRightInset = 72
        private const val preferencesName = "commandglows_app_overlay_prefs"
        private const val keyOverlayEnabled = "overlay_enabled"
        private const val keyOverlaySizeScale = "overlay_size_scale"
        private const val keyOverlayOpacity = "overlay_opacity"
        private const val keyOverlayX = "overlay_x"
        private const val keyOverlayY = "overlay_y"
        private const val dragLongPressDelayMs = 320L
        private const val dismissTargetSizeDp = 72f
        private const val dismissTargetBottomInsetDp = 28f

        @Volatile
        private var running = false
        private var lastState = "not_created"

        @Synchronized
        fun isRunning(): Boolean = running

        @Synchronized
        fun serviceState(): String = lastState

        @Synchronized
        private fun updateServiceState(state: String) {
            lastState = state
        }
    }

    private var windowManager: WindowManager? = null
    private var overlayView: OverlayView? = null
    private var dismissTargetView: TextView? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var dismissTargetParams: WindowManager.LayoutParams? = null
    private var isShowing = false
    private var isDragging = false
    private var isDismissTargetShowing = false
    private var isDismissTargetHot = false
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var latestTouchX = 0f
    private var latestTouchY = 0f
    private var isDragArmed = false
    private var hasMovedPastTapSlop = false
    private var longPressRunnable: Runnable? = null
    private var pendingState = "collapsed"
    private var sizeScale = 1f
    private var overlayOpacity = 0.9f

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        updateServiceState("created")
        OverlayEventQueue.enqueue("serviceLifecycle", mapOf("state" to "created"))
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        loadAppearancePreferences()
        createNotificationChannelIfNeeded()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (isRunning() && !Settings.canDrawOverlays(this)) {
            OverlayEventQueue.enqueue("serviceError", mapOf("code" to "OVERLAY_PERMISSION_REVOKED"))
            updateServiceState("permission_revoked")
            handleStop()
            return START_NOT_STICKY
        }

        OverlayEventQueue.enqueue(
            "serviceCommand",
            mapOf("action" to (intent?.action ?: "null")),
        )
        when (intent?.action) {
            ACTION_START -> handleStart()
            ACTION_STOP -> handleStop()
            ACTION_CANCEL -> handleStop()
            ACTION_PAUSE -> handlePause()
            ACTION_RESUME -> handleResume()
            ACTION_SET_STATE -> handleSetState(intent.getStringExtra(EXTRA_STATE))
            ACTION_UPDATE_METER -> handleUpdateMeter(
                intent.getFloatExtra(EXTRA_LEVEL, 0f),
            )
            ACTION_SET_RESULT_TEXT -> handleSetResultText(
                intent.getStringExtra(EXTRA_TEXT) ?: "",
            )
            ACTION_DELIVER_TEXT -> {
                val text = intent.getStringExtra(EXTRA_TEXT).orEmpty()
                handleDeliverText(text)
            }
            ACTION_SET_APPEARANCE -> handleSetAppearance(
                intent.getFloatExtra(EXTRA_SIZE_SCALE, sizeScale),
                intent.getFloatExtra(EXTRA_OPACITY, overlayOpacity),
            )
            else -> Log.w(TAG, "Overlay service action ignored: ${intent?.action ?: "null"}")
        }
        return START_STICKY
    }

    override fun onDestroy() {
        Log.i(TAG, "Overlay service destroyed.")
        OverlayEventQueue.enqueue("serviceLifecycle", mapOf("state" to "destroyed"))
        updateServiceState("destroyed")
        hideOverlay()
        MicrophoneSessionCoordinator.clearSession(this, MicrophoneSessionCoordinator.SURFACE_OVERLAY)
        synchronized(this) {
            running = false
        }
        super.onDestroy()
    }

    private fun handleStart() {
        synchronized(this) {
            updateServiceState("start_requested")
            if (running) {
                OverlayEventQueue.enqueue("serviceLifecycle", mapOf("state" to "already_running"))
                ensureOverlay()
                setOverlayStateInternal("recording")
                return
            }
            if (!Settings.canDrawOverlays(this)) {
                OverlayEventQueue.enqueue(
                    "serviceError",
                    mapOf("code" to "OVERLAY_PERMISSION_MISSING"),
                )
                updateServiceState("permission_missing")
                MicrophoneSessionCoordinator.clearSession(
                    this,
                    MicrophoneSessionCoordinator.SURFACE_OVERLAY,
                )
                return
            }
            if (!ensureForegroundNotification()) {
                updateServiceState("foreground_failed")
                MicrophoneSessionCoordinator.clearSession(
                    this,
                    MicrophoneSessionCoordinator.SURFACE_OVERLAY,
                )
                return
            }
            if (!ensureOverlay()) {
                updateServiceState("overlay_add_failed")
                MicrophoneSessionCoordinator.clearSession(
                    this,
                    MicrophoneSessionCoordinator.SURFACE_OVERLAY,
                )
                return
            }
            running = true
            setOverlayStateInternal("recording")
            OverlayEventQueue.enqueue("serviceLifecycle", mapOf("state" to "running"))
        }
    }

    private fun handleStop() {
        synchronized(this) {
            if (!running) {
                OverlayEventQueue.enqueue("serviceLifecycle", mapOf("state" to "stop_ignored_not_running"))
                updateServiceState("stopped")
                return
            }
            updateServiceState("stopping")
            MicrophoneSessionCoordinator.clearSession(this, MicrophoneSessionCoordinator.SURFACE_OVERLAY)
            hideOverlay()
            setOverlayStateInternal("collapsed")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            stopSelf()
            running = false
            updateServiceState("stopped")
            OverlayEventQueue.enqueue("serviceLifecycle", mapOf("state" to "stopped"))
        }
    }

    private fun handlePause() {
        synchronized(this) {
            if (!running) {
                OverlayEventQueue.enqueue("serviceLifecycle", mapOf("state" to "pause_ignored_not_running"))
                return
            }
            OverlayEventQueue.enqueue("recordPause")
            setOverlayStateInternal("paused")
        }
    }

    private fun handleResume() {
        synchronized(this) {
            if (!running) {
                OverlayEventQueue.enqueue("serviceLifecycle", mapOf("state" to "resume_ignored_not_running"))
                return
            }
            OverlayEventQueue.enqueue("recordResume")
            setOverlayStateInternal("recording")
        }
    }

    private fun handleUpdateMeter(level: Float) {
        overlayView?.post {
            overlayView?.updateMeter(level)
        }
    }

    private fun handleSetResultText(text: String) {
        if (text.isBlank()) {
            return
        }
        overlayView?.post { overlayView?.showResult() }
    }

    private fun handleDeliverText(text: String) {
        val normalized = text.trim()
        if (normalized.isEmpty()) {
            return
        }
        val policy =
            if (isAccessibilityPermissionGranted()) {
                OverlayTextInjectionHelper.DELIVERY_POLICY_INJECTION_AND_CLIPBOARD
            } else {
                OverlayTextInjectionHelper.DELIVERY_POLICY_CLIPBOARD_ONLY
            }
        val delivery =
            OverlayTextInjectionHelper.deliverText(
                context = this,
                text = normalized,
                deliveryPolicy = policy,
                allowClipboardCopy = true,
            )
        overlayView?.post {
            overlayView?.showResult()
        }
        OverlayEventQueue.enqueue(
            "overlayTextDelivery",
            mapOf(
                "rawText" to normalized,
                "cleanedText" to normalized,
                "language" to java.util.Locale.getDefault().toLanguageTag(),
                "source" to "overlay",
                "durationMs" to 0,
                "delivery" to delivery,
            ),
        )
    }

    private fun isAccessibilityPermissionGranted(): Boolean {
        val expectedComponent = android.content.ComponentName(
            this,
            OverlayAccessibilityService::class.java,
        )
        val expected = expectedComponent.flattenToString()
        val enabledServices =
            android.provider.Settings.Secure.getString(
                contentResolver,
                android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
            ) ?: return false
        val splitter = android.text.TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabledServices)
        while (splitter.hasNext()) {
            val enabledService = splitter.next()
            if (enabledService.equals(expected, ignoreCase = true)) {
                return true
            }
        }
        return false
    }

    private fun ensureForegroundNotification(): Boolean {
        return try {
            startForegroundCompat(buildNotification("Tap the floating button to dictate"))
            OverlayEventQueue.enqueue("serviceLifecycle", mapOf("state" to "foreground_started"))
            true
        } catch (error: Exception) {
            OverlayEventQueue.enqueue(
                "serviceError",
                mapOf(
                    "code" to "OVERLAY_FOREGROUND_START_FAILED",
                    "detail" to (error.message ?: error.javaClass.simpleName),
                ),
            )
            false
        }
    }

    private fun ensureOverlay(): Boolean {
        if (isShowing) {
            OverlayEventQueue.enqueue("overlayView", mapOf("state" to "already_showing"))
            return true
        }
        if (!Settings.canDrawOverlays(this)) {
            OverlayEventQueue.enqueue("serviceError", mapOf("code" to "OVERLAY_PERMISSION_MISSING"))
            return false
        }

        overlayView = OverlayView(this).apply {
            onBubbleTap = {
                OverlayEventQueue.enqueue("bubbleTap")
                toggleRecordingState()
            }
            onRecordStop = {
                OverlayEventQueue.enqueue("recordStop")
                setOverlayStateInternal("processing")
            }
            onRecordCancel = {
                OverlayEventQueue.enqueue("recordCancel")
                setOverlayStateInternal("collapsed")
            }
            onRecordPause = {
                OverlayEventQueue.enqueue("recordPause")
                setOverlayStateInternal("paused")
            }
            onRecordResume = {
                OverlayEventQueue.enqueue("recordResume")
                setOverlayStateInternal("recording")
            }
            onBubbleLongPress = {
                OverlayEventQueue.enqueue("longPress")
                toggleRecordingState()
            }
        }

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            val savedPosition = loadPositionPreference()
            x = savedPosition?.first
                ?: resources.displayMetrics.widthPixels - (initialRightInset + defaultCollapsedWidth)
            y = savedPosition?.second
                ?: (resources.displayMetrics.heightPixels * 0.6).toInt()
            alpha = overlayOpacity
        }
        clampToScreen()

        overlayView?.setState(pendingState)
        overlayView?.setSizeScale(sizeScale)
        setWindowStateForOverlay(pendingState)
        attachTouchListener()
        try {
            windowManager?.addView(overlayView, layoutParams)
            isShowing = true
            OverlayEventQueue.enqueue(
                "overlayView",
                mapOf(
                    "state" to "shown",
                    "x" to (layoutParams?.x ?: -1),
                    "y" to (layoutParams?.y ?: -1),
                ),
            )
            return true
        } catch (error: Exception) {
            OverlayEventQueue.enqueue(
                "serviceError",
                mapOf(
                    "code" to "OVERLAY_VIEW_ADD_FAILED",
                    "detail" to (error.message ?: error.javaClass.simpleName),
                ),
            )
            overlayView = null
            layoutParams = null
            return false
        }
    }

    private fun hideOverlay() {
        if (!isShowing) {
            hideDismissTarget()
            return
        }
        longPressRunnable?.let { runnable ->
            overlayView?.removeCallbacks(runnable)
            longPressRunnable = null
        }
        overlayView?.setDragHandleTouchListener(null)
        overlayView?.setBubbleTouchListener(null)
        overlayView?.setOverlayTouchListener(null)
        overlayView?.setOnTouchListener(null)
        try {
            windowManager?.removeView(overlayView)
        } catch (error: Exception) {
            OverlayEventQueue.enqueue(
                "serviceError",
                mapOf(
                    "code" to "OVERLAY_VIEW_REMOVE_FAILED",
                    "detail" to (error.message ?: error.javaClass.simpleName),
                ),
            )
        }
        overlayView = null
        layoutParams = null
        isShowing = false
        hideDismissTarget()
    }

    private fun attachTouchListener() {
        val overlayDragTouchListener = View.OnTouchListener { view, event ->
            handleDragTouch(
                event,
                tapTarget = view,
                requireLongPressToDrag = false,
            )
        }
        overlayView?.setOverlayTouchListener(overlayDragTouchListener)
        overlayView?.setDragHandleTouchListener(null)
    }

    private fun handleDragTouch(
        event: MotionEvent,
        tapTarget: View?,
        requireLongPressToDrag: Boolean,
    ): Boolean {
        return when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                layoutParams?.let { params ->
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    latestTouchX = event.rawX
                    latestTouchY = event.rawY
                    isDragging = false
                    isDragArmed = !requireLongPressToDrag
                    hasMovedPastTapSlop = false
                    if (requireLongPressToDrag) {
                        longPressRunnable?.let { overlayView?.removeCallbacks(it) }
                        longPressRunnable = Runnable {
                            val currentParams = layoutParams ?: return@Runnable
                            initialX = currentParams.x
                            initialY = currentParams.y
                            initialTouchX = latestTouchX
                            initialTouchY = latestTouchY
                            isDragArmed = true
                            overlayView?.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
                            OverlayEventQueue.enqueue("overlayDragMode", mapOf("state" to "armed"))
                        }
                        overlayView?.postDelayed(longPressRunnable, dragLongPressDelayMs)
                    } else {
                        longPressRunnable = null
                    }
                    overlayView?.parent?.requestDisallowInterceptTouchEvent(true)
                    true
                } ?: false
            }
            MotionEvent.ACTION_MOVE -> {
                val params = layoutParams ?: return false
                latestTouchX = event.rawX
                latestTouchY = event.rawY
                val dragSlop = resources.displayMetrics.density * 8f
                val totalDx = event.rawX - initialTouchX
                val totalDy = event.rawY - initialTouchY
                if (!hasMovedPastTapSlop && (abs(totalDx) > dragSlop || abs(totalDy) > dragSlop)) {
                    hasMovedPastTapSlop = true
                }
                if (requireLongPressToDrag && !isDragArmed) {
                    return true
                }
                val dx = event.rawX - initialTouchX
                val dy = event.rawY - initialTouchY
                if (!isDragging && (abs(dx) > dragSlop || abs(dy) > dragSlop)) {
                    isDragging = true
                    longPressRunnable?.let { overlayView?.removeCallbacks(it) }
                    performOverlayHaptic(HapticFeedbackConstants.LONG_PRESS)
                    showDismissTarget()
                }
                if (isDragging) {
                    params.x = initialX + dx.toInt()
                    params.y = initialY + dy.toInt()
                    try {
                        windowManager?.updateViewLayout(overlayView, params)
                    } catch (_: Exception) {
                        // Keep touch handling stable if this transiently fails.
                    }
                    updateDismissTargetState()
                }
                true
            }
            MotionEvent.ACTION_UP,
            MotionEvent.ACTION_CANCEL -> {
                longPressRunnable?.let { overlayView?.removeCallbacks(it) }
                val released = event.actionMasked == MotionEvent.ACTION_UP

                val consumed = isDragging || hasMovedPastTapSlop
                if (isDragging) {
                    if (released && isOverlayOverDismissTarget()) {
                        performOverlayHaptic(HapticFeedbackConstants.VIRTUAL_KEY)
                        dismissOverlayFromDrag()
                    } else if (released) {
                        performOverlayHaptic(HapticFeedbackConstants.VIRTUAL_KEY)
                        clampToScreen()
                        savePositionPreference()
                        hideDismissTarget()
                    } else {
                        clampToScreen()
                        hideDismissTarget()
                    }
                } else if (released && !hasMovedPastTapSlop) {
                    tapTarget?.performClick()
                }
                isDragging = false
                isDragArmed = false
                hasMovedPastTapSlop = false
                longPressRunnable = null
                overlayView?.parent?.requestDisallowInterceptTouchEvent(false)
                if (event.actionMasked == MotionEvent.ACTION_CANCEL) {
                    hideDismissTarget()
                }
                consumed
            }
            else -> false
        }
    }

    private fun showDismissTarget() {
        if (isDismissTargetShowing) {
            return
        }
        val manager = windowManager ?: return
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }
        val targetSize = dpToPx(dismissTargetSizeDp)
        dismissTargetView = TextView(this).apply {
            text = "X"
            textSize = 26f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            contentDescription = "Drop here to hide the CommandGlows overlay."
            elevation = dpToPx(16f).toFloat()
            background = dismissTargetBackground(active = false)
            alpha = 0.92f
        }
        dismissTargetParams = WindowManager.LayoutParams(
            targetSize,
            targetSize,
            type,
            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = (resources.displayMetrics.widthPixels - targetSize) / 2
            y = resources.displayMetrics.heightPixels -
                targetSize -
                dpToPx(dismissTargetBottomInsetDp)
            alpha = 0.92f
        }
        try {
            manager.addView(dismissTargetView, dismissTargetParams)
            isDismissTargetShowing = true
            isDismissTargetHot = false
            OverlayEventQueue.enqueue("overlayDismissTarget", mapOf("state" to "shown"))
        } catch (error: Exception) {
            dismissTargetView = null
            dismissTargetParams = null
            OverlayEventQueue.enqueue(
                "serviceError",
                mapOf(
                    "code" to "OVERLAY_DISMISS_TARGET_ADD_FAILED",
                    "detail" to (error.message ?: error.javaClass.simpleName),
                ),
            )
        }
    }

    private fun hideDismissTarget() {
        if (!isDismissTargetShowing) {
            dismissTargetView = null
            dismissTargetParams = null
            isDismissTargetHot = false
            return
        }
        try {
            windowManager?.removeView(dismissTargetView)
        } catch (_: Exception) {
            // Keep overlay teardown stable if the target is already detached.
        }
        dismissTargetView = null
        dismissTargetParams = null
        isDismissTargetShowing = false
        isDismissTargetHot = false
    }

    private fun updateDismissTargetState() {
        val active = isOverlayOverDismissTarget()
        if (active == isDismissTargetHot) {
            return
        }
        isDismissTargetHot = active
        dismissTargetView?.background = dismissTargetBackground(active)
        dismissTargetView
            ?.animate()
            ?.scaleX(if (active) 1.12f else 1f)
            ?.scaleY(if (active) 1.12f else 1f)
            ?.setDuration(120L)
            ?.start()
        if (active) {
            overlayView?.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        }
        OverlayEventQueue.enqueue(
            "overlayDismissTarget",
            mapOf("state" to if (active) "armed" else "shown"),
        )
    }

    private fun performOverlayHaptic(feedbackConstant: Int) {
        overlayView?.performHapticFeedback(feedbackConstant)
    }

    private fun isOverlayOverDismissTarget(): Boolean {
        val overlayParams = layoutParams ?: return false
        val targetParams = dismissTargetParams ?: return false
        val targetSize = dismissTargetView?.width?.takeIf { it > 0 }
            ?: dpToPx(dismissTargetSizeDp)
        val overlayWidth = overlayView?.width?.takeIf { it > 0 } ?: defaultCollapsedWidth
        val overlayHeight = overlayView?.height?.takeIf { it > 0 } ?: defaultCollapsedWidth
        val overlayCenterX = overlayParams.x + overlayWidth / 2
        val overlayCenterY = overlayParams.y + overlayHeight / 2
        return overlayCenterX in targetParams.x..(targetParams.x + targetSize) &&
            overlayCenterY in targetParams.y..(targetParams.y + targetSize)
    }

    private fun dismissOverlayFromDrag() {
        val state = overlayView?.getCurrentState() ?: pendingState
        OverlayEventQueue.enqueue("overlayDismiss", mapOf("source" to "drag_target"))
        if (state in setOf("recording", "paused", "processing")) {
            OverlayEventQueue.enqueue("recordCancel")
        }
        getSharedPreferences(preferencesName, MODE_PRIVATE)
            .edit()
            .putBoolean(keyOverlayEnabled, false)
            .apply()
        OverlayEventQueue.enqueue("overlayPreference", mapOf("enabled" to false))
        hideDismissTarget()
        handleStop()
    }

    private fun dismissTargetBackground(active: Boolean): GradientDrawable {
        val fillColor = if (active) NativeOverlayVisualTokens.DANGER else NativeOverlayVisualTokens.SURFACE
        val strokeColor =
            if (active) NativeOverlayVisualTokens.DISMISS_ACTIVE_STROKE else NativeOverlayVisualTokens.DISMISS_IDLE_STROKE
        return GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(fillColor)
            setStroke(dpToPx(if (active) 3f else 2f), strokeColor)
        }
    }

    private fun setWindowStateForOverlay(state: String) {
        val params = layoutParams ?: return
        params.flags =
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        params.alpha = overlayOpacity
        try {
            windowManager?.updateViewLayout(overlayView, params)
        } catch (_: Exception) {
            // ignore
        }
    }

    private fun toggleRecordingState() {
        val current = overlayView?.getCurrentState() ?: pendingState
        if (current == "recording") {
            OverlayEventQueue.enqueue("recordStop")
            setOverlayStateInternal("processing")
        } else {
            setOverlayStateInternal("recording")
        }
    }

    private fun setOverlayStateInternal(state: String?) {
        val normalized = normalizeState(state ?: "collapsed")
        pendingState = normalized
        updateServiceState(normalized)
        overlayView?.post {
            overlayView?.setState(normalized)
            setWindowStateForOverlay(normalized)
        }
    }

    private fun handleSetState(state: String?) {
        setOverlayStateInternal(state)
    }

    private fun handleSetAppearance(nextSizeScale: Float, nextOpacity: Float) {
        sizeScale = nextSizeScale.coerceIn(0.8f, 1.4f)
        overlayOpacity = nextOpacity.coerceIn(0.5f, 1f)
        overlayView?.post {
            overlayView?.setSizeScale(sizeScale)
            setWindowStateForOverlay(pendingState)
        }
    }

    private fun loadAppearancePreferences() {
        val preferences = getSharedPreferences(preferencesName, MODE_PRIVATE)
        sizeScale = preferences.getFloat(keyOverlaySizeScale, 1f).coerceIn(0.8f, 1.4f)
        overlayOpacity = preferences.getFloat(keyOverlayOpacity, 0.9f).coerceIn(0.5f, 1f)
    }

    private fun loadPositionPreference(): Pair<Int, Int>? {
        val preferences = getSharedPreferences(preferencesName, MODE_PRIVATE)
        if (!preferences.contains(keyOverlayX) || !preferences.contains(keyOverlayY)) {
            return null
        }
        val x = preferences.getInt(keyOverlayX, 0)
        val y = preferences.getInt(keyOverlayY, 0)
        return Pair(x, y)
    }

    private fun savePositionPreference() {
        val params = layoutParams ?: return
        getSharedPreferences(preferencesName, MODE_PRIVATE)
            .edit()
            .putInt(keyOverlayX, params.x)
            .putInt(keyOverlayY, params.y)
            .apply()
        OverlayEventQueue.enqueue(
            "overlayPosition",
            mapOf("x" to params.x, "y" to params.y),
        )
    }

    private fun normalizeState(state: String): String {
        return when (state) {
            "collapsed", "recording", "paused", "processing", "result" -> state
            else -> "collapsed"
        }
    }

    private fun clampToScreen() {
        val params = layoutParams ?: return
        val viewWidth = overlayView?.width ?: defaultCollapsedWidth
        val viewHeight = overlayView?.height ?: defaultCollapsedWidth
        val screenWidth = resources.displayMetrics.widthPixels
        val screenHeight = resources.displayMetrics.heightPixels
        params.x = params.x.coerceIn(0, (screenWidth - viewWidth).coerceAtLeast(0))
        params.y = params.y.coerceIn(0, (screenHeight - viewHeight).coerceAtLeast(0))
        try {
            windowManager?.updateViewLayout(overlayView, params)
        } catch (_: Exception) {
            // ignore
        }
    }

    private fun dpToPx(dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            resources.displayMetrics,
        ).roundToInt()
    }

    private fun startForegroundCompat(notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(notificationChannelId) != null) {
            return
        }
        val channel = NotificationChannel(
            notificationChannelId,
            notificationChannelName,
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Foreground notification while overlay is active."
        }
        manager.createNotificationChannel(channel)
    }

    private fun buildNotification(contentText: String): Notification {
        val launchIntent =
            packageManager.getLaunchIntentForPackage(packageName)
                ?: Intent(this, MainActivity::class.java)
        val pendingIntent =
            PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        val builder =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, notificationChannelId)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
            }
        return builder
            .setContentTitle("CommandGlows overlay")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }
}
