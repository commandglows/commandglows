package com.commandglows.app

import java.util.ArrayDeque

object OverlayEventQueue {
    private const val MAX_EVENTS = 100
    private val events = ArrayDeque<Map<String, Any>>()
    private var lastEvent: Map<String, Any>? = null

    @Synchronized
    fun enqueue(eventType: String, payload: Map<String, Any>? = null) {
        if (eventType.isBlank()) {
            return
        }
        while (events.size >= MAX_EVENTS) {
            events.removeFirst()
        }
        val event = buildMap {
            put("type", eventType)
            put("capturedAtEpochMillis", System.currentTimeMillis())
            if (!payload.isNullOrEmpty()) {
                put("payload", HashMap(payload))
            }
        }
        events.addLast(event)
        lastEvent = event
    }

    @Synchronized
    fun drain(): List<Map<String, Any>> {
        val drained = events.toList()
        events.clear()
        return drained
    }

    @Synchronized
    fun size(): Int = events.size

    @Synchronized
    fun lastEventSummary(): String? {
        val event = lastEvent ?: return null
        val type = event["type"]?.toString() ?: return null
        val payload = event["payload"]
        return if (payload is Map<*, *> && payload.isNotEmpty()) {
            "$type ${payload.entries.joinToString(";") { "${it.key}=${it.value}" }}"
        } else {
            type
        }
    }
}
