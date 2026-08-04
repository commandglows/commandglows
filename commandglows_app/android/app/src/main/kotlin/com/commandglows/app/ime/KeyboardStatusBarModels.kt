package com.commandglows.app.ime

import org.json.JSONArray
import org.json.JSONObject

enum class KeyboardStatusBarMode {
    HIDDEN,
    COMPACT,
    STANDARD,
    SMART;

    val wireValue: String
        get() = name.lowercase()

    companion object {
        fun fromRaw(raw: String?): KeyboardStatusBarMode {
            if (raw == null) {
                return SMART
            }
            return entries.firstOrNull { it.wireValue == raw } ?: SMART
        }
    }
}

enum class KeyboardStatusBarModule {
    KEYBOARD_LABEL,
    DATE,
    TIME,
    ACCOUNT_LABEL,
    TIPS;

    val wireValue: String
        get() = name.lowercase()

    companion object {
        fun fromRaw(raw: String?): KeyboardStatusBarModule {
            if (raw == null) {
                return KEYBOARD_LABEL
            }
            return entries.firstOrNull { it.wireValue == raw } ?: KEYBOARD_LABEL
        }
    }
}

enum class KeyboardStatusBarAccountLabelMode {
    NONE,
    MASKED,
    VISIBLE;

    val wireValue: String
        get() = name.lowercase()

    companion object {
        fun fromRaw(raw: String?): KeyboardStatusBarAccountLabelMode {
            if (raw == null) {
                return NONE
            }
            return entries.firstOrNull { it.wireValue == raw } ?: NONE
        }
    }
}

enum class KeyboardTipLevel {
    OFF,
    MINIMAL,
    STANDARD,
    CONTEXTUAL;

    val wireValue: String
        get() = name.lowercase()

    companion object {
        fun fromRaw(raw: String?): KeyboardTipLevel {
            if (raw == null) {
                return OFF
            }
            return entries.firstOrNull { it.wireValue == raw } ?: OFF
        }
    }
}

class KeyboardStatusBarConfig(
    val mode: KeyboardStatusBarMode,
    val modules: List<KeyboardStatusBarModule>,
    val accountLabelMode: KeyboardStatusBarAccountLabelMode,
    val tipLevel: KeyboardTipLevel,
) {
    companion object {
        private const val MAX_MODULES = 12
        private val SAFE_MODULES =
            listOf(
                KeyboardStatusBarModule.KEYBOARD_LABEL,
                KeyboardStatusBarModule.DATE,
                KeyboardStatusBarModule.TIME,
                KeyboardStatusBarModule.ACCOUNT_LABEL,
                KeyboardStatusBarModule.TIPS,
            )

        fun defaults(): KeyboardStatusBarConfig {
            return KeyboardStatusBarConfig(
                mode = KeyboardStatusBarMode.SMART,
                modules =
                    listOf(
                        KeyboardStatusBarModule.KEYBOARD_LABEL,
                        KeyboardStatusBarModule.DATE,
                        KeyboardStatusBarModule.TIME,
                        KeyboardStatusBarModule.ACCOUNT_LABEL,
                    ),
                accountLabelMode = KeyboardStatusBarAccountLabelMode.MASKED,
                tipLevel = KeyboardTipLevel.STANDARD,
            )
        }

        fun fromMap(raw: Map<*, *>): KeyboardStatusBarConfig {
            if (raw.isEmpty()) {
                return defaults()
            }
            val modules =
                (raw["modules"] as? JSONArray)
                    ?.let { parseModulesFromJsonArray(it) }
                    ?: (raw["modules"] as? List<*>)
                        ?.filterIsInstance<String>()
                        ?.map { moduleString ->
                            KeyboardStatusBarModule.fromRaw(moduleString)
                        }
                        ?: emptyList()
            return KeyboardStatusBarConfig(
                mode = KeyboardStatusBarMode.fromRaw(raw["mode"] as? String),
                modules = if (modules.isEmpty()) defaults().modules else modules.take(MAX_MODULES),
                accountLabelMode =
                    KeyboardStatusBarAccountLabelMode.fromRaw(raw["accountLabelMode"] as? String),
                tipLevel = KeyboardTipLevel.fromRaw(raw["tipLevel"] as? String),
            )
        }

        private fun parseModulesFromJsonArray(array: JSONArray): List<KeyboardStatusBarModule> {
            val list = mutableListOf<KeyboardStatusBarModule>()
            for (index in 0 until array.length()) {
                val item = array.optString(index, null)
                if (item == null) {
                    continue
                }
                val module = KeyboardStatusBarModule.fromRaw(item)
                if (!list.contains(module) && module in SAFE_MODULES) {
                    list.add(module)
                }
            }
            return list
        }
    }

    fun toMap(): Map<String, Any> {
        return mapOf(
            "mode" to mode.wireValue,
            "modules" to modules.map { it.wireValue },
            "accountLabelMode" to accountLabelMode.wireValue,
            "tipLevel" to tipLevel.wireValue,
        )
    }

    fun toJSONObject(): JSONObject {
        val modulesArray = JSONArray()
        modules.forEach { modulesArray.put(it.wireValue) }
        return JSONObject().apply {
            put("mode", mode.wireValue)
            put("modules", modulesArray)
            put("accountLabelMode", accountLabelMode.wireValue)
            put("tipLevel", tipLevel.wireValue)
        }
    }

    fun sanitizeModuleList(): List<KeyboardStatusBarModule> {
        return modules.filter { it in SAFE_MODULES }
    }
}

class KeyboardUserContext(
    private val accountLabel: String?,
    private val accountLabelMode: KeyboardStatusBarAccountLabelMode,
    private val tipsLastResetAtMs: Long?,
) {
    val safeAccountLabel: String?
        get() = accountLabel?.trim()?.let(::truncateLabel)

    private fun truncateLabel(raw: String): String {
        val trimmed = raw.trim()
        return if (trimmed.length <= 48) trimmed else trimmed.take(45) + "…"
    }

    val userContextMap: Map<String, Any?>
        get() =
            mapOf(
                "accountLabel" to safeAccountLabel,
                "accountLabelMode" to accountLabelMode.wireValue,
                "tipsLastResetAtMs" to tipsLastResetAtMs,
            )

    companion object {
        fun empty(): KeyboardUserContext =
            KeyboardUserContext(
                accountLabel = null,
                accountLabelMode = KeyboardStatusBarAccountLabelMode.NONE,
                tipsLastResetAtMs = null,
            )
    }
}
