package com.commandglows.app.ime

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import kotlin.math.atan2
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

data class KeyboardPressEffectSpec(
    val effect: String,
    val durationMs: Int,
    val intensity: Float,
    val easing: String,
)

object KeyboardPressEffectPolicy {
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

    fun resolve(config: KeyboardThemeConfig, privateMode: Boolean): KeyboardPressEffectSpec {
        val effect =
            if (privateMode || config.pressEffect !in allowedEffects) {
                "none"
            } else {
                config.pressEffect
            }
        return KeyboardPressEffectSpec(
            effect = effect,
            durationMs = config.effectDurationMs.coerceIn(80, 600),
            intensity = config.effectIntensity.coerceIn(0f, 1f),
            easing = config.effectEasing,
        )
    }
}

class KeyboardPressEffects(
    private val density: Float,
    private val clock: () -> Long,
) {
    private val emittedEffects = setOf("ripple", "confettiLite", "fireworksLite", "waterSplash", "emberBurst")
    private val mascotEffects = setOf("dragonTrail", "spiderTrail")

    private data class Particle(
        val angle: Float,
        val speed: Float,
        val color: Int,
        val size: Float = 3.8f,
    )

    private data class TrailPoint(
        val x: Float,
        val y: Float,
        val createdAtMs: Long,
    )

    private data class MascotState(
        val effect: String,
        val currentX: Float,
        val currentY: Float,
        val targetX: Float,
        val targetY: Float,
        val startedAtMs: Long,
        val lastFrameAtMs: Long,
        val spec: KeyboardPressEffectSpec,
        val trail: List<TrailPoint>,
    )

    private data class ActiveEffect(
        val keyId: String,
        val rect: RectF,
        val anchorX: Float,
        val anchorY: Float,
        val spec: KeyboardPressEffectSpec,
        val startedAtMs: Long,
        val particles: List<Particle>,
    )

    private val effects = ArrayDeque<ActiveEffect>()
    private var mascot: MascotState? = null

    private val fillPaint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
        }
    private val strokePaint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 2f * density
        }
    private val path = Path()

    fun trigger(
        keyId: String,
        rect: RectF,
        spec: KeyboardPressEffectSpec,
    ): Boolean {
        if (spec.effect in mascotEffects) {
            triggerMascot(rect, spec)
            return true
        }
        if (spec.effect == "none" || spec.effect !in emittedEffects) {
            return false
        }
        while (effects.size >= 8) {
            effects.removeFirst()
        }
        effects.addLast(
            ActiveEffect(
                keyId = keyId,
                rect = RectF(rect),
                anchorX = rect.right - rect.width() * 0.24f,
                anchorY = rect.top + rect.height() * 0.22f,
                spec = spec,
                startedAtMs = clock(),
                particles = particlesFor(spec),
            ),
        )
        return true
    }

    fun draw(
        canvas: Canvas,
        keyRadius: Float,
        accentColor: Int,
    ): Boolean {
        var hasActive = false
        val now = clock()
        val iterator = effects.iterator()
        while (iterator.hasNext()) {
            val effect = iterator.next()
            val elapsed = now - effect.startedAtMs
            if (elapsed >= effect.spec.durationMs) {
                iterator.remove()
                continue
            }
            hasActive = true
            val progress = (elapsed.toFloat() / effect.spec.durationMs).coerceIn(0f, 1f)
            drawEffect(canvas, effect, progress, keyRadius, accentColor)
        }
        if (drawMascot(canvas, now, accentColor)) {
            hasActive = true
        }
        return hasActive
    }

    fun activeCountForTest(): Int = effects.size

    fun mascotPressFactor(rect: RectF): Float {
        val state = mascot ?: return 0f
        if (state.effect !in mascotEffects) return 0f
        val expanded = RectF(rect).apply {
            inset(-rect.width() * MASCOT_PRESS_EXPANSION, -rect.height() * MASCOT_PRESS_EXPANSION)
        }
        if (!expanded.contains(state.currentX, state.currentY)) {
            return 0f
        }
        val dx = (state.currentX - rect.centerX()) / rect.width().coerceAtLeast(1f)
        val dy = (state.currentY - rect.centerY()) / rect.height().coerceAtLeast(1f)
        val normalizedDistance = kotlin.math.hypot(dx.toDouble(), dy.toDouble()).toFloat()
        return (1f - normalizedDistance * 1.8f).coerceIn(0f, 1f)
    }

    private fun drawEffect(
        canvas: Canvas,
        effect: ActiveEffect,
        progress: Float,
        keyRadius: Float,
        accentColor: Int,
    ) {
        when (effect.spec.effect) {
            "scale" -> drawScale(canvas, effect, progress, keyRadius, accentColor)
            "pulse" -> drawPulse(canvas, effect, progress, keyRadius, accentColor)
            "shake" -> drawShake(canvas, effect, progress, keyRadius, accentColor)
            "ripple" -> drawRipple(canvas, effect, progress, accentColor)
            "garland",
            "glow",
            -> drawGlow(canvas, effect, progress, keyRadius, accentColor)
            "confettiLite",
            "waterSplash",
            "emberBurst",
            "fireworksLite",
            -> drawParticles(canvas, effect, progress)
        }
    }

    private fun drawScale(
        canvas: Canvas,
        effect: ActiveEffect,
        progress: Float,
        keyRadius: Float,
        accentColor: Int,
    ) {
        val eased = easedProgress(effect.spec, progress)
        val inset = -SCALE_EXPANSION_DP * density * effect.spec.intensity.coerceAtLeast(0.35f) * (1f - eased)
        val rect = RectF(effect.rect).apply { inset(inset, inset) }
        fillPaint.color = alphaColor(accentColor, (135 * (1f - progress)).toInt())
        canvas.drawRoundRect(rect, keyRadius, keyRadius, fillPaint)
    }

    private fun drawPulse(
        canvas: Canvas,
        effect: ActiveEffect,
        progress: Float,
        keyRadius: Float,
        accentColor: Int,
    ) {
        val rect = RectF(effect.rect).apply {
            val inset = -PULSE_EXPANSION_DP * density * effect.spec.intensity.coerceAtLeast(0.35f) * progress
            inset(inset, inset)
        }
        strokePaint.color = alphaColor(accentColor, (210 * (1f - progress)).toInt())
        strokePaint.strokeWidth = max(2f * density, 5f * density * (1f - progress))
        canvas.drawRoundRect(rect, keyRadius, keyRadius, strokePaint)
    }

    private fun drawShake(
        canvas: Canvas,
        effect: ActiveEffect,
        progress: Float,
        keyRadius: Float,
        accentColor: Int,
    ) {
        val offset = ((if ((progress * 10).toInt() % 2 == 0) 1 else -1) * 9f * density * effect.spec.intensity.coerceAtLeast(0.35f) * (1f - progress))
        val rect = RectF(effect.rect).apply { offset(offset, 0f) }
        strokePaint.color = alphaColor(accentColor, (210 * (1f - progress)).toInt())
        strokePaint.strokeWidth = 4f * density
        canvas.drawRoundRect(rect, keyRadius, keyRadius, strokePaint)
    }

    private fun drawRipple(
        canvas: Canvas,
        effect: ActiveEffect,
        progress: Float,
        accentColor: Int,
    ) {
        strokePaint.color = alphaColor(accentColor, (220 * (1f - progress)).toInt())
        strokePaint.strokeWidth = max(1.4f * density, 3.6f * density * (1f - progress))
        val save = canvas.save()
        canvas.clipRect(effect.rect)
        val inset = -effect.rect.width() * 0.10f * progress
        val rect = RectF(effect.rect).apply { inset(inset, inset * 0.55f) }
        canvas.drawRoundRect(rect, 8f * density, 8f * density, strokePaint)
        canvas.restoreToCount(save)
    }

    private fun drawGlow(
        canvas: Canvas,
        effect: ActiveEffect,
        progress: Float,
        keyRadius: Float,
        accentColor: Int,
    ) {
        val rect = RectF(effect.rect).apply { inset(-8f * density, -8f * density) }
        fillPaint.color = alphaColor(accentColor, (115 * (1f - progress)).toInt())
        canvas.drawRoundRect(rect, keyRadius, keyRadius, fillPaint)
    }

    private fun drawParticles(
        canvas: Canvas,
        effect: ActiveEffect,
        progress: Float,
    ) {
        val save = canvas.save()
        canvas.clipRect(effect.rect)
        effect.particles.forEach { particle ->
            val distance = particle.speed * density * easedProgress(effect.spec, progress) * 0.42f
            fillPaint.color = alphaColor(particle.color, (180 * (1f - progress)).toInt())
            canvas.drawCircle(
                effect.anchorX + cos(particle.angle) * distance,
                effect.anchorY + sin(particle.angle) * distance,
                particle.size * density * (1f - progress * 0.45f),
                fillPaint,
            )
        }
        canvas.restoreToCount(save)
    }

    private fun particlesFor(spec: KeyboardPressEffectSpec): List<Particle> {
        val count =
            when (spec.effect) {
                "fireworksLite" -> (8 + spec.intensity * 10).toInt().coerceAtMost(18)
                "waterSplash" -> (6 + spec.intensity * 8).toInt().coerceAtMost(14)
                "emberBurst" -> (7 + spec.intensity * 9).toInt().coerceAtMost(16)
                else -> (5 + spec.intensity * 7).toInt().coerceAtMost(12)
            }
        val palette =
            when (spec.effect) {
                "waterSplash" -> WATER_SPLASH_PALETTE
                "emberBurst" -> EMBER_BURST_PALETTE
                else -> CELEBRATION_PALETTE
            }
        return List(count) { index ->
            Particle(
                angle = ((PI * 2.0 * index) / count).toFloat(),
                speed =
                    when (spec.effect) {
                        "waterSplash" -> 20f + (index % 5) * 5f + spec.intensity * 20f
                        "emberBurst" -> 18f + (index % 4) * 8f + spec.intensity * 24f
                        else -> 24f + (index % 4) * 7f + spec.intensity * 22f
                    },
                color = palette[index % palette.size],
                size =
                    when (spec.effect) {
                        "waterSplash" -> 2.4f + (index % 3) * 0.8f
                        "emberBurst" -> 2.2f + (index % 4) * 0.7f
                        else -> 3.8f
                    },
            )
        }
    }

    private fun triggerMascot(
        rect: RectF,
        spec: KeyboardPressEffectSpec,
    ) {
        val now = clock()
        val targetX = rect.centerX()
        val targetY = rect.centerY()
        val current = mascot
        val trail =
            current?.trail
                ?.takeLast(MAX_TRAIL_POINTS - 1)
                ?.plus(TrailPoint(current.currentX, current.currentY, now))
                ?: listOf(TrailPoint(targetX, targetY, now))
        mascot =
            MascotState(
                effect = spec.effect,
                currentX = current?.currentX ?: targetX,
                currentY = current?.currentY ?: targetY,
                targetX = targetX,
                targetY = targetY,
                startedAtMs = now,
                lastFrameAtMs = now,
                spec = spec,
                trail = trail,
            )
    }

    private fun drawMascot(
        canvas: Canvas,
        now: Long,
        accentColor: Int,
    ): Boolean {
        val state = mascot ?: return false
        val age = now - state.startedAtMs
        val dx = state.targetX - state.currentX
        val dy = state.targetY - state.currentY
        val distance = kotlin.math.hypot(dx.toDouble(), dy.toDouble()).toFloat()
        if (distance < density && age > state.spec.durationMs) {
            mascot = null
            return false
        }
        val frameMs = (now - state.lastFrameAtMs).coerceIn(8L, 32L)
        val speed = (0.42f + state.spec.intensity.coerceIn(0.15f, 1f) * 0.50f) * density * frameMs
        val step = min(distance, speed)
        val nextX = if (distance > 0f) state.currentX + dx / distance * step else state.targetX
        val nextY = if (distance > 0f) state.currentY + dy / distance * step else state.targetY
        val freshTrail =
            (state.trail + TrailPoint(nextX, nextY, now))
                .filter { now - it.createdAtMs <= TRAIL_TTL_MS }
                .takeLast(MAX_TRAIL_POINTS)
        val updated =
            state.copy(
                currentX = nextX,
                currentY = nextY,
                lastFrameAtMs = now,
                trail = freshTrail,
            )
        mascot = updated
        drawMascotTrail(canvas, updated, now, accentColor)
        drawMascotBody(canvas, updated, accentColor)
        return true
    }

    private fun drawMascotTrail(
        canvas: Canvas,
        state: MascotState,
        now: Long,
        accentColor: Int,
    ) {
        if (state.trail.size < 2) return
        path.reset()
        state.trail.first().let { path.moveTo(it.x, it.y) }
        state.trail.drop(1).forEach { path.lineTo(it.x, it.y) }
        strokePaint.style = Paint.Style.STROKE
        strokePaint.strokeCap = Paint.Cap.ROUND
        strokePaint.strokeJoin = Paint.Join.ROUND
        strokePaint.strokeWidth = if (state.effect == "spiderTrail") 1.4f * density else 2.6f * density
        val newestAge = now - state.trail.last().createdAtMs
        val alpha = (190 - newestAge * 190 / TRAIL_TTL_MS).toInt().coerceIn(45, 190)
        strokePaint.color =
            if (state.effect == "spiderTrail") {
                alphaColor(Color.WHITE, alpha)
            } else {
                alphaColor(accentColor, alpha)
            }
        canvas.drawPath(path, strokePaint)
        if (state.effect == "spiderTrail") {
            drawSpiderWeb(canvas, state, now)
        } else {
            drawDragonSparks(canvas, state, now)
        }
        strokePaint.strokeCap = Paint.Cap.BUTT
    }

    private fun drawDragonSparks(
        canvas: Canvas,
        state: MascotState,
        now: Long,
    ) {
        if (state.trail.size < 3) return
        val visibleTrail = state.trail.take(state.trail.size - 1)
        visibleTrail.forEachIndexed { index, point ->
            if (index % 2 != 0) return@forEachIndexed
            val age = now - point.createdAtMs
            val alpha = (210 - age * 210 / TRAIL_TTL_MS).toInt().coerceIn(0, 210)
            if (alpha <= 24) return@forEachIndexed
            val previous = visibleTrail.getOrNull((index - 1).coerceAtLeast(0)) ?: point
            val next = visibleTrail.getOrNull(index + 1) ?: point
            val segmentDx = next.x - previous.x
            val segmentDy = next.y - previous.y
            val length = kotlin.math.hypot(segmentDx.toDouble(), segmentDy.toDouble()).toFloat().coerceAtLeast(1f)
            val normalX = -segmentDy / length
            val normalY = segmentDx / length
            val side = if (index % 4 == 0) 1f else -1f
            val sparkX = point.x + normalX * side * 3.8f * density
            val sparkY = point.y + normalY * side * 3.8f * density
            fillPaint.color = alphaColor(EMBER_BURST_PALETTE[index % EMBER_BURST_PALETTE.size], alpha)
            canvas.drawCircle(sparkX, sparkY, (1.3f + (index % 3) * 0.45f) * density, fillPaint)
        }
    }

    private fun drawSpiderWeb(
        canvas: Canvas,
        state: MascotState,
        now: Long,
    ) {
        if (state.trail.size < 4) return
        strokePaint.strokeWidth = 0.85f * density
        state.trail.windowed(2).forEachIndexed { index, pair ->
            if (index % 3 != 1) return@forEachIndexed
            val start = pair[0]
            val end = pair[1]
            val age = now - end.createdAtMs
            val alpha = (150 - age * 150 / TRAIL_TTL_MS).toInt().coerceIn(0, 150)
            if (alpha <= 18) return@forEachIndexed
            val dx = end.x - start.x
            val dy = end.y - start.y
            val length = kotlin.math.hypot(dx.toDouble(), dy.toDouble()).toFloat().coerceAtLeast(1f)
            val normalX = -dy / length
            val normalY = dx / length
            val midX = (start.x + end.x) * 0.5f
            val midY = (start.y + end.y) * 0.5f
            val halfSpan = (3.2f + (index % 2) * 1.2f) * density
            strokePaint.color = alphaColor(Color.WHITE, alpha)
            canvas.drawLine(
                midX - normalX * halfSpan,
                midY - normalY * halfSpan,
                midX + normalX * halfSpan,
                midY + normalY * halfSpan,
                strokePaint,
            )
        }
    }

    private fun drawMascotBody(
        canvas: Canvas,
        state: MascotState,
        accentColor: Int,
    ) {
        val angle = atan2((state.targetY - state.currentY), (state.targetX - state.currentX))
        val size = (5.5f + state.spec.intensity.coerceIn(0f, 1f) * 3.0f) * density
        drawMascotShadow(canvas, state, size, accentColor)
        canvas.save()
        canvas.translate(state.currentX, state.currentY)
        canvas.rotate((angle * 180f / PI).toFloat())
        if (state.effect == "spiderTrail") {
            drawSpider(canvas, size)
        } else {
            drawDragon(canvas, size, accentColor)
        }
        canvas.restore()
    }

    private fun drawMascotShadow(
        canvas: Canvas,
        state: MascotState,
        size: Float,
        accentColor: Int,
    ) {
        val shadowWidth = if (state.effect == "spiderTrail") size * 1.22f else size * 1.65f
        val shadowHeight = if (state.effect == "spiderTrail") size * 0.34f else size * 0.42f
        val shadowAlpha = if (state.effect == "spiderTrail") 78 else 92
        fillPaint.color =
            if (state.effect == "spiderTrail") {
                Color.argb(shadowAlpha, 0, 0, 0)
            } else {
                Color.argb(
                    shadowAlpha,
                    Color.red(accentColor) / 3,
                    Color.green(accentColor) / 4,
                    Color.blue(accentColor) / 5,
                )
            }
        canvas.drawOval(
            RectF(
                state.currentX - shadowWidth * 0.5f,
                state.currentY + size * 0.34f,
                state.currentX + shadowWidth * 0.5f,
                state.currentY + size * 0.34f + shadowHeight,
            ),
            fillPaint,
        )
    }

    private fun drawDragon(
        canvas: Canvas,
        size: Float,
        accentColor: Int,
    ) {
        fillPaint.color = alphaColor(accentColor, 230)
        path.reset()
        path.moveTo(size * 1.25f, 0f)
        path.lineTo(-size * 0.85f, -size * 0.58f)
        path.lineTo(-size * 0.34f, 0f)
        path.lineTo(-size * 0.85f, size * 0.58f)
        path.close()
        canvas.drawPath(path, fillPaint)
        fillPaint.color = alphaColor(Color.WHITE, 210)
        canvas.drawCircle(size * 0.48f, -size * 0.16f, size * 0.13f, fillPaint)
    }

    private fun drawSpider(
        canvas: Canvas,
        size: Float,
    ) {
        strokePaint.color = alphaColor(Color.WHITE, 210)
        strokePaint.strokeWidth = 1.15f * density
        for (index in 0 until 4) {
            val y = (-0.45f + index * 0.30f) * size
            canvas.drawLine(-size * 0.15f, y, -size * 0.95f, y - size * 0.28f, strokePaint)
            canvas.drawLine(size * 0.15f, y, size * 0.95f, y - size * 0.28f, strokePaint)
        }
        fillPaint.color = alphaColor(SPIDER_BODY_COLOR, 238)
        canvas.drawOval(RectF(-size * 0.44f, -size * 0.56f, size * 0.44f, size * 0.56f), fillPaint)
        fillPaint.color = alphaColor(Color.WHITE, 230)
        canvas.drawCircle(size * 0.18f, -size * 0.18f, size * 0.08f, fillPaint)
        canvas.drawCircle(size * 0.18f, size * 0.18f, size * 0.08f, fillPaint)
    }

    private fun easedProgress(spec: KeyboardPressEffectSpec, progress: Float): Float {
        return when (spec.easing) {
            "linear" -> progress
            "spring" -> spring(progress)
            else -> easeOut(progress)
        }
    }

    private fun easeOut(progress: Float): Float {
        val inverse = 1f - progress
        return 1f - inverse * inverse * inverse
    }

    private fun spring(progress: Float): Float {
        val p = progress.coerceIn(0f, 1f)
        val damping = 5f
        val frequency = 11f
        val value = 1f - kotlin.math.exp(-damping * p) * kotlin.math.cos(frequency * p)
        return value.coerceIn(0f, 1.05f)
    }

    private fun alphaColor(color: Int, alpha: Int): Int {
        return Color.argb(alpha.coerceIn(0, 255), Color.red(color), Color.green(color), Color.blue(color))
    }

    private companion object {
        private const val MAX_TRAIL_POINTS = 14
        private const val TRAIL_TTL_MS = 420L
        private const val MASCOT_PRESS_EXPANSION = 0.14f
        private const val SCALE_EXPANSION_DP = 14f
        private const val PULSE_EXPANSION_DP = 16f
        private const val SPIDER_BODY_COLOR = -14801887
        private const val CELEBRATION_GREEN = -13192316
        private const val CELEBRATION_YELLOW = -11930
        private const val CELEBRATION_PINK = -1095825
        private const val CELEBRATION_BLUE = -11744784
        private const val WATER_LIGHT_BLUE = -7282449
        private const val WATER_PALE_BLUE = -3477256
        private const val WATER_CYAN = -12006684
        private const val EMBER_ORANGE = -29630
        private const val EMBER_PALE_YELLOW = -3672
        private val CELEBRATION_PALETTE =
            intArrayOf(CELEBRATION_GREEN, CELEBRATION_YELLOW, CELEBRATION_PINK, CELEBRATION_BLUE)
        private val WATER_SPLASH_PALETTE =
            intArrayOf(CELEBRATION_BLUE, WATER_LIGHT_BLUE, WATER_PALE_BLUE, WATER_CYAN)
        private val EMBER_BURST_PALETTE =
            intArrayOf(CELEBRATION_YELLOW, EMBER_ORANGE, CELEBRATION_PINK, EMBER_PALE_YELLOW)
    }
}
