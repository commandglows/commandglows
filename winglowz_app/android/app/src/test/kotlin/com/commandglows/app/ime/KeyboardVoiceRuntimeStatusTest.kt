package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Test

class KeyboardVoiceRuntimeStatusTest {
    @Test
    fun `android fallback status keeps mode and reason visible`() {
        assertEquals(
            "Android speech fallback: listening (missing_pack)",
            KeyboardVoiceController.androidFallbackStatus("listening", "missing_pack"),
        )
        assertEquals(
            "Android speech fallback: recording (missing_pack)",
            KeyboardVoiceController.androidFallbackStatus("recording", "none"),
        )
    }

    @Test
    fun `android fallback merge waits for manual stop without duplicating final partial`() {
        assertEquals(
            "bonjour tout le monde",
            KeyboardVoiceController.mergedAndroidFallbackText(
                listOf("bonjour"),
                "tout le monde",
            ),
        )
        assertEquals(
            "bonjour",
            KeyboardVoiceController.mergedAndroidFallbackText(
                listOf("bonjour"),
                "bonjour",
            ),
        )
    }

    @Test
    fun `android fallback continues after silence errors`() {
        assertEquals(
            true,
            KeyboardVoiceController.shouldContinueAndroidFallbackAfterError(
                android.speech.SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
            ),
        )
        assertEquals(
            true,
            KeyboardVoiceController.shouldContinueAndroidFallbackAfterError(
                android.speech.SpeechRecognizer.ERROR_NO_MATCH,
            ),
        )
        assertEquals(
            true,
            KeyboardVoiceController.shouldContinueAndroidFallbackAfterError(
                android.speech.SpeechRecognizer.ERROR_CLIENT,
            ),
        )
        assertEquals(
            true,
            KeyboardVoiceController.shouldContinueAndroidFallbackAfterError(
                android.speech.SpeechRecognizer.ERROR_RECOGNIZER_BUSY,
            ),
        )
        assertEquals(
            true,
            KeyboardVoiceController.isAndroidFallbackRuntimeRestartError(
                android.speech.SpeechRecognizer.ERROR_CLIENT,
            ),
        )
        assertEquals(
            false,
            KeyboardVoiceController.isAndroidFallbackRuntimeRestartError(
                android.speech.SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
            ),
        )
    }

    @Test
    fun `voice runtime status exposes explicit diagnostic map`() {
        val status =
            KeyboardVoiceRuntimeStatus.normalized(
                runtimeMode = "android_fallback",
                languageTag = "fr-FR",
                packId = "none",
                engine = "android_speech_recognizer",
                fallbackReason = "missing_pack",
                lastErrorCode = "none",
            ).toMap()

        assertEquals("android_fallback", status["voiceRuntimeMode"])
        assertEquals("fr-FR", status["voiceLanguageTag"])
        assertEquals("none", status["voicePackId"])
        assertEquals("android_speech_recognizer", status["voiceEngine"])
        assertEquals("missing_pack", status["voiceFallbackReason"])
        assertEquals("none", status["voiceLastErrorCode"])
    }

    @Test
    fun `voice runtime status normalizes unsupported runtime`() {
        val status =
            KeyboardVoiceRuntimeStatus.normalized(
                runtimeMode = "secret_cloud",
                languageTag = "",
                packId = "",
                engine = "",
                fallbackReason = "",
                lastErrorCode = "",
            )

        assertEquals("unavailable", status.runtimeMode)
        assertEquals("und", status.languageTag)
        assertEquals("none", status.packId)
        assertEquals("unavailable", status.engine)
        assertEquals("unsupported_language", status.fallbackReason)
        assertEquals("none", status.lastErrorCode)
    }
}
