package com.commandglows.app.ime

import android.content.Context
import java.time.Instant

data class KeyboardCrashContext(
    val actionId: String,
    val panel: String,
    val mode: String,
    val layoutProfile: String,
    val compactMode: Boolean,
    val heightScale: Float,
    val themePresetId: String,
    val themeSource: String,
    val privateMode: Boolean,
)

object KeyboardCrashReporter {
    private const val MAX_MESSAGE_LENGTH = 1200
    private const val MAX_STACK_FRAMES = 8

    fun report(
        context: Context,
        crashContext: KeyboardCrashContext,
        error: Throwable,
    ): String {
        val preferences =
            context.getSharedPreferences(KeyboardStateStore.PREFERENCES_NAME, Context.MODE_PRIVATE)
        val count = preferences.getInt(KeyboardStateStore.KEY_KEYBOARD_RECOVERY_COUNT, 0) + 1
        val timestamp = Instant.now().toString()
        val diagnostic =
            buildDiagnostic(
                crashContext = crashContext,
                error = error,
                timestamp = timestamp,
                count = count,
            )
        preferences
            .edit()
            .putString(KeyboardStateStore.KEY_LAST_KEYBOARD_ERROR, diagnostic.take(MAX_MESSAGE_LENGTH))
            .putString(KeyboardStateStore.KEY_LAST_KEYBOARD_ERROR_AT, timestamp)
            .putInt(KeyboardStateStore.KEY_KEYBOARD_RECOVERY_COUNT, count)
            .apply()
        return diagnostic
    }

    fun buildDiagnostic(
        crashContext: KeyboardCrashContext,
        error: Throwable,
        timestamp: String,
        count: Int,
    ): String {
        val stack =
            error.stackTrace
                .take(MAX_STACK_FRAMES)
                .joinToString(separator = " <- ") { frame ->
                    sanitize("${frame.className}.${frame.methodName}:${frame.lineNumber}")
                }
        return listOf(
            "keyboard_recovered=true",
            "at_utc=$timestamp",
            "recovery_count=$count",
            "action=${sanitize(crashContext.actionId)}",
            "panel=${sanitize(crashContext.panel)}",
            "mode=${sanitize(crashContext.mode)}",
            "layout=${sanitize(crashContext.layoutProfile)}",
            "compact=${crashContext.compactMode}",
            "height_scale=${crashContext.heightScale}",
            "theme_preset=${sanitize(crashContext.themePresetId)}",
            "theme_source=${sanitize(crashContext.themeSource)}",
            "private_mode=${crashContext.privateMode}",
            "exception=${sanitize(error.javaClass.simpleName)}",
            "message=${sanitize(error.message ?: "no_message")}",
            "stack=$stack",
            "sentry_state=flutter_sdk_if_configured",
        ).joinToString(separator = "; ").take(MAX_MESSAGE_LENGTH)
    }

    fun sanitize(value: Any?): String {
        return value
            ?.toString()
            .orEmpty()
            .replace(Regex("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"), "[REDACTED_EMAIL]")
            .replace(Regex("(?i)(bearer|token|jwt|api[_-]?key|secret|password)\\s*[:=]\\s*[^\\s;]+"), "$1=[REDACTED_SECRET]")
            .replace(Regex("eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+"), "[REDACTED_JWT]")
            .replace(Regex("\\s+"), " ")
            .trim()
            .take(MAX_MESSAGE_LENGTH)
    }
}
