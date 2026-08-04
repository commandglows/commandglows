package expo.modules.floatingoverlay

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityManager
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

private const val TAG = "CommandGlows"

class FloatingOverlayModule : Module() {

    override fun definition() = ModuleDefinition {
        Name("FloatingOverlay")

        Events("onBubbleTap", "onRecordStop", "onRecordCancel", "onBubbleLongPress")

        Function("showBubble") {
            val context = appContext.reactContext ?: run {
                Log.e(TAG, "showBubble: no reactContext")
                return@Function null
            }
            val canDraw = Settings.canDrawOverlays(context)
            Log.d(TAG, "showBubble: canDrawOverlays=$canDraw, SDK=${Build.VERSION.SDK_INT}")
            if (!canDraw) {
                Log.w(TAG, "showBubble: overlay permission not granted, aborting")
                return@Function null
            }
            FloatingOverlayService.overlayModule = this@FloatingOverlayModule
            val intent = Intent(context, FloatingOverlayService::class.java).apply {
                action = "SHOW"
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
                Log.d(TAG, "showBubble: service started successfully")
            } catch (e: Exception) {
                Log.e(TAG, "showBubble: failed to start service", e)
            }
            null
        }

        Function("hideBubble") {
            val context = appContext.reactContext ?: return@Function null
            val intent = Intent(context, FloatingOverlayService::class.java).apply {
                action = "HIDE"
            }
            context.startService(intent)
            null
        }

        Function("destroy") {
            val context = appContext.reactContext ?: return@Function null
            context.stopService(Intent(context, FloatingOverlayService::class.java))
            null
        }

        Function("startRecordingService") {
            val context = appContext.reactContext ?: return@Function null
            val intent = Intent(context, FloatingOverlayService::class.java).apply {
                action = "START_RECORDING"
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            null
        }

        Function("stopRecordingService") {
            val context = appContext.reactContext ?: return@Function null
            val intent = Intent(context, FloatingOverlayService::class.java).apply {
                action = "STOP_RECORDING"
            }
            context.startService(intent)
            null
        }

        Function("setOverlayState") { state: String ->
            FloatingOverlayService.instance?.setOverlayState(state)
            null
        }

        Function("updateMeterLevel") { level: Double ->
            FloatingOverlayService.instance?.updateMeterLevel(level.toFloat())
            null
        }

        Function("setResultText") { text: String ->
            FloatingOverlayService.instance?.setResultText(text)
            null
        }

        AsyncFunction("injectText") { text: String, promise: Promise ->
            val context = appContext.reactContext ?: run {
                promise.resolve(false)
                return@AsyncFunction
            }
            val result = TextInjectionHelper.inject(context, text)
            promise.resolve(result)
        }

        Function("hasOverlayPermission") {
            val context = appContext.reactContext ?: return@Function false
            Settings.canDrawOverlays(context)
        }

        AsyncFunction("requestOverlayPermission") { promise: Promise ->
            val context = appContext.reactContext ?: run {
                promise.resolve(false)
                return@AsyncFunction
            }
            if (Settings.canDrawOverlays(context)) {
                promise.resolve(true)
                return@AsyncFunction
            }
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            promise.resolve(false)
        }

        Function("hasAccessibilityPermission") {
            val context = appContext.reactContext ?: return@Function false
            isAccessibilityServiceEnabled(context)
        }

        Function("openAccessibilitySettings") {
            val context = appContext.reactContext ?: return@Function null
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            null
        }
    }

    fun emitBubbleTap() {
        sendEvent("onBubbleTap", emptyMap<String, Any>())
    }

    fun emitRecordStop() {
        sendEvent("onRecordStop", emptyMap<String, Any>())
    }

    fun emitRecordCancel() {
        sendEvent("onRecordCancel", emptyMap<String, Any>())
    }

    fun emitBubbleLongPress() {
        sendEvent("onBubbleLongPress", emptyMap<String, Any>())
    }

    private fun isAccessibilityServiceEnabled(context: Context): Boolean {
        val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = am.getEnabledAccessibilityServiceList(
            AccessibilityServiceInfo.FEEDBACK_ALL_MASK
        )
        return enabledServices.any {
            it.resolveInfo.serviceInfo.name ==
                TextInjectionAccessibilityService::class.java.name
        }
    }
}
