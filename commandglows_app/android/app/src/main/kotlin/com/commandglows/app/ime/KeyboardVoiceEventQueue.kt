package com.commandglows.app.ime

object KeyboardVoiceEventQueue {
    private const val maxEvents = 50
    private val events = ArrayDeque<Map<String, Any>>()

    @Synchronized
    fun enqueue(
        rawText: String,
        cleanedText: String = rawText,
        language: String,
        source: String = "keyboard",
        durationMs: Int = 0,
        capturedAtEpochMillis: Long = System.currentTimeMillis(),
    ) {
        val normalizedRaw = rawText.trim()
        val normalizedCleaned = cleanedText.trim()
        if (normalizedRaw.isEmpty() || normalizedCleaned.isEmpty()) {
            return
        }
        while (events.size >= maxEvents) {
            events.removeFirst()
        }
        events.addLast(
            mapOf(
                "rawText" to normalizedRaw,
                "cleanedText" to normalizedCleaned,
                "language" to language.ifBlank { "und" },
                "source" to source,
                "durationMs" to durationMs.coerceAtLeast(0),
                "capturedAtEpochMillis" to capturedAtEpochMillis,
            ),
        )
    }

    @Synchronized
    fun drain(): List<Map<String, Any>> {
        val drained = events.toList()
        events.clear()
        return drained
    }

    @Synchronized
    fun size(): Int = events.size
}
