package com.commandglows.app.ime

object KeyboardLocalEngineSupport {
    private val sherpaLinkageClassCandidates =
        listOf(
            "com.k2fsa.sherpa.onnx.OfflineRecognizer",
            "com.k2fsa.sherpa.onnx.OnlineRecognizer",
            "com.k2fsa.sherpa.onnx.SherpaOnnx",
        )

    fun isEngineLinked(engine: String): Boolean {
        val normalizedEngine = engine.trim()
        if (normalizedEngine != "sherpa_onnx") {
            return true
        }
        return sherpaLinkageClassCandidates.any { className ->
            isClassLinked(className)
        }
    }

    fun isEngineSupported(engine: String): Boolean {
        return engine.trim() == "sherpa_onnx"
    }

    private fun isClassLinked(className: String): Boolean {
        return try {
            Class.forName(className)
            true
        } catch (_: Throwable) {
            false
        }
    }
}
