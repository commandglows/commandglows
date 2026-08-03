package com.commandglows.app

import android.content.Context

object MicrophoneSessionCoordinator {
    private const val PREFERENCES_NAME = "commandglows_voice_session_coordinator"
    private const val KEY_ACTIVE_SURFACE = "active_surface"
    private const val KEY_SESSION_MARKER = "active_session_marker"

    const val SURFACE_NONE = "none"
    const val SURFACE_OVERLAY = "overlay"
    const val SURFACE_KEYBOARD = "keyboard"

    fun requestOverlaySession(context: Context): Boolean =
        requestSession(context, SURFACE_OVERLAY)

    fun requestKeyboardSession(context: Context): Boolean =
        requestSession(context, SURFACE_KEYBOARD)

    private fun requestSession(context: Context, surface: String): Boolean {
        val normalizedSurface = normalizedSurface(surface)
        val prefs = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        val activeSurface = prefs.getString(KEY_ACTIVE_SURFACE, SURFACE_NONE)
            ?: SURFACE_NONE
        return if (activeSurface == SURFACE_NONE || activeSurface == normalizedSurface) {
            val canReuse = activeSurface == normalizedSurface
            if (canReuse) {
                true
            } else {
                prefs
                    .edit()
                    .putString(KEY_ACTIVE_SURFACE, normalizedSurface)
                    .putString(KEY_SESSION_MARKER, "$normalizedSurface:${System.currentTimeMillis()}")
                    .apply()
                true
            }
        } else {
            false
        }
    }

    fun clearSession(context: Context, surface: String) {
        val normalizedSurface = normalizedSurface(surface)
        val prefs = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        val activeSurface = prefs.getString(KEY_ACTIVE_SURFACE, SURFACE_NONE)
            ?: SURFACE_NONE
        if (activeSurface == normalizedSurface) {
            prefs
                .edit()
                .remove(KEY_ACTIVE_SURFACE)
                .remove(KEY_SESSION_MARKER)
                .apply()
        }
    }

    fun clearAll(context: Context) {
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_ACTIVE_SURFACE)
            .remove(KEY_SESSION_MARKER)
            .apply()
    }

    fun activeSurface(context: Context): String {
        val prefs = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_ACTIVE_SURFACE, SURFACE_NONE) ?: SURFACE_NONE
    }

    private fun normalizedSurface(surface: String): String {
        return if (surface == SURFACE_OVERLAY || surface == SURFACE_KEYBOARD) {
            surface
        } else {
            SURFACE_NONE
        }
    }
}
