package com.commandglows.app.ime

import com.commandglows.app.ime.generated.CommandGlowsTokens

/**
 * Stable native bridge to the generated Android adapter. This object contains
 * visual defaults only: generated values are compiled into the IME and keep no
 * Flutter runtime dependency or participation in startup or persistence.
 */
internal object KeyboardDesignSystemMapping {
    const val THEME_V1_BACKGROUND: Int = -1117714
    const val THEME_V1_KEY: Int = -1
    const val THEME_V1_SPECIAL_KEY: Int = -2038045
    const val THEME_V1_ACTIVE_KEY: Int =
        CommandGlowsTokens.SEMANTIC_COLOR_KEYBOARD_KEY_ACTIVE
    const val THEME_V1_PRESSED_KEY: Int = -3482925
    const val THEME_V1_TEXT: Int =
        CommandGlowsTokens.SEMANTIC_COLOR_KEYBOARD_KEY_FOREGROUND
    const val THEME_V1_CORNER_TEXT: Int = -10721438
    const val THEME_V1_STATUS_TEXT: Int = -13419208
    const val THEME_V1_BORDER: Int = 0x00000000
    const val THEME_V1_SHADOW: Int = 0x33000000
    const val THEME_V1_PRESS_DURATION_MS: Int =
        CommandGlowsTokens.SEMANTIC_MOTION_KEYBOARD_PRESS

    const val THEME_V1_KEYBOARD_OPACITY: Float = 1f
    const val THEME_V1_CORNER_TEXT_OPACITY: Float = 0.85f
    const val THEME_V1_BORDER_WIDTH: Float = 0f
    const val THEME_V1_KEY_RELIEF_DEPTH: Float = 2f
    const val THEME_V1_KEY_RADIUS: Float = 8f
    const val THEME_V1_GRID_GAP: Float = CommandGlowsTokens.SEMANTIC_SPACE_UNIT
    const val THEME_V1_SHADOW_BLUR: Float = 4f
    const val THEME_V1_SHADOW_OFFSET_Y: Float = 1f
    const val THEME_V1_EFFECT_INTENSITY: Float = 0.35f
}
