package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Test

class KeyboardVoiceRuntimeEventQueueTest {
    @Test
    fun `runtime queue exposes compact native to flutter contract`() {
        val status =
            KeyboardVoiceRuntimeStatus.normalized(
                runtimeMode = "android_fallback",
                languageTag = "fr-FR",
                packId = "none",
                engine = "android_speech_recognizer",
                fallbackReason = "missing_pack",
                lastErrorCode = "none",
            )
        KeyboardVoiceRuntimeEventQueue.enqueue(status, capturedAtEpochMillis = 1715930001111)

        val events = KeyboardVoiceRuntimeEventQueue.drain()
        assertEquals(1, events.size)
        val first = events.first()
        assertEquals("android_fallback", first["runtime_state"])
        assertEquals("missing_pack", first["fallback_reason"])
        assertEquals("none", first["active_pack_id"])
        assertEquals("none", first["last_error_code"])
        assertEquals("fr-FR", first["language_tag"])
        assertEquals("android_speech_recognizer", first["engine"])
        assertEquals("ime_voice_controller", first["source"])
        assertEquals(1715930001111L, first["captured_at_epoch_millis"])
    }
}
