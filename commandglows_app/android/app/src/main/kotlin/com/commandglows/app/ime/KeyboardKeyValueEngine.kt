package com.commandglows.app.ime

import android.view.KeyEvent

enum class KeyboardKeyValueKind {
    Text,
    KeyEvent,
    Action,
    Modifier,
    Macro,
}

enum class KeyboardSystemModifier {
    Shift,
    Ctrl,
    Alt,
    Fn,
}

data class KeyboardKeyValue(
    val kind: KeyboardKeyValueKind,
    val label: String,
    val text: String? = null,
    val keyCode: Int? = null,
    val action: KeyboardKeyAction? = null,
    val modifier: KeyboardSystemModifier? = null,
    val macro: List<KeyboardKeyValue> = emptyList(),
) : Comparable<KeyboardKeyValue> {
    override fun compareTo(other: KeyboardKeyValue): Int {
        return sortKey().compareTo(other.sortKey())
    }

    fun renderLabel(): String = label.ifBlank { text ?: keyCode?.toString() ?: action?.name ?: modifier?.name.orEmpty() }

    private fun sortKey(): String {
        return listOf(
            kind.name,
            label,
            text.orEmpty(),
            keyCode?.toString().orEmpty(),
            action?.name.orEmpty(),
            modifier?.name.orEmpty(),
            macro.joinToString(separator = "|") { it.sortKey() },
        ).joinToString(separator = "\u0000")
    }

    companion object {
        fun text(
            value: String,
            label: String = value,
        ): KeyboardKeyValue =
            KeyboardKeyValue(
                kind = KeyboardKeyValueKind.Text,
                label = label,
                text = value,
            )

        fun keyEvent(
            keyCode: Int,
            label: String = keyCode.toString(),
        ): KeyboardKeyValue =
            KeyboardKeyValue(
                kind = KeyboardKeyValueKind.KeyEvent,
                label = label,
                keyCode = keyCode,
            )

        fun action(
            action: KeyboardKeyAction,
            label: String = action.name,
        ): KeyboardKeyValue =
            KeyboardKeyValue(
                kind = KeyboardKeyValueKind.Action,
                label = label,
                action = action,
            )

        fun modifier(
            modifier: KeyboardSystemModifier,
            label: String = modifier.name,
        ): KeyboardKeyValue =
            KeyboardKeyValue(
                kind = KeyboardKeyValueKind.Modifier,
                label = label,
                modifier = modifier,
            )

        fun macro(
            label: String,
            keys: List<KeyboardKeyValue>,
        ): KeyboardKeyValue =
            KeyboardKeyValue(
                kind = KeyboardKeyValueKind.Macro,
                label = label,
                macro = keys,
            )
    }
}

class KeyboardKeyValueParseException(message: String) : IllegalArgumentException(message)

object KeyboardKeyValueParser {
    fun parse(input: String): KeyboardKeyValue {
        val trimmed = input.trim()
        if (trimmed.isEmpty()) {
            throw KeyboardKeyValueParseException("Key definition is empty")
        }

        val separatorIndex =
            if (hasReservedPrefix(trimmed)) {
                -1
            } else {
                firstUnquoted(trimmed, ':')
            }
        if (separatorIndex <= 0) {
            return parsePayload(trimmed, defaultLabel = null)
        }

        val label = trimmed.substring(0, separatorIndex).trim()
        val payload = trimmed.substring(separatorIndex + 1).trim()
        if (label.isEmpty() || payload.isEmpty()) {
            throw KeyboardKeyValueParseException("Key definition must contain a label and payload")
        }

        val parts = splitTopLevel(payload, ',')
        if (parts.size > 1) {
            return KeyboardKeyValue.macro(
                label = label,
                keys = parts.map { parsePayload(it, defaultLabel = null) },
            )
        }
        return parsePayload(payload, defaultLabel = label).withLabel(label)
    }

    private fun parsePayload(
        payload: String,
        defaultLabel: String?,
    ): KeyboardKeyValue {
        val value = payload.trim()
        if (value.isEmpty()) {
            throw KeyboardKeyValueParseException("Empty key payload")
        }
        if (value.startsWith("'")) {
            val text = parseQuoted(value)
            return KeyboardKeyValue.text(text, defaultLabel ?: text)
        }
        if (value.startsWith("keyevent:", ignoreCase = true)) {
            val rawCode = value.substringAfter(':').trim()
            val keyCode = rawCode.toIntOrNull()
                ?: throw KeyboardKeyValueParseException("Invalid keyevent code '$rawCode'")
            return KeyboardKeyValue.keyEvent(keyCode, defaultLabel ?: rawCode)
        }
        if (value.startsWith("action:", ignoreCase = true)) {
            val rawAction = value.substringAfter(':').trim()
            val action = KeyboardKeyAction.values().firstOrNull { it.name.equals(rawAction, ignoreCase = true) }
                ?: throw KeyboardKeyValueParseException("Unknown action '$rawAction'")
            return KeyboardKeyValue.action(action, defaultLabel ?: action.name)
        }
        if (value.startsWith("modifier:", ignoreCase = true)) {
            val rawModifier = value.substringAfter(':').trim()
            val modifier = KeyboardSystemModifier.values().firstOrNull { it.name.equals(rawModifier, ignoreCase = true) }
                ?: throw KeyboardKeyValueParseException("Unknown modifier '$rawModifier'")
            return KeyboardKeyValue.modifier(modifier, defaultLabel ?: modifier.name)
        }
        return KeyboardKeyValue.text(unescape(value), defaultLabel ?: value)
    }

    private fun hasReservedPrefix(value: String): Boolean {
        return value.startsWith("keyevent:", ignoreCase = true) ||
            value.startsWith("action:", ignoreCase = true) ||
            value.startsWith("modifier:", ignoreCase = true)
    }

    private fun KeyboardKeyValue.withLabel(label: String): KeyboardKeyValue {
        return copy(label = label)
    }

    private fun parseQuoted(value: String): String {
        if (!value.endsWith("'") || value.length == 1) {
            throw KeyboardKeyValueParseException("Unterminated quoted string")
        }
        return unescape(value.substring(1, value.length - 1))
    }

    private fun unescape(value: String): String {
        val out = StringBuilder(value.length)
        var escaping = false
        value.forEach { char ->
            if (escaping) {
                out.append(char)
                escaping = false
            } else if (char == '\\') {
                escaping = true
            } else {
                out.append(char)
            }
        }
        if (escaping) {
            out.append('\\')
        }
        return out.toString()
    }

    private fun firstUnquoted(
        value: String,
        target: Char,
    ): Int {
        var quote = false
        var escaping = false
        value.forEachIndexed { index, char ->
            if (escaping) {
                escaping = false
                return@forEachIndexed
            }
            when (char) {
                '\\' -> escaping = true
                '\'' -> quote = !quote
                target -> if (!quote) return index
            }
        }
        return -1
    }

    private fun splitTopLevel(
        value: String,
        separator: Char,
    ): List<String> {
        val parts = mutableListOf<String>()
        var start = 0
        var quote = false
        var escaping = false
        value.forEachIndexed { index, char ->
            if (escaping) {
                escaping = false
                return@forEachIndexed
            }
            when (char) {
                '\\' -> escaping = true
                '\'' -> quote = !quote
                separator -> if (!quote) {
                    parts.add(value.substring(start, index).trim())
                    start = index + 1
                }
            }
        }
        parts.add(value.substring(start).trim())
        return parts.filter { it.isNotEmpty() }
    }
}

class KeyboardModMap {
    private val mappings = mutableMapOf<Pair<KeyboardSystemModifier, KeyboardKeyValue>, KeyboardKeyValue>()

    fun add(
        modifier: KeyboardSystemModifier,
        from: KeyboardKeyValue,
        to: KeyboardKeyValue,
    ) {
        mappings[modifier to from] = to
    }

    fun get(
        modifier: KeyboardSystemModifier,
        from: KeyboardKeyValue,
    ): KeyboardKeyValue? = mappings[modifier to from]
}

object KeyboardKeyModifier {
    fun apply(
        value: KeyboardKeyValue,
        modifiers: Set<KeyboardSystemModifier>,
        modMap: KeyboardModMap? = null,
    ): KeyboardKeyValue {
        return modifiers.fold(value) { current, modifier ->
            applyOne(current, modifier, modMap)
        }
    }

    private fun applyOne(
        value: KeyboardKeyValue,
        modifier: KeyboardSystemModifier,
        modMap: KeyboardModMap?,
    ): KeyboardKeyValue {
        modMap?.get(modifier, value)?.let { return it }
        return when (modifier) {
            KeyboardSystemModifier.Shift -> applyShift(value)
            KeyboardSystemModifier.Ctrl -> applyCtrl(value)
            KeyboardSystemModifier.Alt -> value
            KeyboardSystemModifier.Fn -> value
        }
    }

    private fun applyShift(value: KeyboardKeyValue): KeyboardKeyValue {
        if (value.kind != KeyboardKeyValueKind.Text || value.text.isNullOrEmpty()) {
            return value
        }
        val shifted =
            if (value.text.length == 1) {
                value.text.uppercase()
            } else {
                value.text.replaceFirstChar { char ->
                    if (char.isLowerCase()) char.titlecase() else char.toString()
                }
            }
        return value.copy(text = shifted, label = shifted)
    }

    private fun applyCtrl(value: KeyboardKeyValue): KeyboardKeyValue {
        if (value.kind != KeyboardKeyValueKind.Text || value.text?.length != 1) {
            return value
        }
        val keyCode =
            when (value.text.lowercase()) {
                "a" -> KeyEvent.KEYCODE_A
                "b" -> KeyEvent.KEYCODE_B
                "c" -> KeyEvent.KEYCODE_C
                "d" -> KeyEvent.KEYCODE_D
                "e" -> KeyEvent.KEYCODE_E
                "f" -> KeyEvent.KEYCODE_F
                "g" -> KeyEvent.KEYCODE_G
                "h" -> KeyEvent.KEYCODE_H
                "i" -> KeyEvent.KEYCODE_I
                "j" -> KeyEvent.KEYCODE_J
                "k" -> KeyEvent.KEYCODE_K
                "l" -> KeyEvent.KEYCODE_L
                "m" -> KeyEvent.KEYCODE_M
                "n" -> KeyEvent.KEYCODE_N
                "o" -> KeyEvent.KEYCODE_O
                "p" -> KeyEvent.KEYCODE_P
                "q" -> KeyEvent.KEYCODE_Q
                "r" -> KeyEvent.KEYCODE_R
                "s" -> KeyEvent.KEYCODE_S
                "t" -> KeyEvent.KEYCODE_T
                "u" -> KeyEvent.KEYCODE_U
                "v" -> KeyEvent.KEYCODE_V
                "w" -> KeyEvent.KEYCODE_W
                "x" -> KeyEvent.KEYCODE_X
                "y" -> KeyEvent.KEYCODE_Y
                "z" -> KeyEvent.KEYCODE_Z
                else -> null
            } ?: return value
        return KeyboardKeyValue.keyEvent(keyCode = keyCode, label = "Ctrl+${value.text.uppercase()}")
    }
}
