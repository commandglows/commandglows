package com.commandglows.app.ime

import android.content.Context
import android.provider.Settings
import org.json.JSONArray
import org.json.JSONObject

object KeyboardClipboardEventQueue {
    private const val maxEvents = 50
    private const val preferencesName = "commandglows_keyboard_clipboard_events"
    private const val eventsKey = "events"
    private val events = ArrayDeque<Map<String, Any>>()

    @Synchronized
    fun enqueue(
        context: Context,
        content: String,
        source: String,
        action: String,
        capturedAtEpochMillis: Long = System.currentTimeMillis(),
    ) {
        val normalized = content.trim()
        if (normalized.isEmpty()) {
            return
        }
        while (events.size >= maxEvents) {
            events.removeFirst()
        }
        val event =
            mapOf(
                "content" to normalized,
                "source" to source,
                "deviceId" to deviceId(context),
                "capturedAtEpochMillis" to capturedAtEpochMillis,
                "sourceMetadata" to
                    mapOf(
                        "surface" to "keyboard",
                        "action" to action,
                    ),
            )
        events.addLast(event)
        persist(
            context,
            (readPersisted(context) + event).takeLast(maxEvents),
        )
    }

    @Synchronized
    fun drain(context: Context): List<Map<String, Any>> {
        val persisted = readPersisted(context)
        val drained = if (persisted.isNotEmpty()) persisted else events.toList()
        events.clear()
        persist(context, emptyList())
        return drained
    }

    @Synchronized
    fun size(): Int = events.size

    private fun readPersisted(context: Context): List<Map<String, Any>> {
        val raw =
            context
                .getSharedPreferences(preferencesName, Context.MODE_PRIVATE)
                .getString(eventsKey, "[]")
                .orEmpty()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val item = array.optJSONObject(index) ?: continue
                    val content = item.optString("content").trim()
                    val source = item.optString("source").trim()
                    val deviceId = item.optString("deviceId").trim()
                    val capturedAtEpochMillis = item.optLong("capturedAtEpochMillis", 0L)
                    if (content.isEmpty() || source.isEmpty() || deviceId.isEmpty() || capturedAtEpochMillis <= 0L) {
                        continue
                    }
                    val metadata = item.optJSONObject("sourceMetadata")
                    add(
                        mapOf(
                            "content" to content,
                            "source" to source,
                            "deviceId" to deviceId,
                            "capturedAtEpochMillis" to capturedAtEpochMillis,
                            "sourceMetadata" to
                                mapOf(
                                    "surface" to (metadata?.optString("surface")?.takeIf { it.isNotBlank() } ?: "keyboard"),
                                    "action" to (metadata?.optString("action")?.takeIf { it.isNotBlank() } ?: "keyboard_clipboard"),
                                ),
                        ),
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    private fun persist(context: Context, nextEvents: List<Map<String, Any>>) {
        val array = JSONArray()
        nextEvents.forEach { event ->
            val metadata = event["sourceMetadata"] as? Map<*, *>
            array.put(
                JSONObject()
                    .put("content", event["content"] as? String ?: "")
                    .put("source", event["source"] as? String ?: "keyboard_clipboard")
                    .put("deviceId", event["deviceId"] as? String ?: deviceId(context))
                    .put("capturedAtEpochMillis", event["capturedAtEpochMillis"] as? Long ?: System.currentTimeMillis())
                    .put(
                        "sourceMetadata",
                        JSONObject()
                            .put("surface", metadata?.get("surface") as? String ?: "keyboard")
                            .put("action", metadata?.get("action") as? String ?: "keyboard_clipboard"),
                    ),
            )
        }
        context
            .getSharedPreferences(preferencesName, Context.MODE_PRIVATE)
            .edit()
            .putString(eventsKey, array.toString())
            .apply()
    }

    private fun deviceId(context: Context): String {
        val androidId =
            Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ANDROID_ID,
            )
                ?.takeIf { it.isNotBlank() }
                ?: "unknown"
        return "android:$androidId"
    }
}
