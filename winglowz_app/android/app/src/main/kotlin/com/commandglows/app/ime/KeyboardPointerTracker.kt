package com.commandglows.app.ime

import kotlin.math.hypot

internal enum class KeyboardProtectedInteraction {
    SpaceSlider,
    HorizontalRowScroll,
    VerticalPanelScroll,
    LongPressRepeat,
    LongPressAction,
}

internal data class KeyboardPointerState<T>(
    val pointerId: Int,
    val keyId: String,
    val payload: T,
    val startX: Float,
    val startY: Float,
    var latestX: Float = startX,
    var latestY: Float = startY,
    var maxDistanceFromStart: Float = 0f,
    var totalTravelDistance: Float = 0f,
    var longPressToken: Int = 0,
    var longPressTriggered: Boolean = false,
    var consumedByProtectedInteraction: Boolean = false,
)

internal class KeyboardPointerTracker<T> {
    private val pointerStates = linkedMapOf<Int, KeyboardPointerState<T>>()

    var protectedOwnerPointerId: Int? = null
        private set

    var protectedInteraction: KeyboardProtectedInteraction? = null
        private set

    fun startPointer(
        pointerId: Int,
        keyId: String,
        payload: T,
        x: Float,
        y: Float,
    ): KeyboardPointerState<T> {
        val state =
            KeyboardPointerState(
                pointerId = pointerId,
                keyId = keyId,
                payload = payload,
                startX = x,
                startY = y,
            )
        pointerStates[pointerId] = state
        return state
    }

    fun get(pointerId: Int): KeyboardPointerState<T>? = pointerStates[pointerId]

    fun contains(pointerId: Int): Boolean = pointerStates.containsKey(pointerId)

    fun activeStates(): List<KeyboardPointerState<T>> = pointerStates.values.toList()

    fun activeKeyIds(): Set<String> = pointerStates.values.mapTo(linkedSetOf()) { it.keyId }

    fun updatePosition(
        pointerId: Int,
        x: Float,
        y: Float,
    ): KeyboardPointerState<T>? {
        val state = pointerStates[pointerId] ?: return null
        val stepDistance = hypot((x - state.latestX).toDouble(), (y - state.latestY).toDouble()).toFloat()
        state.totalTravelDistance += stepDistance
        state.latestX = x
        state.latestY = y
        val dx = x - state.startX
        val dy = y - state.startY
        val distance = hypot(dx.toDouble(), dy.toDouble()).toFloat()
        if (distance > state.maxDistanceFromStart) {
            state.maxDistanceFromStart = distance
        }
        return state
    }

    fun nextLongPressToken(pointerId: Int): Int? {
        val state = pointerStates[pointerId] ?: return null
        state.longPressToken += 1
        return state.longPressToken
    }

    fun isLongPressTokenCurrent(
        pointerId: Int,
        token: Int,
    ): Boolean {
        return pointerStates[pointerId]?.longPressToken == token
    }

    fun markLongPressTriggered(pointerId: Int) {
        pointerStates[pointerId]?.longPressTriggered = true
    }

    fun markConsumedByProtectedInteraction(pointerId: Int) {
        pointerStates[pointerId]?.consumedByProtectedInteraction = true
    }

    fun isProtectedByOtherPointer(pointerId: Int): Boolean {
        val owner = protectedOwnerPointerId ?: return false
        return owner != pointerId
    }

    fun acquireProtectedInteraction(
        ownerPointerId: Int,
        interaction: KeyboardProtectedInteraction,
    ): List<KeyboardPointerState<T>> {
        if (!pointerStates.containsKey(ownerPointerId)) {
            return emptyList()
        }
        val owner = protectedOwnerPointerId
        if (owner != null && owner != ownerPointerId) {
            return emptyList()
        }
        protectedOwnerPointerId = ownerPointerId
        protectedInteraction = interaction
        val canceled = mutableListOf<KeyboardPointerState<T>>()
        val iterator = pointerStates.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next()
            if (entry.key != ownerPointerId) {
                canceled += entry.value
                iterator.remove()
            }
        }
        return canceled
    }

    fun releaseProtectedInteraction(pointerId: Int) {
        if (protectedOwnerPointerId == pointerId) {
            protectedOwnerPointerId = null
            protectedInteraction = null
        }
    }

    fun removePointer(pointerId: Int): KeyboardPointerState<T>? {
        val removed = pointerStates.remove(pointerId)
        if (protectedOwnerPointerId == pointerId) {
            protectedOwnerPointerId = null
            protectedInteraction = null
        }
        return removed
    }

    fun removeAllPointers(): List<KeyboardPointerState<T>> {
        val removed = pointerStates.values.toList()
        pointerStates.clear()
        protectedOwnerPointerId = null
        protectedInteraction = null
        return removed
    }
}
