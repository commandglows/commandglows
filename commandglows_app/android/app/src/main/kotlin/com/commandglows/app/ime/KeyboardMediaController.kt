package com.commandglows.app.ime

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.provider.Settings
import android.view.KeyEvent
import com.commandglows.app.CommandGlowsNotificationListenerService

class KeyboardMediaController(context: Context) {
    private val appContext = context.applicationContext
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    fun playPause() {
        dispatch(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
    }

    fun previous() {
        dispatch(KeyEvent.KEYCODE_MEDIA_PREVIOUS)
    }

    fun next() {
        dispatch(KeyEvent.KEYCODE_MEDIA_NEXT)
    }

    fun stop(): String {
        val controlled =
            runCatching {
                val controller = activeController()
                if (controller?.playbackState?.supports(PlaybackState.ACTION_STOP) == true) {
                    controller.transportControls.stop()
                    true
                } else {
                    false
                }
            }.getOrDefault(false)
        if (controlled) {
            return "Stop sent"
        }
        dispatch(KeyEvent.KEYCODE_MEDIA_STOP)
        return "Stop sent"
    }

    fun volumeDown(stepPercent: Int): String = adjustMusicVolume(AudioManager.ADJUST_LOWER, stepPercent)

    fun volumeUp(stepPercent: Int): String = adjustMusicVolume(AudioManager.ADJUST_RAISE, stepPercent)

    fun nowPlayingLabel(): String {
        if (!KeyboardStateStore(appContext).isMediaSessionAccessGranted()) {
            return MEDIA_ACCESS_REQUIRED
        }
        val controller =
            try {
                activeController()
            } catch (_: SecurityException) {
                return MEDIA_ACCESS_REQUIRED
            } ?: return "Now playing: nothing detected"
        return controller.metadata?.toNowPlayingLabel() ?: "Now playing: metadata unavailable"
    }

    fun openActiveMediaApp(): String {
        if (!KeyboardStateStore(appContext).isMediaSessionAccessGranted()) {
            return MEDIA_ACCESS_REQUIRED
        }
        val controller =
            try {
                activeController()
            } catch (_: SecurityException) {
                return MEDIA_ACCESS_REQUIRED
            } ?: return "Media app: nothing detected"
        val packageName = controller.packageName ?: return "Media app: unavailable"
        val intent =
            appContext.packageManager.getLaunchIntentForPackage(packageName)
                ?: return "Media app: cannot open $packageName"
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            appContext.startActivity(intent)
        } catch (_: RuntimeException) {
            return "Media app: cannot open $packageName"
        }
        return "Media app opened"
    }

    fun adjustBrightness(delta: Int): String {
        if (!KeyboardStateStore(appContext).canWriteSystemSettings()) {
            return BRIGHTNESS_ACCESS_REQUIRED
        }
        val resolver = appContext.contentResolver
        val current =
            runCatching {
                Settings.System.getInt(resolver, Settings.System.SCREEN_BRIGHTNESS)
            }.getOrDefault(DEFAULT_BRIGHTNESS)
        val next = (current + delta).coerceIn(MIN_BRIGHTNESS, MAX_BRIGHTNESS)
        return try {
            Settings.System.putInt(
                resolver,
                Settings.System.SCREEN_BRIGHTNESS_MODE,
                Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL,
            )
            val applied = Settings.System.putInt(resolver, Settings.System.SCREEN_BRIGHTNESS, next)
            if (applied) {
                "Brightness ${next * 100 / MAX_BRIGHTNESS}%"
            } else {
                "Brightness unavailable"
            }
        } catch (_: SecurityException) {
            BRIGHTNESS_ACCESS_REQUIRED
        } catch (_: IllegalArgumentException) {
            "Brightness unavailable"
        }
    }

    private fun adjustMusicVolume(
        direction: Int,
        stepPercent: Int,
    ): String {
        return try {
            val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1)
            val steps = (max * stepPercent.coerceIn(1, 20) / 100f).toInt().coerceAtLeast(1)
            repeat(steps) { index ->
                val flags = if (index == steps - 1) AudioManager.FLAG_SHOW_UI else 0
                audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, direction, flags)
            }
            val current = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
            "Volume ${current * 100 / max}%"
        } catch (_: RuntimeException) {
            "Volume unavailable"
        }
    }

    private fun sendCustomMediaAction(
        actionName: String,
        keywords: List<String>,
    ): String {
        if (!KeyboardStateStore(appContext).isMediaSessionAccessGranted()) {
            return MEDIA_ACCESS_REQUIRED
        }
        val controller =
            try {
                activeController()
            } catch (_: SecurityException) {
                return MEDIA_ACCESS_REQUIRED
            } ?: return "$actionName unavailable: no active media"
        val customAction =
            controller.playbackState
                ?.customActions
                .orEmpty()
                .firstOrNull { action ->
                    val haystack = "${action.action} ${action.name}".lowercase()
                    keywords.any { keyword -> haystack.contains(keyword.lowercase()) }
                }
                ?: return "$actionName unsupported by ${controller.packageName}"
        return try {
            controller.transportControls.sendCustomAction(customAction, null)
            "$actionName sent"
        } catch (_: RuntimeException) {
            "$actionName unavailable"
        }
    }

    private fun PlaybackState.supports(action: Long): Boolean {
        return actions and action == action
    }

    private fun activeController(): MediaController? {
        val sessionManager =
            appContext.getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager
        val listener = ComponentName(appContext, CommandGlowsNotificationListenerService::class.java)
        val controllers =
            try {
                sessionManager.getActiveSessions(listener)
            } catch (error: SecurityException) {
                throw error
            }
        return controllers.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
            ?: controllers.firstOrNull { it.metadata != null }
    }

    private fun dispatch(keyCode: Int) {
        val down = KeyEvent(KeyEvent.ACTION_DOWN, keyCode)
        val up = KeyEvent(KeyEvent.ACTION_UP, keyCode)
        audioManager.dispatchMediaKeyEvent(down)
        audioManager.dispatchMediaKeyEvent(up)
    }

    private fun MediaMetadata.toNowPlayingLabel(): String {
        val artist =
            firstText(
                MediaMetadata.METADATA_KEY_ARTIST,
                MediaMetadata.METADATA_KEY_ALBUM_ARTIST,
                MediaMetadata.METADATA_KEY_AUTHOR,
            )
        val title = firstText(MediaMetadata.METADATA_KEY_TITLE, MediaMetadata.METADATA_KEY_DISPLAY_TITLE)
        return when {
            !artist.isNullOrBlank() && !title.isNullOrBlank() -> "$artist - $title"
            !title.isNullOrBlank() -> title
            !artist.isNullOrBlank() -> artist
            else -> "Now playing: metadata unavailable"
        }
    }

    private fun MediaMetadata.firstText(vararg keys: String): String? {
        return keys.firstNotNullOfOrNull { key -> getText(key)?.toString()?.trim()?.takeIf { it.isNotBlank() } }
    }

    companion object {
        const val MEDIA_ACCESS_REQUIRED = "MEDIA_ACCESS_REQUIRED"
        const val BRIGHTNESS_ACCESS_REQUIRED = "BRIGHTNESS_ACCESS_REQUIRED"
        private const val MIN_BRIGHTNESS = 1
        private const val MAX_BRIGHTNESS = 255
        private const val DEFAULT_BRIGHTNESS = 128
    }
}
