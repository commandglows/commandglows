package com.commandglows.app.ime.actions

import com.commandglows.app.ime.KeyboardKeyAction
import com.commandglows.app.ime.KeyboardKeySpec

class KeyboardActionBarController(
    private val catalog: KeyboardActionCatalog = KeyboardActionCatalog.default(),
) {
    private val fixedModeIds = setOf("letters", "numbers", "symbols", "navigation")
    private val trailingActionIds = listOf("emoji", "clipboard", "snippets", "media", "voice", "prefs")

    fun sanitizeState(
        state: KeyboardActionBarState,
        environment: KeyboardActionEnvironment,
    ): KeyboardActionBarState {
        val order = normalizeOrder(state.orderedActionIds)
        val pinnableIds = catalog.descriptorsById.values.filter { it.pinnable }.map { it.id }.toSet()
        val pinned = (state.pinnedActionIds intersect order.toSet() intersect pinnableIds)
            .ifEmpty { catalog.minimalPinnedActionIds }
        val withPinnedRecovery = pinned + (catalog.minimalPinnedActionIds intersect order.toSet())
        val pinnedBackedAttachedRows =
            state.attachedRows.filter { it.providerActionId in withPinnedRecovery }
        val sanitizedInput =
            state.copy(
                orderedActionIds = order,
                pinnedActionIds = withPinnedRecovery,
                attachedRows = pinnedBackedAttachedRows,
            )
        val availableDescriptors = descriptorsForMainRow(order, environment, sanitizedInput)
        val availableIds = availableDescriptors.map { it.id }.toSet()

        val attachedRows = buildAttachedRows(sanitizedInput, environment)
        val validRowIds = attachedRows.map { it.rowId }.toSet()
        val rowPageById =
            state.rowPageById
                .filterKeys { it in validRowIds }
                .mapValues { (_, page) -> page.coerceAtLeast(0) }

        val usage = state.adaptiveUsageScoreById.filterKeys { it in availableIds }
        return state.copy(
            orderedActionIds = order,
            pinnedActionIds = withPinnedRecovery,
            attachedRows = attachedRows.map { KeyboardAttachedActionRowState(it.providerActionId, it.rowId, it.dedupeKey) },
            rowPageById = rowPageById,
            adaptiveUsageScoreById = usage,
        )
    }

    fun onTap(
        actionId: String,
        state: KeyboardActionBarState,
        environment: KeyboardActionEnvironment,
    ): KeyboardActionTapResult {
        val descriptor = catalog.descriptor(actionId)
            ?: return KeyboardActionTapResult(state, null, "Action unavailable")
        if (!isVisible(descriptor, environment)) {
            return KeyboardActionTapResult(state, null, "Action unavailable")
        }
        val sanitized = sanitizeState(state, environment)
        val nextUsage =
            if (!environment.fieldPolicy.privateMode && descriptor.adaptiveEligible) {
                val current = sanitized.adaptiveUsageScoreById[actionId] ?: 0L
                sanitized.adaptiveUsageScoreById + (actionId to (current + 1L))
            } else {
                sanitized.adaptiveUsageScoreById
            }
        return KeyboardActionTapResult(
            nextState = sanitized.copy(adaptiveUsageScoreById = nextUsage),
            command = descriptor.tapAction,
        )
    }

    fun onLongPress(
        actionId: String,
        state: KeyboardActionBarState,
        environment: KeyboardActionEnvironment,
    ): KeyboardActionLongPressResult {
        val descriptor = catalog.descriptor(actionId)
            ?: return KeyboardActionLongPressResult(state, consumed = false, status = "Action unavailable")
        if (!isVisible(descriptor, environment)) {
            return KeyboardActionLongPressResult(state, consumed = true, status = "Action unavailable")
        }

        val sanitized = sanitizeState(state, environment)
        return when (sanitized.longPressBehavior) {
            KeyboardActionLongPressBehavior.PinAction -> handlePinLongPress(descriptor, sanitized)
            KeyboardActionLongPressBehavior.AttachContextRow -> handleAttachRowLongPress(descriptor, sanitized, environment)
        }
    }

    fun setRowPage(
        rowId: String,
        page: Int,
        state: KeyboardActionBarState,
        environment: KeyboardActionEnvironment,
    ): KeyboardActionBarState {
        val sanitized = sanitizeState(state, environment)
        return sanitized.copy(
            rowPageById = sanitized.rowPageById + (rowId to page.coerceAtLeast(0)),
        )
    }

    fun buildRenderSnapshot(
        state: KeyboardActionBarState,
        environment: KeyboardActionEnvironment,
    ): KeyboardActionRenderSnapshot {
        val sanitized = sanitizeState(state, environment)
        val descriptors = descriptorsForMainRow(sanitized.orderedActionIds, environment, sanitized)
        val mainItems = descriptors.map { descriptor -> actionMainKey(descriptor, environment, sanitized) }
        val attached = environment.customActionRows + buildAttachedRows(sanitized, environment).map { it.spec }
        return KeyboardActionRenderSnapshot(
            state = sanitized,
            mainRow = KeyboardActionRowSpec(
                rowId = "action-row-main",
                dedupeKey = "main",
                items = mainItems,
                actionSurface = false,
            ),
            attachedRows = attached,
        )
    }

    private fun handlePinLongPress(
        descriptor: KeyboardActionDescriptor,
        state: KeyboardActionBarState,
    ): KeyboardActionLongPressResult {
        if (!descriptor.pinnable) {
            return KeyboardActionLongPressResult(state, consumed = true, status = "Pin unavailable")
        }
        val pinned =
            if (state.pinnedActionIds.contains(descriptor.id)) {
                (state.pinnedActionIds - descriptor.id).ifEmpty { catalog.minimalPinnedActionIds }
            } else {
                state.pinnedActionIds + descriptor.id
            }
        return KeyboardActionLongPressResult(
            nextState = state.copy(pinnedActionIds = pinned),
            consumed = true,
            status = if (descriptor.id in pinned) "Action pinned" else "Action unpinned",
        )
    }

    private fun handleAttachRowLongPress(
        descriptor: KeyboardActionDescriptor,
        state: KeyboardActionBarState,
        environment: KeyboardActionEnvironment,
    ): KeyboardActionLongPressResult {
        val provider = descriptor.rowProvider
            ?: return KeyboardActionLongPressResult(state, consumed = true, status = "No context row")
        val rows = provider.buildRows(providerContext(descriptor, environment))
        if (rows.isEmpty()) {
            return KeyboardActionLongPressResult(state, consumed = true, status = "No context row")
        }
        if (descriptor.id in state.pinnedActionIds || state.attachedRows.any { it.providerActionId == descriptor.id }) {
            val removedDedupeKeys = rows.map { it.dedupeKey }.toSet()
            return KeyboardActionLongPressResult(
                nextState =
                    state.copy(
                        pinnedActionIds = state.pinnedActionIds - descriptor.id,
                        attachedRows = state.attachedRows.filterNot { it.providerActionId == descriptor.id || it.dedupeKey in removedDedupeKeys },
                        rowPageById = state.rowPageById.filterKeys { rowId -> rows.none { it.rowId == rowId } },
                    ),
                consumed = true,
                status = "Action unpinned",
            )
        }
        val nextAttached = state.attachedRows.toMutableList()
        rows.forEach { row ->
            val existingIndex = nextAttached.indexOfFirst { it.dedupeKey == row.dedupeKey }
            val value = KeyboardAttachedActionRowState(descriptor.id, row.rowId, row.dedupeKey)
            if (existingIndex >= 0) {
                nextAttached[existingIndex] = value
            } else {
                nextAttached.add(value)
            }
        }
        val nextPages =
            state.rowPageById + rows.associate { it.rowId to 0 }
        return KeyboardActionLongPressResult(
            nextState = state.copy(pinnedActionIds = state.pinnedActionIds + descriptor.id, attachedRows = nextAttached, rowPageById = nextPages),
            consumed = true,
            status = "Action pinned",
        )
    }

    private fun actionMainKey(
        descriptor: KeyboardActionDescriptor,
        environment: KeyboardActionEnvironment,
        state: KeyboardActionBarState,
    ): KeyboardKeySpec {
        return KeyboardKeySpec(
            id = "action-${descriptor.id}",
            label = descriptor.glyph,
            action = descriptor.tapAction,
            enabled = isEnabled(descriptor, environment),
            active = catalog.isActionActive(descriptor, environment, state),
            pinned = descriptor.id in state.pinnedActionIds,
            actionSurface = descriptor.id !in fixedModeIds,
            actionDescriptorId = descriptor.id,
            actionDescriptorPrimary = true,
        )
    }

    private fun normalizeOrder(requestedOrder: List<String>): List<String> {
        val baseline = if (requestedOrder.isEmpty()) catalog.defaultOrder else requestedOrder
        val known = baseline.filter { it in catalog.descriptorsById.keys }
        val missing = catalog.defaultOrder.filterNot { it in known }
        return known + missing
    }

    private fun descriptorsForMainRow(
        order: List<String>,
        environment: KeyboardActionEnvironment,
        state: KeyboardActionBarState,
    ): List<KeyboardActionDescriptor> {
        val ordered = catalog.orderedDescriptors(order)
        val visible = ordered.filter { isVisible(it, environment) }
        val fixedModes = visible.filter { it.id in fixedModeIds }
        val trailingActionSet = trailingActionIds.toSet()
        val movable = visible.filterNot { it.id in fixedModeIds || it.id in trailingActionSet }
        val pinned = movable.filter { it.id in state.pinnedActionIds }
        val unpinned =
            movable
                .filterNot { it.id in state.pinnedActionIds }
        val trailing =
            trailingActionIds.mapNotNull { actionId ->
                visible.firstOrNull { it.id == actionId }
            }
        return fixedModes + pinned + unpinned + trailing
    }

    private data class BuiltAttachedRow(
        val providerActionId: String,
        val rowId: String,
        val dedupeKey: String,
        val spec: KeyboardActionRowSpec,
    )

    private fun buildAttachedRows(
        state: KeyboardActionBarState,
        environment: KeyboardActionEnvironment,
    ): List<BuiltAttachedRow> {
        val pinnedRows =
            state.pinnedActionIds.mapNotNull { actionId ->
                val descriptor = catalog.descriptor(actionId) ?: return@mapNotNull null
                val provider = descriptor.rowProvider ?: return@mapNotNull null
                val row = provider.buildRows(providerContext(descriptor, environment)).firstOrNull()
                    ?: return@mapNotNull null
                KeyboardAttachedActionRowState(descriptor.id, row.rowId, row.dedupeKey)
            }
        val rows = mutableListOf<BuiltAttachedRow>()
        (pinnedRows + state.attachedRows).forEach { attached ->
            val descriptor = catalog.descriptor(attached.providerActionId) ?: return@forEach
            if (!isVisible(descriptor, environment)) {
                return@forEach
            }
            val provider = descriptor.rowProvider ?: return@forEach
            val provided = provider.buildRows(providerContext(descriptor, environment))
            val matched = provided.firstOrNull { it.dedupeKey == attached.dedupeKey } ?: return@forEach
            rows.add(
                BuiltAttachedRow(
                    providerActionId = descriptor.id,
                    rowId = matched.rowId,
                    dedupeKey = matched.dedupeKey,
                    spec = matched,
                ),
            )
        }
        return rows.distinctBy { it.dedupeKey }
    }

    private fun providerContext(
        descriptor: KeyboardActionDescriptor,
        environment: KeyboardActionEnvironment,
    ): KeyboardActionProviderContext {
        return KeyboardActionProviderContext(
            descriptor = descriptor,
            fieldPolicy = environment.fieldPolicy,
            recentEmojis = environment.recentEmojis,
            recentSymbols = environment.recentSymbols,
            clipboardEntries = environment.clipboardEntries,
            snippets = environment.snippets,
        )
    }

    private fun isVisible(
        descriptor: KeyboardActionDescriptor,
        environment: KeyboardActionEnvironment,
    ): Boolean {
        if (descriptor.sensitiveInPrivate && environment.fieldPolicy.privateMode) {
            return false
        }
        return when (descriptor.availabilityPolicy) {
            KeyboardActionAvailabilityPolicy.Always -> true
            KeyboardActionAvailabilityPolicy.ClipboardAllowed -> environment.clipboardAllowed
            KeyboardActionAvailabilityPolicy.VoiceAllowed -> environment.voiceAllowed
            KeyboardActionAvailabilityPolicy.SnippetsAllowed -> environment.snippetsAllowed
            KeyboardActionAvailabilityPolicy.MediaControlsEnabled -> environment.mediaControlsEnabled
        }
    }

    private fun isEnabled(
        descriptor: KeyboardActionDescriptor,
        environment: KeyboardActionEnvironment,
    ): Boolean {
        return isVisible(descriptor, environment)
    }
}
