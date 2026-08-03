package com.commandglows.app.ime

object KeyboardLocalRuntimePath {
    data class LocalRuntimeValidation(
        val canStartLocal: Boolean,
        val fallbackRuntimeMode: String,
        val fallbackReason: String,
        val errorCode: String,
    )

    private const val ENGINE_SHERPA_ONNX = "sherpa_onnx"
    private const val ENGINE_ANDROID_FALLBACK = "android_speech_recognizer"

    fun validate(
        packId: String,
        engine: String,
        modelArtifactPath: String,
        androidFallbackAvailable: Boolean,
        isEngineLinked: (String) -> Boolean = KeyboardLocalEngineSupport::isEngineLinked,
        isEngineSupported: (String) -> Boolean = KeyboardLocalEngineSupport::isEngineSupported,
    ): LocalRuntimeValidation {
        val normalizedPack = packId.trim()
        val normalizedEngine = engine.trim()
        val normalizedModelArtifactPath = modelArtifactPath.trim()
        if (normalizedPack.isEmpty() || normalizedPack == "none") {
            return fallback(
                reason = "missing_pack",
                errorCode = "local_runtime_unavailable",
                androidFallbackAvailable = androidFallbackAvailable,
            )
        }
        if (normalizedEngine.isEmpty() ||
            normalizedEngine == "unavailable" ||
            normalizedEngine == ENGINE_ANDROID_FALLBACK
        ) {
            return fallback(
                reason = "runtime_load_failed",
                errorCode = "local_runtime_unavailable",
                androidFallbackAvailable = androidFallbackAvailable,
            )
        }
        if (normalizedModelArtifactPath.isEmpty() || normalizedModelArtifactPath == "none") {
            return fallback(
                reason = "runtime_load_failed",
                errorCode = "local_model_path_missing",
                androidFallbackAvailable = androidFallbackAvailable,
            )
        }
        if (!isValidArtifactPath(normalizedModelArtifactPath)) {
            return fallback(
                reason = "runtime_load_failed",
                errorCode = "local_model_path_invalid",
                androidFallbackAvailable = androidFallbackAvailable,
            )
        }
        if (!isEngineSupported(normalizedEngine)) {
            return fallback(
                reason = "runtime_load_failed",
                errorCode = "local_engine_unsupported",
                androidFallbackAvailable = androidFallbackAvailable,
            )
        }
        if (normalizedEngine == ENGINE_SHERPA_ONNX && !isEngineLinked(normalizedEngine)) {
            return fallback(
                reason = "runtime_load_failed",
                errorCode = "sherpa_engine_not_linked",
                androidFallbackAvailable = androidFallbackAvailable,
            )
        }
        return fallback(
            reason = "runtime_load_failed",
            errorCode = "local_runtime_unproven",
            androidFallbackAvailable = androidFallbackAvailable,
        )
    }

    private fun fallback(
        reason: String,
        errorCode: String,
        androidFallbackAvailable: Boolean,
    ): LocalRuntimeValidation {
        val runtimeMode = if (androidFallbackAvailable) "android_fallback" else "unavailable"
        val fallbackReason = reason.ifBlank { "unsupported_language" }
        return LocalRuntimeValidation(
            canStartLocal = false,
            fallbackRuntimeMode = runtimeMode,
            fallbackReason = fallbackReason,
            errorCode = errorCode,
        )
    }

    private fun isValidArtifactPath(path: String): Boolean {
        if (!path.startsWith("/")) {
            return false
        }
        if (path.contains('\u0000')) {
            return false
        }
        if (path.contains("..")) {
            return false
        }
        return true
    }
}
