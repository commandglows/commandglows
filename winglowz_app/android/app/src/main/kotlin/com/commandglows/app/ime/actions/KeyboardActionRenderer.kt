package com.commandglows.app.ime.actions

import com.commandglows.app.ime.KeyboardRowSpec

class KeyboardActionRenderer {
    fun renderRows(snapshot: KeyboardActionRenderSnapshot): List<KeyboardRowSpec> {
        val rows = mutableListOf<KeyboardRowSpec>()
        rows.add(renderRow(snapshot.mainRow))
        snapshot.attachedRows.forEach { row -> rows.add(renderRow(row)) }
        return rows
    }

    private fun renderRow(row: KeyboardActionRowSpec): KeyboardRowSpec {
        val visibleCount = row.visiblePageKeyCount
        val rowNeedsHorizontalScroll =
            row.pagedHorizontal && visibleCount != null && row.items.size > visibleCount
        return KeyboardRowSpec(
            rowId = row.rowId,
            keys =
                row.items.map { item ->
                    if (row.actionSurface) {
                        item.copy(actionSurface = true)
                    } else {
                        item
                    }
                },
            horizontalScrollable = rowNeedsHorizontalScroll,
            pagedHorizontalScrollable = rowNeedsHorizontalScroll,
            visiblePageKeyCount = visibleCount.takeIf { rowNeedsHorizontalScroll },
        )
    }
}
