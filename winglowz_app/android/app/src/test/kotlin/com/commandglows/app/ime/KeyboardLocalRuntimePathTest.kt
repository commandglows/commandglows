package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class KeyboardLocalRuntimePathTest {
    @Test
    fun `missing model artifact path fails before engine fallback`() {
        val validation =
            KeyboardLocalRuntimePath.validate(
                packId = "sherpa_onnx.fr-fr.whisper_candidate.2026_05_15",
                engine = "sherpa_onnx",
                modelArtifactPath = "none",
                androidFallbackAvailable = true,
            )

        assertFalse(validation.canStartLocal)
        assertEquals("android_fallback", validation.fallbackRuntimeMode)
        assertEquals("runtime_load_failed", validation.fallbackReason)
        assertEquals("local_model_path_missing", validation.errorCode)
    }

    @Test
    fun `invalid model artifact path fails before engine fallback`() {
        val validation =
            KeyboardLocalRuntimePath.validate(
                packId = "sherpa_onnx.fr-fr.whisper_candidate.2026_05_15",
                engine = "sherpa_onnx",
                modelArtifactPath = "../tmp/model.onnx",
                androidFallbackAvailable = true,
            )

        assertFalse(validation.canStartLocal)
        assertEquals("android_fallback", validation.fallbackRuntimeMode)
        assertEquals("runtime_load_failed", validation.fallbackReason)
        assertEquals("local_model_path_invalid", validation.errorCode)
    }

    @Test
    fun `sherpa engine not linked falls back to android when available`() {
        val validation =
            KeyboardLocalRuntimePath.validate(
                packId = "sherpa_onnx.fr-fr.whisper_candidate.2026_05_15",
                engine = "sherpa_onnx",
                modelArtifactPath = "/data/user/0/com.commandglows.app/files/asr/fr_fr/model.bundle",
                androidFallbackAvailable = true,
                isEngineLinked = { false },
            )

        assertFalse(validation.canStartLocal)
        assertEquals("android_fallback", validation.fallbackRuntimeMode)
        assertEquals("runtime_load_failed", validation.fallbackReason)
        assertEquals("sherpa_engine_not_linked", validation.errorCode)
    }

    @Test
    fun `sherpa engine not linked is unavailable when android fallback is missing`() {
        val validation =
            KeyboardLocalRuntimePath.validate(
                packId = "sherpa_onnx.fr-fr.whisper_candidate.2026_05_15",
                engine = "sherpa_onnx",
                modelArtifactPath = "/data/user/0/com.commandglows.app/files/asr/fr_fr/model.bundle",
                androidFallbackAvailable = false,
                isEngineLinked = { false },
            )

        assertFalse(validation.canStartLocal)
        assertEquals("unavailable", validation.fallbackRuntimeMode)
        assertEquals("runtime_load_failed", validation.fallbackReason)
        assertEquals("sherpa_engine_not_linked", validation.errorCode)
    }

    @Test
    fun `sherpa linked path is treated as unproven for now`() {
        val validation =
            KeyboardLocalRuntimePath.validate(
                packId = "sherpa_onnx.fr-fr.whisper_candidate.2026_05_15",
                engine = "sherpa_onnx",
                modelArtifactPath = "/data/user/0/com.commandglows.app/files/asr/fr_fr/model.bundle",
                androidFallbackAvailable = true,
                isEngineLinked = { true },
            )

        assertEquals(false, validation.canStartLocal)
        assertEquals("android_fallback", validation.fallbackRuntimeMode)
        assertEquals("runtime_load_failed", validation.fallbackReason)
        assertEquals("local_runtime_unproven", validation.errorCode)
    }

    @Test
    fun `unsupported local engine falls back before runtime start`() {
        val validation =
            KeyboardLocalRuntimePath.validate(
                packId = "whisper_cpp.fr-fr.tiny.2026_05_15",
                engine = "whisper_cpp",
                modelArtifactPath = "/data/user/0/com.commandglows.app/files/asr/fr_fr/model.bundle",
                androidFallbackAvailable = true,
            )

        assertFalse(validation.canStartLocal)
        assertEquals("android_fallback", validation.fallbackRuntimeMode)
        assertEquals("runtime_load_failed", validation.fallbackReason)
        assertEquals("local_engine_unsupported", validation.errorCode)
    }
}
