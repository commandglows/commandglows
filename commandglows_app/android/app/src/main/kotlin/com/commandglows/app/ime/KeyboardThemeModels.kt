package com.commandglows.app.ime

import android.graphics.Color
import org.json.JSONObject
import kotlin.math.roundToInt

/**
 * Native-only visual roles that are not part of the cross-surface generated
 * adapter. Keeping them named here preserves the IME's independent startup
 * and the exact v1 preset values without scattering rendering literals.
 */
internal object NativeImeVisualTokens {
    const val LIGHT_PRIVATE_BACKGROUND: Int = -595742
    const val LIGHT_DISABLED_KEY: Int = -2696745
    const val LIGHT_DISABLED_TEXT: Int = -8682882

    const val DARK_BACKGROUND: Int = -15591403
    const val DARK_PRIVATE_BACKGROUND: Int = -14017509
    const val DARK_KEY: Int = -14472409
    const val DARK_SPECIAL_KEY: Int = -13748173
    const val DARK_ACTIVE_KEY: Int = -13192316
    const val DARK_PRESSED_KEY: Int = -12365237
    const val DARK_DISABLED_KEY: Int = -14801887
    const val DARK_TEXT: Int = -1314066
    const val DARK_ACTIVE_TEXT: Int = -16247793
    const val DARK_DISABLED_TEXT: Int = -9668751
    const val DARK_SECONDARY_TEXT: Int = -5720658
    const val DARK_STATUS_TEXT: Int = -3352110

    const val STATUS_ERROR: Int = -3919812
    const val DEBUG_STROKE: Int = -2613216
    const val DEBUG_TEXT: Int = -6285288
    const val PINNED_BADGE_STAR: Int = -10163
    const val VOICE_RECORDING: Int = -1364160

    const val GLASS_KEY_RADIUS: Float = 14f
    const val PIXEL_KEY_RADIUS: Float = 5f
}

data class KeyboardThemePreset(
    val id: String,
    val name: String,
)

object KeyboardThemePresets {
    const val SYSTEM = "system"
    const val COMMANDGLOWS = "commandglows"
    const val COMMANDGLOWS_LIGHT = "commandglows_light"
    const val COMMANDGLOWS_DARK = "commandglows_dark"
    const val NEON_TERMINAL = "neon_terminal"
    const val GLASS_MINT = "glass_mint"
    const val SUNSET_GRADIENT = "sunset_gradient"
    const val MIDNIGHT_AURORA = "midnight_aurora"
    const val PAPER_INK = "paper_ink"
    const val PIXEL_CANDY = "pixel_candy"
    const val MINIMAL_CONTRAST = "minimal_contrast"

    val all =
        listOf(
            KeyboardThemePreset(SYSTEM, "System"),
            KeyboardThemePreset(COMMANDGLOWS, "CommandGlows"),
            KeyboardThemePreset(NEON_TERMINAL, "Neon"),
            KeyboardThemePreset(GLASS_MINT, "Glass"),
            KeyboardThemePreset(SUNSET_GRADIENT, "Sunset"),
            KeyboardThemePreset(MIDNIGHT_AURORA, "Aurora"),
            KeyboardThemePreset(PAPER_INK, "Paper"),
            KeyboardThemePreset(PIXEL_CANDY, "Candy"),
            KeyboardThemePreset(MINIMAL_CONTRAST, "Contrast"),
        )

    fun labelFor(presetId: String): String =
        all.firstOrNull { it.id == presetId }?.name ?: "Theme"

    fun resolveVariantForMode(
        config: KeyboardThemeConfig,
        dark: Boolean,
    ): KeyboardThemeConfig {
        val presetId = normalizedPresetId(config.presetId)
        if (presetId == SYSTEM || config.useImage || !isCatalogPreset(presetId)) {
            return config
        }
        val lightPreset = configFor(presetId, dark = false)
        val darkPreset = configFor(presetId, dark = true)
        if (!matchesPresetPalette(config, lightPreset) && !matchesPresetPalette(config, darkPreset)) {
            return config
        }
        val targetPreset = if (dark) darkPreset else lightPreset
        return targetPreset.copy(
            version = config.version,
            keyboardOpacity = config.keyboardOpacity,
            pressHighlightDurationMs = config.pressHighlightDurationMs,
            cornerTextOpacity = config.cornerTextOpacity,
            borderWidth = config.borderWidth,
            keyReliefEnabled = config.keyReliefEnabled,
            keyReliefDepth = config.keyReliefDepth,
            keyRadius = config.keyRadius,
            keyHorizontalGap = config.keyHorizontalGap,
            rowVerticalGap = config.rowVerticalGap,
            shadowBlur = config.shadowBlur,
            shadowOffsetY = config.shadowOffsetY,
            pressEffect = config.pressEffect,
            effectIntensity = config.effectIntensity,
            effectDurationMs = config.effectDurationMs,
            effectEasing = config.effectEasing,
        )
    }

    fun configFor(presetId: String, dark: Boolean = false): KeyboardThemeConfig {
        val normalizedPresetId =
            normalizedPresetId(presetId)
        val base = KeyboardThemeConfig(presetId = normalizedPresetId, useImage = false, backgroundImagePath = null)
        if (dark) {
            return darkConfigFor(normalizedPresetId, base)
        }
        return when (normalizedPresetId) {
            SYSTEM -> KeyboardThemeConfig()
            COMMANDGLOWS -> base
            NEON_TERMINAL ->
                base.copy(
                    backgroundStartColor = Color.parseColor("#07120F"),
                    backgroundEndColor = Color.parseColor("#12241E"),
                    useGradient = true,
                    keyColor = Color.parseColor("#0D1C18"),
                    specialKeyColor = Color.parseColor("#143127"),
                    activeKeyColor = Color.parseColor("#00F5A0"),
                    pressedKeyColor = Color.parseColor("#1D4D3C"),
                    textColor = Color.parseColor("#E9FFF6"),
                    cornerTextColor = Color.parseColor("#7CFFD3"),
                    statusTextColor = Color.parseColor("#B8FFE8"),
                    borderColor = Color.parseColor("#00A76E"),
                    shadowColor = 0x8800F5A0.toInt(),
                    shadowBlur = 7f,
                    pressEffect = "garland",
                )
            GLASS_MINT ->
                base.copy(
                    backgroundStartColor = Color.parseColor("#DFFAF0"),
                    backgroundEndColor = Color.parseColor("#BEEBD9"),
                    useGradient = true,
                    keyColor = 0xCCFFFFFF.toInt(),
                    specialKeyColor = 0xBFE5FFF6.toInt(),
                    activeKeyColor = Color.parseColor("#168765"),
                    pressedKeyColor = Color.parseColor("#D0EEE3"),
                    textColor = Color.parseColor("#17342B"),
                    cornerTextColor = Color.parseColor("#4F7C6C"),
                    statusTextColor = Color.parseColor("#254C3F"),
                    borderColor = 0x80FFFFFF.toInt(),
                    keyRadius = NativeImeVisualTokens.GLASS_KEY_RADIUS,
                    shadowBlur = 9f,
                )
            SUNSET_GRADIENT ->
                base.copy(
                    backgroundStartColor = Color.parseColor("#FFC371"),
                    backgroundEndColor = Color.parseColor("#FF5F6D"),
                    useGradient = true,
                    keyColor = Color.parseColor("#FFF8EB"),
                    specialKeyColor = Color.parseColor("#FFDEB8"),
                    activeKeyColor = Color.parseColor("#8A1F3D"),
                    pressedKeyColor = Color.parseColor("#FFCFB0"),
                    textColor = Color.parseColor("#3B1820"),
                    cornerTextColor = Color.parseColor("#754252"),
                    statusTextColor = Color.parseColor("#471D28"),
                    borderColor = 0x33FFFFFF,
                    pressEffect = "pulse",
                )
            MIDNIGHT_AURORA ->
                base.copy(
                    backgroundStartColor = Color.parseColor("#07111F"),
                    backgroundEndColor = Color.parseColor("#204B6D"),
                    useGradient = true,
                    gradientStyle = "radial",
                    keyColor = Color.parseColor("#111C2E"),
                    specialKeyColor = Color.parseColor("#1E2E48"),
                    activeKeyColor = Color.parseColor("#64D2FF"),
                    pressedKeyColor = Color.parseColor("#2D4667"),
                    textColor = Color.parseColor("#EAF7FF"),
                    cornerTextColor = Color.parseColor("#A7DFFF"),
                    statusTextColor = Color.parseColor("#D7F0FF"),
                    borderColor = Color.parseColor("#3B6D8D"),
                    shadowColor = 0x995BD6FF.toInt(),
                    pressEffect = "ripple",
                )
            PAPER_INK ->
                base.copy(
                    backgroundStartColor = Color.parseColor("#F5EFE2"),
                    backgroundEndColor = Color.parseColor("#F5EFE2"),
                    keyColor = Color.parseColor("#FFFCF4"),
                    specialKeyColor = Color.parseColor("#E9DDC9"),
                    activeKeyColor = Color.parseColor("#2D2A26"),
                    pressedKeyColor = Color.parseColor("#E1D2BB"),
                    textColor = Color.parseColor("#1D1A16"),
                    cornerTextColor = Color.parseColor("#6A5D4A"),
                    statusTextColor = Color.parseColor("#40382D"),
                    borderColor = Color.parseColor("#B9A98F"),
                    shadowColor = 0x33000000,
                    shadowBlur = 3f,
                )
            PIXEL_CANDY ->
                base.copy(
                    backgroundStartColor = Color.parseColor("#FFE0F1"),
                    backgroundEndColor = Color.parseColor("#D4F1FF"),
                    useGradient = true,
                    keyColor = Color.WHITE,
                    specialKeyColor = Color.parseColor("#FFC6E2"),
                    activeKeyColor = Color.parseColor("#005A9C"),
                    pressedKeyColor = Color.parseColor("#FFD166"),
                    textColor = Color.parseColor("#15213A"),
                    cornerTextColor = Color.parseColor("#37527A"),
                    statusTextColor = Color.parseColor("#1A3150"),
                    borderColor = Color.parseColor("#15213A"),
                    borderWidth = 1.5f,
                    keyRadius = NativeImeVisualTokens.PIXEL_KEY_RADIUS,
                    shadowBlur = 1f,
                    pressEffect = "confettiLite",
                )
            MINIMAL_CONTRAST ->
                base.copy(
                    backgroundStartColor = Color.BLACK,
                    backgroundEndColor = Color.BLACK,
                    keyColor = Color.WHITE,
                    specialKeyColor = Color.parseColor("#E8E8E8"),
                    activeKeyColor = Color.YELLOW,
                    pressedKeyColor = Color.parseColor("#CFCFCF"),
                    textColor = Color.BLACK,
                    cornerTextColor = Color.parseColor("#303030"),
                    statusTextColor = Color.WHITE,
                    borderColor = Color.WHITE,
                    borderWidth = 1f,
                    shadowBlur = 0f,
                )
            else -> KeyboardThemeConfig()
        }
    }

    private fun darkConfigFor(
        presetId: String,
        base: KeyboardThemeConfig,
    ): KeyboardThemeConfig =
        when (presetId) {
            SYSTEM -> KeyboardThemeConfig()
            COMMANDGLOWS ->
                base.copy(
                    backgroundStartColor = NativeImeVisualTokens.DARK_BACKGROUND,
                    backgroundEndColor = NativeImeVisualTokens.DARK_BACKGROUND,
                    keyColor = NativeImeVisualTokens.DARK_KEY,
                    specialKeyColor = NativeImeVisualTokens.DARK_SPECIAL_KEY,
                    activeKeyColor = NativeImeVisualTokens.DARK_ACTIVE_KEY,
                    pressedKeyColor = NativeImeVisualTokens.DARK_PRESSED_KEY,
                    textColor = NativeImeVisualTokens.DARK_TEXT,
                    cornerTextColor = Color.parseColor("#B7C8BF"),
                    statusTextColor = NativeImeVisualTokens.DARK_STATUS_TEXT,
                    borderColor = Color.parseColor("#516158"),
                    shadowColor = 0x66000000,
                )
            NEON_TERMINAL -> configFor(NEON_TERMINAL)
            GLASS_MINT ->
                base.copy(
                    backgroundStartColor = Color.parseColor("#10251F"),
                    backgroundEndColor = Color.parseColor("#1E4A3C"),
                    useGradient = true,
                    keyColor = 0xCC1A2E28.toInt(),
                    specialKeyColor = 0xCC24463B.toInt(),
                    activeKeyColor = Color.parseColor("#7FF0C8"),
                    pressedKeyColor = Color.parseColor("#315F51"),
                    textColor = Color.parseColor("#E8FFF7"),
                    cornerTextColor = Color.parseColor("#A7D8C8"),
                    statusTextColor = Color.parseColor("#C8F5E6"),
                    borderColor = 0x6635E0AC,
                    keyRadius = NativeImeVisualTokens.GLASS_KEY_RADIUS,
                    shadowColor = 0x66000000,
                    shadowBlur = 9f,
                )
            SUNSET_GRADIENT ->
                base.copy(
                    backgroundStartColor = Color.parseColor("#351422"),
                    backgroundEndColor = Color.parseColor("#7A2636"),
                    useGradient = true,
                    keyColor = Color.parseColor("#2C1B22"),
                    specialKeyColor = Color.parseColor("#4A2630"),
                    activeKeyColor = Color.parseColor("#FFB36E"),
                    pressedKeyColor = Color.parseColor("#6A3542"),
                    textColor = Color.parseColor("#FFF1E6"),
                    cornerTextColor = Color.parseColor("#FFC9B5"),
                    statusTextColor = Color.parseColor("#FFE0D2"),
                    borderColor = 0x44FFFFFF,
                    shadowColor = 0x66000000,
                    pressEffect = "pulse",
                )
            MIDNIGHT_AURORA -> configFor(MIDNIGHT_AURORA)
            PAPER_INK ->
                base.copy(
                    backgroundStartColor = Color.parseColor("#181512"),
                    backgroundEndColor = Color.parseColor("#241F1A"),
                    keyColor = Color.parseColor("#2C2721"),
                    specialKeyColor = Color.parseColor("#3A332A"),
                    activeKeyColor = Color.parseColor("#E9D7B8"),
                    pressedKeyColor = Color.parseColor("#4A4034"),
                    textColor = Color.parseColor("#F7EFE3"),
                    cornerTextColor = Color.parseColor("#C9B99F"),
                    statusTextColor = Color.parseColor("#E6D8C1"),
                    borderColor = Color.parseColor("#756850"),
                    shadowColor = 0x66000000,
                    shadowBlur = 3f,
                )
            PIXEL_CANDY ->
                base.copy(
                    backgroundStartColor = Color.parseColor("#27172A"),
                    backgroundEndColor = Color.parseColor("#102840"),
                    useGradient = true,
                    keyColor = Color.parseColor("#23172F"),
                    specialKeyColor = Color.parseColor("#472047"),
                    activeKeyColor = Color.parseColor("#66D9FF"),
                    pressedKeyColor = Color.parseColor("#7A4B12"),
                    textColor = Color.parseColor("#FFF4FF"),
                    cornerTextColor = Color.parseColor("#FFBFE2"),
                    statusTextColor = Color.parseColor("#D4F1FF"),
                    borderColor = Color.parseColor("#FFBFE2"),
                    borderWidth = 1.5f,
                    keyRadius = NativeImeVisualTokens.PIXEL_KEY_RADIUS,
                    shadowColor = 0x66000000,
                    shadowBlur = 1f,
                    pressEffect = "confettiLite",
                )
            MINIMAL_CONTRAST ->
                base.copy(
                    backgroundStartColor = Color.BLACK,
                    backgroundEndColor = Color.BLACK,
                    keyColor = Color.parseColor("#111111"),
                    specialKeyColor = Color.parseColor("#222222"),
                    activeKeyColor = Color.YELLOW,
                    pressedKeyColor = Color.parseColor("#333333"),
                    textColor = Color.WHITE,
                    cornerTextColor = Color.parseColor("#E0E0E0"),
                    statusTextColor = Color.WHITE,
                    borderColor = Color.WHITE,
                    borderWidth = 1f,
                    shadowBlur = 0f,
                )
            else -> KeyboardThemeConfig()
        }

    private fun normalizedPresetId(presetId: String): String =
        when (presetId) {
            COMMANDGLOWS_LIGHT, COMMANDGLOWS_DARK -> COMMANDGLOWS
            else -> presetId
        }

    private fun isCatalogPreset(presetId: String): Boolean =
        all.any { it.id == presetId }

    private fun matchesPresetPalette(
        config: KeyboardThemeConfig,
        preset: KeyboardThemeConfig,
    ): Boolean =
        normalizedPresetId(config.presetId) == preset.presetId &&
            config.backgroundStartColor == preset.backgroundStartColor &&
            config.backgroundEndColor == preset.backgroundEndColor &&
            config.useGradient == preset.useGradient &&
            config.gradientStyle == preset.gradientStyle &&
            config.keyColor == preset.keyColor &&
            config.specialKeyColor == preset.specialKeyColor &&
            config.activeKeyColor == preset.activeKeyColor &&
            config.pressedKeyColor == preset.pressedKeyColor &&
            config.textColor == preset.textColor &&
            config.cornerTextColor == preset.cornerTextColor &&
            config.statusTextColor == preset.statusTextColor &&
            config.borderColor == preset.borderColor &&
            config.shadowColor == preset.shadowColor
}

data class KeyboardThemeConfig(
    val version: Int = 1,
    val presetId: String = "system",
    val backgroundStartColor: Int = KeyboardDesignSystemMapping.THEME_V1_BACKGROUND,
    val backgroundEndColor: Int = KeyboardDesignSystemMapping.THEME_V1_BACKGROUND,
    val useGradient: Boolean = false,
    val gradientStyle: String = "linear",
    val useImage: Boolean = false,
    val backgroundImagePath: String? = null,
    val keyboardOpacity: Float = KeyboardDesignSystemMapping.THEME_V1_KEYBOARD_OPACITY,
    val keyColor: Int = KeyboardDesignSystemMapping.THEME_V1_KEY,
    val specialKeyColor: Int = KeyboardDesignSystemMapping.THEME_V1_SPECIAL_KEY,
    val activeKeyColor: Int = KeyboardDesignSystemMapping.THEME_V1_ACTIVE_KEY,
    val pressedKeyColor: Int = KeyboardDesignSystemMapping.THEME_V1_PRESSED_KEY,
    val pressHighlightDurationMs: Int = KeyboardDesignSystemMapping.THEME_V1_PRESS_DURATION_MS,
    val textColor: Int = KeyboardDesignSystemMapping.THEME_V1_TEXT,
    val cornerTextColor: Int = KeyboardDesignSystemMapping.THEME_V1_CORNER_TEXT,
    val cornerTextOpacity: Float = KeyboardDesignSystemMapping.THEME_V1_CORNER_TEXT_OPACITY,
    val statusTextColor: Int = KeyboardDesignSystemMapping.THEME_V1_STATUS_TEXT,
    val borderColor: Int = KeyboardDesignSystemMapping.THEME_V1_BORDER,
    val borderWidth: Float = KeyboardDesignSystemMapping.THEME_V1_BORDER_WIDTH,
    val keyReliefEnabled: Boolean = false,
    val keyReliefDepth: Float = KeyboardDesignSystemMapping.THEME_V1_KEY_RELIEF_DEPTH,
    val keyRadius: Float = KeyboardDesignSystemMapping.THEME_V1_KEY_RADIUS,
    val keyHorizontalGap: Float = KeyboardDesignSystemMapping.THEME_V1_GRID_GAP,
    val rowVerticalGap: Float = KeyboardDesignSystemMapping.THEME_V1_GRID_GAP,
    val keyWidthScale: Float = 1f,
    val shadowColor: Int = KeyboardDesignSystemMapping.THEME_V1_SHADOW,
    val shadowBlur: Float = KeyboardDesignSystemMapping.THEME_V1_SHADOW_BLUR,
    val shadowOffsetY: Float = KeyboardDesignSystemMapping.THEME_V1_SHADOW_OFFSET_Y,
    val pressEffect: String = "none",
    val effectIntensity: Float = KeyboardDesignSystemMapping.THEME_V1_EFFECT_INTENSITY,
    val effectDurationMs: Int = KeyboardDesignSystemMapping.THEME_V1_PRESS_DURATION_MS,
    val effectEasing: String = "easeOut",
) {
    fun toMap(): Map<String, Any?> {
        return mapOf(
            "version" to version,
            "presetId" to presetId,
            "backgroundStartColor" to backgroundStartColor,
            "backgroundEndColor" to backgroundEndColor,
            "useGradient" to useGradient,
            "gradientStyle" to gradientStyle,
            "useImage" to useImage,
            "backgroundImagePath" to backgroundImagePath,
            "keyboardOpacity" to keyboardOpacity,
            "keyColor" to keyColor,
            "specialKeyColor" to specialKeyColor,
            "activeKeyColor" to activeKeyColor,
            "pressedKeyColor" to pressedKeyColor,
            "pressHighlightDurationMs" to pressHighlightDurationMs,
            "textColor" to textColor,
            "cornerTextColor" to cornerTextColor,
            "cornerTextOpacity" to cornerTextOpacity,
            "statusTextColor" to statusTextColor,
            "borderColor" to borderColor,
            "borderWidth" to borderWidth,
            "keyReliefEnabled" to keyReliefEnabled,
            "keyReliefDepth" to keyReliefDepth,
            "keyRadius" to keyRadius,
            "keyHorizontalGap" to keyHorizontalGap,
            "rowVerticalGap" to rowVerticalGap,
            "shadowColor" to shadowColor,
            "shadowBlur" to shadowBlur,
            "shadowOffsetY" to shadowOffsetY,
            "pressEffect" to pressEffect,
            "effectIntensity" to effectIntensity,
            "effectDurationMs" to effectDurationMs,
            "effectEasing" to effectEasing,
        )
    }

    fun toJson(): String = JSONObject(toMap()).toString()

    fun validated(): KeyboardThemeConfig {
        val normalizedPath = backgroundImagePath?.trim().orEmpty().ifBlank { null }
        val normalizedPresetId =
            when (presetId) {
                KeyboardThemePresets.COMMANDGLOWS_LIGHT, KeyboardThemePresets.COMMANDGLOWS_DARK -> KeyboardThemePresets.COMMANDGLOWS
                else -> presetId
            }
        return copy(
            version = version.coerceAtLeast(1),
            presetId = normalizedPresetId,
            gradientStyle = if (gradientStyle in allowedGradientStyles) gradientStyle else "linear",
            borderWidth = borderWidth.coerceIn(0f, 4f),
            keyReliefDepth = keyReliefDepth.coerceIn(0f, 6f),
            keyRadius = keyRadius.coerceIn(0f, 24f),
            keyHorizontalGap = keyHorizontalGap.snapToImeGrid(max = 16f),
            rowVerticalGap = rowVerticalGap.snapToImeGrid(max = 16f),
            keyWidthScale = 1f,
            keyboardOpacity = keyboardOpacity.coerceIn(KEYBOARD_OPACITY_MIN, 1f),
            shadowBlur = shadowBlur.coerceIn(0f, 18f),
            shadowOffsetY = shadowOffsetY.coerceIn(-4f, 10f),
            effectIntensity = effectIntensity.coerceIn(0f, 1f),
            pressHighlightDurationMs = pressHighlightDurationMs.coerceIn(0, 1200),
            cornerTextOpacity = cornerTextOpacity.coerceIn(0f, 0.85f),
            effectDurationMs = effectDurationMs.coerceIn(80, 600),
            pressEffect = normalizedPressEffect(pressEffect),
            effectEasing = if (effectEasing in allowedEasings) effectEasing else "easeOut",
            useImage = useImage && normalizedPath != null,
            backgroundImagePath = normalizedPath,
        )
    }

    companion object {
        private const val KEYBOARD_OPACITY_MIN = 0.25f
        private val allowedEffects =
            setOf(
                "none",
                "scale",
                "pulse",
                "shake",
                "ripple",
                "garland",
                "glow",
                "electricArc",
                "specularSweep",
                "inkPress",
                "keycapTilt",
                "edgeCompression",
                "confettiLite",
                "fireworksLite",
                "waterSplash",
                "emberBurst",
                "dragonTrail",
                "spiderTrail",
            )
        private fun normalizedPressEffect(effect: String): String {
            val normalized =
                when (effect) {
                    "glow" -> "garland"
                    else -> effect
                }
            return if (normalized in allowedEffects) normalized else "none"
        }
        private val allowedGradientStyles = setOf("linear", "radial")
        private val allowedEasings = setOf("easeOut", "linear", "spring")

        fun fromJson(raw: String?): KeyboardThemeConfig {
            if (raw.isNullOrBlank()) {
                return KeyboardThemeConfig()
            }
            return runCatching {
                val json = JSONObject(raw)
                fromMap(
                    mapOf(
                        "version" to json.optInt("version", 1),
                        "presetId" to json.optString("presetId", "system"),
                        "backgroundStartColor" to json.optInt("backgroundStartColor", KeyboardDesignSystemMapping.THEME_V1_BACKGROUND),
                        "backgroundEndColor" to json.optInt("backgroundEndColor", KeyboardDesignSystemMapping.THEME_V1_BACKGROUND),
                        "useGradient" to json.optBoolean("useGradient", false),
                        "gradientStyle" to json.optString("gradientStyle", "linear"),
                        "useImage" to json.optBoolean("useImage", false),
                        "backgroundImagePath" to json.optString("backgroundImagePath", ""),
                        "keyboardOpacity" to json.optDouble("keyboardOpacity", KeyboardDesignSystemMapping.THEME_V1_KEYBOARD_OPACITY.toDouble()),
                        "keyColor" to json.optInt("keyColor", KeyboardDesignSystemMapping.THEME_V1_KEY),
                        "specialKeyColor" to json.optInt("specialKeyColor", KeyboardDesignSystemMapping.THEME_V1_SPECIAL_KEY),
                        "activeKeyColor" to json.optInt("activeKeyColor", KeyboardDesignSystemMapping.THEME_V1_ACTIVE_KEY),
                        "pressedKeyColor" to json.optInt("pressedKeyColor", KeyboardDesignSystemMapping.THEME_V1_PRESSED_KEY),
                        "pressHighlightDurationMs" to json.optInt("pressHighlightDurationMs", KeyboardDesignSystemMapping.THEME_V1_PRESS_DURATION_MS),
                        "textColor" to json.optInt("textColor", KeyboardDesignSystemMapping.THEME_V1_TEXT),
                        "cornerTextColor" to json.optInt("cornerTextColor", KeyboardDesignSystemMapping.THEME_V1_CORNER_TEXT),
                        "cornerTextOpacity" to json.optDouble("cornerTextOpacity", KeyboardDesignSystemMapping.THEME_V1_CORNER_TEXT_OPACITY.toDouble()),
                        "statusTextColor" to json.optInt("statusTextColor", KeyboardDesignSystemMapping.THEME_V1_STATUS_TEXT),
                        "borderColor" to json.optInt("borderColor", KeyboardDesignSystemMapping.THEME_V1_BORDER),
                        "borderWidth" to json.optDouble("borderWidth", KeyboardDesignSystemMapping.THEME_V1_BORDER_WIDTH.toDouble()),
                        "keyReliefEnabled" to json.optBoolean("keyReliefEnabled", false),
                        "keyReliefDepth" to json.optDouble("keyReliefDepth", KeyboardDesignSystemMapping.THEME_V1_KEY_RELIEF_DEPTH.toDouble()),
                        "keyRadius" to json.optDouble("keyRadius", KeyboardDesignSystemMapping.THEME_V1_KEY_RADIUS.toDouble()),
                        "keyHorizontalGap" to json.optDouble("keyHorizontalGap", KeyboardDesignSystemMapping.THEME_V1_GRID_GAP.toDouble()),
                        "rowVerticalGap" to json.optDouble("rowVerticalGap", KeyboardDesignSystemMapping.THEME_V1_GRID_GAP.toDouble()),
                        "shadowColor" to json.optInt("shadowColor", KeyboardDesignSystemMapping.THEME_V1_SHADOW),
                        "shadowBlur" to json.optDouble("shadowBlur", KeyboardDesignSystemMapping.THEME_V1_SHADOW_BLUR.toDouble()),
                        "shadowOffsetY" to json.optDouble("shadowOffsetY", KeyboardDesignSystemMapping.THEME_V1_SHADOW_OFFSET_Y.toDouble()),
                        "pressEffect" to json.optString("pressEffect", "none"),
                        "effectIntensity" to json.optDouble("effectIntensity", KeyboardDesignSystemMapping.THEME_V1_EFFECT_INTENSITY.toDouble()),
                        "effectDurationMs" to json.optInt("effectDurationMs", KeyboardDesignSystemMapping.THEME_V1_PRESS_DURATION_MS),
                        "effectEasing" to json.optString("effectEasing", "easeOut"),
                    ),
                )
            }.getOrElse { KeyboardThemeConfig() }
        }

        fun fromMap(raw: Map<*, *>): KeyboardThemeConfig {
            val config =
                KeyboardThemeConfig(
                    version = (raw["version"] as? Number)?.toInt() ?: 1,
                    presetId = (raw["presetId"] as? String)?.ifBlank { "system" } ?: "system",
                    backgroundStartColor = (raw["backgroundStartColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_BACKGROUND,
                    backgroundEndColor = (raw["backgroundEndColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_BACKGROUND,
                    useGradient = raw["useGradient"] as? Boolean ?: false,
                    gradientStyle = (raw["gradientStyle"] as? String)?.ifBlank { "linear" } ?: "linear",
                    useImage = raw["useImage"] as? Boolean ?: false,
                    backgroundImagePath = (raw["backgroundImagePath"] as? String)?.ifBlank { null },
                    keyboardOpacity = (raw["keyboardOpacity"] as? Number)?.toFloat() ?: 1f,
                    keyColor = (raw["keyColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_KEY,
                    specialKeyColor = (raw["specialKeyColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_SPECIAL_KEY,
                    activeKeyColor = (raw["activeKeyColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_ACTIVE_KEY,
                    pressedKeyColor = (raw["pressedKeyColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_PRESSED_KEY,
                    pressHighlightDurationMs = (raw["pressHighlightDurationMs"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_PRESS_DURATION_MS,
                    textColor = (raw["textColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_TEXT,
                    cornerTextColor = (raw["cornerTextColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_CORNER_TEXT,
                    cornerTextOpacity = (raw["cornerTextOpacity"] as? Number)?.toFloat() ?: 0.85f,
                    statusTextColor = (raw["statusTextColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_STATUS_TEXT,
                    borderColor = (raw["borderColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_BORDER,
                    borderWidth = (raw["borderWidth"] as? Number)?.toFloat() ?: 0f,
                    keyReliefEnabled = raw["keyReliefEnabled"] as? Boolean ?: false,
                    keyReliefDepth = (raw["keyReliefDepth"] as? Number)?.toFloat() ?: 2f,
                    keyRadius = (raw["keyRadius"] as? Number)?.toFloat() ?: 8f,
                    keyHorizontalGap = (raw["keyHorizontalGap"] as? Number)?.toFloat() ?: 4f,
                    rowVerticalGap = (raw["rowVerticalGap"] as? Number)?.toFloat() ?: 4f,
                    keyWidthScale = 1f,
                    shadowColor = (raw["shadowColor"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_SHADOW,
                    shadowBlur = (raw["shadowBlur"] as? Number)?.toFloat() ?: 4f,
                    shadowOffsetY = (raw["shadowOffsetY"] as? Number)?.toFloat() ?: 1f,
                    pressEffect = (raw["pressEffect"] as? String)?.ifBlank { "none" } ?: "none",
                    effectIntensity = (raw["effectIntensity"] as? Number)?.toFloat() ?: 0.35f,
                    effectDurationMs = (raw["effectDurationMs"] as? Number)?.toInt() ?: KeyboardDesignSystemMapping.THEME_V1_PRESS_DURATION_MS,
                    effectEasing = (raw["effectEasing"] as? String)?.ifBlank { "easeOut" } ?: "easeOut",
                )
            return config.validated()
        }

        private fun Float.snapToImeGrid(max: Float): Float {
            val clamped = coerceIn(0f, max)
            return (clamped / 4f).roundToInt() * 4f
        }
    }
}
