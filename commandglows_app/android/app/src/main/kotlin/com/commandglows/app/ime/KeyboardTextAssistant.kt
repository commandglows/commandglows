package com.commandglows.app.ime

data class KeyboardTextRule(
    val trigger: String,
    val replacement: String,
    val caseSensitive: Boolean,
)

data class KeyboardExpansionMatch(
    val deleteBeforeCodePoints: Int,
    val replacement: String,
)

object KeyboardTextAssistant {
    private val defaultFrenchWords =
        listOf(
            "bonjour",
            "bonsoir",
            "merci",
            "demain",
            "aujourd'hui",
            "maintenant",
            "j'arrive",
            "d'accord",
            "parfait",
            "adresse",
            "rendez-vous",
        )
    private val defaultEnglishWords =
        listOf(
            "hello",
            "thanks",
            "tomorrow",
            "today",
            "now",
            "address",
            "meeting",
            "perfect",
            "coming",
            "okay",
        )

    fun shouldAutoCapitalize(textBeforeCursor: String): Boolean {
        val trimmed = textBeforeCursor.trimEnd()
        if (trimmed.isEmpty()) {
            return true
        }
        return trimmed.last() in setOf('.', '!', '?', '\n')
    }

    fun suggestions(
        textBeforeCursor: String,
        rules: List<KeyboardTextRule>,
        frenchEnabled: Boolean = true,
        englishEnabled: Boolean = true,
        maxCount: Int = 3,
    ): List<String> {
        val prefix = currentTokenBeforeCursor(textBeforeCursor)
        if (prefix.length < 2) {
            return emptyList()
        }
        val normalizedPrefix = prefix.lowercase()
        val candidates =
            buildList {
                rules.forEach { rule ->
                    if (rule.matchesPrefix(prefix)) {
                        add(rule.replacement)
                    }
                    if (rule.replacement.lowercase().startsWith(normalizedPrefix)) {
                        add(rule.replacement)
                    }
                }
                defaultWords(frenchEnabled = frenchEnabled, englishEnabled = englishEnabled).forEach { word ->
                    if (word.lowercase().startsWith(normalizedPrefix)) {
                        add(word)
                    }
                }
            }
        return candidates
            .map { it.trim() }
            .filter { it.isNotEmpty() && !it.equals(prefix, ignoreCase = true) }
            .distinct()
            .take(maxCount)
    }

    private fun defaultWords(
        frenchEnabled: Boolean,
        englishEnabled: Boolean,
    ): List<String> {
        return buildList {
            if (frenchEnabled) {
                addAll(defaultFrenchWords)
            }
            if (englishEnabled) {
                addAll(defaultEnglishWords)
            }
        }
    }

    fun expansionAfterBoundary(
        textBeforeCursor: String,
        rules: List<KeyboardTextRule>,
    ): KeyboardExpansionMatch? {
        if (textBeforeCursor.isEmpty() || !isBoundary(textBeforeCursor.last())) {
            return null
        }
        var boundaryStart = textBeforeCursor.length
        while (boundaryStart > 0 && isBoundary(textBeforeCursor[boundaryStart - 1])) {
            boundaryStart--
        }
        if (boundaryStart == 0) {
            return null
        }
        var tokenStart = boundaryStart
        while (tokenStart > 0 && isTokenChar(textBeforeCursor[tokenStart - 1])) {
            tokenStart--
        }
        if (tokenStart == boundaryStart) {
            return null
        }
        val token = textBeforeCursor.substring(tokenStart, boundaryStart)
        val boundary = textBeforeCursor.substring(boundaryStart)
        val replacedText = textBeforeCursor.substring(tokenStart)
        val rule = rules.firstOrNull { it.matchesToken(token) } ?: return null
        return KeyboardExpansionMatch(
            deleteBeforeCodePoints = replacedText.codePointCount(0, replacedText.length),
            replacement = rule.replacement + boundary,
        )
    }

    fun currentTokenBeforeCursor(textBeforeCursor: String): String {
        var index = textBeforeCursor.length
        while (index > 0 && isTokenChar(textBeforeCursor[index - 1])) {
            index--
        }
        return textBeforeCursor.substring(index)
    }

    fun deleteCountForCurrentToken(textBeforeCursor: String): Int {
        val token = currentTokenBeforeCursor(textBeforeCursor)
        return token.codePointCount(0, token.length)
    }

    private fun KeyboardTextRule.matchesToken(token: String): Boolean {
        return if (caseSensitive) {
            trigger == token
        } else {
            trigger.equals(token, ignoreCase = true)
        }
    }

    private fun KeyboardTextRule.matchesPrefix(prefix: String): Boolean {
        return if (caseSensitive) {
            trigger.startsWith(prefix)
        } else {
            trigger.lowercase().startsWith(prefix.lowercase())
        }
    }

    private fun isTokenChar(char: Char): Boolean {
        return char.isLetterOrDigit() || char == '\'' || char == '-' || char == '_'
    }

    private fun isBoundary(char: Char): Boolean {
        return char.isWhitespace() || char in setOf('.', ',', ';', ':', '!', '?')
    }
}
