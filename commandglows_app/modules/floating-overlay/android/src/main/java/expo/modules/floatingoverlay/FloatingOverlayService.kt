package expo.modules.floatingoverlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager

class FloatingOverlayService : Service() {

    companion object {
        const val CHANNEL_ID = "commandglows_app_overlay"
        const val NOTIFICATION_ID = 1001
        var instance: FloatingOverlayService? = null
        var overlayModule: FloatingOverlayModule? = null
    }

    private var windowManager: WindowManager? = null
    private var overlayView: OverlayView? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var isShowing = false

    // Drag tracking
    private var initialX = 0
    private var initialY = 0
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isDragging = false
    private var longPressRunnable: Runnable? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
    }

    private var isRecordingService = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            "SHOW" -> showOverlay()
            "HIDE" -> hideOverlay()
            "START_RECORDING" -> startRecordingService()
            "STOP_RECORDING" -> stopRecordingService()
            "UPDATE_NOTIFICATION" -> {
                val text = intent.getStringExtra("text") ?: "Recording..."
                updateNotificationText(text)
            }
            else -> showOverlay()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        hideOverlay()
        instance = null
        super.onDestroy()
    }

    private fun startForegroundCompat(notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+ requires foregroundServiceType in startForeground call
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun showOverlay() {
        if (isShowing) return
        if (!Settings.canDrawOverlays(this)) {
            Log.w("CommandGlows", "Cannot draw overlays — permission not granted")
            return
        }

        // Start as foreground service
        val notification = createNotification("Tap the floating button to dictate")
        startForegroundCompat(notification)

        // Create overlay view
        overlayView = OverlayView(this).apply {
            onBubbleTap = { overlayModule?.emitBubbleTap() }
            onRecordStop = { overlayModule?.emitRecordStop() }
            onRecordCancel = { overlayModule?.emitRecordCancel() }
        }

        // Window layout params
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
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = resources.displayMetrics.widthPixels - 200
            y = (resources.displayMetrics.heightPixels * 0.6).toInt()
            alpha = 0.8f // Semi-transparent when idle, Android 12+ requires >= 0.8
        }

        // Touch: press-and-hold to record, release to stop.
        // Drag to reposition (only when collapsed).
        var isHoldRecording = false

        overlayView?.setOnTouchListener { _, event ->
            val state = overlayView?.getCurrentState() ?: "collapsed"

            // When expanded (recording/processing), let child buttons handle touches
            if (state != "collapsed") {
                return@setOnTouchListener false
            }

            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = layoutParams!!.x
                    initialY = layoutParams!!.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isDragging = false
                    isHoldRecording = false

                    // After a short delay, start recording (press-and-hold)
                    longPressRunnable = Runnable {
                        if (!isDragging) {
                            isHoldRecording = true
                            Log.d("CommandGlows", "Hold-to-record: started")
                            overlayModule?.emitBubbleTap()
                        }
                    }
                    overlayView?.postDelayed(longPressRunnable, 200)
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - initialTouchX
                    val dy = event.rawY - initialTouchY
                    if (!isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
                        isDragging = true
                        isHoldRecording = false
                        longPressRunnable?.let { overlayView?.removeCallbacks(it) }
                    }
                    if (isDragging) {
                        layoutParams?.x = initialX + dx.toInt()
                        layoutParams?.y = initialY + dy.toInt()
                        try {
                            windowManager?.updateViewLayout(overlayView, layoutParams)
                        } catch (_: Exception) {}
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    longPressRunnable?.let { overlayView?.removeCallbacks(it) }
                    if (isDragging) {
                        snapToEdge()
                    } else if (isHoldRecording) {
                        // Release after hold = stop recording
                        Log.d("CommandGlows", "Hold-to-record: released — stopping")
                        overlayModule?.emitRecordStop()
                        isHoldRecording = false
                    } else {
                        // Quick tap (< 200ms) = also start recording (tap mode)
                        Log.d("CommandGlows", "Quick tap: starting recording")
                        overlayModule?.emitBubbleTap()
                    }
                    true
                }
                else -> false
            }
        }

        Log.d("CommandGlows", "Overlay view added to WindowManager")
        windowManager?.addView(overlayView, layoutParams)
        isShowing = true
    }

    private fun hideOverlay() {
        if (!isShowing) return
        try {
            windowManager?.removeView(overlayView)
        } catch (_: Exception) {}
        overlayView = null
        isShowing = false
        if (!isRecordingService) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        }
    }

    // Foreground service for recording without overlay — keeps process alive when screen is off
    private fun startRecordingService() {
        if (isShowing) {
            // Overlay already running as foreground, just update notification
            updateNotificationText("Recording in progress...")
            isRecordingService = true
            return
        }
        isRecordingService = true
        val notification = createNotification("Recording in progress...")
        startForegroundCompat(notification)
    }

    private fun stopRecordingService() {
        isRecordingService = false
        if (isShowing) {
            // Overlay still active, revert notification text
            updateNotificationText("Tap the floating button to dictate")
        } else {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    private fun updateNotificationText(text: String) {
        val notification = createNotification(text)
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIFICATION_ID, notification)
    }

    private fun snapToEdge() {
        val params = layoutParams ?: return
        val screenWidth = resources.displayMetrics.widthPixels
        val viewWidth = overlayView?.width ?: 160

        val targetX = if (params.x + viewWidth / 2 < screenWidth / 2) {
            16 // Snap left
        } else {
            screenWidth - viewWidth - 16 // Snap right
        }

        params.x = targetX
        windowManager?.updateViewLayout(overlayView, params)
    }

    fun setOverlayState(state: String) {
        overlayView?.post { overlayView?.setState(state) }
        layoutParams?.let { params ->
            // When collapsed: not focusable (touches pass through), semi-transparent
            // When recording/processing: focusable (capture button taps), fully opaque
            if (state == "collapsed") {
                params.flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                params.alpha = 0.8f
            } else {
                params.flags = WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                params.alpha = 1.0f
            }
            try {
                windowManager?.updateViewLayout(overlayView, params)
            } catch (_: Exception) {}
        }
    }

    fun updateMeterLevel(level: Float) {
        overlayView?.post { overlayView?.updateMeter(level) }
    }

    fun setResultText(text: String) {
        overlayView?.post { overlayView?.showResult(text) }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "CommandGlows Overlay",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the floating voice button active"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun createNotification(text: String = "Tap the floating button to dictate"): Notification {
        // Launch app when notification tapped
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("CommandGlows")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("CommandGlows")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        }
    }
}
