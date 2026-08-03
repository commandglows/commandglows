package com.commandglows.app.ime.actions

internal object KeyboardAdaptiveUsageRanker {
    fun <T> rankByUsage(
        items: List<T>,
        usageScoreById: Map<String, Long>,
        idOf: (T) -> String,
        eligible: (T) -> Boolean = { true },
    ): List<T> {
        return items.sortedWith(
            compareByDescending<T> { item ->
                if (eligible(item)) {
                    usageScoreById[idOf(item)] ?: 0L
                } else {
                    Long.MIN_VALUE
                }
            }.thenBy { item -> items.indexOf(item) },
        )
    }
}
