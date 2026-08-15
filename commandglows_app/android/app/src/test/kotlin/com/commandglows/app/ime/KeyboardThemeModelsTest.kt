package com.commandglows.app.ime

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.json.JSONArray
import org.json.JSONObject

class KeyboardThemeModelsTest {
    @Test
    fun `shared fixture freezes native mappings preset ids and v1 json`() {
        val fixture = loadDesignSystemFixture()
        val frozenPresetIds = fixture.getJSONArray("presetIds").toStringList()

        assertEquals(frozenPresetIds, KeyboardThemePresets.all.map { it.id })
        assertEquals(
            KeyboardDesignSystemMapping.THEME_V1_ACTIVE_KEY,
            KeyboardThemeConfig().activeKeyColor,
        )

        val frozenTheme = fixture.getJSONObject("themeV1")
        val parsed = KeyboardThemeConfig.fromJson(frozenTheme.toString())
        val roundTrip = JSONObject(parsed.toJson())
        assertEquals(frozenTheme.toCanonicalMap(), roundTrip.toCanonicalMap())
    }

    @Test
    fun `shared fixture retains cloud revisions checksums and theme payloads`() {
        val fixture = loadDesignSystemFixture()

        for (name in listOf("syncV1", "syncV2")) {
            val frozen = fixture.getJSONObject(name)
            val before = frozen.toCanonicalMap()
            val after = JSONObject(frozen.toString()).toCanonicalMap()

            assertEquals(before, after)
            assertTrue(frozen.getInt("profileRevision") > frozen.getInt("baseCloudRevision"))
            assertEquals(64, frozen.getString("checksum").length)
            assertTrue(frozen.getJSONObject("payload").has("themeConfig"))
        }
    }

    @Test
    fun `falls back from corrupt json`() {
        val config = KeyboardThemeConfig.fromJson("{not-json")

        assertEquals("system", config.presetId)
        assertEquals("none", config.pressEffect)
    }

    @Test
    fun `clamps effect config and unknown effect`() {
        val config =
            KeyboardThemeConfig.fromMap(
                mapOf(
                    "pressEffect" to "expensive",
                    "effectIntensity" to 2.4,
                    "pressHighlightDurationMs" to 3000,
                    "cornerTextOpacity" to 1.0,
                    "effectDurationMs" to 2000,
                    "gradientStyle" to "spiral",
                    "effectEasing" to "bounce",
                    "borderWidth" to 99,
                    "keyRadius" to 99,
                    "shadowBlur" to 99,
                    "keyboardOpacity" to -1,
                ),
            )

        assertEquals("none", config.pressEffect)
        assertEquals(1f, config.effectIntensity)
        assertEquals(1200, config.pressHighlightDurationMs)
        assertEquals(0.85f, config.cornerTextOpacity)
        assertEquals(600, config.effectDurationMs)
        assertEquals("linear", config.gradientStyle)
        assertEquals("easeOut", config.effectEasing)
        assertEquals(4f, config.borderWidth)
        assertEquals(24f, config.keyRadius)
        assertEquals(18f, config.shadowBlur)
        assertEquals(0.25f, config.keyboardOpacity)
    }

    @Test
    fun `round trips advanced theme fields`() {
        val config =
            KeyboardThemeConfig(
                presetId = "midnight_aurora",
                useGradient = true,
                gradientStyle = "radial",
                borderWidth = 1.5f,
                keyRadius = 14f,
                keyHorizontalGap = 10f,
                rowVerticalGap = 5f,
                shadowBlur = 9f,
                shadowOffsetY = 2f,
                pressHighlightDurationMs = 850,
                cornerTextOpacity = 0.5f,
                keyboardOpacity = 0.55f,
                effectEasing = "spring",
            )

        val parsed = KeyboardThemeConfig.fromJson(config.toJson())

        assertEquals("radial", parsed.gradientStyle)
        assertEquals(1.5f, parsed.borderWidth)
        assertEquals(14f, parsed.keyRadius)
        assertEquals(12f, parsed.keyHorizontalGap)
        assertEquals(4f, parsed.rowVerticalGap)
        assertEquals(9f, parsed.shadowBlur)
        assertEquals(2f, parsed.shadowOffsetY)
        assertEquals(850, parsed.pressHighlightDurationMs)
        assertEquals(0.5f, parsed.cornerTextOpacity)
        assertEquals(0.55f, parsed.keyboardOpacity)
        assertEquals("spring", parsed.effectEasing)
    }

    @Test
    fun `preset palette switches variants while preserving non color overrides`() {
        val config =
            KeyboardThemePresets
                .configFor(KeyboardThemePresets.GLASS_MINT)
                .copy(
                    keyReliefEnabled = true,
                    keyReliefDepth = 4f,
                    keyboardOpacity = 0.72f,
                    pressEffect = "keycapTilt",
                )
        val dark = KeyboardThemePresets.resolveVariantForMode(config, dark = true)
        val darkPreset = KeyboardThemePresets.configFor(KeyboardThemePresets.GLASS_MINT, dark = true)

        assertEquals(KeyboardThemePresets.GLASS_MINT, dark.presetId)
        assertEquals(darkPreset.backgroundStartColor, dark.backgroundStartColor)
        assertEquals(darkPreset.keyColor, dark.keyColor)
        assertEquals(darkPreset.textColor, dark.textColor)
        assertTrue(dark.keyReliefEnabled)
        assertEquals(4f, dark.keyReliefDepth)
        assertEquals(0.72f, dark.keyboardOpacity)
        assertEquals("keycapTilt", dark.pressEffect)

        val light = KeyboardThemePresets.resolveVariantForMode(dark, dark = false)
        assertEquals(config.backgroundStartColor, light.backgroundStartColor)
        assertTrue(light.keyReliefEnabled)
    }

    @Test
    fun `custom palette does not get replaced by preset variant`() {
        val config =
            KeyboardThemePresets
                .configFor(KeyboardThemePresets.GLASS_MINT)
                .copy(keyColor = 0xFF123456.toInt())

        val resolved = KeyboardThemePresets.resolveVariantForMode(config, dark = true)

        assertEquals(0xFF123456.toInt(), resolved.keyColor)
        assertEquals(config.backgroundStartColor, resolved.backgroundStartColor)
    }

    @Test
    fun `ignores legacy key width scale`() {
        val config = KeyboardThemeConfig.fromMap(mapOf("keyWidthScale" to 0.75))

        assertEquals(1f, config.keyWidthScale)
        assertFalse(config.toMap().containsKey("keyWidthScale"))
    }

    @Test
    fun `image flag requires a path`() {
        val config = KeyboardThemeConfig.fromMap(mapOf("useImage" to true))

        assertFalse(config.useImage)
    }

    @Test
    fun `private mode disables press effects`() {
        val config = KeyboardThemeConfig(pressEffect = "spiderTrail")

        assertEquals("none", KeyboardPressEffectPolicy.resolve(config, privateMode = true).effect)
        assertEquals("spiderTrail", KeyboardPressEffectPolicy.resolve(config, privateMode = false).effect)
    }

    @Test
    fun `press effects cap active queue`() {
        val effects = KeyboardPressEffects(density = 1f, clock = { 100L })
        repeat(10) { index ->
            assertTrue(
                effects.trigger(
                    keyId = "key-$index",
                    rect = android.graphics.RectF(0f, 0f, 40f, 40f),
                    spec =
                        KeyboardPressEffectSpec(
                            "confettiLite",
                            durationMs = 100,
                            intensity = 1f,
                            easing = "easeOut",
                        ),
                ),
            )
        }

        assertEquals(8, effects.activeCountForTest())
    }
}

private fun loadDesignSystemFixture(): JSONObject {
    val stream =
        checkNotNull(
            KeyboardThemeModelsTest::class.java.classLoader
                ?.getResourceAsStream("fixtures/design_system_app_native_v1.json"),
        )
    return stream.bufferedReader(Charsets.UTF_8).use { JSONObject(it.readText()) }
}

private fun JSONArray.toStringList(): List<String> =
    (0 until length()).map { index -> getString(index) }

private fun JSONObject.toCanonicalMap(): Map<String, Any?> =
    keys().asSequence().sorted().associateWith { key -> get(key).toCanonicalValue() }

private fun JSONArray.toCanonicalList(): List<Any?> =
    (0 until length()).map { index -> get(index).toCanonicalValue() }

private fun Any?.toCanonicalValue(): Any? =
    when (this) {
        is JSONObject -> toCanonicalMap()
        is JSONArray -> toCanonicalList()
        is Number -> toDouble()
        JSONObject.NULL -> null
        else -> this
    }
