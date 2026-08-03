package com.commandglows.app.ime

data class KeyboardVoiceRuntimeStatus(
    val runtimeMode: String,
    val languageTag: String,
    val packId: String,
    val engine: String,
    val fallbackReason: String,
    val lastErrorCode: String,
) {
    fun toMap(): Map<String, String> =
        mapOf(
            "voiceRuntimeMode" to runtimeMode,
            "voiceLanguageTag" to languageTag,
            "voicePackId" to packId,
            "voiceEngine" to engine,
            "voiceFallbackReason" to fallbackReason,
            "voiceLastErrorCode" to lastErrorCode,
        )

    companion object {
        fun normalized(
            runtimeMode: String,
            languageTag: String,
            packId: String,
            engine: String,
            fallbackReason: String,
            lastErrorCode: String,
        ): KeyboardVoiceRuntimeStatus {
            val safeRuntime =
                if (runtimeMode in setOf("local", "android_fallback", "cloud_fallback", "unavailable")) {
                    runtimeMode
                } else {
                    "unavailable"
                }
            return KeyboardVoiceRuntimeStatus(
                runtimeMode = safeRuntime,
                languageTag = languageTag.take(32).ifBlank { "und" },
                packId = packId.take(96).ifBlank { "none" },
                engine = engine.take(48).ifBlank { "unavailable" },
                fallbackReason = fallbackReason.take(48).ifBlank { "unsupported_language" },
                lastErrorCode = lastErrorCode.take(64).ifBlank { "none" },
            )
        }
    }
}
