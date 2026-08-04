package com.commandglows.app.ime

data class KeyboardLocalVoiceEngineConfig(
    val languageTag: String,
    val packId: String,
    val engine: String,
    val modelArtifactPath: String,
)

data class KeyboardLocalVoiceEngineCallbacks(
    val onState: (String) -> Unit,
    val onPartialResult: (String) -> Unit,
    val onFinalResult: (String) -> Unit,
)

data class KeyboardLocalVoiceEngineStartResult(
    val started: Boolean,
    val fallbackReason: String = "none",
    val lastErrorCode: String = "none",
)

interface KeyboardLocalVoiceEngine {
    fun start(
        config: KeyboardLocalVoiceEngineConfig,
        callbacks: KeyboardLocalVoiceEngineCallbacks,
    ): KeyboardLocalVoiceEngineStartResult

    fun stop()

    fun cancel()
}

object KeyboardLocalVoiceEngineFactory {
    fun create(engine: String): KeyboardLocalVoiceEngine {
        return when (engine.trim()) {
            "sherpa_onnx" -> SherpaOnnxKeyboardLocalVoiceEngine()
            else -> UnsupportedKeyboardLocalVoiceEngine()
        }
    }
}

private class UnsupportedKeyboardLocalVoiceEngine : KeyboardLocalVoiceEngine {
    override fun start(
        config: KeyboardLocalVoiceEngineConfig,
        callbacks: KeyboardLocalVoiceEngineCallbacks,
    ): KeyboardLocalVoiceEngineStartResult {
        callbacks.onState("Local engine unsupported")
        return KeyboardLocalVoiceEngineStartResult(
            started = false,
            fallbackReason = "runtime_load_failed",
            lastErrorCode = "local_engine_unsupported",
        )
    }

    override fun stop() = Unit

    override fun cancel() = Unit
}

private class SherpaOnnxKeyboardLocalVoiceEngine : KeyboardLocalVoiceEngine {
    override fun start(
        config: KeyboardLocalVoiceEngineConfig,
        callbacks: KeyboardLocalVoiceEngineCallbacks,
    ): KeyboardLocalVoiceEngineStartResult {
        if (!KeyboardLocalEngineSupport.isEngineLinked(config.engine)) {
            callbacks.onState("Sherpa engine not linked")
            return KeyboardLocalVoiceEngineStartResult(
                started = false,
                fallbackReason = "runtime_load_failed",
                lastErrorCode = "sherpa_engine_not_linked",
            )
        }

        callbacks.onState("Sherpa runtime adapter pending audio bridge")
        return KeyboardLocalVoiceEngineStartResult(
            started = false,
            fallbackReason = "runtime_load_failed",
            lastErrorCode = "local_runtime_init_failed",
        )
    }

    override fun stop() = Unit

    override fun cancel() = Unit
}
