package com.commandglows.app.ime

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.content.Context
import android.content.res.Configuration
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.DashPathEffect
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.LinearGradient
import android.graphics.Shader
import android.graphics.Typeface
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.text.TextPaint
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.SoundEffectConstants
import android.view.View
import android.view.View.MeasureSpec
import android.view.animation.OvershootInterpolator
import com.commandglows.app.ime.actions.KeyboardActionBarController
import com.commandglows.app.ime.actions.KeyboardActionBarState
import com.commandglows.app.ime.actions.KeyboardAttachedActionRowState
import com.commandglows.app.ime.actions.KeyboardActionCatalog
import com.commandglows.app.ime.actions.KeyboardActionEnvironment
import com.commandglows.app.ime.actions.KeyboardActionLongPressBehavior
import com.commandglows.app.ime.actions.KeyboardActionLongPressResult
import com.commandglows.app.ime.actions.KeyboardActionRowSpec
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

private data class NativeKeyboardColors(
    val background: Int,
    val privateBackground: Int,
    val key: Int,
    val specialKey: Int,
    val activeKey: Int,
    val pressedKey: Int,
    val disabledKey: Int,
    val text: Int,
    val activeText: Int,
    val disabledText: Int,
    val secondaryText: Int,
    val statusText: Int,
) {
    companion object {
        val Light =
            NativeKeyboardColors(
                background = Color.rgb(238, 241, 238),
                privateBackground = Color.rgb(246, 232, 226),
                key = Color.WHITE,
                specialKey = Color.rgb(224, 230, 227),
                activeKey = Color.rgb(23, 121, 93),
                pressedKey = Color.rgb(202, 218, 211),
                disabledKey = Color.rgb(214, 217, 215),
                text = Color.rgb(29, 35, 32),
                activeText = Color.WHITE,
                disabledText = Color.rgb(123, 130, 126),
                secondaryText = Color.rgb(92, 103, 98),
                statusText = Color.rgb(51, 61, 56),
            )

        val Dark =
            NativeKeyboardColors(
                background = Color.rgb(18, 24, 21),
                privateBackground = Color.rgb(42, 28, 27),
                key = Color.rgb(35, 43, 39),
                specialKey = Color.rgb(46, 56, 51),
                activeKey = Color.rgb(54, 179, 132),
                pressedKey = Color.rgb(67, 82, 75),
                disabledKey = Color.rgb(30, 36, 33),
                text = Color.rgb(235, 242, 238),
                activeText = Color.rgb(8, 20, 15),
                disabledText = Color.rgb(108, 119, 113),
                secondaryText = Color.rgb(168, 181, 174),
                statusText = Color.rgb(204, 217, 210),
            )
    }
}

private data class KeySoundStep(
    val toneType: Int,
    val toneDurationMs: Int,
    val postDelayMs: Long = 0L,
)

class CommandGlowsKeyboardView(
    context: Context,
    private val callbacks: Callbacks,
) : View(context) {
    interface Callbacks {
        fun onText(text: String): Boolean
        fun onEmojiInserted(emoji: String)
        fun onSymbolInserted(symbol: String)
        fun onBackspace(): Boolean
        fun onForwardDelete(): Boolean
        fun onDeleteWordBefore(): Boolean
        fun onDeleteWordAfter(): Boolean
        fun onDeleteSentenceBefore(): Boolean
        fun onDeleteSentenceAfter(): Boolean
        fun onEnter(): Boolean
        fun onVoice()
        fun onVoicePause()
        fun onVoiceResume()
        fun onVoiceRestart()
        fun onVoiceCancel()
        fun onCopySelection()
        fun onCutSelection(): Boolean
        fun onPasteClipboard(): Boolean
        fun onPastePlainClipboard(): Boolean
        fun onSelectAll(): Boolean
        fun onUndo(): Boolean
        fun onRedo(): Boolean
        fun onCancelSelection(): Boolean
        fun onSuggestionSelected(suggestion: String): Boolean
        fun onSnippets()
        fun onSettings()
        fun onThemeSettings()
        fun onThemePresetSelected(presetId: String)
        fun onKeyboardPicker()
        fun onMediaPlayPause()
        fun onMediaPrevious()
        fun onMediaNext()
        fun onMediaNowPlaying(): String
        fun onOpenMediaApp()
        fun onMediaStop()
        fun onVolumeDown()
        fun onVolumeUp()
        fun onBrightnessDown()
        fun onBrightnessUp()
        fun onNavigateCharLeft(): Boolean
        fun onNavigateCharRight(): Boolean
        fun onNavigateWordLeft(): Boolean
        fun onNavigateWordRight(): Boolean
        fun onNavigateSentenceLeft(): Boolean
        fun onNavigateSentenceRight(): Boolean
        fun onNavigateLineUp(): Boolean
        fun onNavigateLineDown(): Boolean
        fun onNavigateParagraphUp(): Boolean
        fun onNavigateParagraphDown(): Boolean
        fun onNavigateLineStart(): Boolean
        fun onNavigateLineEnd(): Boolean
        fun onKeyEvent(keyCode: Int, metaState: Int): Boolean
        fun onLayoutProfileChanged(profile: KeyboardLayoutProfile)
        fun onCornerModeChanged(enabled: Boolean)
        fun onDebugTouchOverlayChanged(enabled: Boolean)
        fun onKeyVibrationChanged(enabled: Boolean)
        fun onKeyVibrationModeChanged(level: Int)
        fun onKeySoundChanged(enabled: Boolean)
        fun onKeySoundModeChanged(level: Int)
        fun onSpellingSuggestionsChanged(enabled: Boolean)
        fun onSpecialKeyCornersChanged(enabled: Boolean)
        fun onFrenchLanguageChanged(enabled: Boolean)
        fun onEnglishLanguageChanged(enabled: Boolean)
        fun onDoubleSpacePeriodChanged(enabled: Boolean)
        fun onPunctuationAutoSpacingChanged(enabled: Boolean)
        fun onKeyboardHeightScaleChanged(scale: Float)
        fun onHorizontalKeyboardPaddingChanged(scale: Float)
        fun onVerticalKeyboardPaddingChanged(scale: Float)
        fun onCompactModeChanged(enabled: Boolean)
        fun onAutoCloseModesChanged(enabled: Boolean)
        fun onActionBarStateChanged(state: KeyboardActionBarState)
    }

    private data class KeyFrame(
        val key: KeyboardKeySpec,
        val slotRect: RectF,
        val visualRect: RectF,
        val touchRect: RectF,
        val rowIndex: Int,
        val rowId: String? = null,
        val rowScrollable: Boolean = false,
        val rowPagedScrollable: Boolean = false,
        val rowVisibleWidth: Float = 0f,
        val panelScrollable: Boolean = false,
    )

    private data class LongPressSwipeVisual(
        val startX: Float,
        val startY: Float,
        val startedAtMs: Long,
    )

    private data class LayoutFingerprint(
        val layoutMode: KeyboardLayoutMode,
        val panelMode: KeyboardPanelMode,
        val shifted: Boolean,
        val shiftLocked: Boolean,
        val fieldContext: KeyboardFieldContextMode,
        val layoutProfile: KeyboardLayoutProfile,
        val cornerModeEnabled: Boolean,
        val debugTouchOverlayEnabled: Boolean,
        val keyVibrationEnabled: Boolean,
        val keyVibrationIntensity: Int,
        val keySoundEnabled: Boolean,
        val keySoundIntensity: Int,
        val spellingSuggestionsEnabled: Boolean,
        val specialKeyCornersEnabled: Boolean,
        val frenchLanguageEnabled: Boolean,
        val englishLanguageEnabled: Boolean,
        val doubleSpacePeriodEnabled: Boolean,
        val punctuationAutoSpacingEnabled: Boolean,
        val keyboardHeightScale: Float,
        val keyboardHorizontalPaddingScale: Float,
        val keyboardVerticalPaddingScale: Float,
        val compactModeEnabled: Boolean,
        val symbolPage: Int,
        val emojiCategory: KeyboardEmojiCategory,
        val recentEmojis: List<String>,
        val recentSymbols: List<String>,
        val enterLabel: String,
        val clipboardEntries: List<KeyboardClipboardEntry>,
        val snippets: List<KeyboardTextRule>,
        val suggestions: List<String>,
        val actionBarState: KeyboardActionBarState,
        val mediaNowPlayingLabel: String?,
        val cornerConfig: KeyboardCornerConfig,
        val themePresetId: String,
        val privateMode: Boolean,
        val clipboardAllowed: Boolean,
        val voiceAllowed: Boolean,
        val snippetsAllowed: Boolean,
        val mediaControlsEnabled: Boolean,
    )

    private var shifted = false
    private var shiftLocked = false
    private var actionBarState = KeyboardActionBarState()
    private var themeMode = KeyboardStateStore.THEME_SYSTEM
    private var themeConfig = KeyboardThemeConfig()
    private var themeImagePath: String? = null
    private var themeBitmap: Bitmap? = null
    private var nativeColors = NativeKeyboardColors.Light
    private var resolvedTextColor = NativeKeyboardColors.Light.text
    private var resolvedCornerTextColor = NativeKeyboardColors.Light.secondaryText
    private var resolvedStatusTextColor = NativeKeyboardColors.Light.statusText
    private var resolvedKeyRadius = resources.displayMetrics.density * 8f
    private var layoutMode = KeyboardLayoutMode.Letters
    private var symbolPage = 0
    private var panelMode = KeyboardPanelMode.None
    private var layoutProfile = KeyboardStateStore.DEFAULT_LAYOUT_PROFILE
    private var cornerModeEnabled = KeyboardStateStore.DEFAULT_CORNER_MODE_ENABLED
    private var debugTouchOverlayEnabled = false
    private var keyVibrationIntensity = KeyboardStateStore.KEY_VIBRATION_INTENSITY_MEDIUM
    private val vibrator: Vibrator? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }
    private var keyVibrationEnabled: Boolean
        get() = keyVibrationIntensity != KeyboardStateStore.KEY_VIBRATION_INTENSITY_OFF
        set(value) {
            keyVibrationIntensity =
                if (value) {
                    KeyboardStateStore.KEY_VIBRATION_INTENSITY_MEDIUM
                } else {
                    KeyboardStateStore.KEY_VIBRATION_INTENSITY_OFF
                }
        }
    private var keySoundIntensity = KeyboardStateStore.KEY_SOUND_INTENSITY_SHORT
    private var keySoundEnabled: Boolean
        get() = keySoundIntensity != KeyboardStateStore.KEY_SOUND_INTENSITY_OFF
        set(value) {
            keySoundIntensity =
                if (value) {
                    KeyboardStateStore.KEY_SOUND_INTENSITY_SHORT
                } else {
                    KeyboardStateStore.KEY_SOUND_INTENSITY_OFF
                }
        }
    private var spellingSuggestionsEnabled = true
    private var mediaControlsEnabled = true
    private var specialKeyCornersEnabled = false
    private var frenchLanguageEnabled = true
    private var englishLanguageEnabled = true
    private var doubleSpacePeriodEnabled = true
    private var punctuationAutoSpacingEnabled = true
    private var keyboardHeightScale = KeyboardStateStore.KEYBOARD_HEIGHT_DEFAULT
    private var keyboardHorizontalPaddingScale = KeyboardStateStore.KEYBOARD_PADDING_PERCENT_DEFAULT / 100f
    private var keyboardVerticalPaddingScale = KeyboardStateStore.KEYBOARD_PADDING_PERCENT_DEFAULT / 100f
    private var actionRowHeightScale = KeyboardStateStore.ACTION_ROW_HEIGHT_DEFAULT
    private var compactModeEnabled = false
    private var autoCloseModesEnabled = true
    private var emojiCategory = KeyboardEmojiCategory.Recents
    private var recentEmojis = emptyList<String>()
    private var recentSymbols = emptyList<String>()
    private var voiceRecordingActive = false
    private var voicePermissionRequired = false
    private var fieldPolicy = KeyboardSecurityPolicy.evaluate(null, KeyboardStateStore.PRIVACY_AUTO)
    private var fieldContext = KeyboardFieldContextMode.Text
    private var enterLabel = "Enter"
    private var keyToneGenerator: ToneGenerator? =
        runCatching {
            ToneGenerator(AudioManager.STREAM_MUSIC, ToneGenerator.MAX_VOLUME * 4 / 10)
        }.getOrNull()
    private var statusText = "CommandGlows"
    private var baseStatusText = "CommandGlows"
    private var transientStatusText: String? = null
    private var statusBarMode = KeyboardStatusBarMode.STANDARD
    private var statusBarModules = listOf(
        KeyboardStatusBarModule.KEYBOARD_LABEL,
        KeyboardStatusBarModule.DATE,
        KeyboardStatusBarModule.TIME,
    )
    private var accountLabel: String? = null
    private var accountLabelMode = KeyboardStatusBarAccountLabelMode.NONE
    private var suggestions = emptyList<String>()
    private var clipboardEntries = emptyList<KeyboardClipboardEntry>()
    private var snippets = emptyList<KeyboardTextRule>()
    private var customActionRows = emptyList<KeyboardActionRowSpec>()
    private var mediaNowPlayingLabel: String? = null
    private var cornerConfig = KeyboardCornerConfig()
    private val activeSystemModifiers = linkedSetOf<KeyboardSystemModifier>()
    private val ctrlHoldPointerIds = linkedSetOf<Int>()
    private var ctrlActionSurfaceLocked = false
    private var lastCtrlTapAtMs = 0L
    private val longPressSwipeDispatchPointerIds = linkedSetOf<Int>()
    private val longPressSwipeStartKeyIdByPointerId = mutableMapOf<Int, String>()
    private val longPressSwipeActionDescriptorByPointerId = mutableMapOf<Int, String?>()
    private val longPressSwipeActionPinnedBeforeByPointerId = mutableMapOf<Int, Boolean>()
    private val longPressSwipeActionRowsBeforeByPointerId = mutableMapOf<Int, Set<String>>()
    private val longPressSwipeVisualByPointerId = mutableMapOf<Int, LongPressSwipeVisual>()
    private val longPressSwipeHoveredKeyByPointerId = mutableMapOf<Int, String>()
    private val longPressSwipeHoveredSelectionByPointerId = mutableMapOf<Int, GestureSelection>()
    private val longPressSwipeHoveredKeyCountById = mutableMapOf<String, Int>()
    private val gestureRepeatCandidateSelectionByPointerId = mutableMapOf<Int, GestureSelection>()
    private val gestureRepeatCandidateKeyIdByPointerId = mutableMapOf<Int, String>()
    private val gestureRepeatRunnablesByPointerId = mutableMapOf<Int, Runnable>()

    private val pointerTracker = KeyboardPointerTracker<KeyFrame>()
    private val longPressRunnablesByPointerId = mutableMapOf<Int, Runnable>()
    private val mediaNowPlayingRefreshRunnable = Runnable {
        refreshVisibleMediaNowPlaying()
    }
    private var debugPrimaryPointerX = 0f
    private var debugPrimaryPointerY = 0f
    private var debugPrimaryStartX = 0f
    private var debugPrimaryStartY = 0f
    private var activePointerPressedKeyIds = emptySet<String>()
    private val lingeringPressedKeyIds = linkedSetOf<String>()
    private val lingeringPressTokens = mutableMapOf<String, Int>()
    private val materialPressStartedAtById = mutableMapOf<String, Long>()
    private var materialPressEffectAnimating = false
    private data class KeyMaterialGeometry(
        val footprintRect: RectF,
        val surfaceRect: RectF,
        val radius: Float,
        val baseColor: Int,
        val pressed: Boolean,
        val reliefDepth: Float,
        val fullDepth: Float,
        val leftDepth: Float,
        val rightDepth: Float,
        val bottomDepth: Float,
        val leftFacePath: Path?,
        val rightFacePath: Path?,
        val bottomFacePath: Path?,
    )

    private var debugGestureText = "idle"
    private var repeatActionKey: KeyboardKeySpec? = null
    private var repeatActionSelection = GestureSelection.PrimaryTap
    private var repeatOwnerPointerId = MotionEvent.INVALID_POINTER_ID
    private var repeatSourceFrame: KeyFrame? = null
    private var repeatRunnable: Runnable? = null
    private var slidingSpace = false
    private var slidingSpaceOwnerPointerId = MotionEvent.INVALID_POINTER_ID
    private var lastSlideStep = 0
    private var scrollingHorizontalRow = false
    private var horizontalScrollOwnerPointerId = MotionEvent.INVALID_POINTER_ID
    private var lastHorizontalScrollX = 0f
    private var activeHorizontalRowId: String? = null
    private var horizontalGestureStartOffset = 0f
    private var horizontalGestureDragDx = 0f
    private val horizontalRowScrollOffsetById = mutableMapOf<String, Float>()
    private val horizontalRowMaxOffsetById = mutableMapOf<String, Float>()
    private val horizontalRowPageWidthById = mutableMapOf<String, Float>()
    private val horizontalRowPageById = mutableMapOf<String, Int>()
    private val horizontalRowAnimatorById = mutableMapOf<String, ValueAnimator>()
    private val horizontalRowVisualProgressById = mutableMapOf<String, Float>()
    private val horizontalRowVisualAnimatorById = mutableMapOf<String, ValueAnimator>()
    private var scrollingVerticalPanel = false
    private var verticalScrollOwnerPointerId = MotionEvent.INVALID_POINTER_ID
    private var lastVerticalScrollY = 0f
    private var verticalPanelScrollOffset = 0f
    private var verticalPanelMaxScrollOffset = 0f
    private var recoveringFromKeyboardError = false

    private val keyFrames = mutableListOf<KeyFrame>()
    private var layoutSnapshot = KeyboardLayoutBuilder.safeFallback()
    private var layoutRefreshGeneration = 0

    private val density = resources.displayMetrics.density
    private val pressEffects = KeyboardPressEffects(density) { SystemClock.uptimeMillis() }
    private val baseOuterPadding = 0f
    private val keyboardWidthPaddingStep = 0.05f
    private val keyboardHeightPaddingStep = 0.05f
    private val keyRadius = dp(8f)
    private val minStatusHeight = dp(30f)
    private val maxStatusLines = 4
    private val actionRowHeight = dp(40f)
    private val textRowHeight = dp(46f)
    private val controlRowHeight = dp(48f)
    private val panelRowHeight = dp(42f)
    private val keyboardHeightStep = 0.03f

    private fun keyGap(): Float = dp(themeConfig.keyHorizontalGap)

    private fun rowGap(): Float =
        dp(themeConfig.rowVerticalGap).coerceAtLeast(keyboardThemeMinimumRowGap())

    private fun keyWidthScale(): Float = 1f

    private val backgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.background
    }
    private val privateBackgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.privateBackground
    }
    private val keyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.key
    }
    private val specialKeyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.specialKey
    }
    private val themePreviewKeyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.specialKey
    }
    private val activeKeyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.activeKey
    }
    private val pressedKeyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.pressedKey
    }
    private val keyBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.TRANSPARENT
        style = Paint.Style.STROKE
        strokeWidth = 0f
    }
    private val keyReliefDarkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.TRANSPARENT
        style = Paint.Style.STROKE
        strokeWidth = 0f
    }
    private val keyReliefLightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.TRANSPARENT
        style = Paint.Style.STROKE
        strokeWidth = 0f
    }
    private val keyEffectFillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.TRANSPARENT
        style = Paint.Style.FILL
    }
    private val keyEffectStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.TRANSPARENT
        style = Paint.Style.STROKE
        strokeWidth = 0f
    }
    private val longPressSwipeStrokePaint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
        }
    private val longPressSwipeFillPaint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
        }
    private val longPressSwipeThicknessScale = 1.45f
    private val longPressSwipeStrokeThicknessScale = 2.35f
    private val longPressSwipeGuidelineScale = 1.35f
    private val keyEffectPath = Path()
    private val keyShadowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.TRANSPARENT
        style = Paint.Style.FILL
    }
    private val verticalScrollbarTrackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(70, 0, 0, 0)
        style = Paint.Style.FILL
    }
    private val verticalScrollbarThumbPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(180, 255, 255, 255)
        style = Paint.Style.FILL
    }
    private val horizontalEdgeAffordancePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.TRANSPARENT
        style = Paint.Style.FILL
    }
    private val pinnedBadgePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(255, 255, 255)
        style = Paint.Style.FILL
    }
    private val pinnedBadgeAccentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(23, 121, 93)
        style = Paint.Style.FILL
    }
    private val voicePulsePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.TRANSPARENT
        style = Paint.Style.FILL
    }
    private val voiceRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.TRANSPARENT
        style = Paint.Style.STROKE
    }
    private val disabledKeyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.disabledKey
    }
    private val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.text
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    private val secondaryTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.secondaryText
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    private val statusPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = NativeKeyboardColors.Light.statusText
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    private val debugStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(216, 32, 32)
        style = Paint.Style.STROKE
        strokeWidth = dp(1f)
    }
    private val debugVisualStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(180, 25, 86, 235)
        style = Paint.Style.STROKE
        strokeWidth = dp(1f)
    }
    private val debugTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.rgb(160, 24, 24)
        textAlign = Paint.Align.LEFT
        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
    }
    private val scrollVisualRect = RectF()

    private val gestureThresholds =
        GestureThresholds(
            tapSlopPx = dp(10f),
            cornerThresholdPx = dp(16f),
            returnCenterRadiusPx = dp(12f),
        )
    private val ctrlSurfaceDoubleTapTimeoutMs = 300L
    private val longPressDelayMs = 420L
    private val repeatDelayMs = 72L
    private val spaceSlideStartPx = dp(18f)
    private val spaceSlideStepPx = dp(34f)
    private val horizontalSnapDurationMs = 780L
    private val horizontalRowVisualInDurationMs = 420L
    private val horizontalRowVisualOutDurationMs = 860L
    private val horizontalSnapInterpolator = OvershootInterpolator(0.85f)

    private val repeatingActions =
        setOf(
            KeyboardKeyAction.Backspace,
            KeyboardKeyAction.ForwardDelete,
            KeyboardKeyAction.DeleteWordBefore,
            KeyboardKeyAction.DeleteWordAfter,
            KeyboardKeyAction.DeleteSentenceBefore,
            KeyboardKeyAction.DeleteSentenceAfter,
            KeyboardKeyAction.NavigateCharLeft,
            KeyboardKeyAction.NavigateCharRight,
            KeyboardKeyAction.NavigateWordLeft,
            KeyboardKeyAction.NavigateWordRight,
            KeyboardKeyAction.NavigateSentenceLeft,
            KeyboardKeyAction.NavigateSentenceRight,
            KeyboardKeyAction.NavigateLineUp,
            KeyboardKeyAction.NavigateLineDown,
            KeyboardKeyAction.NavigateParagraphUp,
            KeyboardKeyAction.NavigateParagraphDown,
            KeyboardKeyAction.NavigateLineStart,
            KeyboardKeyAction.NavigateLineEnd,
        )

    private val actionBarController = KeyboardActionBarController(KeyboardActionCatalog.default())

    init {
        isClickable = true
        isFocusable = true
        setBackgroundColor(Color.TRANSPARENT)
        applyThemeMode(themeMode)
        refreshLayout()
    }

    fun applyPolicy(policy: KeyboardFieldPolicy) {
        fieldPolicy = policy
        if (policy.privateMode) {
            recentEmojis = emptyList()
            if (emojiCategory == KeyboardEmojiCategory.Recents) {
                emojiCategory = KeyboardEmojiCategory.Smileys
            }
        }
        statusText =
            if (policy.privateMode) {
                "CommandGlows - private input (${policy.reason})"
            } else {
                composeStatusText()
            }
        baseStatusText = statusText
        reconcileActionBarState()
        refreshLayout()
    }

    fun applyRuntimePreferences(
        profile: KeyboardLayoutProfile,
        cornersEnabled: Boolean,
        debugTouchOverlay: Boolean,
        keyVibration: Int,
        keySound: Int,
        spellingSuggestions: Boolean,
        mediaControlsEnabled: Boolean,
        specialKeyCorners: Boolean,
        frenchLanguage: Boolean,
        englishLanguage: Boolean,
        doubleSpacePeriod: Boolean,
        punctuationAutoSpacing: Boolean,
        keyboardHeightScale: Float,
        keyboardHorizontalPaddingPercent: Int,
        keyboardVerticalPaddingPercent: Int,
        actionRowHeightScale: Float,
        compactMode: Boolean,
        autoCloseModes: Boolean,
        themeMode: String,
        themeConfig: KeyboardThemeConfig,
        recents: List<String>,
        symbolRecents: List<String>,
        clipboardEntries: List<KeyboardClipboardEntry>,
        snippets: List<KeyboardTextRule>,
        customActionRows: List<KeyboardActionRowSpec>,
        cornerConfig: KeyboardCornerConfig,
        actionBarState: KeyboardActionBarState,
        actionBarLongPressBehavior: KeyboardActionLongPressBehavior,
        statusBarConfig: KeyboardStatusBarConfig,
        accountLabel: String?,
        accountLabelMode: KeyboardStatusBarAccountLabelMode,
    ) {
        layoutProfile = profile
        cornerModeEnabled = cornersEnabled
        debugTouchOverlayEnabled = debugTouchOverlay
        keyVibrationIntensity = keyVibration
        keySoundIntensity = keySound
        spellingSuggestionsEnabled = spellingSuggestions
        this.mediaControlsEnabled = mediaControlsEnabled
        specialKeyCornersEnabled = specialKeyCorners
        statusBarMode = statusBarConfig.mode
        statusBarModules = statusBarConfig.modules
        this.accountLabel = accountLabel
        this.accountLabelMode = accountLabelMode
        frenchLanguageEnabled = frenchLanguage
        englishLanguageEnabled = englishLanguage
        doubleSpacePeriodEnabled = doubleSpacePeriod
        punctuationAutoSpacingEnabled = punctuationAutoSpacing
        this.keyboardHeightScale = keyboardHeightScale.coerceIn(
            KeyboardStateStore.KEYBOARD_HEIGHT_MIN,
            KeyboardStateStore.KEYBOARD_HEIGHT_MAX,
        )
        keyboardHorizontalPaddingScale = (keyboardHorizontalPaddingPercent.coerceIn(0, KeyboardStateStore.KEYBOARD_PADDING_PERCENT_MAX) / 100f).coerceIn(
            0f,
            0.20f,
        )
        keyboardVerticalPaddingScale = (keyboardVerticalPaddingPercent.coerceIn(0, KeyboardStateStore.KEYBOARD_PADDING_PERCENT_MAX) / 100f).coerceIn(
            0f,
            0.20f,
        )
        this.actionRowHeightScale = KeyboardStateStore.normalizeActionRowHeightScale(actionRowHeightScale)
        compactModeEnabled = compactMode
        autoCloseModesEnabled = autoCloseModes
        this.themeConfig = themeConfig
        if (themeImagePath != themeConfig.backgroundImagePath) {
            themeImagePath = themeConfig.backgroundImagePath
            themeBitmap = decodeThemeBitmap(themeImagePath)
        }
        applyThemeMode(themeMode)
        this.clipboardEntries = clipboardEntries
        this.snippets = snippets
        this.customActionRows = customActionRows
        this.cornerConfig = cornerConfig
        setActionBarState(
            actionBarState.copy(
                longPressBehavior = actionBarLongPressBehavior,
            ),
            notify = false,
        )
        reconcileActionBarState()
        recentEmojis = if (fieldPolicy.privateMode) emptyList() else recents
        recentSymbols = if (fieldPolicy.privateMode) emptyList() else symbolRecents
        if (fieldPolicy.privateMode && emojiCategory == KeyboardEmojiCategory.Recents) {
            emojiCategory = KeyboardEmojiCategory.Smileys
        }
        baseStatusText = composeStatusText()
        statusText = transientStatusText ?: baseStatusText
        requestLayout()
        refreshLayout()
    }

    private fun applyThemeMode(mode: String) {
        themeMode =
            if (mode in setOf(
                    KeyboardStateStore.THEME_SYSTEM,
                    KeyboardStateStore.THEME_LIGHT,
                    KeyboardStateStore.THEME_DARK,
                )
            ) {
                mode
            } else {
                KeyboardStateStore.THEME_SYSTEM
            }
        val darkMode =
            themeMode == KeyboardStateStore.THEME_DARK ||
                (themeMode == KeyboardStateStore.THEME_SYSTEM && isSystemDark())
        nativeColors =
            if (darkMode) {
                NativeKeyboardColors.Dark
            } else {
                NativeKeyboardColors.Light
            }
        val resolvedThemeConfig = resolvedThemeConfigForMode(themeConfig, darkMode)
        themeConfig = resolvedThemeConfig
        val defaultBackground =
            if (resolvedThemeConfig.presetId == "system") {
                nativeColors.background
            } else {
                resolvedThemeConfig.backgroundStartColor
            }
        backgroundPaint.shader = null
        backgroundPaint.color = keyboardLayerColor(defaultBackground, KEYBOARD_BACKGROUND_OPACITY_BOOST)
        privateBackgroundPaint.color = nativeColors.privateBackground
        keyPaint.color =
            keyboardLayerColor(
                if (resolvedThemeConfig.presetId == "system") nativeColors.key else resolvedThemeConfig.keyColor,
                KEYBOARD_SURFACE_OPACITY_BOOST,
            )
        specialKeyPaint.color =
            keyboardLayerColor(
                if (resolvedThemeConfig.presetId == "system") nativeColors.specialKey else resolvedThemeConfig.specialKeyColor,
                KEYBOARD_SURFACE_OPACITY_BOOST,
            )
        activeKeyPaint.color =
            keyboardLayerColor(
                if (resolvedThemeConfig.presetId == "system") nativeColors.activeKey else resolvedThemeConfig.activeKeyColor,
                KEYBOARD_SURFACE_OPACITY_BOOST,
            )
        pressedKeyPaint.color =
            keyboardLayerColor(
                if (resolvedThemeConfig.presetId == "system") nativeColors.pressedKey else resolvedThemeConfig.pressedKeyColor,
                KEYBOARD_SURFACE_OPACITY_BOOST,
            )
        disabledKeyPaint.color = nativeColors.disabledKey
        resolvedTextColor =
            keyboardLayerColor(
                if (resolvedThemeConfig.presetId == "system") nativeColors.text else resolvedThemeConfig.textColor,
                KEYBOARD_TEXT_OPACITY_BOOST,
            )
        val baseCornerTextColor =
            if (resolvedThemeConfig.presetId == "system") nativeColors.secondaryText else resolvedThemeConfig.cornerTextColor
        resolvedCornerTextColor =
            keyboardLayerColor(
                colorWithOpacity(
                    baseCornerTextColor,
                    resolvedThemeConfig.cornerTextOpacity,
                ),
                KEYBOARD_TEXT_OPACITY_BOOST,
            )
        resolvedStatusTextColor =
            keyboardLayerColor(
                if (resolvedThemeConfig.presetId == "system") nativeColors.statusText else resolvedThemeConfig.statusTextColor,
                KEYBOARD_TEXT_OPACITY_BOOST,
            )
        resolvedKeyRadius = if (resolvedThemeConfig.presetId == "system") keyRadius else dp(resolvedThemeConfig.keyRadius)
        restoreKeyBorderPaint()
        keyShadowPaint.color =
            keyboardLayerColor(
                if (resolvedThemeConfig.presetId == "system") Color.TRANSPARENT else resolvedThemeConfig.shadowColor,
                KEYBOARD_SHADOW_OPACITY_BOOST,
            )
        textPaint.color = resolvedTextColor
        secondaryTextPaint.color = resolvedCornerTextColor
        statusPaint.color = resolvedStatusTextColor
    }

    private fun restoreKeyBorderPaint() {
        keyBorderPaint.color = keyboardLayerColor(themeConfig.borderColor, KEYBOARD_BORDER_OPACITY_BOOST)
        keyBorderPaint.strokeWidth = dp(themeConfig.borderWidth)
    }

    private fun syncMaterialPressStarts() {
        val now = SystemClock.uptimeMillis()
        val pressedIds = activePointerPressedKeyIds + lingeringPressedKeyIds
        pressedIds.forEach { keyId ->
            materialPressStartedAtById.putIfAbsent(keyId, now)
        }
        materialPressStartedAtById.keys.retainAll(pressedIds)
    }

    private fun keyboardLayerColor(
        color: Int,
        opacityBoost: Float,
    ): Int {
        val opacity = weightedKeyboardOpacity(opacityBoost)
        val alpha = (Color.alpha(color) * opacity)
            .roundToInt()
            .coerceIn(0, 255)
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color))
    }

    private fun weightedKeyboardOpacity(opacityBoost: Float): Float {
        if (fieldPolicy.privateMode) {
            return 1f
        }
        val opacity = themeConfig.keyboardOpacity.coerceIn(KEYBOARD_OPACITY_MIN, 1f)
        return (opacity + (1f - opacity) * opacityBoost.coerceIn(0f, 1f)).coerceIn(0f, 1f)
    }

    private fun colorWithOpacity(
        color: Int,
        opacity: Float,
    ): Int {
        val alpha = (Color.alpha(color) * opacity.coerceIn(0f, 0.85f))
            .roundToInt()
            .coerceIn(0, 217)
        return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color))
    }

    private fun resolvedThemeConfigForMode(
        config: KeyboardThemeConfig,
        darkMode: Boolean,
    ): KeyboardThemeConfig = KeyboardThemePresets.resolveVariantForMode(config, dark = darkMode)

    private fun isSystemDark(): Boolean {
        return (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
            Configuration.UI_MODE_NIGHT_YES
    }

    fun applyInputContext(
        contextMode: KeyboardFieldContextMode,
        enterActionLabel: String,
    ) {
        fieldContext = contextMode
        enterLabel = enterActionLabel
        reconcileActionBarState()
        refreshLayout()
    }

    fun applyTypingAssistant(
        autoCapitalized: Boolean,
        candidates: List<String>,
    ) {
        val nextShifted =
            if (layoutMode == KeyboardLayoutMode.Letters && !shiftLocked) {
                autoCapitalized
            } else {
                shifted
            }
        val nextSuggestions = candidates.take(3)
        if (shifted == nextShifted && suggestions == nextSuggestions) {
            return
        }
        if (layoutMode == KeyboardLayoutMode.Letters && !shiftLocked) {
            shifted = nextShifted
        }
        suggestions = nextSuggestions
        refreshLayout()
    }

    private fun actionEnvironment(
        mode: KeyboardLayoutMode = layoutMode,
        panel: KeyboardPanelMode = panelMode,
    ): KeyboardActionEnvironment {
        return KeyboardActionEnvironment(
            fieldPolicy = fieldPolicy,
            layoutMode = mode,
            panelMode = panel,
            clipboardAllowed = fieldPolicy.clipboardAllowed,
            clipboardEntries = clipboardEntries,
            voiceAllowed = fieldPolicy.voiceAllowed,
            snippetsAllowed = fieldPolicy.snippetsAllowed,
            mediaControlsEnabled = mediaControlsEnabled,
            recentEmojis = recentEmojis,
            recentSymbols = recentSymbols,
            snippets = snippets,
            customActionRows = customActionRows,
        )
    }

    private fun reconcileActionBarState(
        mode: KeyboardLayoutMode = layoutMode,
        panel: KeyboardPanelMode = panelMode,
    ) {
        val next =
            actionBarController.sanitizeState(
                state = actionBarState,
                environment = actionEnvironment(mode = mode, panel = panel),
            )
        setActionBarState(next)
    }

    private fun setActionBarState(
        state: KeyboardActionBarState,
        notify: Boolean = true,
    ) {
        val changed = state != actionBarState
        actionBarState = state
        if (notify && changed) {
            callbacks.onActionBarStateChanged(state)
        }
    }

    fun showVoiceActionBar() {
        val voiceRow = KeyboardAttachedActionRowState(
            providerActionId = "voice",
            rowId = "action-row-voice",
            dedupeKey = "voice",
        )
        val nextRows =
            (actionBarState.attachedRows.filterNot { it.dedupeKey == "voice" } + voiceRow)
        setActionBarState(
            actionBarState.copy(
                pinnedActionIds = actionBarState.pinnedActionIds + "voice",
                attachedRows = nextRows,
                rowPageById = actionBarState.rowPageById + ("action-row-voice" to 0),
            ),
        )
        reconcileActionBarState()
        refreshLayout()
    }

    fun hideVoiceActionBar() {
        setActionBarState(
            actionBarState.copy(
                pinnedActionIds = actionBarState.pinnedActionIds - "voice",
                attachedRows = actionBarState.attachedRows.filterNot { it.dedupeKey == "voice" },
                rowPageById = actionBarState.rowPageById - "action-row-voice",
            ),
        )
        reconcileActionBarState()
        refreshLayout()
    }

    fun setStatus(
        message: String,
        isError: Boolean = false,
    ) {
        transientStatusText = message
        statusText = message
        statusPaint.color =
            if (isError) {
                Color.rgb(196, 48, 60)
            } else {
                resolvedStatusTextColor
            }
        requestLayout()
        invalidate()
    }

    fun setVoiceRecordingActive(active: Boolean) {
        if (voiceRecordingActive == active) {
            return
        }
        voiceRecordingActive = active
        invalidate()
    }

    fun setVoicePermissionRequired(required: Boolean) {
        if (voicePermissionRequired == required) {
            return
        }
        voicePermissionRequired = required
        invalidate()
    }

    fun isVoicePermissionRequired(): Boolean = voicePermissionRequired

    private fun clearTransientStatus() {
        transientStatusText = null
        statusText = baseStatusText
        statusPaint.color = resolvedStatusTextColor
        requestLayout()
        invalidate()
    }

    private fun composeStatusText(): String {
        if (statusBarMode == KeyboardStatusBarMode.HIDDEN) {
            return baseStatusText
        }
        val items = mutableListOf<String>()
        val includes = statusBarModules.toSet()
        if (KeyboardStatusBarModule.KEYBOARD_LABEL in includes) {
            items.add("CommandGlows")
        }
        if (KeyboardStatusBarModule.DATE in includes) {
            items.add(currentDateLabel())
        }
        if (KeyboardStatusBarModule.TIME in includes) {
            items.add(currentTimeLabel())
        }
        if (KeyboardStatusBarModule.ACCOUNT_LABEL in includes) {
            val label = when (accountLabelMode) {
                KeyboardStatusBarAccountLabelMode.NONE -> null
                KeyboardStatusBarAccountLabelMode.MASKED -> maskedAccountLabel(accountLabel)
                KeyboardStatusBarAccountLabelMode.VISIBLE -> accountLabel?.trim()
            }
            label?.let { items.add(it) }
        }
        if (items.isEmpty()) {
            items.add("CommandGlows")
        }
        return items.joinToString(" | ")
    }

    private fun currentDateLabel(): String {
        val now = java.util.Calendar.getInstance()
        return java.text.DateFormat.getDateInstance(java.text.DateFormat.MEDIUM).format(now.time)
    }

    private fun currentTimeLabel(): String {
        val now = java.util.Calendar.getInstance()
        return java.text.DateFormat.getTimeInstance(java.text.DateFormat.SHORT).format(now.time)
    }

    private fun maskedAccountLabel(rawLabel: String?): String? {
        val trimmed = rawLabel?.trim().orEmpty()
        if (trimmed.isEmpty()) {
            return null
        }
        val at = trimmed.indexOf('@')
        if (at <= 0) {
            return "Compte"
        }
        val local = trimmed.take(at)
        if (local.length <= 2) {
            return "${local.firstOrNull() ?: '*'}…"
        }
        return "${local.first()}***${local.last()}"
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val desiredHeight = desiredKeyboardHeight(width)
        val height =
            when (MeasureSpec.getMode(heightMeasureSpec)) {
                MeasureSpec.AT_MOST -> minOf(desiredHeight, MeasureSpec.getSize(heightMeasureSpec))
                else -> desiredHeight
            }
        setMeasuredDimension(width, height)
    }

    override fun onDraw(canvas: Canvas) {
        runKeyboardSafely("onDraw") {
            super.onDraw(canvas)
            drawKeyboard(canvas)
        } ?: drawRecoveredFallback(canvas)
    }

    override fun onSizeChanged(
        w: Int,
        h: Int,
        oldw: Int,
        oldh: Int,
    ) {
        super.onSizeChanged(w, h, oldw, oldh)
        if ((w != oldw || h != oldh) && themeImagePath != null) {
            themeBitmap = decodeThemeBitmap(themeImagePath, w, h)
        }
    }

    private fun drawKeyboard(canvas: Canvas) {
        keyFrames.clear()
        activePointerPressedKeyIds = pointerTracker.activeKeyIds()
        syncMaterialPressStarts()
        materialPressEffectAnimating = false
        horizontalRowMaxOffsetById.clear()
        if (!fieldPolicy.privateMode && themeConfig.useGradient && themeConfig.presetId != "system" && !themeConfig.useImage) {
            backgroundPaint.shader =
                if (themeConfig.gradientStyle == "radial") {
                    RadialGradient(
                        width * 0.28f,
                        height * 0.18f,
                        max(width, height).toFloat(),
                        keyboardLayerColor(themeConfig.backgroundEndColor, KEYBOARD_BACKGROUND_OPACITY_BOOST),
                        keyboardLayerColor(themeConfig.backgroundStartColor, KEYBOARD_BACKGROUND_OPACITY_BOOST),
                        Shader.TileMode.CLAMP,
                    )
                } else {
                    LinearGradient(
                        0f,
                        0f,
                        width.toFloat(),
                        height.toFloat(),
                        keyboardLayerColor(themeConfig.backgroundStartColor, KEYBOARD_BACKGROUND_OPACITY_BOOST),
                        keyboardLayerColor(themeConfig.backgroundEndColor, KEYBOARD_BACKGROUND_OPACITY_BOOST),
                        Shader.TileMode.CLAMP,
                    )
                }
        } else {
            backgroundPaint.shader = null
        }
        canvas.drawRect(
            0f,
            0f,
            width.toFloat(),
            height.toFloat(),
            if (fieldPolicy.privateMode) privateBackgroundPaint else backgroundPaint,
        )
        if (!fieldPolicy.privateMode && themeConfig.useImage) {
            themeBitmap?.let { bitmap ->
        canvas.drawBitmap(bitmap, null, RectF(0f, 0f, width.toFloat(), height.toFloat()), null)
            }
        }

        val horizontalPadding = computedHorizontalPadding(width.toFloat())
        val verticalPadding = computedVerticalPadding(width.toFloat())
        val left = baseOuterPadding + horizontalPadding
        val right = width - (baseOuterPadding + horizontalPadding)
        var y = baseOuterPadding + verticalPadding

        val contentWidth = right - left
        val statusHeight = statusHeightFor(contentWidth)
        if (statusHeight > 0f) {
        drawStatus(canvas, y, left, contentWidth, statusHeight)
        y += statusHeight + rowGap()
        }

        layoutSnapshot.rows.forEachIndexed { index, row ->
            if (usesVerticalPanelScroll() && index == firstPanelRowIndex()) {
                val panelHeight = visiblePanelHeight()
                drawVerticalPanelRows(canvas, left, y, right - left, panelHeight)
                y += panelHeight + rowGap()
                return@forEachIndexed
            }
            if (usesVerticalPanelScroll() && index in firstPanelRowIndex() until firstPanelRowIndex() + layoutSnapshot.panelRowCount) {
                return@forEachIndexed
            }
            val rowHeight = rowHeightFor(index)
            drawRow(canvas, row, index, left, y, right - left, rowHeight)
            y += rowHeight + rowGap()
        }

        if (drawLongPressSwipeVisuals(canvas)) {
            postInvalidateOnAnimation()
        }
        if (pressEffects.draw(canvas, resolvedKeyRadius, activeKeyPaint.color)) {
            postInvalidateOnAnimation()
        }
        if (materialPressEffectAnimating) {
            postInvalidateOnAnimation()
        }
        if (voiceRecordingActive) {
            postInvalidateOnAnimation()
        }

        if (debugTouchOverlayEnabled) {
            drawDebugOverlay(canvas)
        }
        pruneHorizontalRowVisualState()
    }

    private fun drawLongPressSwipeVisuals(canvas: Canvas): Boolean {
        if (longPressSwipeVisualByPointerId.isEmpty()) {
            return false
        }
        val swipeEffect = KeyboardPressEffectPolicy.resolve(themeConfig, fieldPolicy.privateMode)
        val accent = activeKeyPaint.color
        var hasActiveVisual = false
        val toClear = mutableListOf<Int>()
        val now = SystemClock.uptimeMillis()
        val activePointers = longPressSwipeVisualByPointerId.toList()
        for ((pointerId, visual) in activePointers) {
            val state = pointerTracker.get(pointerId)
            if (state == null) {
                toClear.add(pointerId)
                continue
            }
            drawLongPressSwipeVisual(
                canvas = canvas,
                startX = visual.startX,
                startY = visual.startY,
                endX = state.latestX,
                endY = state.latestY,
                effectSpec = swipeEffect,
                accentColor = accent,
                phaseMs = now - visual.startedAtMs,
            )
            hasActiveVisual = true
        }
        toClear.forEach { pointerId ->
            longPressSwipeVisualByPointerId.remove(pointerId)
        }
        return hasActiveVisual
    }

    private fun drawLongPressSwipeVisual(
        canvas: Canvas,
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        effectSpec: KeyboardPressEffectSpec,
        accentColor: Int,
        phaseMs: Long,
    ) {
        val dx = endX - startX
        val dy = endY - startY
        val length = hypot(dx.toDouble(), dy.toDouble()).toFloat()
        if (length < dp(1f)) {
            return
        }
        val progress = ((phaseMs % 1800L) / 1800f)
        val intensity = effectSpec.intensity.coerceIn(0.2f, 1f)
        val unitX = dx / length
        val unitY = dy / length
        val normalX = -unitY
        val normalY = unitX
        val phase = phaseMs / 1000f * kotlin.math.PI.toFloat() * 2f
        when (effectSpec.effect) {
            "none" -> {
                drawSwipeRibbonPath(
                    canvas,
                    startX,
                    startY,
                    endX,
                    endY,
                    normalX,
                    normalY,
                    accentColor,
                    intensity = 0.45f,
                    phase = phase,
                    waveScale = 0.55f,
                    highlightProgress = null,
                )
            }
            "scale", "garland", "glow", "pulse" -> {
                drawSwipeRibbonPath(
                    canvas,
                    startX,
                    startY,
                    endX,
                    endY,
                    normalX,
                    normalY,
                    accentColor,
                    intensity,
                    phase,
                    waveScale = if (effectSpec.effect == "garland" || effectSpec.effect == "glow") 1f else 0.62f,
                    highlightProgress = if (effectSpec.effect == "pulse") progress else null,
                )
                drawSwipeEndpointBubbles(
                    canvas,
                    startX,
                    startY,
                    endX,
                    endY,
                    accentColor,
                    progress,
                    intensity,
                )
            }
            "shake", "edgeCompression" -> {
                drawSwipeRibbonPath(
                    canvas,
                    startX,
                    startY,
                    endX,
                    endY,
                    normalX,
                    normalY,
                    accentColor,
                    intensity,
                    phase,
                    waveScale = 1.35f,
                    highlightProgress = progress,
                )
            }
            "electricArc" -> {
                drawSwipeRibbonPath(
                    canvas,
                    startX,
                    startY,
                    endX,
                    endY,
                    normalX,
                    normalY,
                    accentColor,
                    intensity,
                    phase * 1.18f,
                    waveScale = 1.55f,
                    highlightProgress = progress,
                )
            }
            "specularSweep" -> {
                drawSwipeSpecularPath(
                    canvas,
                    startX,
                    startY,
                    endX,
                    endY,
                    accentColor,
                    intensity,
                    phase,
                    progress,
                )
            }
            "inkPress", "keycapTilt" -> {
                drawSwipeRibbonPath(
                    canvas,
                    startX,
                    startY,
                    endX,
                    endY,
                    normalX,
                    normalY,
                    accentColor,
                    intensity,
                    phase * 0.92f,
                    waveScale = 0.86f,
                    highlightProgress = progress,
                )
            }
            "confettiLite", "fireworksLite" -> {
                drawSwipeRibbonPath(
                    canvas,
                    startX,
                    startY,
                    endX,
                    endY,
                    normalX,
                    normalY,
                    accentColor,
                    intensity,
                    phase,
                    waveScale = 0.72f,
                    highlightProgress = null,
                )
                drawSwipeParticles(canvas, startX, startY, endX, endY, effectSpec, accentColor, progress)
            }
            else -> {
                drawSwipeRibbonPath(
                    canvas,
                    startX,
                    startY,
                    endX,
                    endY,
                    normalX,
                    normalY,
                    accentColor,
                    intensity,
                    phase,
                    waveScale = 0.72f,
                    highlightProgress = null,
                )
            }
        }
    }

    private fun drawSwipeRibbonPath(
        canvas: Canvas,
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        normalX: Float,
        normalY: Float,
        accentColor: Int,
        intensity: Float,
        phase: Float,
        waveScale: Float,
        highlightProgress: Float?,
    ) {
        val path = buildSwipeRibbonPath(startX, startY, endX, endY, normalX, normalY, phase, waveScale, intensity)
        val baseWidth = dp(4.1f * longPressSwipeStrokeThicknessScale * longPressSwipeGuidelineScale)
        longPressSwipeStrokePaint.color = colorWithOpacity(Color.BLACK, 0.18f)
        longPressSwipeStrokePaint.strokeWidth = baseWidth
        longPressSwipeStrokePaint.shader = null
        canvas.drawPath(path, longPressSwipeStrokePaint)

        longPressSwipeStrokePaint.color = colorWithOpacity(accentColor, 0.42f + 0.18f * intensity)
        longPressSwipeStrokePaint.strokeWidth = dp(2.3f * longPressSwipeStrokeThicknessScale) * intensity
        canvas.drawPath(path, longPressSwipeStrokePaint)

        val coreWidth = dp(1.05f * longPressSwipeStrokeThicknessScale * longPressSwipeGuidelineScale)
        longPressSwipeStrokePaint.color = colorWithOpacity(Color.WHITE, 0.18f + 0.16f * intensity)
        longPressSwipeStrokePaint.strokeWidth = coreWidth
        canvas.drawPath(path, longPressSwipeStrokePaint)

        if (highlightProgress != null) {
            val clampedProgress = highlightProgress.coerceIn(0f, 1f)
            val dx = endX - startX
            val dy = endY - startY
            val markerX = startX + dx * clampedProgress
            val markerY = startY + dy * clampedProgress
            longPressSwipeFillPaint.color = colorWithOpacity(Color.WHITE, 0.16f + 0.2f * intensity)
            canvas.drawCircle(markerX, markerY, dp(3.8f * longPressSwipeThicknessScale) * intensity, longPressSwipeFillPaint)
        }
    }

    private fun buildSwipeRibbonPath(
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        normalX: Float,
        normalY: Float,
        phase: Float,
        waveScale: Float,
        intensity: Float,
    ): Path {
        val dx = endX - startX
        val dy = endY - startY
        val length = hypot(dx.toDouble(), dy.toDouble()).toFloat()
        keyEffectPath.reset()
        if (length <= dp(1f)) {
            keyEffectPath.moveTo(startX, startY)
            keyEffectPath.lineTo(endX, endY)
            return keyEffectPath
        }
        keyEffectPath.moveTo(startX, startY)
        val segments = 24
        val fixedPhase = (startX * 0.013f + startY * 0.017f + endX * 0.019f + endY * 0.023f)
        for (index in 1..segments) {
            val t = index / segments.toFloat()
            val x = startX + dx * t
            val y = startY + dy * t
            val weight = (1f - kotlin.math.abs(0.5f - t) * 2f).coerceAtLeast(0f)
            val wave = sin((fixedPhase + phase + t * 15.5f).toDouble()).toFloat() *
                dp(2.15f * longPressSwipeGuidelineScale * waveScale) *
                intensity *
                (0.22f + 0.78f * weight)
            keyEffectPath.lineTo(
                x + normalX * wave,
                y + normalY * wave,
            )
        }
        return keyEffectPath
    }

    private fun drawSwipeArcPath(
        canvas: Canvas,
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        normalX: Float,
        normalY: Float,
        effectSpec: KeyboardPressEffectSpec,
        accentColor: Int,
        intensity: Float,
        phase: Float,
        wobble: Boolean,
    ) {
        val eased = 1f - easeOutPress(phase / kotlin.math.PI.toFloat() / 2f % 1f)
        keyEffectPath.reset()
        keyEffectPath.moveTo(startX, startY)
        val segments = 18
        for (index in 1..segments) {
            val t = index / segments.toFloat()
            val x = startX + (endX - startX) * t
            val y = startY + (endY - startY) * t
            if (wobble) {
                val offset = if (index % 2 == 0) 1f else -1f
                keyEffectPath.lineTo(
                    x + normalX * offset * dp(1.8f) * intensity * sin((phase + t * 12f).toDouble()).toFloat(),
                    y + normalY * offset * dp(1.8f) * intensity * sin((phase + t * 12f).toDouble()).toFloat(),
                )
            } else {
                val wave = if (effectSpec.effect == "garland" || effectSpec.effect == "glow") {
                    sin((phase + t * 8f).toDouble()).toFloat() * dp(1.2f) * intensity * eased
                } else {
                    0f
                }
                keyEffectPath.lineTo(
                    x + normalX * wave,
                    y + normalY * wave,
                )
            }
        }
        longPressSwipeStrokePaint.strokeWidth =
            if (effectSpec.effect == "scale") {
                dp(2.6f * longPressSwipeStrokeThicknessScale) * intensity
            } else if (effectSpec.effect == "pulse") {
                dp(2.2f * longPressSwipeStrokeThicknessScale) * intensity
            } else if (effectSpec.effect == "garland" || effectSpec.effect == "glow") {
                dp(2.8f * longPressSwipeStrokeThicknessScale) * intensity
            } else if (wobble) {
                dp(1.9f * longPressSwipeStrokeThicknessScale) * intensity
            } else {
                dp(2f * longPressSwipeStrokeThicknessScale) * intensity
            }
        longPressSwipeStrokePaint.color = colorWithOpacity(accentColor, 0.52f + 0.12f * intensity)
        canvas.drawPath(keyEffectPath, longPressSwipeStrokePaint)
    }

    private fun drawSwipeEndpointBubbles(
        canvas: Canvas,
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        accentColor: Int,
        progress: Float,
        intensity: Float,
    ) {
        val trailPhase = (1f - (progress * 0.5f + 0.5f).coerceIn(0f, 1f))
        longPressSwipeFillPaint.color = colorWithOpacity(accentColor, 0.38f + 0.22f * trailPhase * intensity)
        canvas.drawCircle(startX, startY, dp(3f * longPressSwipeThicknessScale), longPressSwipeFillPaint)
        longPressSwipeFillPaint.color = colorWithOpacity(Color.WHITE, 0.28f + 0.22f * intensity)
        canvas.drawCircle(endX, endY, dp(4.4f * longPressSwipeThicknessScale) * (0.7f + 0.3f * intensity), longPressSwipeFillPaint)
    }

    private fun drawSwipeElectricPath(
        canvas: Canvas,
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        accentColor: Int,
        intensity: Float,
        phase: Float,
        normalX: Float,
        normalY: Float,
    ) {
        keyEffectPath.reset()
        keyEffectPath.moveTo(startX, startY)
        val segments = 22
        for (index in 1..segments) {
            val t = index / segments.toFloat()
            val x = startX + (endX - startX) * t
            val y = startY + (endY - startY) * t
            val wave = sin((phase + index * 1.4f).toDouble()).toFloat() * dp(2.8f) * intensity
            keyEffectPath.lineTo(x + normalX * wave, y + normalY * wave)
        }
        longPressSwipeStrokePaint.color = colorWithOpacity(accentColor, 0.36f + 0.18f * intensity)
        longPressSwipeStrokePaint.strokeWidth = dp(1.7f * longPressSwipeStrokeThicknessScale) * intensity
        canvas.drawPath(keyEffectPath, longPressSwipeStrokePaint)
        longPressSwipeStrokePaint.color = colorWithOpacity(Color.WHITE, 0.22f)
        longPressSwipeStrokePaint.strokeWidth = dp(0.9f * longPressSwipeStrokeThicknessScale)
        longPressSwipeStrokePaint.shader = null
        canvas.drawCircle(endX, endY, dp(5.2f * longPressSwipeThicknessScale) * intensity, longPressSwipeStrokePaint)
    }

    private fun drawSwipeSpecularPath(
        canvas: Canvas,
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        accentColor: Int,
        intensity: Float,
        phase: Float,
        progress: Float,
    ) {
        val dx = endX - startX
        val dy = endY - startY
        val length = hypot(dx.toDouble(), dy.toDouble()).toFloat()
        if (length <= 0f) return
        val normalX = -dy / length
        val normalY = dx / length
        drawSwipeRibbonPath(
            canvas,
            startX,
            startY,
            endX,
            endY,
            normalX,
            normalY,
            accentColor,
            intensity,
            phase,
            waveScale = 0.72f,
            highlightProgress = null,
        )
        val sweepT = progress
        val sparkleX = startX + (endX - startX) * sweepT
        val sparkleY = startY + (endY - startY) * sweepT
        longPressSwipeFillPaint.shader =
            LinearGradient(
                startX,
                startY,
                sparkleX,
                sparkleY,
                intArrayOf(
                    colorWithOpacity(Color.WHITE, 0f),
                    colorWithOpacity(Color.WHITE, 0.3f + 0.15f * intensity),
                    colorWithOpacity(Color.WHITE, 0f),
                ),
                floatArrayOf(0f, 0.5f, 1f),
                Shader.TileMode.CLAMP,
        )
        canvas.drawCircle(sparkleX, sparkleY, dp(6f * longPressSwipeThicknessScale) * intensity, longPressSwipeFillPaint)
        longPressSwipeFillPaint.shader = null
    }

    private fun drawSwipeInkRibbon(
        canvas: Canvas,
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        accentColor: Int,
        intensity: Float,
        phase: Float,
    ) {
        longPressSwipeFillPaint.color = colorWithOpacity(accentColor, 0.12f + 0.16f * intensity)
        longPressSwipeStrokePaint.color = colorWithOpacity(accentColor, 0.5f + 0.18f * intensity)
        longPressSwipeStrokePaint.strokeWidth = dp(2.5f * longPressSwipeStrokeThicknessScale) * intensity
        canvas.drawLine(startX, startY, endX, endY, longPressSwipeStrokePaint)
        val pulse = ((sin(phase * 0.95f) * 0.5f + 0.5f) * 0.45f)
        val markerX = startX + (endX - startX) * (0.18f + 0.64f * pulse)
        val markerY = startY + (endY - startY) * (0.18f + 0.64f * pulse)
        longPressSwipeFillPaint.color = colorWithOpacity(Color.WHITE, 0.2f + 0.16f * intensity * (1f - pulse))
        canvas.drawCircle(markerX, markerY, dp(3.8f * longPressSwipeThicknessScale), longPressSwipeFillPaint)
    }

    private fun drawSwipeParticles(
        canvas: Canvas,
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        effectSpec: KeyboardPressEffectSpec,
        accentColor: Int,
        progress: Float,
    ) {
        val radiusBase =
            (if (effectSpec.effect == "fireworksLite") dp(3.6f) else dp(2.5f)) *
                longPressSwipeThicknessScale
        val particleCount = if (effectSpec.effect == "fireworksLite") 15 else 9
        val dx = endX - startX
        val dy = endY - startY
        val dirX = if (dx == 0f) 1f else dx
        val dirY = if (dy == 0f) 1f else dy
        val spread = dp(8f) * progress
        for (index in 0 until particleCount) {
            val localProgress = ((index.toFloat() / particleCount) + progress * 0.85f) % 1f
            val angle = (Math.PI * 2.0 * localProgress).toFloat()
            val distance = spread * (0.35f + 0.65f * localProgress)
            val x = endX + kotlin.math.cos(angle) * distance + (index % 2 - 0.5f) * dirX * 0.012f
            val y = endY + kotlin.math.sin(angle) * distance + (index % 2 - 0.5f) * dirY * 0.012f
            val alpha = (200f * (1f - localProgress)).toInt().coerceIn(0, 200)
            longPressSwipeFillPaint.color = colorWithOpacity(
                when (index % 4) {
                    0 -> Color.WHITE
                    1 -> accentColor
                    2 -> Color.YELLOW
                    else -> Color.CYAN
                },
                alpha / 255f,
            )
            canvas.drawCircle(x, y, radiusBase * (1f - localProgress * 0.45f), longPressSwipeFillPaint)
        }
    }

    private fun registerLongPressSwipeVisual(pointerId: Int) {
        val state = pointerTracker.get(pointerId) ?: return
        longPressSwipeVisualByPointerId[pointerId] =
            LongPressSwipeVisual(
                startX = state.startX,
                startY = state.startY,
                startedAtMs = SystemClock.uptimeMillis(),
            )
    }

    private fun updateLongPressSwipeHoveredTarget(state: KeyboardPointerState<KeyFrame>) {
        // Contract: only dispatch-owned pointers may project hover state onto a
        // target key. This keeps the visual beam and release target aligned.
        if (!longPressSwipeDispatchPointerIds.contains(state.pointerId)) {
            clearLongPressSwipeHoveredKey(state.pointerId)
            return
        }
        val startKeyId = longPressSwipeStartKeyIdByPointerId[state.pointerId]
        if (startKeyId == null) {
            clearLongPressSwipeHoveredKey(state.pointerId)
            return
        }
        val hoveredHit = hitTest(state.latestX, state.latestY)
        val hoveredSelection =
            if (
                hoveredHit != null &&
                hoveredHit.key.id != startKeyId &&
                isLongPressSwipeHoverEligible(hoveredHit.key)
            ) {
                longPressSwipeSelectionForTarget(
                    frame = hoveredHit,
                    x = state.latestX,
                    y = state.latestY,
                )
            } else {
                null
            }
        val hoveredKeyId = if (hoveredSelection != null) hoveredHit?.key?.id else null
        setLongPressSwipeHoveredKey(state.pointerId, hoveredKeyId, hoveredSelection)
    }

    private fun isLongPressSwipeHoverEligible(key: KeyboardKeySpec): Boolean {
        return key.enabled &&
            cornerModeEnabled &&
            allowsCornerGesture(key) &&
            longPressSwipeTargetSelections(key).isNotEmpty()
    }

    private fun longPressSwipeTargetSelections(key: KeyboardKeySpec): List<GestureSelection> {
        return listOfNotNull(
            GestureSelection.Up.takeIf { key.cornerAssignments.up != null },
            GestureSelection.Right.takeIf { key.cornerAssignments.right != null },
            GestureSelection.Down.takeIf { key.cornerAssignments.down != null },
            GestureSelection.Left.takeIf { key.cornerAssignments.left != null },
        )
    }

    private fun longPressSwipeSelectionForTarget(
        frame: KeyFrame,
        x: Float,
        y: Float,
    ): GestureSelection? {
        return KeyboardLongPressSwipePolicy.chooseTargetSelection(
            candidates = longPressSwipeTargetSelections(frame.key),
            targetX = x,
            targetY = y,
            centerX = frame.touchRect.centerX(),
            centerY = frame.touchRect.centerY(),
        )
    }

    private fun setLongPressSwipeHoveredKey(
        pointerId: Int,
        keyId: String?,
        selection: GestureSelection?,
    ) {
        val previousKeyId = longPressSwipeHoveredKeyByPointerId[pointerId]
        val previousSelection = longPressSwipeHoveredSelectionByPointerId[pointerId]
        if (previousKeyId == keyId && previousSelection == selection) {
            return
        }
        previousKeyId?.let { previous ->
            val currentCount = (longPressSwipeHoveredKeyCountById[previous] ?: 0) - 1
            if (currentCount <= 0) {
                longPressSwipeHoveredKeyCountById.remove(previous)
            } else {
                longPressSwipeHoveredKeyCountById[previous] = currentCount
            }
        }
        if (keyId == null) {
            longPressSwipeHoveredKeyByPointerId.remove(pointerId)
            longPressSwipeHoveredSelectionByPointerId.remove(pointerId)
            return
        }
        longPressSwipeHoveredKeyByPointerId[pointerId] = keyId
        if (selection != null) {
            longPressSwipeHoveredSelectionByPointerId[pointerId] = selection
        } else {
            longPressSwipeHoveredSelectionByPointerId.remove(pointerId)
        }
        longPressSwipeHoveredKeyCountById[keyId] = (longPressSwipeHoveredKeyCountById[keyId] ?: 0) + 1
    }

    private fun clearLongPressSwipeHoveredKey(pointerId: Int) {
        val keyId = longPressSwipeHoveredKeyByPointerId.remove(pointerId) ?: return
        longPressSwipeHoveredSelectionByPointerId.remove(pointerId)
        val currentCount = (longPressSwipeHoveredKeyCountById[keyId] ?: 1) - 1
        if (currentCount <= 0) {
            longPressSwipeHoveredKeyCountById.remove(keyId)
        } else {
            longPressSwipeHoveredKeyCountById[keyId] = currentCount
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        return runKeyboardSafely("onTouchEvent:${event.actionMasked}") {
            handleTouchEvent(event)
        } ?: true
    }

    private fun handleTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                return startGesture(event.getPointerId(event.actionIndex), event.x, event.y)
            }
            MotionEvent.ACTION_POINTER_DOWN -> {
                val index = event.actionIndex
                return startGesture(event.getPointerId(index), event.getX(index), event.getY(index))
            }
            MotionEvent.ACTION_MOVE -> return handleMoveEvent(event)
            MotionEvent.ACTION_UP -> {
                return finishGesture(event.getPointerId(event.actionIndex), event.x, event.y)
            }
            MotionEvent.ACTION_POINTER_UP -> {
                val index = event.actionIndex
                return finishGesture(event.getPointerId(index), event.getX(index), event.getY(index))
            }
            MotionEvent.ACTION_CANCEL -> {
                cancelAllPointers("cancel")
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    private fun startGesture(
        pointerId: Int,
        x: Float,
        y: Float,
    ): Boolean {
        if (pointerTracker.isProtectedByOtherPointer(pointerId)) {
            debugGestureText =
                "pointer suppressed pointer=$pointerId owner=${pointerTracker.protectedOwnerPointerId}"
            invalidate()
            return true
        }
        val hit = hitTest(x, y)
        if (hit == null || !hit.key.enabled) {
            return false
        }
        val state = pointerTracker.startPointer(pointerId, hit.key.id, hit, x, y)
        updateDebugPointer(state)
        if (hit.rowScrollable && !hit.rowId.isNullOrBlank()) {
            cancelHorizontalRowAnimation(hit.rowId)
        }
        scheduleLongPress(pointerId)
        debugGestureText = "start pointer=$pointerId key=${hit.key.id}"
        invalidate()
        return true
    }

    private fun handleMoveEvent(event: MotionEvent): Boolean {
        val activePointers = pointerTracker.activeStates()
        if (activePointers.isEmpty()) {
            return false
        }
        activePointers.forEach { state ->
            val pointerIndex = event.findPointerIndex(state.pointerId)
            if (pointerIndex < 0) {
                cancelPointer(state.pointerId, "missing pointer=${state.pointerId}")
                return@forEach
            }
            val updated =
                pointerTracker.updatePosition(
                    pointerId = state.pointerId,
                    x = event.getX(pointerIndex),
                    y = event.getY(pointerIndex),
                ) ?: return@forEach
            updateDebugPointer(updated)
            if (pointerTracker.isProtectedByOtherPointer(updated.pointerId)) {
                cancelPointer(
                    updated.pointerId,
                    "pointer canceled pointer=${updated.pointerId} protected=${pointerTracker.protectedInteraction}",
                )
                return@forEach
            }
            val activatedLongPressSwipe = tryActivateLongPressSwipeFromExit(updated)
            if (activatedLongPressSwipe) {
                updateLongPressSwipeHoveredTarget(updated)
                return@forEach
            }
            updateLongPressSwipeHoveredTarget(updated)
            val dx = updated.latestX - updated.startX
            val dy = updated.latestY - updated.startY
            handleSpaceSlider(updated, dx, dy)
            handleHorizontalRowScroll(updated, dx, updated.latestX)
            handleVerticalPanelScroll(updated, dy, updated.latestY)
            maybeScheduleGestureRepeat(updated)
            val distance = hypot(dx.toDouble(), dy.toDouble()).toFloat()
            debugGestureText =
                "move ptr=${updated.pointerId} dir=${directionFrom(dx, dy)} dist=${distance.toInt()} max=${updated.maxDistanceFromStart.toInt()} lock=${pointerTracker.protectedInteraction ?: "none"}"
        }
        invalidate()
        return true
    }

    private fun tryActivateLongPressSwipeFromExit(state: KeyboardPointerState<KeyFrame>): Boolean {
        // Contract: long-press swipe is an exit transition from the origin key.
        // Protected gestures and already-triggered long-press branches keep
        // ownership instead of allowing a second dispatch mode to launch.
        val key = state.payload.key
        val pointerInsideStartKey = state.payload.touchRect.contains(state.latestX, state.latestY)
        if (
            key.enabled &&
            !pointerInsideStartKey &&
            isCtrlModifierKey(key) &&
            ctrlHoldPointerIds.contains(state.pointerId)
        ) {
            return activateCtrlHoldSwipeDispatchMode(state.pointerId, key)
        }
        if (!KeyboardLongPressSwipePolicy.canActivateFromKeyExit(
                consumedByProtectedInteraction = state.consumedByProtectedInteraction,
                longPressTriggered = state.longPressTriggered,
                keyEnabled = key.enabled,
                pointerInsideStartKey = pointerInsideStartKey,
            )
        ) {
            return false
        }
        if (isCtrlModifierKey(key) || canLaunchCtrlSwipeFromFrame(state)) {
            return activateCtrlHoldSwipeMode(state.pointerId, key)
        }
        if (key.actionDescriptorPrimary && key.actionDescriptorId != null) {
            return activateActionLongPressSwipeMode(
                pointerId = state.pointerId,
                actionDescriptorId = key.actionDescriptorId,
                startKeyId = key.id,
            )
        }
        return false
    }

    private fun activateCtrlHoldSwipeMode(
        pointerId: Int,
        key: KeyboardKeySpec,
    ): Boolean {
        if (!activateCtrlHoldMode(pointerId, lockSurface = false)) {
            return false
        }
        activateCtrlHoldSwipeDispatchMode(pointerId, key)
        performKeyboardHaptic(HapticFeedbackConstants.LONG_PRESS)
        invalidate()
        return true
    }

    private fun canLaunchCtrlSwipeFromFrame(state: KeyboardPointerState<KeyFrame>): Boolean {
        val frame = state.payload
        if (
            KeyboardLongPressSwipePolicy.shouldPreserveSpaceSliderGesture(
                startKeyIsSpace = isSpaceKey(frame.key),
                dx = state.latestX - state.startX,
                dy = state.latestY - state.startY,
                spaceSlideStartPx = spaceSlideStartPx,
            )
        ) {
            return false
        }
        return KeyboardLongPressSwipePolicy.canLaunchCtrlSwipeFromRow(
            startRowIndex = frame.rowIndex,
            ctrlRowIndex = ctrlSwipeLaunchRowIndex(),
            rowScrollable = frame.rowScrollable,
            panelScrollable = frame.panelScrollable,
        )
    }

    private fun ctrlSwipeLaunchRowIndex(): Int? {
        return keyFrames.firstOrNull { isCtrlModifierKey(it.key) }?.rowIndex
    }

    private fun activateCtrlHoldMode(
        pointerId: Int,
        lockSurface: Boolean,
    ): Boolean {
        if (ctrlHoldPointerIds.contains(pointerId)) {
            return false
        }
        clearLongPress(pointerId)
        acquireProtectedInteraction(pointerId, KeyboardProtectedInteraction.LongPressAction)
        pointerTracker.markLongPressTriggered(pointerId)
        ctrlHoldPointerIds.add(pointerId)
        clearCtrlFamilyModifiers()
        lastCtrlTapAtMs = 0L
        if (lockSurface) {
            ctrlActionSurfaceLocked = true
            setStatus("Ctrl actions locked")
        } else {
            setStatus("Ctrl")
        }
        return true
    }

    private fun activateCtrlHoldSwipeDispatchMode(
        pointerId: Int,
        key: KeyboardKeySpec,
    ): Boolean {
        if (longPressSwipeDispatchPointerIds.contains(pointerId)) {
            return false
        }
        longPressSwipeDispatchPointerIds.add(pointerId)
        longPressSwipeStartKeyIdByPointerId[pointerId] = key.id
        longPressSwipeActionDescriptorByPointerId[pointerId] = null
        longPressSwipeActionPinnedBeforeByPointerId[pointerId] = false
        longPressSwipeActionRowsBeforeByPointerId[pointerId] = emptySet()
        registerLongPressSwipeVisual(pointerId)
        return true
    }

    private fun activateActionLongPressSwipeMode(
        pointerId: Int,
        actionDescriptorId: String,
        startKeyId: String,
    ): Boolean {
        val baselineState = actionBarState
        val result =
            actionBarController.onLongPress(
                actionId = actionDescriptorId,
                state = actionBarState,
                environment = actionEnvironment(),
            )
        if (!result.consumed) {
            setStatus(result.status ?: "Action unavailable")
            return false
        }
        clearLongPress(pointerId)
        acquireProtectedInteraction(pointerId, KeyboardProtectedInteraction.LongPressAction)
        pointerTracker.markLongPressTriggered(pointerId)
        longPressSwipeDispatchPointerIds.add(pointerId)
        longPressSwipeStartKeyIdByPointerId[pointerId] = startKeyId
        longPressSwipeActionDescriptorByPointerId[pointerId] = actionDescriptorId
        longPressSwipeActionPinnedBeforeByPointerId[pointerId] =
            actionBarState.pinnedActionIds.contains(actionDescriptorId)
        longPressSwipeActionRowsBeforeByPointerId[pointerId] =
            actionBarState.attachedRows
                .filter { it.providerActionId == actionDescriptorId }
                .map { it.rowId }
                .toSet()
        registerLongPressSwipeVisual(pointerId)
        val safeResult = removeSwipePinMutationOnly(baselineState, result)
        setActionBarState(safeResult.nextState)
        if (actionDescriptorId == "numbers" && layoutMode == KeyboardLayoutMode.Numbers) {
            layoutMode = KeyboardLayoutMode.Letters
            panelMode = KeyboardPanelMode.None
            shifted = false
        }
        safeResult.status?.let { setStatus(it) }
        clearHorizontalRowScrollState()
        reconcileActionBarState()
        refreshLayout()
        performKeyboardHaptic(HapticFeedbackConstants.LONG_PRESS)
        invalidate()
        return true
    }

    private fun removeSwipePinMutationOnly(
        baseline: KeyboardActionBarState,
        result: KeyboardActionLongPressResult,
    ): KeyboardActionLongPressResult {
        if (
            result.nextState.pinnedActionIds != baseline.pinnedActionIds &&
            result.nextState.attachedRows == baseline.attachedRows &&
            result.nextState.rowPageById == baseline.rowPageById
        ) {
            return result.copy(
                status = null,
                nextState = result.nextState.copy(
                    pinnedActionIds = baseline.pinnedActionIds,
                ),
            )
        }
        return result
    }

    private fun finishGesture(
        pointerId: Int,
        x: Float,
        y: Float,
    ): Boolean {
        val state = pointerTracker.get(pointerId)
        if (state == null) {
            debugGestureText = "ignored pointer-up pointer=$pointerId active=${pointerTracker.activeStates().size}"
            invalidate()
            return true
        }
        val updated = pointerTracker.updatePosition(pointerId, x, y) ?: state
        clearLongPress(pointerId)
        clearGestureRepeatCandidate(pointerId)
        stopRepeat(pointerId)
        val key = updated.payload.key
        if (!key.enabled) {
            removePointerState(pointerId)
            invalidate()
            return true
        }
        if (updated.consumedByProtectedInteraction || updated.longPressTriggered) {
            if (tryDispatchAfterLongPressSwipe(pointerId, updated, x, y)) {
                removePointerState(pointerId)
                invalidate()
                return true
            }
            if (scrollingHorizontalRow && horizontalScrollOwnerPointerId == pointerId) {
                finishHorizontalRowScroll()
            }
            debugGestureText =
                "up key=${key.id} consumed lock=${pointerTracker.protectedInteraction ?: "none"}"
            removePointerState(pointerId)
            invalidate()
            return true
        }
        val selection =
            effectiveGestureSelection(
                key = key,
                sample =
                    GestureSample(
                        startX = updated.startX,
                        startY = updated.startY,
                        endX = x,
                        endY = y,
                        maxDistanceFromStart = updated.maxDistanceFromStart,
                    ),
            )
        debugGestureText =
            "up key=${key.id} sel=${selection.name} tap=${gestureThresholds.tapSlopPx.toInt()} corner=${gestureThresholds.cornerThresholdPx.toInt()}"
        dispatch(key, selection, updated.payload)
        retainPressedHighlight(key.id)
        removePointerState(pointerId)
        invalidate()
        return true
    }

    private fun cancelAllPointers(reason: String) {
        val removedPointers = pointerTracker.removeAllPointers()
        removedPointers.forEach { state ->
            cleanupPointerStateAfterRemoval(state.pointerId)
        }
        stopRepeat()
        debugGestureText = reason
        invalidate()
    }

    private fun cancelPointer(
        pointerId: Int,
        reason: String,
    ) {
        if (scrollingHorizontalRow && horizontalScrollOwnerPointerId == pointerId) {
            finishHorizontalRowScroll()
        }
        removePointerState(pointerId)
        debugGestureText = reason
    }

    private fun removePointerState(pointerId: Int) {
        pointerTracker.removePointer(pointerId) ?: return
        cleanupPointerStateAfterRemoval(pointerId)
    }

    private fun cleanupPointerStateAfterRemoval(pointerId: Int) {
        clearLongPress(pointerId)
        clearGestureRepeatCandidate(pointerId)
        if (repeatOwnerPointerId == pointerId) {
            stopRepeat(pointerId)
        }
        ctrlHoldPointerIds.remove(pointerId)
        val hadSwipeVisual = longPressSwipeVisualByPointerId.remove(pointerId) != null
        if (longPressSwipeDispatchPointerIds.remove(pointerId) || hadSwipeVisual) {
            longPressSwipeStartKeyIdByPointerId.remove(pointerId)
            longPressSwipeActionDescriptorByPointerId.remove(pointerId)
            longPressSwipeActionPinnedBeforeByPointerId.remove(pointerId)
            longPressSwipeActionRowsBeforeByPointerId.remove(pointerId)
            clearLongPressSwipeHoveredKey(pointerId)
        }
        if (slidingSpaceOwnerPointerId == pointerId) {
            slidingSpace = false
            slidingSpaceOwnerPointerId = MotionEvent.INVALID_POINTER_ID
            lastSlideStep = 0
        }
        if (horizontalScrollOwnerPointerId == pointerId) {
            scrollingHorizontalRow = false
            horizontalScrollOwnerPointerId = MotionEvent.INVALID_POINTER_ID
            lastHorizontalScrollX = 0f
            activeHorizontalRowId = null
            horizontalGestureStartOffset = 0f
            horizontalGestureDragDx = 0f
        }
        if (verticalScrollOwnerPointerId == pointerId) {
            scrollingVerticalPanel = false
            verticalScrollOwnerPointerId = MotionEvent.INVALID_POINTER_ID
            lastVerticalScrollY = 0f
        }
    }

    private fun scheduleLongPress(pointerId: Int) {
        val token = pointerTracker.nextLongPressToken(pointerId) ?: return
        clearLongPress(pointerId)
        val runnable =
            Runnable {
                handleLongPress(pointerId, token)
            }
        longPressRunnablesByPointerId[pointerId] = runnable
        postDelayed(runnable, longPressDelayMs)
    }

    private fun clearLongPress(pointerId: Int) {
        longPressRunnablesByPointerId.remove(pointerId)?.let { removeCallbacks(it) }
    }

    private fun updateDebugPointer(pointerState: KeyboardPointerState<KeyFrame>) {
        debugPrimaryStartX = pointerState.startX
        debugPrimaryStartY = pointerState.startY
        debugPrimaryPointerX = pointerState.latestX
        debugPrimaryPointerY = pointerState.latestY
    }

    fun cancelAllPointerGestures(reason: String = "reset") {
        cancelAllPointers(reason)
    }

    private fun handleLongPress(
        pointerId: Int,
        token: Int,
    ) {
        runKeyboardSafely("handleLongPress:${pointerTracker.get(pointerId)?.keyId ?: "none"}") {
            handleLongPressUnsafe(pointerId, token)
        }
    }

    private fun handleLongPressUnsafe(
        pointerId: Int,
        token: Int,
    ) {
        if (!pointerTracker.isLongPressTokenCurrent(pointerId, token)) {
            return
        }
        val state = pointerTracker.get(pointerId) ?: return
        if (pointerTracker.isProtectedByOtherPointer(pointerId)) {
            return
        }
        val key = state.payload.key
        if (!key.enabled || slidingSpace || scrollingHorizontalRow) {
            return
        }
        debugGestureText = "long key=${key.id} ptr=$pointerId"
        if (canRepeatPrimaryKey(key)) {
            acquireProtectedInteraction(pointerId, KeyboardProtectedInteraction.LongPressRepeat)
            pointerTracker.markLongPressTriggered(pointerId)
            startRepeat(pointerId, key, state.payload)
        } else if (isCtrlModifierKey(key)) {
            if (KeyboardCtrlSurfaceModePolicy.shouldUnlockOnLongPress(ctrlActionSurfaceLocked)) {
                clearLongPress(pointerId)
                acquireProtectedInteraction(pointerId, KeyboardProtectedInteraction.LongPressAction)
                pointerTracker.markLongPressTriggered(pointerId)
                unlockCtrlActionSurface()
                invalidate()
                return
            }
            if (!activateCtrlHoldMode(pointerId, lockSurface = true)) {
                invalidate()
                return
            }
        } else if (key.actionDescriptorPrimary && key.actionDescriptorId != null) {
            val actionDescriptorId = key.actionDescriptorId
            val result =
                actionBarController.onLongPress(
                    actionId = actionDescriptorId,
                    state = actionBarState,
                    environment = actionEnvironment(),
                )
            if (!result.consumed) {
                invalidate()
                return
            }
            acquireProtectedInteraction(pointerId, KeyboardProtectedInteraction.LongPressAction)
            pointerTracker.markLongPressTriggered(pointerId)
            setActionBarState(result.nextState)
            if (key.actionDescriptorId == "numbers" && layoutMode == KeyboardLayoutMode.Numbers) {
                layoutMode = KeyboardLayoutMode.Letters
                panelMode = KeyboardPanelMode.None
                shifted = false
            }
            result.status?.let { setStatus(it) }
            clearHorizontalRowScrollState()
            reconcileActionBarState()
            refreshLayout()
        } else if (key.action == KeyboardKeyAction.Shift) {
            acquireProtectedInteraction(pointerId, KeyboardProtectedInteraction.LongPressAction)
            pointerTracker.markLongPressTriggered(pointerId)
            if (layoutMode == KeyboardLayoutMode.Symbols) {
                cycleSymbolPage()
            } else {
                shiftLocked = true
                shifted = true
                setStatus("Shift locked")
            }
            refreshLayout()
        } else if (dispatchLongPressShortcut(key, state.payload)) {
            acquireProtectedInteraction(pointerId, KeyboardProtectedInteraction.LongPressAction)
            pointerTracker.markLongPressTriggered(pointerId)
        } else {
            invalidate()
            return
        }
        performKeyboardHaptic(HapticFeedbackConstants.LONG_PRESS)
        invalidate()
    }

    private fun canRepeatPrimaryKey(key: KeyboardKeySpec): Boolean {
        if (key.action in repeatingActions) {
            return true
        }
        if (key.action == KeyboardKeyAction.Text && key.id != "space") {
            return true
        }
        return key.action == KeyboardKeyAction.KeyValue &&
            key.keyValue?.kind == KeyboardKeyValueKind.Text &&
            !key.keyValue.text.isNullOrEmpty()
    }

    private fun dispatchLongPressShortcut(
        key: KeyboardKeySpec,
        sourceFrame: KeyFrame?,
    ): Boolean {
        if (cornerModeEnabled && allowsCornerGesture(key)) {
            val shortcut = key.cornerAssignments.topLeft
            if (shortcut != null) {
                if (!dispatchKeyValue(shortcut.value, GestureSelection.TopLeft, clearModifiersAfter = true)) {
                    setStatus("Long press shortcut unavailable")
                }
                return true
            }
        }
        dispatch(key, GestureSelection.PrimaryTap, sourceFrame)
        return true
    }

    private fun startRepeat(
        pointerId: Int,
        key: KeyboardKeySpec,
        sourceFrame: KeyFrame?,
        selection: GestureSelection = GestureSelection.PrimaryTap,
        dispatchImmediately: Boolean = true,
    ) {
        stopRepeat()
        repeatOwnerPointerId = pointerId
        repeatActionKey = key
        repeatActionSelection = selection
        repeatSourceFrame = sourceFrame
        val runnable =
            object : Runnable {
                override fun run() {
                    if (repeatOwnerPointerId != pointerId || !pointerTracker.contains(pointerId)) {
                        stopRepeat(pointerId)
                        return
                    }
                    val repeatKey = repeatActionKey ?: return
                    dispatch(repeatKey, repeatActionSelection, repeatSourceFrame)
                    postDelayed(this, repeatDelayForPointer(pointerId, repeatKey, repeatActionSelection))
                }
            }
        repeatRunnable = runnable
        if (dispatchImmediately) {
            dispatch(key, selection, sourceFrame)
        }
        postDelayed(runnable, repeatDelayForPointer(pointerId, key, selection))
    }

    private fun repeatDelayForPointer(
        pointerId: Int,
        key: KeyboardKeySpec,
        selection: GestureSelection,
    ): Long {
        if (!canAccelerateRepeat(key, selection)) {
            return repeatDelayMs
        }
        val state = pointerTracker.get(pointerId) ?: return repeatDelayMs
        val distanceBoost =
            when {
                state.maxDistanceFromStart >= dp(180f) -> 3
                state.maxDistanceFromStart >= dp(120f) -> 2
                state.maxDistanceFromStart >= dp(72f) -> 1
                else -> 0
            }
        val activityBoost =
            when {
                state.totalTravelDistance >= dp(360f) -> 2
                state.totalTravelDistance >= dp(180f) -> 1
                else -> 0
            }
        return when ((distanceBoost + activityBoost).coerceIn(0, 4)) {
            0 -> repeatDelayMs
            1 -> 56L
            2 -> 44L
            3 -> 34L
            else -> 26L
        }
    }

    private fun canAccelerateRepeat(
        key: KeyboardKeySpec,
        selection: GestureSelection,
    ): Boolean {
        return if (selection == GestureSelection.PrimaryTap) {
            key.action in repeatingActions
        } else {
            val value = keyValueForSelection(key, selection) ?: return false
            shouldRepeatGestureSelection(selection, value)
        }
    }

    private fun stopRepeat(ownerPointerId: Int? = null) {
        if (ownerPointerId != null && repeatOwnerPointerId != ownerPointerId) {
            return
        }
        repeatRunnable?.let { removeCallbacks(it) }
        repeatRunnable = null
        repeatActionKey = null
        repeatActionSelection = GestureSelection.PrimaryTap
        repeatSourceFrame = null
        repeatOwnerPointerId = MotionEvent.INVALID_POINTER_ID
    }

    private fun acquireProtectedInteraction(
        pointerId: Int,
        interaction: KeyboardProtectedInteraction,
    ) {
        val canceled = pointerTracker.acquireProtectedInteraction(pointerId, interaction)
        canceled.forEach { state ->
            cleanupPointerStateAfterRemoval(state.pointerId)
        }
    }

    private fun handleSpaceSlider(
        state: KeyboardPointerState<KeyFrame>,
        dx: Float,
        dy: Float,
    ) {
        val key = state.payload.key
        if (slidingSpace && slidingSpaceOwnerPointerId != state.pointerId) {
            return
        }
        if (!isSpaceKey(key) || abs(dx) < spaceSlideStartPx || abs(dx) < abs(dy) * 1.25f) {
            return
        }
        if (!slidingSpace) {
            acquireProtectedInteraction(state.pointerId, KeyboardProtectedInteraction.SpaceSlider)
            pointerTracker.markConsumedByProtectedInteraction(state.pointerId)
            slidingSpace = true
            slidingSpaceOwnerPointerId = state.pointerId
            lastSlideStep = 0
        }
        clearLongPress(state.pointerId)
        val step = (dx / spaceSlideStepPx).toInt()
        val delta = step - lastSlideStep
        if (delta == 0) {
            return
        }
        repeat(abs(delta)) {
            val moved =
                if (delta > 0) {
                    callbacks.onNavigateCharRight()
                } else {
                    callbacks.onNavigateCharLeft()
                }
            if (!moved) {
                setStatus("Cursor slide unavailable")
                return@repeat
            }
        }
        lastSlideStep = step
    }

    private fun maybeScheduleGestureRepeat(state: KeyboardPointerState<KeyFrame>) {
        val pointerId = state.pointerId
        if (
            state.consumedByProtectedInteraction ||
            state.longPressTriggered ||
            slidingSpace ||
            scrollingHorizontalRow ||
            scrollingVerticalPanel ||
            longPressSwipeDispatchPointerIds.contains(pointerId)
        ) {
            clearGestureRepeatCandidate(pointerId)
            return
        }
        val key = state.payload.key
        val selection =
            effectiveGestureSelection(
                key = key,
                sample =
                    GestureSample(
                        startX = state.startX,
                        startY = state.startY,
                        endX = state.latestX,
                        endY = state.latestY,
                        maxDistanceFromStart = state.maxDistanceFromStart,
                    ),
            )
        val value = keyValueForSelection(key, selection) ?: run {
            clearGestureRepeatCandidate(pointerId)
            return
        }
        if (!shouldRepeatGestureSelection(selection, value)) {
            clearGestureRepeatCandidate(pointerId)
            return
        }

        val nextCandidate = gestureRepeatCandidateSelectionByPointerId[pointerId]
        val nextCandidateKeyId = gestureRepeatCandidateKeyIdByPointerId[pointerId]
        if (nextCandidate == selection && nextCandidateKeyId == key.id) {
            return
        }

        clearGestureRepeatCandidate(pointerId)
        gestureRepeatCandidateSelectionByPointerId[pointerId] = selection
        gestureRepeatCandidateKeyIdByPointerId[pointerId] = key.id
        clearLongPress(pointerId)

        val runnable =
            Runnable {
                triggerGestureRepeat(pointerId)
            }
        gestureRepeatRunnablesByPointerId[pointerId] = runnable
        postDelayed(runnable, longPressDelayMs)
    }

    private fun triggerGestureRepeat(pointerId: Int) {
        runKeyboardSafely("gestureRepeat:$pointerId") {
            triggerGestureRepeatUnsafe(pointerId)
        }
    }

    private fun triggerGestureRepeatUnsafe(pointerId: Int) {
        val candidateSelection = gestureRepeatCandidateSelectionByPointerId[pointerId] ?: return
        val keyId = gestureRepeatCandidateKeyIdByPointerId[pointerId] ?: return
        val state = pointerTracker.get(pointerId) ?: return clearGestureRepeatCandidate(pointerId)
        if (state.consumedByProtectedInteraction || state.longPressTriggered) {
            clearGestureRepeatCandidate(pointerId)
            return
        }
        val key = state.payload.key
        if (key.id != keyId) {
            clearGestureRepeatCandidate(pointerId)
            return
        }
        val currentSelection =
            effectiveGestureSelection(
                key = key,
                sample =
                    GestureSample(
                        startX = state.startX,
                        startY = state.startY,
                        endX = state.latestX,
                        endY = state.latestY,
                        maxDistanceFromStart = state.maxDistanceFromStart,
                    ),
            )
        if (currentSelection != candidateSelection) {
            clearGestureRepeatCandidate(pointerId)
            return
        }
        val value = keyValueForSelection(key, candidateSelection) ?: run {
            clearGestureRepeatCandidate(pointerId)
            return
        }
        if (!shouldRepeatGestureSelection(candidateSelection, value)) {
            clearGestureRepeatCandidate(pointerId)
            return
        }

        clearGestureRepeatCandidate(pointerId)
        clearLongPress(pointerId)
        acquireProtectedInteraction(pointerId, KeyboardProtectedInteraction.LongPressRepeat)
        pointerTracker.markLongPressTriggered(pointerId)
        startRepeat(
            pointerId = pointerId,
            key = key,
            sourceFrame = state.payload,
            selection = candidateSelection,
            dispatchImmediately = true,
        )
    }

    private fun clearGestureRepeatCandidate(pointerId: Int) {
        gestureRepeatCandidateSelectionByPointerId.remove(pointerId)
        gestureRepeatCandidateKeyIdByPointerId.remove(pointerId)
        val pending = gestureRepeatRunnablesByPointerId.remove(pointerId) ?: return
        removeCallbacks(pending)
    }

    private fun shouldRepeatGestureSelection(
        selection: GestureSelection,
        value: KeyboardKeyValue,
    ): Boolean {
        return KeyboardLongPressSwipePolicy.shouldRepeatGestureSelection(
            selection = selection,
            value = value,
            repeatingActions = repeatingActions,
        )
    }

    private fun tryDispatchAfterLongPressSwipe(
        pointerId: Int,
        state: KeyboardPointerState<KeyFrame>,
        x: Float,
        y: Float,
    ): Boolean {
        // Contract: releasing after long-press swipe dispatches against the
        // hovered target key, preferring target-side directional assignments
        // when the key exposes them, and falls back to primary tap only when
        // the target is not a directional gesture surface.
        if (!longPressSwipeDispatchPointerIds.contains(pointerId)) {
            return false
        }
        val startKeyId = longPressSwipeStartKeyIdByPointerId[pointerId] ?: return false
        val targetHit = hitTest(x, y) ?: return false
        val targetKey = targetHit.key
        if (!targetKey.enabled || targetKey.id == startKeyId) {
            return false
        }
        val targetSelection =
            if (isLongPressSwipeHoverEligible(targetKey)) {
                longPressSwipeSelectionForTarget(targetHit, x, y)
            } else {
                null
            }
        if (targetSelection != null) {
            dispatch(targetKey, targetSelection, targetHit)
        } else if (allowsTextGesture(targetKey)) {
            setStatus("Swipe action unavailable")
            closeLongPressActionRowIfNeeded(pointerId)
            debugGestureText =
                "swipe dispatch unavailable ptr=$pointerId from=$startKeyId to=${targetKey.id}"
            return true
        } else {
            dispatch(targetKey, GestureSelection.PrimaryTap, targetHit)
        }
        closeLongPressActionRowIfNeeded(pointerId)
        debugGestureText =
            "swipe dispatch ptr=$pointerId from=$startKeyId to=${targetKey.id} dist=${state.maxDistanceFromStart.toInt()}"
        return true
    }

    private fun closeLongPressActionRowIfNeeded(pointerId: Int) {
        val actionDescriptorId = longPressSwipeActionDescriptorByPointerId[pointerId] ?: return
        val wasPinnedBefore = longPressSwipeActionPinnedBeforeByPointerId[pointerId] ?: false
        if (wasPinnedBefore) {
            return
        }
        val attachedRowsBefore = longPressSwipeActionRowsBeforeByPointerId[pointerId].orEmpty()
        val rowsToClose = actionBarState.attachedRows.filter {
            it.providerActionId == actionDescriptorId && it.rowId !in attachedRowsBefore
        }
        if (rowsToClose.isEmpty()) {
            return
        }
        val nextRows = actionBarState.attachedRows.filterNot { it in rowsToClose }
        val rowIdsToClose = rowsToClose.mapTo(linkedSetOf()) { it.rowId }
        val nextRowPages = actionBarState.rowPageById.filter { (rowId, _) -> rowId !in rowIdsToClose }
        setActionBarState(
            actionBarState.copy(
                pinnedActionIds = actionBarState.pinnedActionIds - actionDescriptorId,
                attachedRows = nextRows,
                rowPageById = nextRowPages,
            ),
        )
        reconcileActionBarState()
        refreshLayout()
    }

    private fun handleHorizontalRowScroll(
        state: KeyboardPointerState<KeyFrame>,
        dxFromStart: Float,
        x: Float,
    ) {
        if (scrollingHorizontalRow && horizontalScrollOwnerPointerId != state.pointerId) {
            return
        }
        val frame = state.payload
        val rowId = frame?.rowId
        if (!frame.isScrollableRowFrame() || rowId.isNullOrBlank() || abs(dxFromStart) < dp(8f)) {
            return
        }
        if (abs(dxFromStart) < abs(state.latestY - state.startY) * 1.2f) {
            return
        }
        clearLongPress(state.pointerId)
        val maxOffset = horizontalRowMaxOffsetById[rowId] ?: 0f
        if (maxOffset <= 0f) {
            return
        }
        val currentOffset = horizontalRowScrollOffsetById[rowId] ?: 0f
        val pagedRow = frame.isPagedScrollableRowFrame()
        if (!scrollingHorizontalRow) {
            acquireProtectedInteraction(state.pointerId, KeyboardProtectedInteraction.HorizontalRowScroll)
            pointerTracker.markConsumedByProtectedInteraction(state.pointerId)
            scrollingHorizontalRow = true
            horizontalScrollOwnerPointerId = state.pointerId
            activeHorizontalRowId = rowId
            lastHorizontalScrollX = state.startX
            cancelHorizontalRowAnimation(rowId)
            horizontalGestureStartOffset =
                if (pagedRow) {
                    val pageWidth = max(dp(1f), horizontalRowPageWidthById[rowId] ?: frame?.rowVisibleWidth ?: width.toFloat())
                    val startPage = currentHorizontalRowPage(rowId, pageWidth, maxOffset, currentOffset)
                    pageOffset(startPage, pageWidth, maxOffset).also { startOffset ->
                        horizontalRowScrollOffsetById[rowId] = startOffset
                    }
                } else {
                    currentOffset
                }
            horizontalGestureDragDx = 0f
            animateHorizontalRowVisualProgress(rowId, 1f, horizontalRowVisualInDurationMs, removeWhenZero = false)
        }
        if (pagedRow) {
            val pageWidth = max(dp(1f), horizontalRowPageWidthById[rowId] ?: frame?.rowVisibleWidth ?: width.toFloat())
            val maxPage = ceil(maxOffset / pageWidth).toInt().coerceAtLeast(0)
            val startPage = (horizontalGestureStartOffset / pageWidth).roundToInt().coerceIn(0, maxPage)
            val startOffset = pageOffset(startPage, pageWidth, maxOffset)
            val dragPreview = (-dxFromStart * 0.28f).coerceIn(-pageWidth * 0.18f, pageWidth * 0.18f)
            val previewOffset = (startOffset + dragPreview).coerceIn(0f, maxOffset)
            horizontalGestureDragDx = dxFromStart
            horizontalRowScrollOffsetById[rowId] = previewOffset
            postInvalidateOnAnimation()
            lastHorizontalScrollX = x
            return
        }
        val delta = lastHorizontalScrollX - x
        val next = resistedHorizontalOffset(currentOffset + delta, maxOffset)
        if (next != currentOffset) {
            horizontalRowScrollOffsetById[rowId] = next
            postInvalidateOnAnimation()
        }
        lastHorizontalScrollX = x
    }

    private fun finishHorizontalRowScroll() {
        val ownerPointerId = horizontalScrollOwnerPointerId
        val ownerFrame = pointerTracker.get(ownerPointerId)?.payload
        val rowId = activeHorizontalRowId ?: ownerFrame?.rowId ?: return
        val maxOffset = horizontalRowMaxOffsetById[rowId] ?: 0f
        val currentOffset = horizontalRowScrollOffsetById[rowId] ?: 0f
        val frame = ownerFrame
        if (frame.isPagedScrollableRowFrame()) {
            val pageWidth = max(dp(1f), horizontalRowPageWidthById[rowId] ?: frame?.rowVisibleWidth ?: width.toFloat())
            val maxPage = ceil(maxOffset / pageWidth).toInt().coerceAtLeast(0)
            val startPage = (horizontalGestureStartOffset / pageWidth).roundToInt().coerceIn(0, maxPage)
            val threshold = min(pageWidth * 0.22f, dp(96f))
            val targetPage =
                when {
                    horizontalGestureDragDx <= -threshold -> startPage + 1
                    horizontalGestureDragDx >= threshold -> startPage - 1
                    else -> startPage
                }.coerceIn(0, maxPage)
            val targetOffset = pageOffset(targetPage, pageWidth, maxOffset)
            if (targetPage != startPage) {
                performKeyboardHaptic(HapticFeedbackConstants.CLOCK_TICK)
            }
            horizontalRowPageById[rowId] = targetPage
            if (rowId.startsWith("action-row-")) {
                setActionBarState(
                    actionBarController.setRowPage(
                        rowId = rowId,
                        page = targetPage,
                        state = actionBarState,
                        environment = actionEnvironment(),
                    ),
                )
            }
            animateHorizontalRowVisualProgress(rowId, 0f, horizontalRowVisualOutDurationMs, removeWhenZero = true)
            animateHorizontalRowOffset(rowId, currentOffset, targetOffset)
            return
        }
        val targetOffset = currentOffset.coerceIn(0f, maxOffset)
        animateHorizontalRowVisualProgress(rowId, 0f, horizontalRowVisualOutDurationMs, removeWhenZero = true)
        animateHorizontalRowOffset(rowId, currentOffset, targetOffset)
    }

    private fun resistedHorizontalOffset(
        rawOffset: Float,
        maxOffset: Float,
    ): Float {
        val overscrollLimit = dp(42f)
        return when {
            rawOffset < 0f -> (rawOffset * 0.34f).coerceAtLeast(-overscrollLimit)
            rawOffset > maxOffset -> (maxOffset + (rawOffset - maxOffset) * 0.34f).coerceAtMost(maxOffset + overscrollLimit)
            else -> rawOffset
        }
    }

    private fun pageOffset(
        page: Int,
        pageWidth: Float,
        maxOffset: Float,
    ): Float {
        return (page.coerceAtLeast(0) * pageWidth).coerceIn(0f, maxOffset)
    }

    private fun currentHorizontalRowPage(
        rowId: String,
        pageWidth: Float,
        maxOffset: Float,
        offsetFallback: Float,
    ): Int {
        val maxPage = ceil(maxOffset / pageWidth).toInt().coerceAtLeast(0)
        val storedPage = horizontalRowPageById[rowId] ?: actionBarState.rowPageById[rowId]
        return (storedPage ?: (offsetFallback / pageWidth).roundToInt()).coerceIn(0, maxPage)
    }

    private fun animateHorizontalRowOffset(
        rowId: String,
        fromOffset: Float,
        toOffset: Float,
    ) {
        cancelHorizontalRowAnimation(rowId)
        if (abs(fromOffset - toOffset) < 0.5f) {
            horizontalRowScrollOffsetById[rowId] = toOffset
            postInvalidateOnAnimation()
            return
        }
        horizontalRowScrollOffsetById[rowId] = fromOffset
        val animator =
            ValueAnimator.ofFloat(fromOffset, toOffset).apply {
                duration = horizontalSnapDurationMs
                interpolator = horizontalSnapInterpolator
                addUpdateListener { animation ->
                    horizontalRowScrollOffsetById[rowId] = animation.animatedValue as Float
                    postInvalidateOnAnimation()
                }
                addListener(
                    object : AnimatorListenerAdapter() {
                        override fun onAnimationEnd(animation: Animator) {
                            if (horizontalRowAnimatorById[rowId] === animation) {
                                horizontalRowAnimatorById.remove(rowId)
                                horizontalRowScrollOffsetById[rowId] = toOffset
                                postInvalidateOnAnimation()
                            }
                        }

                        override fun onAnimationCancel(animation: Animator) {
                            if (horizontalRowAnimatorById[rowId] === animation) {
                                horizontalRowAnimatorById.remove(rowId)
                            }
                        }
                    },
                )
            }
        horizontalRowAnimatorById[rowId] = animator
        animator.start()
    }

    private fun animateHorizontalRowVisualProgress(
        rowId: String,
        toProgress: Float,
        durationMs: Long,
        removeWhenZero: Boolean,
    ) {
        val target = toProgress.coerceIn(0f, 1f)
        val from = horizontalRowVisualProgressById[rowId] ?: 0f
        horizontalRowVisualAnimatorById.remove(rowId)?.cancel()
        if (abs(from - target) < 0.01f) {
            if (removeWhenZero && target <= 0f) {
                horizontalRowVisualProgressById.remove(rowId)
            } else {
                horizontalRowVisualProgressById[rowId] = target
            }
            postInvalidateOnAnimation()
            return
        }
        horizontalRowVisualProgressById[rowId] = from
        val animator =
            ValueAnimator.ofFloat(from, target).apply {
                duration = durationMs
                addUpdateListener { animation ->
                    horizontalRowVisualProgressById[rowId] = animation.animatedValue as Float
                    postInvalidateOnAnimation()
                }
                addListener(
                    object : AnimatorListenerAdapter() {
                        override fun onAnimationEnd(animation: Animator) {
                            if (horizontalRowVisualAnimatorById[rowId] === animation) {
                                horizontalRowVisualAnimatorById.remove(rowId)
                                if (removeWhenZero && target <= 0f) {
                                    horizontalRowVisualProgressById.remove(rowId)
                                } else {
                                    horizontalRowVisualProgressById[rowId] = target
                                }
                                postInvalidateOnAnimation()
                            }
                        }

                        override fun onAnimationCancel(animation: Animator) {
                            if (horizontalRowVisualAnimatorById[rowId] === animation) {
                                horizontalRowVisualAnimatorById.remove(rowId)
                            }
                        }
                    },
                )
            }
        horizontalRowVisualAnimatorById[rowId] = animator
        animator.start()
    }

    private fun cancelHorizontalRowAnimation(rowId: String?) {
        if (rowId.isNullOrBlank()) {
            horizontalRowAnimatorById.values.toList().forEach { it.cancel() }
            horizontalRowAnimatorById.clear()
            return
        }
        horizontalRowAnimatorById.remove(rowId)?.cancel()
    }

    private fun clearHorizontalRowScrollState() {
        cancelHorizontalRowAnimation(null)
        clearHorizontalRowVisualState()
        horizontalRowScrollOffsetById.clear()
        horizontalRowPageWidthById.clear()
        horizontalRowMaxOffsetById.clear()
        scrollingHorizontalRow = false
        horizontalScrollOwnerPointerId = MotionEvent.INVALID_POINTER_ID
        activeHorizontalRowId = null
        lastHorizontalScrollX = 0f
        horizontalGestureStartOffset = 0f
        horizontalGestureDragDx = 0f
    }

    private fun clearHorizontalRowVisualState() {
        horizontalRowVisualAnimatorById.values.toList().forEach { it.cancel() }
        horizontalRowVisualAnimatorById.clear()
        horizontalRowVisualProgressById.clear()
    }

    private fun pruneHorizontalRowVisualState() {
        if (horizontalRowVisualProgressById.isEmpty() && horizontalRowVisualAnimatorById.isEmpty()) {
            return
        }
        val visibleScrollableRows = horizontalRowMaxOffsetById.filterValues { it > 0f }.keys
        val staleRows = (horizontalRowVisualProgressById.keys + horizontalRowVisualAnimatorById.keys)
            .filterNot { it in visibleScrollableRows }
        staleRows.forEach { rowId ->
            horizontalRowVisualAnimatorById.remove(rowId)?.cancel()
            horizontalRowVisualProgressById.remove(rowId)
            if (activeHorizontalRowId == rowId) {
                activeHorizontalRowId = null
                scrollingHorizontalRow = false
                horizontalScrollOwnerPointerId = MotionEvent.INVALID_POINTER_ID
            }
        }
    }

    private fun handleVerticalPanelScroll(
        state: KeyboardPointerState<KeyFrame>,
        dyFromStart: Float,
        y: Float,
    ) {
        if (scrollingVerticalPanel && verticalScrollOwnerPointerId != state.pointerId) {
            return
        }
        if (!state.payload.isScrollablePanelFrame() || abs(dyFromStart) < dp(8f)) {
            return
        }
        if (abs(dyFromStart) < abs(state.latestX - state.startX) * 1.2f) {
            return
        }
        clearLongPress(state.pointerId)
        if (!scrollingVerticalPanel) {
            acquireProtectedInteraction(state.pointerId, KeyboardProtectedInteraction.VerticalPanelScroll)
            pointerTracker.markConsumedByProtectedInteraction(state.pointerId)
            scrollingVerticalPanel = true
            verticalScrollOwnerPointerId = state.pointerId
            lastVerticalScrollY = y
        }
        val delta = lastVerticalScrollY - y
        val next = (verticalPanelScrollOffset + delta).coerceIn(0f, verticalPanelMaxScrollOffset)
        if (next != verticalPanelScrollOffset) {
            verticalPanelScrollOffset = next
            invalidate()
        }
        lastVerticalScrollY = y
    }

    private fun KeyFrame?.isScrollableRowFrame(): Boolean {
        return this?.rowScrollable == true
    }

    private fun KeyFrame?.isPagedScrollableRowFrame(): Boolean {
        return this?.rowPagedScrollable == true
    }

    private fun KeyFrame?.isScrollablePanelFrame(): Boolean {
        return this?.panelScrollable == true
    }

    private fun isSpaceKey(key: KeyboardKeySpec): Boolean {
        return key.action == KeyboardKeyAction.Text &&
            (key.glyph?.primary == " " || key.keyValue?.text == " ")
    }

    private fun shouldTrackSymbolRecent(key: KeyboardKeySpec): Boolean {
        if (key.action != KeyboardKeyAction.Text || key.id == "space") {
            return false
        }
        return layoutMode == KeyboardLayoutMode.Symbols ||
            layoutMode == KeyboardLayoutMode.Accents ||
            panelMode == KeyboardPanelMode.Accents ||
            key.id.startsWith("action-symbol-") ||
            key.id.startsWith("action-accent-")
    }

    private fun isEmojiRecentCandidate(value: String): Boolean {
        val codePoints = value.trim().codePoints().toArray()
        return codePoints.any { codePoint ->
            codePoint == 0x200D ||
                codePoint == 0xFE0F ||
                codePoint in 0x1F000..0x1FAFF ||
                codePoint in 0x2600..0x27BF
        }
    }

    private fun decodeThemeBitmap(
        path: String?,
        targetWidth: Int = width,
        targetHeight: Int = height,
    ): Bitmap? {
        val source = path?.trim().orEmpty()
        if (source.isEmpty()) {
            return null
        }
        return runCatching {
            val boundsOptions =
                BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
            BitmapFactory.decodeFile(source, boundsOptions)
            if (boundsOptions.outWidth <= 0 || boundsOptions.outHeight <= 0) {
                return@runCatching null
            }

            val safeTargetWidth = targetWidth.coerceAtLeast(1080)
            val safeTargetHeight = targetHeight.coerceAtLeast(480)
            val sampleSize =
                calculateInSampleSize(
                    boundsOptions.outWidth,
                    boundsOptions.outHeight,
                    safeTargetWidth,
                    safeTargetHeight,
                )
            BitmapFactory.decodeFile(
                source,
                BitmapFactory.Options().apply {
                    inSampleSize = sampleSize
                    inPreferredConfig = Bitmap.Config.ARGB_8888
                },
            )
        }.getOrNull()
    }

    private fun calculateInSampleSize(
        sourceWidth: Int,
        sourceHeight: Int,
        targetWidth: Int,
        targetHeight: Int,
    ): Int {
        var sampleSize = 1
        if (sourceHeight <= targetHeight && sourceWidth <= targetWidth) {
            return sampleSize
        }
        var halfHeight = sourceHeight / 2
        var halfWidth = sourceWidth / 2
        while (halfHeight / sampleSize >= targetHeight &&
            halfWidth / sampleSize >= targetWidth
        ) {
            sampleSize *= 2
        }
        return sampleSize.coerceAtLeast(1)
    }

    private fun drawStatus(
        canvas: Canvas,
        top: Float,
        left: Float,
        contentWidth: Float,
        height: Float,
    ) {
        statusPaint.textSize = sp(13f)
        val lines = statusLines(contentWidth)
        val lineHeight = statusLineHeight()
        val totalTextHeight = lineHeight * lines.size
        var baseline =
            top + (height - totalTextHeight) / 2f - statusPaint.ascent()
        lines.forEach { line ->
            canvas.drawText(line, left + contentWidth / 2f, baseline, statusPaint)
            baseline += lineHeight
        }
    }

    private fun statusHeightFor(contentWidth: Float): Float {
        if (statusBarMode == KeyboardStatusBarMode.HIDDEN) {
            return 0f
        }
        statusPaint.textSize = sp(13f)
        val lineCount = statusLines(contentWidth).size.coerceAtLeast(1)
        return max(minStatusHeight, lineCount * statusLineHeight() + dp(10f))
    }

    private fun statusLineHeight(): Float {
        return statusPaint.descent() - statusPaint.ascent() + dp(2f)
    }

    private fun statusLines(contentWidth: Float): List<String> {
        val normalized = statusText.replace(Regex("\\s+"), " ").trim()
        if (normalized.isEmpty()) {
            return listOf("")
        }
        val maxWidth = contentWidth.coerceAtLeast(dp(48f))
        val lines = mutableListOf<String>()
        var current = ""

        fun addCurrent() {
            if (current.isNotEmpty()) {
                lines.add(current)
                current = ""
            }
        }

        normalized.split(" ").forEach { word ->
            val candidate = if (current.isEmpty()) word else "$current $word"
            if (statusPaint.measureText(candidate) <= maxWidth) {
                current = candidate
                return@forEach
            }
            addCurrent()
            if (statusPaint.measureText(word) <= maxWidth) {
                current = word
            } else {
                var chunk = ""
                word.forEach { char ->
                    val next = "$chunk$char"
                    if (statusPaint.measureText(next) <= maxWidth) {
                        chunk = next
                    } else {
                        if (chunk.isNotEmpty()) {
                            lines.add(chunk)
                        }
                        chunk = char.toString()
                    }
                }
                current = chunk
            }
        }
        addCurrent()

        if (lines.size <= maxStatusLines) {
            return lines
        }
        val visible = lines.take(maxStatusLines).toMutableList()
        var last = visible.last().trimEnd()
        while (last.isNotEmpty() && statusPaint.measureText("$last…") > maxWidth) {
            last = last.dropLast(1).trimEnd()
        }
        visible[visible.lastIndex] = if (last.isEmpty()) "…" else "$last…"
        return visible
    }

    private fun drawRow(
        canvas: Canvas,
        row: KeyboardRowSpec,
        rowIndex: Int,
        left: Float,
        top: Float,
        width: Float,
        height: Float,
    ) {
        if (row.horizontalScrollable) {
            drawScrollableRow(canvas, row, rowIndex, left, top, width, height)
            return
        }

        val geometry =
            KeyboardGridLayoutEngine.layoutFixedRow(
                row = row,
                left = left,
                top = top,
                width = width,
                height = height,
                keyGap = keyGap(),
                keyWidthScale = keyWidthScale(),
                touchBottomExtension = rowGap(),
            )
        geometry.forEach { cell ->
            keyFrames.add(
                KeyFrame(
                    key = cell.key,
                    slotRect = cell.slotRect,
                    visualRect = cell.visualRect,
                    touchRect = cell.touchRect,
                    rowIndex = rowIndex,
                    rowId = row.rowId,
                ),
            )
            drawKey(canvas, cell.key, cell.visualRect)
        }
    }

    private fun drawScrollableRow(
        canvas: Canvas,
        row: KeyboardRowSpec,
        rowIndex: Int,
        left: Float,
        top: Float,
        width: Float,
        height: Float,
        touchClipRect: RectF? = null,
    ) {
        val rowId = row.rowId ?: "scroll-row-${top.toInt()}"
        val visibleCount = row.visiblePageKeyCount
        val keyGapSize = keyGap()
        val baseKeyWidth =
            if (visibleCount != null && visibleCount > 0) {
                ((width - keyGapSize * (visibleCount - 1)).coerceAtLeast(dp(1f)) / visibleCount)
            } else {
                dp(76f) * keyWidthScale()
            }
        val keyWidths =
            row.keys.map { key ->
                if (visibleCount != null && visibleCount > 0) {
                    baseKeyWidth
                } else {
                    max(dp(54f), baseKeyWidth * key.weight)
                }
            }
        val contentWidth = keyWidths.sum() + keyGap() * max(0, row.keys.size - 1)
        val maxOffset = max(0f, contentWidth - width)
        horizontalRowMaxOffsetById[rowId] = maxOffset
        horizontalRowPageWidthById[rowId] = max(dp(1f), width)
        if (row.pagedHorizontalScrollable) {
            val pageWidth = horizontalRowPageWidthById[rowId] ?: max(dp(1f), width)
            val maxPage = ceil(maxOffset / pageWidth).toInt().coerceAtLeast(0)
            val page = (horizontalRowPageById[rowId] ?: actionBarState.rowPageById[rowId] ?: 0).coerceIn(0, maxPage)
            horizontalRowPageById[rowId] = page
            val targetOffset = pageOffset(page, pageWidth, maxOffset)
            val isActiveGesture = scrollingHorizontalRow && activeHorizontalRowId == rowId
            val isAnimating = horizontalRowAnimatorById.containsKey(rowId)
            val currentOffset = horizontalRowScrollOffsetById[rowId]
            if (currentOffset == null || (!isActiveGesture && !isAnimating && abs(currentOffset - targetOffset) > 0.5f)) {
                horizontalRowScrollOffsetById[rowId] = targetOffset
            }
        }
        val isActiveGesture = scrollingHorizontalRow && activeHorizontalRowId == rowId
        val isAnimating = horizontalRowAnimatorById.containsKey(rowId)
        val rawRowOffset = horizontalRowScrollOffsetById[rowId] ?: 0f
        val rowOffset =
            if (isActiveGesture || isAnimating) {
                rawRowOffset
            } else {
                rawRowOffset.coerceIn(0f, maxOffset)
            }
        horizontalRowScrollOffsetById[rowId] = rowOffset
        val visualProgress = horizontalRowVisualProgress(rowId, row, width, maxOffset)
        val keyHeightShrink = 0.28f * visualProgress
        val radiusScale = 1f - 0.24f * visualProgress
        val textScale = 1f - 0.18f * visualProgress

        val clipSave = canvas.save()
        canvas.clipRect(left, top, left + width, top + height)
        val viewportRect = RectF(left, top, left + width, top + height + rowGap())
        val geometry =
            KeyboardGridLayoutEngine.layoutScrollableRow(
                row = row,
                keyWidths = keyWidths,
                rowOffset = rowOffset,
                left = left,
                top = top,
                height = height,
                keyGap = keyGap(),
                keyWidthScale = keyWidthScale(),
                touchClipRect = touchClipRect ?: viewportRect,
                touchBottomExtension = rowGap(),
            )
        geometry.forEach { cell ->
            if (cell.slotRect.right >= left && cell.slotRect.left <= left + width) {
                val drawRect =
                    if (visualProgress > 0f) {
                        scrollVisualRect.set(cell.visualRect)
                        scrollVisualRect.inset(
                            0f,
                            scrollVisualRect.height() * keyHeightShrink / 2f,
                        )
                        RectF(scrollVisualRect)
                    } else {
                        RectF(cell.visualRect)
                    }
                keyFrames.add(
                    KeyFrame(
                        key = cell.key,
                        slotRect = RectF(cell.slotRect),
                        visualRect = drawRect,
                        touchRect = RectF(cell.touchRect),
                        rowIndex = rowIndex,
                        rowId = rowId,
                        rowScrollable = true,
                        rowPagedScrollable = row.pagedHorizontalScrollable,
                        rowVisibleWidth = width,
                    ),
                )
                drawKey(canvas, cell.key, drawRect, radiusScale = radiusScale, textScale = textScale)
            }
        }
        drawHorizontalRowEdgeAffordances(
            canvas,
            left,
            top,
            width,
            height,
            baseKeyWidth,
            rowOffset,
            maxOffset,
            visualProgress,
        )
        canvas.restoreToCount(clipSave)
    }

    private fun horizontalRowVisualProgress(
        rowId: String,
        row: KeyboardRowSpec,
        width: Float,
        maxOffset: Float,
    ): Float {
        val baseProgress = (horizontalRowVisualProgressById[rowId] ?: 0f).coerceIn(0f, 1f)
        if (baseProgress <= 0f || !row.pagedHorizontalScrollable || activeHorizontalRowId != rowId || maxOffset <= 0f) {
            return baseProgress
        }
        val pageWidth = max(dp(1f), horizontalRowPageWidthById[rowId] ?: width)
        val threshold = min(pageWidth * 0.22f, dp(96f))
        val snapHint = ((abs(horizontalGestureDragDx) - threshold) / max(dp(1f), threshold)).coerceIn(0f, 1f)
        return baseProgress * (1f - snapHint * 0.14f)
    }

    private fun drawHorizontalRowEdgeAffordances(
        canvas: Canvas,
        left: Float,
        top: Float,
        width: Float,
        height: Float,
        baseKeyWidth: Float,
        rowOffset: Float,
        maxOffset: Float,
        visualProgress: Float,
    ) {
        if (maxOffset <= 0f) {
            return
        }
        val edgeWidth = min(min(width * 0.12f, baseKeyWidth * 0.66f), dp(30f))
        val activeProgress = visualProgress.coerceIn(0f, 1f)
        val fadeAlphaBase = (34f + 108f * activeProgress).roundToInt().coerceIn(0, 142)
        val handleAlphaBase = (88f + 80f * activeProgress).roundToInt().coerceIn(0, 168)
        val leftHidden = (rowOffset / dp(36f)).coerceIn(0f, 1f)
        val rightHidden = ((maxOffset - rowOffset) / dp(36f)).coerceIn(0f, 1f)
        val leftAlpha = (fadeAlphaBase * leftHidden).roundToInt()
        val rightAlpha = (fadeAlphaBase * rightHidden).roundToInt()
        val leftHandleAlpha = (handleAlphaBase * leftHidden).roundToInt()
        val rightHandleAlpha = (handleAlphaBase * rightHidden).roundToInt()
        val edgeColor = horizontalRowEdgeColor()
        if (leftAlpha > 0) {
            drawHorizontalEdgeStrips(canvas, left, top, height, edgeWidth, leftAlpha, edgeColor, leftEdge = true)
        }
        if (leftHandleAlpha > 0) {
            horizontalEdgeAffordancePaint.color =
                Color.argb(leftHandleAlpha, Color.red(edgeColor), Color.green(edgeColor), Color.blue(edgeColor))
            val handleWidth = dp(3.5f)
            val handleHeight = min(max(dp(1f), height - dp(8f)), max(dp(20f), height * 0.56f))
            val handleLeft = left + dp(2f)
            val handleTop = top + (height - handleHeight) / 2f
            scrollVisualRect.set(handleLeft, handleTop, handleLeft + handleWidth, handleTop + handleHeight)
            canvas.drawRoundRect(scrollVisualRect, handleWidth / 2f, handleWidth / 2f, horizontalEdgeAffordancePaint)
        }
        if (rightAlpha > 0) {
            drawHorizontalEdgeStrips(canvas, left + width, top, height, edgeWidth, rightAlpha, edgeColor, leftEdge = false)
        }
        if (rightHandleAlpha > 0) {
            horizontalEdgeAffordancePaint.color =
                Color.argb(rightHandleAlpha, Color.red(edgeColor), Color.green(edgeColor), Color.blue(edgeColor))
            val handleWidth = dp(3.5f)
            val handleHeight = min(max(dp(1f), height - dp(8f)), max(dp(20f), height * 0.56f))
            val handleRight = left + width - dp(2f)
            val handleTop = top + (height - handleHeight) / 2f
            scrollVisualRect.set(handleRight - handleWidth, handleTop, handleRight, handleTop + handleHeight)
            canvas.drawRoundRect(scrollVisualRect, handleWidth / 2f, handleWidth / 2f, horizontalEdgeAffordancePaint)
        }
    }

    private fun drawHorizontalEdgeStrips(
        canvas: Canvas,
        edgeX: Float,
        top: Float,
        height: Float,
        edgeWidth: Float,
        alphaBase: Int,
        edgeColor: Int,
        leftEdge: Boolean,
    ) {
        val widthWeights = floatArrayOf(0.19f, 0.31f, 0.50f)
        val alphaWeights = floatArrayOf(0.32f, 0.58f, 0.86f)
        var cursor = if (leftEdge) edgeX + edgeWidth else edgeX - edgeWidth
        for (index in widthWeights.indices) {
            val stripWidth = edgeWidth * widthWeights[index]
            val alpha = (alphaBase * alphaWeights[index]).roundToInt().coerceIn(0, 255)
            horizontalEdgeAffordancePaint.color =
                Color.argb(alpha, Color.red(edgeColor), Color.green(edgeColor), Color.blue(edgeColor))
            if (leftEdge) {
                canvas.drawRect(cursor - stripWidth, top, cursor, top + height, horizontalEdgeAffordancePaint)
                cursor -= stripWidth
            } else {
                canvas.drawRect(cursor, top, cursor + stripWidth, top + height, horizontalEdgeAffordancePaint)
                cursor += stripWidth
            }
        }
    }

    private fun horizontalRowEdgeColor(): Int {
        return if (!fieldPolicy.privateMode && keyBorderPaint.strokeWidth > 0f && Color.alpha(keyBorderPaint.color) > 0) {
            keyBorderPaint.color
        } else if (colorBrightness(backgroundPaint.color) > 0.5f) {
            Color.BLACK
        } else {
            Color.WHITE
        }
    }

    private fun colorBrightness(color: Int): Float {
        return (Color.red(color) * 0.299f + Color.green(color) * 0.587f + Color.blue(color) * 0.114f) / 255f
    }

    private fun drawVerticalPanelScrollbar(
        canvas: Canvas,
        left: Float,
        top: Float,
        width: Float,
        height: Float,
        contentHeight: Float,
    ) {
        if (verticalPanelMaxScrollOffset <= 0f || contentHeight <= height) {
            return
        }
        val trackWidth = dp(3f)
        val trackRight = left + width - dp(3f)
        val trackLeft = trackRight - trackWidth
        val trackTop = top + dp(2f)
        val trackBottom = top + height - dp(2f)
        val trackHeight = trackBottom - trackTop
        val thumbHeight = max(dp(18f), trackHeight * (height / contentHeight))
        val maxThumbTop = trackBottom - thumbHeight
        val thumbTop = if (verticalPanelMaxScrollOffset == 0f) {
            trackTop
        } else {
            trackTop + (maxThumbTop - trackTop) * (verticalPanelScrollOffset / verticalPanelMaxScrollOffset)
        }
        val radius = trackWidth / 2f
        canvas.drawRoundRect(RectF(trackLeft, trackTop, trackRight, trackBottom), radius, radius, verticalScrollbarTrackPaint)
        canvas.drawRoundRect(RectF(trackLeft, thumbTop, trackRight, thumbTop + thumbHeight), radius, radius, verticalScrollbarThumbPaint)
    }

    private fun drawVerticalPanelRows(
        canvas: Canvas,
        left: Float,
        top: Float,
        width: Float,
        height: Float,
    ) {
        val firstPanelIndex = firstPanelRowIndex()
        val panelRows = layoutSnapshot.rows.drop(firstPanelIndex).take(layoutSnapshot.panelRowCount)
        val panelRowHeight = scaledPanelRowHeight()
        val contentHeight = panelRows.size * panelRowHeight + rowGap() * max(0, panelRows.size - 1)
        verticalPanelMaxScrollOffset = max(0f, contentHeight - height)
        verticalPanelScrollOffset = verticalPanelScrollOffset.coerceIn(0f, verticalPanelMaxScrollOffset)

        val clipSave = canvas.save()
        canvas.clipRect(left, top, left + width, top + height)
        val panelViewport = RectF(left, top, left + width, top + height)
        var y = top - verticalPanelScrollOffset
        panelRows.forEachIndexed { index, row ->
            if (y + panelRowHeight >= top && y <= top + height) {
                drawPanelScrollRow(
                    canvas,
                    row,
                    firstPanelIndex + index,
                    left,
                    y,
                    width,
                    panelRowHeight,
                    panelViewport,
                )
            }
            y += panelRowHeight + rowGap()
        }
        canvas.restoreToCount(clipSave)
        drawVerticalPanelScrollbar(canvas, left, top, width, height, contentHeight)
    }

    private fun drawPanelScrollRow(
        canvas: Canvas,
        row: KeyboardRowSpec,
        rowIndex: Int,
        left: Float,
        top: Float,
        width: Float,
        height: Float,
        touchClipRect: RectF? = null,
    ) {
        if (row.horizontalScrollable) {
            drawScrollableRow(canvas, row, rowIndex, left, top, width, height, touchClipRect)
            return
        }

        val geometry =
            KeyboardGridLayoutEngine.layoutFixedRow(
                row = row,
                left = left,
                top = top,
                width = width,
                height = height,
                keyGap = keyGap(),
                keyWidthScale = keyWidthScale(),
                touchClipRect = touchClipRect,
                touchBottomExtension = rowGap(),
            )
        geometry.forEach { cell ->
            keyFrames.add(
                KeyFrame(
                    key = cell.key,
                    slotRect = cell.slotRect,
                    visualRect = cell.visualRect,
                    touchRect = cell.touchRect,
                    rowIndex = rowIndex,
                    rowId = row.rowId,
                    panelScrollable = true,
                ),
            )
            drawKey(canvas, cell.key, cell.visualRect)
        }
    }

    private fun drawKey(
        canvas: Canvas,
        key: KeyboardKeySpec,
        rect: RectF,
        radiusScale: Float = 1f,
        textScale: Float = 1f,
    ) {
        key.themePreviewConfig?.let { previewConfig ->
            drawThemePreviewKey(canvas, key, rect, previewConfig)
            return
        }
        val longPressSwipeActive = longPressSwipeDispatchPointerIds.isNotEmpty()
        val ctrlHoldVisualActive = isCtrlHoldVisualModeActive()
        val isLongPressSwipeHovered = longPressSwipeHoveredKeyCountById.containsKey(key.id)
        val isLongPressSwipeTarget = longPressSwipeActive && isLongPressSwipeHoverEligible(key)
        val longPressSwipeSurfaceAssignment =
            if (isLongPressSwipeTarget) {
                resolveLongPressSwipeSurfaceAssignment(key)
            } else {
                null
            }
        val isCtrlPrimaryCornerTarget = ctrlHoldVisualActive && ctrlPrimaryCornerActionValue(key) != null
        val isLongPressSwipeOrigin = longPressSwipeStartKeyIdByPointerId.values.any { it == key.id }
        val hideInactiveLongPressSwipeSurface =
            longPressSwipeActive && !isLongPressSwipeTarget && !isLongPressSwipeOrigin
        val paint = when {
            !key.enabled -> disabledKeyPaint
            voicePermissionRequired && key.action == KeyboardKeyAction.Voice -> specialKeyPaint
            key.id in activePointerPressedKeyIds || key.id in lingeringPressedKeyIds || isLongPressSwipeHovered -> pressedKeyPaint
            isLongPressSwipeTarget || isCtrlPrimaryCornerTarget -> activeKeyPaint
            key.active && usesNeutralKeyboardSurface(key) -> pressedKeyPaint
            key.active || isActiveModifierKey(key) -> activeKeyPaint
            key.actionSurface -> specialKeyPaint
            key.action == KeyboardKeyAction.Text || usesNeutralKeyboardSurface(key) -> keyPaint
            else -> specialKeyPaint
        }
        val drawRadius = resolvedKeyRadius * radiusScale.coerceIn(0.75f, 1f)
        val pressed =
            key.id in activePointerPressedKeyIds || key.id in lingeringPressedKeyIds || isLongPressSwipeHovered
        val mascotPressFactor =
            if (!fieldPolicy.privateMode && key.enabled) {
                pressEffects.mascotPressFactor(rect)
            } else {
                0f
            }
        val reliefPressFactor =
            if (pressed) {
                1f
            } else {
                mascotPressFactor * MASCOT_KEY_PRESS_FACTOR
            }
        val reliefPressed = reliefPressFactor > 0.01f
        val materialEffect = materialPressEffect(pressed)
        val materialProgress = materialPressProgress(key.id)
        val reliefDepth = if (!fieldPolicy.privateMode && themeConfig.keyReliefEnabled) dp(themeConfig.keyReliefDepth) else 0f
        val footprintRect = materialPressRect(rect, materialEffect, materialProgress)
        val drawRect =
            if (reliefDepth > 0f) {
                keyReliefSurfaceRect(footprintRect, reliefDepth, reliefPressFactor)
            } else {
                RectF(footprintRect)
            }
        val materialGeometry =
            keyMaterialGeometry(
                footprintRect = footprintRect,
                surfaceRect = drawRect,
                radius = drawRadius,
                baseColor = paint.color,
                pressed = pressed || reliefPressed,
                reliefDepth = reliefDepth,
            )
        if (!hideInactiveLongPressSwipeSurface && !fieldPolicy.privateMode && themeConfig.presetId != "system" && themeConfig.shadowBlur > 0f) {
            val shadowRect = RectF(if (reliefDepth > 0f) footprintRect else drawRect).apply {
                offset(0f, dp(themeConfig.shadowOffsetY))
                inset(-dp(themeConfig.shadowBlur) * 0.18f, -dp(themeConfig.shadowBlur) * 0.10f)
            }
            if (reliefDepth > 0f) {
                val shadowSave = canvas.save()
                canvas.clipRect(footprintRect)
                canvas.drawRoundRect(shadowRect, drawRadius, drawRadius, keyShadowPaint)
                canvas.restoreToCount(shadowSave)
            } else {
                canvas.drawRoundRect(shadowRect, drawRadius, drawRadius, keyShadowPaint)
            }
        }
        if (!hideInactiveLongPressSwipeSurface) {
            drawMaterialPressBackdrop(canvas, materialGeometry, materialEffect, materialProgress)
            if (reliefDepth > 0f) {
                drawKeyReliefSides(canvas, drawRect, footprintRect, drawRadius, paint.color, pressed || reliefPressed)
            }
            canvas.drawRoundRect(drawRect, drawRadius, drawRadius, paint)
            if (reliefDepth > 0f) {
                drawKeyReliefSurface(canvas, drawRect, drawRadius, paint.color, pressed || reliefPressed)
            }
            drawMaterialPressSurface(canvas, materialGeometry, materialEffect, materialProgress)
            if (!fieldPolicy.privateMode && keyBorderPaint.strokeWidth > 0f && Color.alpha(keyBorderPaint.color) > 0) {
                drawRoundRectStrokeInside(canvas, drawRect, drawRadius, keyBorderPaint)
            }
        }

        if (!hideInactiveLongPressSwipeSurface && voiceRecordingActive && key.action == KeyboardKeyAction.Voice) {
            drawVoiceRecordingIndicator(canvas, drawRect)
        }
        if (!hideInactiveLongPressSwipeSurface && key.pinned) {
            drawPinnedBadge(canvas, drawRect, paint.color)
        }

        textPaint.color =
            if (hideInactiveLongPressSwipeSurface) {
                colorWithOpacity(resolvedTextColor, 0.28f)
            } else if (key.active || isActiveModifierKey(key) || isLongPressSwipeTarget || isCtrlPrimaryCornerTarget) {
                val activeTextColor = if (themeConfig.presetId == "system") {
                    nativeColors.activeText
                } else {
                    contrastTextColor(paint.color)
                }
                keyboardLayerColor(activeTextColor, KEYBOARD_TEXT_OPACITY_BOOST)
            } else if (voicePermissionRequired && key.action == KeyboardKeyAction.Voice) {
                Color.rgb(196, 48, 60)
            } else if (key.enabled) {
                resolvedTextColor
            } else {
                nativeColors.disabledText
        }
        textPaint.textSize = keyTextSize(key) * textScale.coerceIn(0.86f, 1f)
        val label =
            longPressSwipeSurfaceAssignment?.let(KeyboardActionSurfacePolicy::displayLabel)
                ?: if (isLongPressSwipeTarget && !isLongPressSwipeOrigin) {
                    ""
                } else {
                    displayLabelForRect(key, drawRect)
                }
        if (label.isNotEmpty()) {
            val secondaryLabel = key.secondaryLabel?.takeIf { !isLongPressSwipeTarget }
            if (secondaryLabel == null) {
                val baseline = drawRect.centerY() - (textPaint.descent() + textPaint.ascent()) / 2f
                canvas.drawText(label, drawRect.centerX(), baseline, textPaint)
            } else {
                val primaryBaseline = drawRect.centerY() - dp(3f)
                canvas.drawText(label, drawRect.centerX(), primaryBaseline, textPaint)
                secondaryTextPaint.textSize = sp(8f)
                secondaryTextPaint.color =
                    if (hideInactiveLongPressSwipeSurface) {
                        colorWithOpacity(resolvedCornerTextColor, 0.22f)
                    } else if (key.active || isActiveModifierKey(key) || isLongPressSwipeTarget || isCtrlPrimaryCornerTarget) {
                        colorWithOpacity(textPaint.color, 0.78f)
                    } else {
                        resolvedCornerTextColor
                    }
                val secondaryBaseline = drawRect.centerY() + dp(11f)
                canvas.drawText(secondaryLabel, drawRect.centerX(), secondaryBaseline, secondaryTextPaint)
            }
        }

        if (shouldRenderCorners(key) && !isLongPressSwipeTarget) {
            renderCornerGlyphs(canvas, drawRect, key.cornerAssignments)
        }

    }

    private fun keyMaterialGeometry(
        footprintRect: RectF,
        surfaceRect: RectF,
        radius: Float,
        baseColor: Int,
        pressed: Boolean,
        reliefDepth: Float,
    ): KeyMaterialGeometry {
        val bottomDepth = (footprintRect.bottom - surfaceRect.bottom).coerceAtLeast(0f)
        val leftDepth = (surfaceRect.left - footprintRect.left).coerceAtLeast(0f)
        val rightDepth = (footprintRect.right - surfaceRect.right).coerceAtLeast(0f)
        val fullDepth = (surfaceRect.top - footprintRect.top).coerceAtLeast(0f) + bottomDepth
        if (reliefDepth <= 0f || fullDepth <= 0.35f) {
            return KeyMaterialGeometry(
                footprintRect = RectF(footprintRect),
                surfaceRect = RectF(surfaceRect),
                radius = radius,
                baseColor = baseColor,
                pressed = pressed,
                reliefDepth = reliefDepth,
                fullDepth = fullDepth,
                leftDepth = leftDepth,
                rightDepth = rightDepth,
                bottomDepth = bottomDepth,
                leftFacePath = null,
                rightFacePath = null,
                bottomFacePath = null,
            )
        }

        val topInset = min(radius * 0.56f, surfaceRect.height() * 0.42f)
        val sideTopY =
            if (pressed) {
                (surfaceRect.bottom - bottomDepth).coerceAtLeast(surfaceRect.top)
            } else {
                surfaceRect.top + topInset
            }
        val leftFace =
            if (leftDepth > 0.35f) {
                Path().apply {
                    moveTo(surfaceRect.left, sideTopY)
                    lineTo(surfaceRect.left, surfaceRect.bottom)
                    lineTo(surfaceRect.left - leftDepth, surfaceRect.bottom + fullDepth)
                    lineTo(surfaceRect.left - leftDepth, sideTopY + fullDepth)
                    close()
                }
            } else {
                null
            }
        val rightFace =
            if (rightDepth > 0.35f) {
                Path().apply {
                    moveTo(surfaceRect.right, sideTopY)
                    lineTo(surfaceRect.right + rightDepth, sideTopY + fullDepth)
                    lineTo(surfaceRect.right + rightDepth, surfaceRect.bottom + fullDepth)
                    lineTo(surfaceRect.right, surfaceRect.bottom)
                    close()
                }
            } else {
                null
            }
        val bottomFace =
            if (bottomDepth > 0.35f) {
                Path().apply {
                    moveTo(surfaceRect.left, surfaceRect.bottom)
                    lineTo(surfaceRect.right, surfaceRect.bottom)
                    lineTo(surfaceRect.right + rightDepth, surfaceRect.bottom + fullDepth)
                    lineTo(surfaceRect.left - leftDepth, surfaceRect.bottom + fullDepth)
                    close()
                }
            } else {
                null
            }
        return KeyMaterialGeometry(
            footprintRect = RectF(footprintRect),
            surfaceRect = RectF(surfaceRect),
            radius = radius,
            baseColor = baseColor,
            pressed = pressed,
            reliefDepth = reliefDepth,
            fullDepth = fullDepth,
            leftDepth = leftDepth,
            rightDepth = rightDepth,
            bottomDepth = bottomDepth,
            leftFacePath = leftFace,
            rightFacePath = rightFace,
            bottomFacePath = bottomFace,
        )
    }

    private fun resolveLongPressSwipeSurfaceAssignment(key: KeyboardKeySpec): KeyboardCornerAssignment? {
        longPressSwipeHoveredKeyByPointerId.entries
            .firstOrNull { it.value == key.id }
            ?.key
            ?.let { pointerId ->
                longPressSwipeHoveredSelectionByPointerId[pointerId]?.let { selection ->
                    key.cornerAssignments.forSelection(selection)?.let { return it }
                }
            }
        return KeyboardActionSurfacePolicy.preferredLongPressSwipeAssignment(key.cornerAssignments)
    }

    private fun materialPressEffect(pressed: Boolean): String {
        if (!pressed || fieldPolicy.privateMode) return "none"
        return when (themeConfig.pressEffect) {
            "scale",
            "pulse",
            "shake",
            "garland",
            "glow",
            "electricArc",
            "specularSweep",
            "inkPress",
            "keycapTilt",
                "edgeCompression",
                "ripple",
                "confettiLite",
                "fireworksLite",
                "waterSplash",
                "emberBurst",
                "dragonTrail",
                "spiderTrail",
            -> themeConfig.pressEffect
            else -> "none"
        }
    }

    private fun materialPressProgress(keyId: String): Float {
        val duration = themeConfig.effectDurationMs.coerceIn(80, 600)
        val startedAt = materialPressStartedAtById[keyId] ?: return 1f
        return ((SystemClock.uptimeMillis() - startedAt).toFloat() / duration).coerceIn(0f, 1f)
    }

    private fun materialPressRect(
        rect: RectF,
        effect: String,
        progress: Float,
    ): RectF {
        val drawRect = RectF(rect)
        val intensity = themeConfig.effectIntensity.coerceIn(0.25f, 1f)
        when (effect) {
            "scale" -> {
                val scale = 1f - (0.026f + 0.024f * intensity) * easeOutPress(progress)
                insetRectForScale(drawRect, scale)
                if (progress < 1f) materialPressEffectAnimating = true
            }
            "pulse" -> {
                val envelope = 1f - easeOutPress(progress)
                val scale = 1f + 0.045f * intensity * envelope
                insetRectForScale(drawRect, scale)
                if (progress < 1f) materialPressEffectAnimating = true
            }
            "shake" -> {
                val envelope = 1f - progress
                val offsetX = sin((progress * 18.849556f).toDouble()).toFloat() * dp(7f) * intensity * envelope
                drawRect.offset(offsetX, 0f)
                if (progress < 1f) materialPressEffectAnimating = true
            }
            "keycapTilt" -> {
                val settle = easeOutPress(progress)
                drawRect.offset(dp(1.2f) * intensity * settle, dp(1.6f) * intensity * settle)
                insetRectForScale(drawRect, 0.992f)
                if (progress < 1f) materialPressEffectAnimating = true
            }
            "edgeCompression" -> {
                val settle = easeOutPress(progress)
                drawRect.top += dp(0.8f) * intensity * settle
                drawRect.bottom -= dp(1.8f) * intensity * settle
                drawRect.offset(0f, dp(1.2f) * intensity * settle)
                if (progress < 1f) materialPressEffectAnimating = true
            }
            "garland",
            "glow",
            "electricArc",
            "specularSweep",
            "inkPress",
            "ripple",
            "confettiLite",
            "fireworksLite",
            "waterSplash",
            "emberBurst",
            "dragonTrail",
            "spiderTrail",
            -> {
                if (progress < 1f) materialPressEffectAnimating = true
            }
        }
        return drawRect
    }

    private fun insetRectForScale(rect: RectF, scale: Float) {
        val safeScale = scale.coerceIn(0.88f, 1.12f)
        val dx = rect.width() * (1f - safeScale) / 2f
        val dy = rect.height() * (1f - safeScale) / 2f
        rect.inset(dx, dy)
    }

    private fun drawMaterialPressBackdrop(
        canvas: Canvas,
        geometry: KeyMaterialGeometry,
        effect: String,
        progress: Float,
    ) {
        if (effect != "garland" && effect != "glow" && effect != "pulse" && effect != "electricArc") return
        val intensity = themeConfig.effectIntensity.coerceIn(0.25f, 1f)
        val settle = easeOutPress(progress)
        val strength =
            if (effect == "garland" || effect == "glow") {
                0.08f + 0.10f * settle * intensity
            } else if (effect == "electricArc") {
                0.06f + 0.08f * (1f - settle) * intensity
            } else {
                0.08f * (1f - settle) * intensity
            }
        if (strength <= 0.01f) return
        val save = canvas.save()
        canvas.clipRect(geometry.footprintRect)
        keyEffectFillPaint.color = colorWithOpacity(activeKeyPaint.color, strength)
        canvas.drawRoundRect(geometry.footprintRect, geometry.radius, geometry.radius, keyEffectFillPaint)
        canvas.restoreToCount(save)
    }

    private fun drawMaterialPressSurface(
        canvas: Canvas,
        geometry: KeyMaterialGeometry,
        effect: String,
        progress: Float,
    ) {
        if (effect == "none") return
        val intensity = themeConfig.effectIntensity.coerceIn(0.25f, 1f)
        val settle = easeOutPress(progress)
        keyEffectFillPaint.shader = null
        keyEffectStrokePaint.pathEffect = null
        if (effect == "garland" || effect == "glow") {
            keyEffectFillPaint.color = colorWithOpacity(adjustColor(geometry.baseColor, 1.16f), 0.10f + 0.14f * settle * intensity)
            canvas.drawRoundRect(geometry.surfaceRect, geometry.radius, geometry.radius, keyEffectFillPaint)
            drawMaterialFaceTint(canvas, geometry, adjustColor(geometry.baseColor, 1.08f), 0.08f + 0.12f * settle * intensity)
        }
        if (
            effect == "pulse" ||
                effect == "scale" ||
                effect == "ripple" ||
                effect == "confettiLite" ||
                effect == "fireworksLite" ||
                effect == "waterSplash" ||
                effect == "emberBurst" ||
                effect == "dragonTrail" ||
                effect == "spiderTrail"
        ) {
            keyEffectFillPaint.color = colorWithOpacity(adjustColor(geometry.baseColor, 1.08f), 0.04f + 0.08f * (1f - settle) * intensity)
            canvas.drawRoundRect(geometry.surfaceRect, geometry.radius, geometry.radius, keyEffectFillPaint)
        }
        if (effect == "inkPress") {
            keyEffectFillPaint.shader = null
            keyEffectFillPaint.color = colorWithOpacity(adjustColor(geometry.baseColor, 0.68f), 0.10f + 0.16f * settle * intensity)
            canvas.drawRoundRect(geometry.surfaceRect, geometry.radius, geometry.radius, keyEffectFillPaint)
            drawMaterialFaceTint(canvas, geometry, adjustColor(geometry.baseColor, 0.56f), 0.06f + 0.10f * settle * intensity)
        }
        if (effect == "keycapTilt" || effect == "edgeCompression") {
            drawKeyPressBevel(canvas, geometry, effect, settle, intensity)
        }
        if (effect == "specularSweep") {
            drawSpecularSweep(canvas, geometry, progress, intensity)
        }
        if (effect == "electricArc") {
            drawElectricArc(canvas, geometry, progress, intensity)
        }
        if (
            effect == "garland" ||
                effect == "glow" ||
                effect == "pulse" ||
                effect == "scale" ||
                effect == "electricArc" ||
                effect == "specularSweep" ||
                effect == "ripple" ||
                effect == "confettiLite" ||
                effect == "fireworksLite" ||
                effect == "waterSplash" ||
                effect == "emberBurst" ||
                effect == "dragonTrail" ||
                effect == "spiderTrail"
        ) {
            keyEffectStrokePaint.color = colorWithOpacity(activeKeyPaint.color, 0.28f + 0.22f * intensity)
            keyEffectStrokePaint.strokeWidth = dp(1.2f)
            keyEffectStrokePaint.pathEffect = null
            drawRoundRectStrokeInside(canvas, geometry.surfaceRect, geometry.radius, keyEffectStrokePaint)
        }
    }

    private fun drawMaterialFaceTint(
        canvas: Canvas,
        geometry: KeyMaterialGeometry,
        color: Int,
        alpha: Float,
    ) {
        if (geometry.reliefDepth <= 0f || alpha <= 0.01f) return
        keyEffectFillPaint.shader = null
        keyEffectFillPaint.color = colorWithOpacity(color, alpha)
        geometry.leftFacePath?.let { canvas.drawPath(it, keyEffectFillPaint) }
        geometry.rightFacePath?.let { canvas.drawPath(it, keyEffectFillPaint) }
        geometry.bottomFacePath?.let { canvas.drawPath(it, keyEffectFillPaint) }
    }

    private fun drawKeyPressBevel(
        canvas: Canvas,
        geometry: KeyMaterialGeometry,
        effect: String,
        settle: Float,
        intensity: Float,
    ) {
        val rect = geometry.surfaceRect
        val topStrength = if (effect == "keycapTilt") 0.16f else 0.11f
        keyEffectStrokePaint.strokeWidth = dp(1.1f)
        keyEffectStrokePaint.pathEffect = null
        keyEffectStrokePaint.color = colorWithOpacity(adjustColor(geometry.baseColor, 1.18f), topStrength * settle * intensity)
        val saveTop = canvas.save()
        canvas.clipRect(rect.left, rect.top, rect.right, rect.centerY())
        drawRoundRectStrokeInside(canvas, rect, geometry.radius, keyEffectStrokePaint)
        canvas.restoreToCount(saveTop)

        keyEffectStrokePaint.strokeWidth = dp(if (effect == "edgeCompression") 2.3f else 1.6f)
        keyEffectStrokePaint.color = colorWithOpacity(adjustColor(geometry.baseColor, 0.58f), 0.18f * settle * intensity)
        val saveBottom = canvas.save()
        canvas.clipRect(rect.left, rect.centerY(), rect.right, rect.bottom)
        drawRoundRectStrokeInside(canvas, rect, geometry.radius, keyEffectStrokePaint)
        canvas.restoreToCount(saveBottom)
        drawMaterialFaceTint(canvas, geometry, adjustColor(geometry.baseColor, 0.72f), 0.08f * settle * intensity)
    }

    private fun drawSpecularSweep(
        canvas: Canvas,
        geometry: KeyMaterialGeometry,
        progress: Float,
        intensity: Float,
    ) {
        val rect = geometry.surfaceRect
        val sweepCenter = rect.left + rect.width() * (0.18f + 0.72f * easeOutPress(progress))
        val sweepWidth = rect.width() * (0.18f + 0.10f * intensity)
        keyEffectFillPaint.shader =
            LinearGradient(
                sweepCenter - sweepWidth,
                rect.top,
                sweepCenter + sweepWidth,
                rect.bottom,
                intArrayOf(
                    colorWithOpacity(Color.WHITE, 0f),
                    colorWithOpacity(Color.WHITE, 0.22f * intensity),
                    colorWithOpacity(Color.WHITE, 0f),
                ),
                floatArrayOf(0f, 0.5f, 1f),
                Shader.TileMode.CLAMP,
            )
        val save = canvas.save()
        keyEffectPath.reset()
        keyEffectPath.addRoundRect(rect, geometry.radius, geometry.radius, Path.Direction.CW)
        canvas.clipPath(keyEffectPath)
        canvas.drawRoundRect(rect, geometry.radius, geometry.radius, keyEffectFillPaint)
        canvas.restoreToCount(save)
        keyEffectFillPaint.shader = null
        drawMaterialFaceTint(canvas, geometry, Color.WHITE, 0.04f * intensity)
    }

    private fun drawElectricArc(
        canvas: Canvas,
        geometry: KeyMaterialGeometry,
        progress: Float,
        intensity: Float,
    ) {
        val rect = geometry.surfaceRect
        val phase = progress * dp(18f)
        keyEffectStrokePaint.shader = null
        keyEffectStrokePaint.pathEffect = DashPathEffect(floatArrayOf(dp(6f), dp(3f)), phase)
        keyEffectStrokePaint.strokeWidth = dp(1.0f + 1.1f * intensity)
        keyEffectStrokePaint.color = colorWithOpacity(activeKeyPaint.color, 0.38f + 0.26f * intensity)
        drawRoundRectStrokeInside(canvas, rect, geometry.radius, keyEffectStrokePaint)
        keyEffectStrokePaint.pathEffect = null

        keyEffectStrokePaint.color = colorWithOpacity(Color.WHITE, 0.20f + 0.18f * intensity)
        keyEffectStrokePaint.strokeWidth = dp(0.8f + 0.5f * intensity)
        keyEffectPath.reset()
        val topY = rect.top + keyEffectStrokePaint.strokeWidth
        val rightX = rect.right - keyEffectStrokePaint.strokeWidth
        keyEffectPath.moveTo(rect.left + geometry.radius * 0.72f, topY)
        keyEffectPath.lineTo(rect.right - geometry.radius * 0.72f, topY)
        keyEffectPath.moveTo(rightX, rect.top + geometry.radius * 0.72f)
        keyEffectPath.lineTo(rightX, rect.bottom - geometry.radius * 0.72f)
        canvas.drawPath(keyEffectPath, keyEffectStrokePaint)
        drawMaterialFaceTint(canvas, geometry, activeKeyPaint.color, 0.10f + 0.12f * (1f - easeOutPress(progress)) * intensity)

        keyEffectStrokePaint.color = colorWithOpacity(Color.WHITE, 0.22f + 0.18f * intensity)
        keyEffectStrokePaint.strokeWidth = dp(0.55f + 0.45f * intensity)
        geometry.rightFacePath?.let { canvas.drawPath(it, keyEffectStrokePaint) }
        geometry.bottomFacePath?.let { canvas.drawPath(it, keyEffectStrokePaint) }
    }

    private fun easeOutPress(progress: Float): Float {
        val inverse = 1f - progress.coerceIn(0f, 1f)
        return 1f - inverse * inverse * inverse
    }

    private fun keyReliefVisibleDepth(depth: Float, pressFactor: Float): Float {
        if (depth <= 0f) return 0f
        val pressedDepth = max(dp(0.55f), depth * 0.20f)
        val visibleDepth = depth - (depth - pressedDepth) * pressFactor.coerceIn(0f, 1f)
        return visibleDepth.coerceIn(0f, depth)
    }

    private fun keyReliefSideDepth(depth: Float): Float {
        if (depth <= 0f) return 0f
        return min(depth * 0.34f, dp(2.2f))
    }

    private fun keyReliefSurfaceRect(
        footprintRect: RectF,
        reliefDepth: Float,
        pressFactor: Float,
    ): RectF {
        val surfaceRect = RectF(footprintRect)
        if (reliefDepth <= 0f) return surfaceRect

        val visibleDepth = keyReliefVisibleDepth(reliefDepth, pressFactor)
        val pressTravel = (reliefDepth - visibleDepth).coerceAtLeast(0f)
        val sideDepth = keyReliefSideDepth(reliefDepth)
        surfaceRect.top += pressTravel
        surfaceRect.left += sideDepth
        surfaceRect.right -= sideDepth
        surfaceRect.bottom -= reliefDepth
        surfaceRect.bottom += pressTravel

        val minHeight = dp(8f)
        if (surfaceRect.height() < minHeight) {
            surfaceRect.top = surfaceRect.bottom - minHeight
        }
        val minWidth = dp(12f)
        if (surfaceRect.width() < minWidth) {
            val center = footprintRect.centerX()
            surfaceRect.left = (center - minWidth / 2f).coerceAtLeast(footprintRect.left)
            surfaceRect.right = (center + minWidth / 2f).coerceAtMost(footprintRect.right)
        }
        return surfaceRect
    }

    private fun drawKeyReliefSides(
        canvas: Canvas,
        surfaceRect: RectF,
        footprintRect: RectF,
        radius: Float,
        baseColor: Int,
        pressed: Boolean,
    ) {
        val bottomDepth = (footprintRect.bottom - surfaceRect.bottom).coerceAtLeast(0f)
        val leftDepth = (surfaceRect.left - footprintRect.left).coerceAtLeast(0f)
        val rightDepth = (footprintRect.right - surfaceRect.right).coerceAtLeast(0f)
        if (bottomDepth <= 0.35f && leftDepth <= 0.35f && rightDepth <= 0.35f) return
        val fullDepth = (surfaceRect.top - footprintRect.top).coerceAtLeast(0f) + bottomDepth
        if (fullDepth <= 0.35f) return
        keyReliefDarkPaint.style = Paint.Style.FILL
        keyReliefDarkPaint.shader = null
        val faceAlpha = if (pressed) 0.62f else 0.92f
        keyReliefDarkPaint.color = colorWithOpacity(adjustColor(baseColor, 0.62f), faceAlpha)
        val topInset = min(radius * 0.56f, surfaceRect.height() * 0.42f)
        val sideTopY =
            if (pressed) {
                (surfaceRect.bottom - bottomDepth).coerceAtLeast(surfaceRect.top)
            } else {
                surfaceRect.top + topInset
            }
        val save = canvas.save()
        canvas.clipRect(footprintRect)
        canvas.drawRoundRect(footprintRect, radius, radius, keyReliefDarkPaint)

        if (leftDepth > 0.35f) {
            keyEffectPath.reset()
            keyEffectPath.moveTo(surfaceRect.left, sideTopY)
            keyEffectPath.lineTo(surfaceRect.left, surfaceRect.bottom)
            keyEffectPath.lineTo(surfaceRect.left - leftDepth, surfaceRect.bottom + fullDepth)
            keyEffectPath.lineTo(surfaceRect.left - leftDepth, sideTopY + fullDepth)
            keyEffectPath.close()
            keyEffectPath.computeBounds(scrollVisualRect, true)
            keyReliefDarkPaint.shader =
                LinearGradient(
                    scrollVisualRect.left,
                    scrollVisualRect.top,
                    scrollVisualRect.right,
                    scrollVisualRect.bottom,
                    intArrayOf(
                        colorWithOpacity(adjustColor(baseColor, 0.82f), faceAlpha),
                        colorWithOpacity(adjustColor(baseColor, 0.64f), faceAlpha),
                    ),
                    null,
                    Shader.TileMode.CLAMP,
                )
            canvas.drawPath(keyEffectPath, keyReliefDarkPaint)
            keyReliefDarkPaint.shader = null
        }

        if (rightDepth > 0.35f) {
            keyEffectPath.reset()
            keyEffectPath.moveTo(surfaceRect.right, sideTopY)
            keyEffectPath.lineTo(surfaceRect.right + rightDepth, sideTopY + fullDepth)
            keyEffectPath.lineTo(surfaceRect.right + rightDepth, surfaceRect.bottom + fullDepth)
            keyEffectPath.lineTo(surfaceRect.right, surfaceRect.bottom)
            keyEffectPath.close()
            keyEffectPath.computeBounds(scrollVisualRect, true)
            keyReliefDarkPaint.shader =
                LinearGradient(
                    scrollVisualRect.left,
                    scrollVisualRect.top,
                    scrollVisualRect.right,
                    scrollVisualRect.bottom,
                    intArrayOf(
                        colorWithOpacity(adjustColor(baseColor, 0.70f), faceAlpha),
                        colorWithOpacity(adjustColor(baseColor, 0.48f), faceAlpha),
                    ),
                    null,
                    Shader.TileMode.CLAMP,
                )
            canvas.drawPath(keyEffectPath, keyReliefDarkPaint)
            keyReliefDarkPaint.shader = null
        }

        if (bottomDepth > 0.35f) {
            keyEffectPath.reset()
            keyEffectPath.moveTo(surfaceRect.left, surfaceRect.bottom)
            keyEffectPath.lineTo(surfaceRect.right, surfaceRect.bottom)
            keyEffectPath.lineTo(surfaceRect.right + rightDepth, surfaceRect.bottom + fullDepth)
            keyEffectPath.lineTo(surfaceRect.left - leftDepth, surfaceRect.bottom + fullDepth)
            keyEffectPath.close()
            keyEffectPath.computeBounds(scrollVisualRect, true)
            keyReliefDarkPaint.shader =
                LinearGradient(
                    scrollVisualRect.left,
                    scrollVisualRect.top,
                    scrollVisualRect.left,
                    scrollVisualRect.bottom,
                    intArrayOf(
                        colorWithOpacity(adjustColor(baseColor, 0.78f), faceAlpha),
                        colorWithOpacity(adjustColor(baseColor, 0.56f), faceAlpha),
                    ),
                    null,
                    Shader.TileMode.CLAMP,
                )
            canvas.drawPath(keyEffectPath, keyReliefDarkPaint)
            keyReliefDarkPaint.shader = null
        }
        canvas.restoreToCount(save)
    }

    private fun drawKeyReliefSurface(
        canvas: Canvas,
        rect: RectF,
        radius: Float,
        baseColor: Int,
        pressed: Boolean,
    ) {
        if (pressed) return
        keyReliefLightPaint.shader = null
        keyReliefLightPaint.style = Paint.Style.STROKE
        keyReliefLightPaint.strokeWidth = dp(0.75f)
        keyReliefLightPaint.color =
            colorWithOpacity(
                adjustColor(baseColor, 1.20f),
                0.13f,
            )
        val lightInset = keyReliefLightPaint.strokeWidth / 2f
        scrollVisualRect.set(rect)
        scrollVisualRect.inset(lightInset, lightInset)
        val lightRadius = (radius - lightInset).coerceAtLeast(0f)
        val lightSave = canvas.save()
        canvas.clipRect(rect.left, rect.top, rect.right, rect.top + rect.height() * 0.42f)
        canvas.drawRoundRect(scrollVisualRect, lightRadius, lightRadius, keyReliefLightPaint)
        canvas.restoreToCount(lightSave)
    }

    private fun adjustColor(color: Int, factor: Float): Int {
        fun channel(value: Int): Int = (value * factor).roundToInt().coerceIn(0, 255)
        return Color.argb(Color.alpha(color), channel(Color.red(color)), channel(Color.green(color)), channel(Color.blue(color)))
    }

    private fun drawRoundRectStrokeInside(
        canvas: Canvas,
        rect: RectF,
        radius: Float,
        paint: Paint,
    ) {
        val strokeInset = (paint.strokeWidth / 2f).coerceAtLeast(0f)
        if (strokeInset <= 0f) {
            canvas.drawRoundRect(rect, radius, radius, paint)
            return
        }
        val maxInset = ((min(rect.width(), rect.height()) - 1f) / 2f).coerceAtLeast(0f)
        val safeInset = min(strokeInset, maxInset)
        if (safeInset <= 0f) {
            canvas.drawRoundRect(rect, radius, radius, paint)
            return
        }
        scrollVisualRect.set(rect)
        scrollVisualRect.inset(safeInset, safeInset)
        val innerRadius = (radius - safeInset).coerceAtLeast(0f)
        canvas.drawRoundRect(scrollVisualRect, innerRadius, innerRadius, paint)
    }

    private fun usesNeutralKeyboardSurface(key: KeyboardKeySpec): Boolean {
        return when (key.action) {
            KeyboardKeyAction.ModeLetters,
            KeyboardKeyAction.ModeNumbers,
            KeyboardKeyAction.ModeAccents,
            KeyboardKeyAction.ModeSymbols,
            KeyboardKeyAction.ModeNavigation -> true
            else -> layoutMode == KeyboardLayoutMode.Navigation && key.id.startsWith("nav-mode-")
        }
    }

    private fun drawThemePreviewKey(
        canvas: Canvas,
        key: KeyboardKeySpec,
        rect: RectF,
        previewConfig: KeyboardThemeConfig,
    ) {
        val isPressed = key.id in activePointerPressedKeyIds
        val backgroundColor = if (isPressed) previewConfig.pressedKeyColor else previewConfig.backgroundStartColor
        themePreviewKeyPaint.shader = if (previewConfig.useGradient && !isPressed) {
            LinearGradient(
                rect.left,
                rect.top,
                rect.right,
                rect.bottom,
                previewConfig.backgroundStartColor,
                previewConfig.backgroundEndColor,
                Shader.TileMode.CLAMP,
            )
        } else {
            null
        }
        themePreviewKeyPaint.color = backgroundColor
        canvas.drawRoundRect(rect, resolvedKeyRadius, resolvedKeyRadius, themePreviewKeyPaint)
        themePreviewKeyPaint.shader = null

        val inset = dp(4f)
        val stripTop = rect.bottom - dp(9f)
        val stripRect = RectF(rect.left + inset, stripTop, rect.right - inset, rect.bottom - dp(4f))
        val stripWidth = stripRect.width() / 3f
        themePreviewKeyPaint.color = previewConfig.keyColor
        canvas.drawRoundRect(
            RectF(stripRect.left, stripRect.top, stripRect.left + stripWidth - dp(1f), stripRect.bottom),
            dp(2f),
            dp(2f),
            themePreviewKeyPaint,
        )
        themePreviewKeyPaint.color = previewConfig.specialKeyColor
        canvas.drawRoundRect(
            RectF(stripRect.left + stripWidth, stripRect.top, stripRect.left + (stripWidth * 2f) - dp(1f), stripRect.bottom),
            dp(2f),
            dp(2f),
            themePreviewKeyPaint,
        )
        themePreviewKeyPaint.color = previewConfig.activeKeyColor
        canvas.drawRoundRect(
            RectF(stripRect.left + (stripWidth * 2f), stripRect.top, stripRect.right, stripRect.bottom),
            dp(2f),
            dp(2f),
            themePreviewKeyPaint,
        )

        if (key.active) {
            keyBorderPaint.color = previewConfig.activeKeyColor
            keyBorderPaint.strokeWidth = dp(2f)
            drawRoundRectStrokeInside(canvas, rect, resolvedKeyRadius, keyBorderPaint)
            restoreKeyBorderPaint()
        } else if (previewConfig.borderWidth > 0f && Color.alpha(previewConfig.borderColor) > 0) {
            keyBorderPaint.color = previewConfig.borderColor
            keyBorderPaint.strokeWidth = dp(previewConfig.borderWidth)
            drawRoundRectStrokeInside(canvas, rect, resolvedKeyRadius, keyBorderPaint)
            restoreKeyBorderPaint()
        }

        if (key.pinned) {
            drawPinnedBadge(canvas, rect, previewConfig.specialKeyColor, previewConfig.presetId)
        }

        textPaint.color = contrastTextColor(backgroundColor)
        textPaint.textSize = keyTextSize(key)
        val baseline = rect.centerY() - dp(3f) - (textPaint.descent() + textPaint.ascent()) / 2f
        canvas.drawText(displayLabel(key), rect.centerX(), baseline, textPaint)
    }

    private fun drawPinnedBadge(
        canvas: Canvas,
        rect: RectF,
        keyColor: Int,
        presetId: String = themeConfig.presetId,
    ) {
        val cx = rect.right - dp(8f)
        val cy = rect.top + dp(4f)
        withAngledPinnedBadge(canvas, cx, cy, pinnedBadgeRotationForPreset(presetId)) {
            when (presetId) {
                KeyboardThemePresets.PIXEL_CANDY -> drawCandyPinnedBadge(canvas, cx, cy, keyColor)
                KeyboardThemePresets.SUNSET_GRADIENT -> drawCloudPinnedBadge(canvas, cx, cy, keyColor)
                KeyboardThemePresets.GLASS_MINT -> drawDropPinnedBadge(canvas, cx, cy, contrastBadgeAccentColor(keyColor))
                KeyboardThemePresets.MIDNIGHT_AURORA -> drawStarPinnedBadge(canvas, cx, cy, midnightStarBadgeColor())
                else -> drawLedPinnedBadge(canvas, cx, cy, contrastBadgeAccentColor(keyColor), contrastBadgeBaseColor(keyColor))
            }
        }
    }

    private fun pinnedBadgeRotationForPreset(presetId: String): Float {
        return when (presetId) {
            KeyboardThemePresets.GLASS_MINT -> 20f
            KeyboardThemePresets.MIDNIGHT_AURORA -> 20f
            else -> 20f
        }
    }

    private fun midnightStarBadgeColor(): Int {
        return Color.rgb(255, 216, 77)
    }

    private fun drawVoiceRecordingIndicator(
        canvas: Canvas,
        rect: RectF,
    ) {
        val phase = (SystemClock.uptimeMillis() % 1100L).toFloat() / 1100f
        val red = Color.rgb(235, 47, 64)
        val centerRadius = min(rect.width(), rect.height()) * (0.24f + 0.08f * phase)
        voicePulsePaint.style = Paint.Style.FILL
        voicePulsePaint.color = Color.argb((82 * (1f - phase)).toInt().coerceIn(0, 82), Color.red(red), Color.green(red), Color.blue(red))
        canvas.drawCircle(rect.centerX(), rect.centerY(), centerRadius, voicePulsePaint)

        voiceRingPaint.style = Paint.Style.STROKE
        voiceRingPaint.strokeWidth = dp(1.6f)
        voiceRingPaint.color = Color.argb((210 * (1f - phase)).toInt().coerceIn(0, 210), Color.red(red), Color.green(red), Color.blue(red))
        canvas.drawCircle(rect.centerX(), rect.centerY(), centerRadius + dp(3f), voiceRingPaint)

        val dotRadius = min(rect.width(), rect.height()) * 0.085f
        val dotCx = rect.right - max(dp(8f), rect.width() * 0.16f)
        val dotCy = rect.top + max(dp(8f), rect.height() * 0.18f)
        voicePulsePaint.color = Color.argb(235, Color.red(red), Color.green(red), Color.blue(red))
        canvas.drawCircle(dotCx, dotCy, dotRadius, voicePulsePaint)
        voiceRingPaint.color = Color.WHITE
        voiceRingPaint.strokeWidth = dp(1.2f)
        canvas.drawCircle(dotCx, dotCy, dotRadius + dp(1f), voiceRingPaint)
    }

    private fun withAngledPinnedBadge(
        canvas: Canvas,
        cx: Float,
        cy: Float,
        rotationDegrees: Float,
        draw: () -> Unit,
    ) {
        val save = canvas.save()
        canvas.rotate(rotationDegrees, cx, cy)
        try {
            draw()
        } finally {
            canvas.restoreToCount(save)
        }
    }

    private fun drawCandyPinnedBadge(
        canvas: Canvas,
        cx: Float,
        cy: Float,
        keyColor: Int,
    ) {
        pinnedBadgePaint.style = Paint.Style.FILL
        pinnedBadgeAccentPaint.style = Paint.Style.FILL
        pinnedBadgePaint.color = contrastBadgeBaseColor(keyColor)
        pinnedBadgeAccentPaint.color = contrastBadgeAccentColor(keyColor)
        val body = RectF(cx - dp(4.5f), cy - dp(3f), cx + dp(4.5f), cy + dp(3f))
        canvas.drawRoundRect(body, dp(3f), dp(3f), pinnedBadgeAccentPaint)
        canvas.drawCircle(cx, cy, dp(2.1f), pinnedBadgePaint)
        val left = Path().apply {
            moveTo(cx - dp(4.5f), cy)
            lineTo(cx - dp(8f), cy - dp(3f))
            lineTo(cx - dp(8f), cy + dp(3f))
            close()
        }
        val right = Path().apply {
            moveTo(cx + dp(4.5f), cy)
            lineTo(cx + dp(8f), cy - dp(3f))
            lineTo(cx + dp(8f), cy + dp(3f))
            close()
        }
        canvas.drawPath(left, pinnedBadgePaint)
        canvas.drawPath(right, pinnedBadgePaint)
    }

    private fun drawCloudPinnedBadge(
        canvas: Canvas,
        cx: Float,
        cy: Float,
        keyColor: Int,
    ) {
        pinnedBadgePaint.style = Paint.Style.FILL
        pinnedBadgePaint.color = contrastBadgeBaseColor(keyColor)
        canvas.drawCircle(cx - dp(3f), cy + dp(1f), dp(3.3f), pinnedBadgePaint)
        canvas.drawCircle(cx + dp(1f), cy - dp(1f), dp(4.1f), pinnedBadgePaint)
        canvas.drawCircle(cx + dp(5f), cy + dp(1.2f), dp(3f), pinnedBadgePaint)
        canvas.drawRoundRect(RectF(cx - dp(6.5f), cy, cx + dp(7f), cy + dp(4.7f)), dp(2f), dp(2f), pinnedBadgePaint)
    }

    private fun drawLedPinnedBadge(
        canvas: Canvas,
        cx: Float,
        cy: Float,
        color: Int,
        baseColor: Int = Color.argb(85, Color.red(color), Color.green(color), Color.blue(color)),
    ) {
        pinnedBadgePaint.style = Paint.Style.FILL
        pinnedBadgeAccentPaint.style = Paint.Style.FILL
        pinnedBadgePaint.color = baseColor
        pinnedBadgeAccentPaint.color = color
        canvas.drawCircle(cx, cy, dp(6.2f), pinnedBadgePaint)
        canvas.drawCircle(cx, cy, dp(3.4f), pinnedBadgeAccentPaint)
    }

    private fun drawDropPinnedBadge(
        canvas: Canvas,
        cx: Float,
        cy: Float,
        color: Int,
    ) {
        pinnedBadgeAccentPaint.style = Paint.Style.FILL
        pinnedBadgeAccentPaint.color = color
        val drop = Path().apply {
            moveTo(cx, cy - dp(6f))
            cubicTo(cx + dp(5f), cy - dp(1f), cx + dp(4f), cy + dp(5f), cx, cy + dp(5f))
            cubicTo(cx - dp(4f), cy + dp(5f), cx - dp(5f), cy - dp(1f), cx, cy - dp(6f))
            close()
        }
        canvas.drawPath(drop, pinnedBadgeAccentPaint)
    }

    private fun drawPaperPinnedBadge(
        canvas: Canvas,
        cx: Float,
        cy: Float,
    ) {
        drawLedPinnedBadge(canvas, cx, cy, contrastBadgeAccentColor(specialKeyPaint.color), contrastBadgeBaseColor(specialKeyPaint.color))
    }

    private fun contrastBadgeBaseColor(keyColor: Int): Int {
        return if (relativeLuminance(keyColor) > 0.55f) Color.argb(235, 24, 28, 32) else Color.argb(235, 255, 255, 255)
    }

    private fun contrastBadgeAccentColor(keyColor: Int): Int {
        return if (relativeLuminance(keyColor) > 0.55f) Color.WHITE else Color.BLACK
    }

    private fun contrastTextColor(backgroundColor: Int): Int {
        return if (relativeLuminance(backgroundColor) > 0.45f) Color.BLACK else Color.WHITE
    }

    private fun relativeLuminance(color: Int): Float {
        fun channel(value: Int): Float {
            val normalized = value / 255f
            return if (normalized <= 0.03928f) normalized / 12.92f else Math.pow(((normalized + 0.055f) / 1.055f).toDouble(), 2.4).toFloat()
        }
        return 0.2126f * channel(Color.red(color)) + 0.7152f * channel(Color.green(color)) + 0.0722f * channel(Color.blue(color))
    }

    private fun drawStarPinnedBadge(
        canvas: Canvas,
        cx: Float,
        cy: Float,
        color: Int,
    ) {
        pinnedBadgeAccentPaint.style = Paint.Style.FILL
        pinnedBadgeAccentPaint.color = color
        val star = Path().apply {
            moveTo(cx, cy - dp(6f))
            lineTo(cx + dp(1.8f), cy - dp(1.8f))
            lineTo(cx + dp(6f), cy)
            lineTo(cx + dp(1.8f), cy + dp(1.8f))
            lineTo(cx, cy + dp(6f))
            lineTo(cx - dp(1.8f), cy + dp(1.8f))
            lineTo(cx - dp(6f), cy)
            lineTo(cx - dp(1.8f), cy - dp(1.8f))
            close()
        }
        canvas.drawPath(star, pinnedBadgeAccentPaint)
    }

    private fun shouldRenderCorners(key: KeyboardKeySpec): Boolean {
        return cornerModeEnabled &&
            allowsCornerGesture(key) &&
            !key.cornerAssignments.isEmpty()
    }

    private fun renderCornerGlyphs(
        canvas: Canvas,
        rect: RectF,
        assignments: KeyboardCornerAssignments,
    ) {
        secondaryTextPaint.textSize = sp(9f)
        secondaryTextPaint.color = resolvedCornerTextColor
        val previousAlign = secondaryTextPaint.textAlign
        secondaryTextPaint.textAlign = Paint.Align.CENTER
        assignments.up?.let {
            drawCornerLabel(canvas, it.label, rect.centerX(), rect.top + dp(9f))
        }
        assignments.down?.let {
            drawCornerLabel(canvas, it.label, rect.centerX(), rect.bottom - dp(5f))
        }
        secondaryTextPaint.textAlign = Paint.Align.CENTER
        assignments.left?.let {
            drawCornerLabel(canvas, it.label, rect.left + dp(7f), rect.centerY() + dp(3f))
        }
        assignments.right?.let {
            drawCornerLabel(canvas, it.label, rect.right - dp(7f), rect.centerY() + dp(3f))
        }
        assignments.topLeft?.let {
            drawCornerLabel(canvas, it.label, rect.left + dp(8f), rect.top + dp(10f))
        }
        assignments.bottomLeft?.let {
            drawCornerLabel(canvas, it.label, rect.left + dp(8f), rect.bottom - dp(6f))
        }
        assignments.topRight?.let {
            drawCornerLabel(canvas, it.label, rect.right - dp(8f), rect.top + dp(10f))
        }
        assignments.bottomRight?.let {
            drawCornerLabel(canvas, it.label, rect.right - dp(8f), rect.bottom - dp(6f))
        }
        secondaryTextPaint.textAlign = previousAlign
    }

    private fun drawCornerLabel(
        canvas: Canvas,
        label: String,
        cx: Float,
        cy: Float,
    ) {
        val lines = label.split('\n').filter { it.isNotEmpty() }
        if (lines.size <= 1) {
            canvas.drawText(label, cx, cy, secondaryTextPaint)
            return
        }
        val lineHeight = -secondaryTextPaint.ascent() + secondaryTextPaint.descent()
        val totalHeight = lineHeight * lines.size
        var top = cy - (totalHeight / 2f)
        lines.forEach { line ->
            val baseline = top - secondaryTextPaint.ascent()
            canvas.drawText(line, cx, baseline, secondaryTextPaint)
            top += lineHeight
        }
    }

    private fun effectiveGestureSelection(
        key: KeyboardKeySpec,
        sample: GestureSample,
    ): GestureSelection {
        val selection = KeyboardGestureClassifier.classify(sample, gestureThresholds)
        return if (selection == GestureSelection.Canceled) {
            GestureSelection.Canceled
        } else if (!cornerModeEnabled) {
            GestureSelection.PrimaryTap
        } else if (selection == GestureSelection.PrimaryTap) {
            GestureSelection.PrimaryTap
        } else if (selection in SWIPE_GESTURES && allowsTextGesture(key)) {
            selection
        } else if (allowsCornerGesture(key)) {
            selection
        } else {
            GestureSelection.PrimaryTap
        }
    }

    private val SWIPE_GESTURES =
        setOf(
            GestureSelection.Up,
            GestureSelection.Right,
            GestureSelection.Down,
            GestureSelection.Left,
        )

    private fun allowsTextGesture(key: KeyboardKeySpec): Boolean {
        return key.action == KeyboardKeyAction.Text && key.id != "space"
    }

    private fun allowsCornerGesture(key: KeyboardKeySpec): Boolean {
        return (key.action == KeyboardKeyAction.Text && key.id != "space") || specialKeyCornersEnabled
    }

    private fun dispatch(
        key: KeyboardKeySpec,
        selection: GestureSelection,
        sourceFrame: KeyFrame? = null,
    ) {
        runKeyboardSafely("dispatch:${key.id}") {
            dispatchUnsafe(key, selection, sourceFrame)
        }
    }

    private fun dispatchUnsafe(
        key: KeyboardKeySpec,
        selection: GestureSelection,
        sourceFrame: KeyFrame?,
    ) {
        if (selection == GestureSelection.Canceled) {
            setStatus("Gesture canceled")
            performKeyboardHaptic(HapticFeedbackConstants.REJECT)
            return
        }
        var commandKey = key
        if (selection == GestureSelection.PrimaryTap && key.actionDescriptorId != null) {
            val result =
                actionBarController.onTap(
                    actionId = key.actionDescriptorId,
                    state = actionBarState,
                    environment = actionEnvironment(),
                )
            setActionBarState(result.nextState)
            if (result.command == null) {
                setStatus(result.status ?: "Action unavailable")
                refreshLayout()
                return
            }
            commandKey =
                if (result.command == key.action) {
                    key
                } else {
                    key.copy(
                        action = result.command,
                        actionDescriptorId = null,
                        actionDescriptorPrimary = false,
                    )
                }
        }
        triggerPressEffect(key, sourceFrame)
        performKeyboardHaptic(HapticFeedbackConstants.KEYBOARD_TAP)
        if (shouldPlayKeySoundBeforeDispatch(commandKey)) {
            performKeySound()
        }
        if (selection != GestureSelection.PrimaryTap) {
            val cornerValue = keyValueForSelection(key, selection)
            if (cornerValue == null) {
                when (commandKey.action) {
                    KeyboardKeyAction.Text,
                    KeyboardKeyAction.KeyValue,
                    -> {
                        setStatus("Gesture shortcut unavailable")
                    }
                    else -> {
                        dispatch(commandKey, GestureSelection.PrimaryTap, sourceFrame)
                    }
                    }
                return
            }
            if (!dispatchKeyValue(cornerValue, selection, clearModifiersAfter = true)) {
                when (commandKey.action) {
                    KeyboardKeyAction.Text,
                    KeyboardKeyAction.KeyValue,
                    -> {
                        setStatus("Gesture shortcut unavailable")
                    }
                    else -> {
                        dispatch(commandKey, GestureSelection.PrimaryTap, sourceFrame)
                    }
                }
            }
            return
        }
        val previousLayout = layoutFingerprint()
        val previousLayoutRefreshGeneration = layoutRefreshGeneration
        val previousMode = layoutMode
        val previousPanel = panelMode
        when (commandKey.action) {
            KeyboardKeyAction.KeyValue -> {
                val keyValue = commandKey.keyValue ?: return
                if (!dispatchKeyValue(keyValue, selection, clearModifiersAfter = true)) {
                    setStatus("Key unavailable")
                }
                autoCloseModeAfterTextInput(keyValue.text != null)
            }
            KeyboardKeyAction.Text -> {
                val keyValue = keyValueForSelection(commandKey, selection) ?: return
                val ctrlPromoted = keyValue == ctrlPrimaryCornerActionValue(commandKey)
                val committed = dispatchKeyValue(
                    keyValue,
                    selection,
                    clearModifiersAfter = !ctrlPromoted,
                )
                if (!committed) {
                    setStatus("Text input unavailable")
                    return
                }
                val output = keyValue.text ?: return
                if (panelMode == KeyboardPanelMode.Emoji ||
                    commandKey.id.startsWith("action-emoji-") ||
                    (isEmojiRecentCandidate(output) && !shouldTrackSymbolRecent(commandKey))
                ) {
                    callbacks.onEmojiInserted(output)
                } else if (shouldTrackSymbolRecent(commandKey)) {
                    callbacks.onSymbolInserted(output)
                }
                autoCloseModeAfterTextInput(keyValue.text != null)
            }
            KeyboardKeyAction.Backspace -> {
                if (!callbacks.onBackspace()) {
                    setStatus("Delete unavailable")
                }
            }
            KeyboardKeyAction.ForwardDelete -> {
                if (!callbacks.onForwardDelete()) {
                    setStatus("Forward delete unavailable")
                }
            }
            KeyboardKeyAction.DeleteWordBefore -> {
                if (!callbacks.onDeleteWordBefore()) {
                    setStatus("Word deletion unavailable")
                }
            }
            KeyboardKeyAction.DeleteWordAfter -> {
                if (!callbacks.onDeleteWordAfter()) {
                    setStatus("Forward word deletion unavailable")
                }
            }
            KeyboardKeyAction.DeleteSentenceBefore -> {
                if (!callbacks.onDeleteSentenceBefore()) {
                    setStatus("Sentence deletion unavailable")
                }
            }
            KeyboardKeyAction.DeleteSentenceAfter -> {
                if (!callbacks.onDeleteSentenceAfter()) {
                    setStatus("Forward sentence deletion unavailable")
                }
            }
            KeyboardKeyAction.InsertTab -> {
                if (!callbacks.onKeyEvent(android.view.KeyEvent.KEYCODE_TAB, metaState = 0)) {
                    setStatus("Tab unavailable")
                }
            }
            KeyboardKeyAction.Escape -> {
                if (!callbacks.onKeyEvent(android.view.KeyEvent.KEYCODE_ESCAPE, metaState = 0)) {
                    setStatus("Esc unavailable")
                }
            }
            KeyboardKeyAction.Enter -> {
                if (!callbacks.onEnter()) {
                    setStatus("Enter action unavailable")
                }
            }
            KeyboardKeyAction.Shift -> {
                if (layoutMode == KeyboardLayoutMode.Symbols) {
                    cycleSymbolPage()
                } else if (shiftLocked) {
                    shiftLocked = false
                    shifted = false
                } else {
                    shifted = !shifted
                }
            }
            KeyboardKeyAction.ModeLetters -> {
                layoutMode = KeyboardLayoutMode.Letters
                symbolPage = 0
                panelMode = KeyboardPanelMode.None
            }
            KeyboardKeyAction.ModeNumbers -> {
                layoutMode =
                    if (layoutMode == KeyboardLayoutMode.Numbers) {
                        KeyboardLayoutMode.Letters
                    } else {
                        KeyboardLayoutMode.Numbers
                    }
                panelMode = KeyboardPanelMode.None
            }
            KeyboardKeyAction.ModeAccents -> {
                layoutMode = KeyboardLayoutMode.Accents
                panelMode = KeyboardPanelMode.None
            }
            KeyboardKeyAction.ModeSymbols -> {
                layoutMode =
                    if (layoutMode == KeyboardLayoutMode.Symbols) {
                        symbolPage = 0
                        KeyboardLayoutMode.Letters
                    } else {
                        KeyboardLayoutMode.Symbols
                    }
                panelMode = KeyboardPanelMode.None
            }
            KeyboardKeyAction.ModeNavigation -> {
                layoutMode =
                    if (layoutMode == KeyboardLayoutMode.Navigation) {
                        KeyboardLayoutMode.Letters
                    } else {
                        KeyboardLayoutMode.Navigation
                    }
                panelMode = KeyboardPanelMode.None
            }
            KeyboardKeyAction.ToggleNavigationPanel -> togglePanel(KeyboardPanelMode.Navigation)
            KeyboardKeyAction.ToggleAccentPanel -> togglePanel(KeyboardPanelMode.Accents)
            KeyboardKeyAction.ToggleEmojiPanel -> togglePanel(KeyboardPanelMode.Emoji)
            KeyboardKeyAction.ToggleClipboardPanel -> toggleClipboardPanel()
            KeyboardKeyAction.ToggleMediaPanel -> togglePanel(KeyboardPanelMode.Media)
            KeyboardKeyAction.ToggleSnippetsPanel -> togglePanel(KeyboardPanelMode.Snippets)
            KeyboardKeyAction.ToggleSettingsPanel -> togglePanel(KeyboardPanelMode.Settings)
            KeyboardKeyAction.CopySelection -> callbacks.onCopySelection()
            KeyboardKeyAction.CutSelection -> {
                if (!callbacks.onCutSelection()) {
                    setStatus("Cut unavailable")
                }
            }
            KeyboardKeyAction.PasteClipboard -> {
                val pasted = callbacks.onPasteClipboard()
                if (pasted) {
                    panelMode = KeyboardPanelMode.None
                } else {
                    setStatus("Clipboard unavailable")
                }
            }
            KeyboardKeyAction.PastePlainClipboard -> {
                val pasted = callbacks.onPastePlainClipboard()
                if (pasted) {
                    panelMode = KeyboardPanelMode.None
                } else {
                    setStatus("Plain paste unavailable")
                }
            }
            KeyboardKeyAction.InsertClipboardEntry -> {
                val content = commandKey.suggestion
                if (content.isNullOrBlank()) {
                    setStatus("Clipboard empty")
                } else if (callbacks.onText(content)) {
                    panelMode = KeyboardPanelMode.None
                } else {
                    setStatus("Clipboard entry rejected by field")
                }
            }
            KeyboardKeyAction.SelectAll -> {
                if (!callbacks.onSelectAll()) {
                    setStatus("Select all unavailable")
                }
            }
            KeyboardKeyAction.Undo -> {
                if (!callbacks.onUndo()) {
                    setStatus("Undo unavailable")
                }
            }
            KeyboardKeyAction.Redo -> {
                if (!callbacks.onRedo()) {
                    setStatus("Redo unavailable")
                }
            }
            KeyboardKeyAction.CancelSelection -> {
                if (!callbacks.onCancelSelection()) {
                    setStatus("Selection cancel unavailable")
                }
            }
            KeyboardKeyAction.InsertSuggestion -> {
                val suggestion = commandKey.suggestion ?: return
                if (!callbacks.onSuggestionSelected(suggestion)) {
                    setStatus("Suggestion unavailable")
                }
            }
            KeyboardKeyAction.ShowClipboardPins -> {
                setStatus("Pinned clipboard list is in CommandGlows app")
            }
            KeyboardKeyAction.MediaPrevious -> {
                callbacks.onMediaPrevious()
                scheduleVisibleMediaNowPlayingRefresh()
            }
            KeyboardKeyAction.MediaPlayPause -> callbacks.onMediaPlayPause()
            KeyboardKeyAction.MediaNext -> {
                callbacks.onMediaNext()
                scheduleVisibleMediaNowPlayingRefresh()
            }
            KeyboardKeyAction.MediaNowPlaying -> {
                if (mediaNowPlayingLabel == null) {
                    mediaNowPlayingLabel = callbacks.onMediaNowPlaying()
                    setStatus(mediaNowPlayingLabel ?: "Now playing unavailable")
                } else {
                    mediaNowPlayingLabel = null
                    setStatus("Now playing hidden")
                }
                refreshLayout()
            }
            KeyboardKeyAction.OpenMediaApp -> callbacks.onOpenMediaApp()
            KeyboardKeyAction.MediaStop -> callbacks.onMediaStop()
            KeyboardKeyAction.VolumeDown -> callbacks.onVolumeDown()
            KeyboardKeyAction.VolumeUp -> callbacks.onVolumeUp()
            KeyboardKeyAction.BrightnessDown -> callbacks.onBrightnessDown()
            KeyboardKeyAction.BrightnessUp -> callbacks.onBrightnessUp()
            KeyboardKeyAction.InsertSnippetOne -> {
                val snippet = commandKey.suggestion
                if (snippet.isNullOrBlank()) {
                    callbacks.onSnippets()
                } else if (callbacks.onText(snippet)) {
                    panelMode = KeyboardPanelMode.None
                } else {
                    setStatus("Snippet rejected by field")
                }
            }
            KeyboardKeyAction.OpenCommandGlowsSnippets -> callbacks.onSnippets()
            KeyboardKeyAction.OpenCommandGlowsSettings -> callbacks.onSettings()
            KeyboardKeyAction.OpenThemeSettings -> togglePanel(KeyboardPanelMode.ThemeSettings)
            KeyboardKeyAction.SelectThemePreset -> {
                val presetId = commandKey.suggestion
                if (presetId.isNullOrBlank()) {
                    setStatus("Theme unavailable")
                } else {
                    callbacks.onThemePresetSelected(presetId)
                    panelMode = KeyboardPanelMode.Settings
                }
            }
            KeyboardKeyAction.ShowKeyboardPicker -> callbacks.onKeyboardPicker()
            KeyboardKeyAction.ToggleCornerMode -> {
                cornerModeEnabled = !cornerModeEnabled
                callbacks.onCornerModeChanged(cornerModeEnabled)
                setStatus(if (cornerModeEnabled) "Swipe gestures enabled" else "Swipe gestures disabled")
            }
            KeyboardKeyAction.ToggleLayoutProfile -> {
                layoutProfile =
                    if (layoutProfile == KeyboardLayoutProfile.QWERTY) {
                        KeyboardLayoutProfile.AZERTY
                    } else {
                        KeyboardLayoutProfile.QWERTY
                    }
                callbacks.onLayoutProfileChanged(layoutProfile)
                setStatus("Layout ${layoutProfile.name}")
            }
            KeyboardKeyAction.ToggleDebugTouchOverlay -> {
                debugTouchOverlayEnabled = !debugTouchOverlayEnabled
                callbacks.onDebugTouchOverlayChanged(debugTouchOverlayEnabled)
                setStatus(if (debugTouchOverlayEnabled) "Touch debug enabled" else "Touch debug disabled")
            }
            KeyboardKeyAction.ToggleKeyVibration -> {
                keyVibrationIntensity =
                    when (keyVibrationIntensity) {
                        KeyboardStateStore.KEY_VIBRATION_INTENSITY_OFF -> KeyboardStateStore.KEY_VIBRATION_INTENSITY_SHORT
                        KeyboardStateStore.KEY_VIBRATION_INTENSITY_SHORT -> KeyboardStateStore.KEY_VIBRATION_INTENSITY_MEDIUM
                        KeyboardStateStore.KEY_VIBRATION_INTENSITY_MEDIUM -> KeyboardStateStore.KEY_VIBRATION_INTENSITY_LONG
                        else -> KeyboardStateStore.KEY_VIBRATION_INTENSITY_OFF
                    }
                callbacks.onKeyVibrationModeChanged(keyVibrationIntensity)
                setStatus(vibrationModeStatusText())
            }
            KeyboardKeyAction.ToggleKeySound -> {
                keySoundIntensity =
                    when (keySoundIntensity) {
                        KeyboardStateStore.KEY_SOUND_INTENSITY_OFF -> KeyboardStateStore.KEY_SOUND_INTENSITY_SHORT
                        KeyboardStateStore.KEY_SOUND_INTENSITY_SHORT -> KeyboardStateStore.KEY_SOUND_INTENSITY_MEDIUM
                        KeyboardStateStore.KEY_SOUND_INTENSITY_MEDIUM -> KeyboardStateStore.KEY_SOUND_INTENSITY_LONG
                        KeyboardStateStore.KEY_SOUND_INTENSITY_LONG -> KeyboardStateStore.KEY_SOUND_INTENSITY_EXTRA
                        else -> KeyboardStateStore.KEY_SOUND_INTENSITY_OFF
                    }
                callbacks.onKeySoundModeChanged(keySoundIntensity)
                callbacks.onKeySoundChanged(keySoundEnabled)
                performKeySound()
                setStatus(soundModeStatusText())
            }
            KeyboardKeyAction.ToggleSpellingSuggestions -> {
                spellingSuggestionsEnabled = !spellingSuggestionsEnabled
                callbacks.onSpellingSuggestionsChanged(spellingSuggestionsEnabled)
                setStatus(if (spellingSuggestionsEnabled) "Suggestions on" else "Suggestions off")
            }
            KeyboardKeyAction.ToggleSpecialKeyCorners -> {
                specialKeyCornersEnabled = !specialKeyCornersEnabled
                callbacks.onSpecialKeyCornersChanged(specialKeyCornersEnabled)
                setStatus(if (specialKeyCornersEnabled) "Special key gestures on" else "Special key gestures off")
            }
            KeyboardKeyAction.ToggleFrenchLanguage -> {
                frenchLanguageEnabled = !frenchLanguageEnabled
                callbacks.onFrenchLanguageChanged(frenchLanguageEnabled)
                setStatus(if (frenchLanguageEnabled) "French enabled" else "French disabled")
            }
            KeyboardKeyAction.ToggleEnglishLanguage -> {
                englishLanguageEnabled = !englishLanguageEnabled
                callbacks.onEnglishLanguageChanged(englishLanguageEnabled)
                setStatus(if (englishLanguageEnabled) "English enabled" else "English disabled")
            }
            KeyboardKeyAction.ToggleDoubleSpacePeriod -> {
                doubleSpacePeriodEnabled = !doubleSpacePeriodEnabled
                callbacks.onDoubleSpacePeriodChanged(doubleSpacePeriodEnabled)
                setStatus(if (doubleSpacePeriodEnabled) "Double-space period on" else "Double-space period off")
            }
            KeyboardKeyAction.TogglePunctuationAutoSpacing -> {
                punctuationAutoSpacingEnabled = !punctuationAutoSpacingEnabled
                callbacks.onPunctuationAutoSpacingChanged(punctuationAutoSpacingEnabled)
                setStatus(if (punctuationAutoSpacingEnabled) "Punctuation spacing on" else "Punctuation spacing off")
            }
            KeyboardKeyAction.DecreaseKeyboardHeight -> {
                updateKeyboardHeightScale(-keyboardHeightStep)
            }
            KeyboardKeyAction.IncreaseKeyboardHeight -> {
                updateKeyboardHeightScale(keyboardHeightStep)
            }
            KeyboardKeyAction.DecreaseKeyboardHorizontalPadding -> {
                updateKeyboardHorizontalPadding(-keyboardWidthPaddingStep)
            }
            KeyboardKeyAction.IncreaseKeyboardHorizontalPadding -> {
                updateKeyboardHorizontalPadding(keyboardWidthPaddingStep)
            }
            KeyboardKeyAction.DecreaseKeyboardVerticalPadding -> {
                updateKeyboardVerticalPadding(-keyboardHeightPaddingStep)
            }
            KeyboardKeyAction.IncreaseKeyboardVerticalPadding -> {
                updateKeyboardVerticalPadding(keyboardHeightPaddingStep)
            }
            KeyboardKeyAction.ToggleCompactMode -> {
                toggleCompactMode()
            }
            KeyboardKeyAction.ToggleAutoCloseModes -> {
                toggleAutoCloseModes()
            }
            KeyboardKeyAction.SelectEmojiRecents -> emojiCategory = KeyboardEmojiCategory.Recents
            KeyboardKeyAction.SelectEmojiSmileys -> emojiCategory = KeyboardEmojiCategory.Smileys
            KeyboardKeyAction.SelectEmojiHands -> emojiCategory = KeyboardEmojiCategory.Hands
            KeyboardKeyAction.SelectEmojiSymbols -> emojiCategory = KeyboardEmojiCategory.Symbols
            KeyboardKeyAction.SelectEmojiNature -> emojiCategory = KeyboardEmojiCategory.Nature
            KeyboardKeyAction.SelectEmojiFood -> emojiCategory = KeyboardEmojiCategory.Food
            KeyboardKeyAction.SelectEmojiObjects -> emojiCategory = KeyboardEmojiCategory.Objects
            KeyboardKeyAction.SelectEmojiActivities -> emojiCategory = KeyboardEmojiCategory.Activities
            KeyboardKeyAction.SelectEmojiTravel -> emojiCategory = KeyboardEmojiCategory.Travel
            KeyboardKeyAction.SelectEmojiFlags -> emojiCategory = KeyboardEmojiCategory.Flags
            KeyboardKeyAction.NavigateCharLeft -> {
                if (!callbacks.onNavigateCharLeft()) {
                    setStatus("Left unavailable")
                }
            }
            KeyboardKeyAction.NavigateCharRight -> {
                if (!callbacks.onNavigateCharRight()) {
                    setStatus("Right unavailable")
                }
            }
            KeyboardKeyAction.NavigateWordLeft -> {
                if (!callbacks.onNavigateWordLeft()) {
                    setStatus("Word-left unavailable")
                }
            }
            KeyboardKeyAction.NavigateWordRight -> {
                if (!callbacks.onNavigateWordRight()) {
                    setStatus("Word-right unavailable")
                }
            }
            KeyboardKeyAction.NavigateSentenceLeft -> {
                if (!callbacks.onNavigateSentenceLeft()) {
                    setStatus("Sentence-left unavailable")
                }
            }
            KeyboardKeyAction.NavigateSentenceRight -> {
                if (!callbacks.onNavigateSentenceRight()) {
                    setStatus("Sentence-right unavailable")
                }
            }
            KeyboardKeyAction.NavigateLineUp -> {
                if (!callbacks.onNavigateLineUp()) {
                    setStatus("Line-up unavailable")
                }
            }
            KeyboardKeyAction.NavigateLineDown -> {
                if (!callbacks.onNavigateLineDown()) {
                    setStatus("Line-down unavailable")
                }
            }
            KeyboardKeyAction.NavigateParagraphUp -> {
                if (!callbacks.onNavigateParagraphUp()) {
                    setStatus("Paragraph-up unavailable")
                }
            }
            KeyboardKeyAction.NavigateParagraphDown -> {
                if (!callbacks.onNavigateParagraphDown()) {
                    setStatus("Paragraph-down unavailable")
                }
            }
            KeyboardKeyAction.NavigateLineStart -> {
                if (!callbacks.onNavigateLineStart()) {
                    setStatus("Start unavailable")
                }
            }
            KeyboardKeyAction.NavigateLineEnd -> {
                if (!callbacks.onNavigateLineEnd()) {
                    setStatus("End unavailable")
                }
            }
            KeyboardKeyAction.ClosePanel -> panelMode = KeyboardPanelMode.None
            KeyboardKeyAction.Voice -> callbacks.onVoice()
            KeyboardKeyAction.VoicePause -> callbacks.onVoicePause()
            KeyboardKeyAction.VoiceResume -> callbacks.onVoiceResume()
            KeyboardKeyAction.VoiceRestart -> callbacks.onVoiceRestart()
            KeyboardKeyAction.VoiceCancel -> callbacks.onVoiceCancel()
        }
        if (previousMode != layoutMode || previousPanel != panelMode) {
            clearHorizontalRowScrollState()
            verticalPanelScrollOffset = 0f
        }
        reconcileActionBarState()
        if (layoutFingerprint() != previousLayout) {
            val expectedSnapshotMode =
                if (fieldContext == KeyboardFieldContextMode.Phone ||
                    fieldContext == KeyboardFieldContextMode.Number
                ) {
                    KeyboardLayoutMode.Numbers
                } else {
                    layoutMode
                }
            val snapshotMatchesFinalPanel =
                layoutSnapshot.mode == expectedSnapshotMode &&
                    layoutSnapshot.panel == panelMode
            if (layoutRefreshGeneration == previousLayoutRefreshGeneration || !snapshotMatchesFinalPanel) {
                refreshLayout()
            } else {
                invalidate()
            }
        } else {
            invalidate()
        }
    }

    private fun autoCloseModeAfterTextInput(insertedText: Boolean) {
        if (!autoCloseModesEnabled || !insertedText) {
            return
        }
        val shouldCloseLayoutMode =
            layoutMode == KeyboardLayoutMode.Numbers ||
                layoutMode == KeyboardLayoutMode.Symbols ||
                layoutMode == KeyboardLayoutMode.Accents
        val shouldCloseTypingPanel =
            panelMode == KeyboardPanelMode.Emoji ||
                panelMode == KeyboardPanelMode.Accents
        if (!shouldCloseLayoutMode && !shouldCloseTypingPanel) {
            return
        }
        layoutMode = KeyboardLayoutMode.Letters
        panelMode = KeyboardPanelMode.None
    }

    private fun performKeyboardHaptic(feedbackConstant: Int) {
        if (!keyVibrationEnabled) {
            return
        }
        val durationMs = vibrationModeDurationMs()
        if (durationMs > 0 && performDirectKeyboardVibration(durationMs)) {
            return
        }
        performKeyboardHapticFeedback(feedbackConstant)
    }

    private fun performKeyboardHapticFeedback(feedbackConstant: Int) {
        performHapticFeedback(
            feedbackConstant,
            HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING or
                HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING,
        )
    }

    private fun performDirectKeyboardVibration(durationMs: Long): Boolean {
        val activeVibrator = vibrator ?: return false
        if (!activeVibrator.hasVibrator()) {
            return false
        }
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                activeVibrator.vibrate(
                    VibrationEffect.createOneShot(
                        durationMs,
                        VibrationEffect.DEFAULT_AMPLITUDE,
                    ),
                )
            } else {
                @Suppress("DEPRECATION")
                activeVibrator.vibrate(durationMs)
            }
            true
        } catch (_: SecurityException) {
            false
        }
    }

    private fun vibrationModeDurationMs(): Long {
        return when (keyVibrationIntensity) {
            KeyboardStateStore.KEY_VIBRATION_INTENSITY_SHORT -> 12L
            KeyboardStateStore.KEY_VIBRATION_INTENSITY_MEDIUM -> 24L
            KeyboardStateStore.KEY_VIBRATION_INTENSITY_LONG -> 40L
            else -> 0L
        }
    }

    private fun vibrationModeStatusText(): String {
        return when (keyVibrationIntensity) {
            KeyboardStateStore.KEY_VIBRATION_INTENSITY_OFF -> "Key vibration off"
            else -> "Key vibration ${vibrationModeDurationMs()} ms"
        }
    }

    private val keySoundProfiles = arrayOf(
        listOf(),
        listOf(KeySoundStep(ToneGenerator.TONE_PROP_BEEP, 24)),
        listOf(KeySoundStep(ToneGenerator.TONE_PROP_BEEP2, 22)),
        listOf(KeySoundStep(ToneGenerator.TONE_PROP_ACK, 28)),
        listOf(KeySoundStep(ToneGenerator.TONE_PROP_NACK, 26)),
    )

    private fun performKeySound() {
        if (!keySoundEnabled) {
            return
        }
        val profile = when (keySoundIntensity) {
            KeyboardStateStore.KEY_SOUND_INTENSITY_SHORT -> keySoundProfiles[1]
            KeyboardStateStore.KEY_SOUND_INTENSITY_MEDIUM -> keySoundProfiles[2]
            KeyboardStateStore.KEY_SOUND_INTENSITY_LONG -> keySoundProfiles[3]
            KeyboardStateStore.KEY_SOUND_INTENSITY_EXTRA -> keySoundProfiles[4]
            else -> keySoundProfiles[1]
        }
        profile.forEach { step ->
            postDelayed(
                {
                    val toneGenerator = keyToneGenerator
                    if (toneGenerator == null) {
                        playSoundEffect(SoundEffectConstants.CLICK)
                    } else {
                        toneGenerator.startTone(step.toneType, step.toneDurationMs)
                    }
                },
                step.postDelayMs,
            )
        }
    }

    private fun shouldPlayKeySoundBeforeDispatch(key: KeyboardKeySpec): Boolean {
        return key.action != KeyboardKeyAction.ToggleKeySound
    }

    private fun currentSoundModeLabel(): String {
        return when (keySoundIntensity) {
            KeyboardStateStore.KEY_SOUND_INTENSITY_OFF -> "Muted"
            KeyboardStateStore.KEY_SOUND_INTENSITY_SHORT -> "Click"
            KeyboardStateStore.KEY_SOUND_INTENSITY_MEDIUM -> "Tick"
            KeyboardStateStore.KEY_SOUND_INTENSITY_LONG -> "Clack"
            KeyboardStateStore.KEY_SOUND_INTENSITY_EXTRA -> "Pop"
            else -> "Click"
        }
    }

    private fun soundModeStatusText(): String {
        return if (keySoundEnabled) "Key sound ${currentSoundModeLabel()}" else "Key sound off"
    }

    override fun onDetachedFromWindow() {
        cancelAllPointerGestures("detached")
        stopRepeat()
        super.onDetachedFromWindow()
        keyToneGenerator?.release()
        keyToneGenerator = null
    }

    private fun retainPressedHighlight(keyId: String) {
        val durationMs = themeConfig.pressHighlightDurationMs.coerceIn(0, 1200)
        val token = (lingeringPressTokens[keyId] ?: 0) + 1
        lingeringPressTokens[keyId] = token
        if (durationMs == 0) {
            lingeringPressedKeyIds.remove(keyId)
            lingeringPressTokens.remove(keyId)
            return
        }
        while (lingeringPressedKeyIds.size >= 8 && keyId !in lingeringPressedKeyIds) {
            val oldest = lingeringPressedKeyIds.first()
            lingeringPressedKeyIds.remove(oldest)
            lingeringPressTokens.remove(oldest)
        }
        lingeringPressedKeyIds.add(keyId)
        postDelayed(
            {
                if (lingeringPressTokens[keyId] == token) {
                    lingeringPressedKeyIds.remove(keyId)
                    lingeringPressTokens.remove(keyId)
                    invalidate()
                }
            },
            durationMs.toLong(),
        )
    }

    private fun triggerPressEffect(
        key: KeyboardKeySpec,
        sourceFrame: KeyFrame?,
    ) {
        val frame =
            sourceFrame?.takeIf { it.key.id == key.id } ?:
                keyFrames.lastOrNull { it.key.id == key.id } ?:
                return
        val spec = KeyboardPressEffectPolicy.resolve(themeConfig, fieldPolicy.privateMode)
        if (
            spec.effect == "scale" ||
                spec.effect == "pulse" ||
                spec.effect == "shake" ||
                spec.effect == "garland" ||
                spec.effect == "glow" ||
                spec.effect == "electricArc" ||
                spec.effect == "specularSweep" ||
                spec.effect == "inkPress" ||
                spec.effect == "keycapTilt" ||
                spec.effect == "edgeCompression" ||
                spec.effect == "ripple" ||
                spec.effect == "confettiLite" ||
                spec.effect == "fireworksLite" ||
                spec.effect == "waterSplash" ||
                spec.effect == "emberBurst" ||
                spec.effect == "dragonTrail" ||
                spec.effect == "spiderTrail"
        ) {
            postInvalidateOnAnimation()
        }
        if (pressEffects.trigger(key.id, frame.visualRect, spec)) {
            postInvalidateOnAnimation()
        }
    }

    private fun dispatchKeyValue(
        value: KeyboardKeyValue,
        selection: GestureSelection,
        clearModifiersAfter: Boolean,
    ): Boolean {
        if (
            selection == GestureSelection.PrimaryTap &&
            value.kind == KeyboardKeyValueKind.Modifier &&
            value.modifier == KeyboardSystemModifier.Ctrl
        ) {
            handleCtrlPrimaryTap()
            return true
        }
        val effectiveValue =
            if (value.kind == KeyboardKeyValueKind.Modifier) {
                value
            } else {
                KeyboardKeyModifier.apply(value, currentSystemModifiers(), KeyboardLayoutBuilder.defaultModMap())
            }
        val result =
            when (effectiveValue.kind) {
                KeyboardKeyValueKind.Text -> {
                    val text = effectiveValue.text ?: return false
                    callbacks.onText(text)
                }
                KeyboardKeyValueKind.KeyEvent -> {
                    val keyCode = effectiveValue.keyCode ?: return false
                    callbacks.onKeyEvent(keyCode, metaStateFor(currentSystemModifiers()))
                }
                KeyboardKeyValueKind.Action -> {
                    val action = effectiveValue.action ?: return false
                    dispatch(
                        KeyboardKeySpec(
                            id = "keyvalue-action-${action.name}",
                            label = action.name,
                            action = action,
                        ),
                        GestureSelection.PrimaryTap,
                    )
                    true
                }
                KeyboardKeyValueKind.Modifier -> {
                    toggleSystemModifier(effectiveValue.modifier ?: return false)
                    true
                }
                KeyboardKeyValueKind.Macro -> {
                    effectiveValue.macro.all { macroValue ->
                        dispatchKeyValue(macroValue, GestureSelection.PrimaryTap, clearModifiersAfter = false)
                    }
                }
            }
        if (result && clearModifiersAfter && effectiveValue.kind != KeyboardKeyValueKind.Modifier) {
            ctrlActionSurfaceLocked = false
            clearTransientModifiers()
        }
        return result
    }

    private fun handleCtrlPrimaryTap() {
        val nowAtMs = SystemClock.uptimeMillis()
        when (
            KeyboardCtrlSurfaceModePolicy.actionForPrimaryTap(
                locked = ctrlActionSurfaceLocked,
                activeModifier = activeCtrlCycleModifier(),
                lastTapAtMs = lastCtrlTapAtMs,
                nowAtMs = nowAtMs,
                doubleTapTimeoutMs = ctrlSurfaceDoubleTapTimeoutMs,
            )
        ) {
            KeyboardCtrlSurfaceTapAction.ActivateCtrl -> {
                lastCtrlTapAtMs = nowAtMs
                activateCtrlCycleModifier(KeyboardSystemModifier.Ctrl)
            }
            KeyboardCtrlSurfaceTapAction.LockCtrl -> {
                lastCtrlTapAtMs = nowAtMs
                lockCtrlActionSurface()
            }
            KeyboardCtrlSurfaceTapAction.ActivateAlt -> {
                lastCtrlTapAtMs = nowAtMs
                activateCtrlCycleModifier(KeyboardSystemModifier.Alt)
            }
            KeyboardCtrlSurfaceTapAction.ActivateFn -> {
                lastCtrlTapAtMs = nowAtMs
                activateCtrlCycleModifier(KeyboardSystemModifier.Fn)
            }
            KeyboardCtrlSurfaceTapAction.UnlockSurface -> {
                unlockCtrlActionSurface()
            }
        }
        refreshLayout()
    }

    private fun lockCtrlActionSurface() {
        ctrlActionSurfaceLocked = true
        clearCtrlFamilyModifiers()
        setStatus("Ctrl actions locked")
    }

    private fun unlockCtrlActionSurface() {
        ctrlActionSurfaceLocked = false
        clearCtrlFamilyModifiers()
        lastCtrlTapAtMs = 0L
        setStatus("Ctrl actions unlocked")
    }

    private fun activeCtrlCycleModifier(): KeyboardSystemModifier? {
        return when {
            KeyboardSystemModifier.Ctrl in activeSystemModifiers -> KeyboardSystemModifier.Ctrl
            KeyboardSystemModifier.Alt in activeSystemModifiers -> KeyboardSystemModifier.Alt
            KeyboardSystemModifier.Fn in activeSystemModifiers -> KeyboardSystemModifier.Fn
            else -> null
        }
    }

    private fun activateCtrlCycleModifier(modifier: KeyboardSystemModifier) {
        ctrlActionSurfaceLocked = false
        clearCtrlFamilyModifiers()
        activeSystemModifiers.add(modifier)
        setStatus("${modifier.name} on")
    }

    private fun clearCtrlFamilyModifiers() {
        activeSystemModifiers.remove(KeyboardSystemModifier.Ctrl)
        activeSystemModifiers.remove(KeyboardSystemModifier.Alt)
        activeSystemModifiers.remove(KeyboardSystemModifier.Fn)
    }

    private fun toggleSystemModifier(modifier: KeyboardSystemModifier) {
        when (modifier) {
            KeyboardSystemModifier.Shift -> {
                if (layoutMode == KeyboardLayoutMode.Symbols) {
                    cycleSymbolPage()
                } else if (shiftLocked) {
                    shiftLocked = false
                    shifted = false
                } else {
                    shifted = !shifted
                }
            }
            KeyboardSystemModifier.Ctrl,
            KeyboardSystemModifier.Alt,
            KeyboardSystemModifier.Fn,
            -> {
                if (activeSystemModifiers.contains(modifier)) {
                    activeSystemModifiers.remove(modifier)
                } else {
                    activeSystemModifiers.add(modifier)
                }
                val state = if (activeSystemModifiers.contains(modifier)) "on" else "off"
                setStatus("${modifier.name} $state")
            }
        }
    }

    private fun cycleSymbolPage() {
        symbolPage = (symbolPage + 1) % SYMBOL_PAGE_COUNT
        setStatus("Symbols page ${symbolPage + 1}/$SYMBOL_PAGE_COUNT")
    }

    private fun clearTransientModifiers() {
        activeSystemModifiers.clear()
        lastCtrlTapAtMs = 0L
        if (!shiftLocked && shifted && layoutSnapshot.mode == KeyboardLayoutMode.Letters) {
            shifted = false
        }
    }

    private fun currentSystemModifiers(): Set<KeyboardSystemModifier> {
        val modifiers = linkedSetOf<KeyboardSystemModifier>()
        if (shifted && layoutSnapshot.mode == KeyboardLayoutMode.Letters) {
            modifiers.add(KeyboardSystemModifier.Shift)
        }
        modifiers.addAll(activeSystemModifiers)
        return modifiers
    }

    private fun metaStateFor(modifiers: Set<KeyboardSystemModifier>): Int {
        var metaState = 0
        if (KeyboardSystemModifier.Shift in modifiers) {
            metaState = metaState or android.view.KeyEvent.META_SHIFT_ON or android.view.KeyEvent.META_SHIFT_LEFT_ON
        }
        if (KeyboardSystemModifier.Ctrl in modifiers) {
            metaState = metaState or android.view.KeyEvent.META_CTRL_ON or android.view.KeyEvent.META_CTRL_LEFT_ON
        }
        if (KeyboardSystemModifier.Alt in modifiers) {
            metaState = metaState or android.view.KeyEvent.META_ALT_ON or android.view.KeyEvent.META_ALT_LEFT_ON
        }
        return metaState
    }

    private fun isActiveModifierKey(key: KeyboardKeySpec): Boolean {
        val modifier = key.keyValue?.modifier ?: return false
        if (modifier == KeyboardSystemModifier.Ctrl) {
            return ctrlActionSurfaceLocked || activeCtrlCycleModifier() != null
        }
        return (modifier == KeyboardSystemModifier.Shift && shifted) ||
            activeSystemModifiers.contains(modifier)
    }

    private fun isCtrlHoldVisualModeActive(): Boolean {
        return ctrlActionSurfaceLocked || ctrlHoldPointerIds.isNotEmpty()
    }

    private fun togglePanel(target: KeyboardPanelMode) {
        clearHorizontalRowScrollState()
        verticalPanelScrollOffset = 0f
        panelMode = if (panelMode == target) KeyboardPanelMode.None else target
        reconcileActionBarState()
    }

    private fun toggleClipboardPanel() {
        clearHorizontalRowScrollState()
        verticalPanelScrollOffset = 0f
        panelMode =
            if (panelMode == KeyboardPanelMode.Clipboard || panelMode == KeyboardPanelMode.ClipboardFull) {
                KeyboardPanelMode.None
            } else {
                KeyboardPanelMode.Clipboard
            }
        reconcileActionBarState()
    }

    private fun buildSnapshot(): KeyboardLayoutSnapshot {
        val effectiveMode =
            if (fieldContext == KeyboardFieldContextMode.Phone ||
                fieldContext == KeyboardFieldContextMode.Number
            ) {
                KeyboardLayoutMode.Numbers
            } else {
                layoutMode
            }
        reconcileActionBarState(mode = effectiveMode, panel = panelMode)
        return KeyboardLayoutBuilder.build(
            KeyboardLayoutRequest(
                mode = effectiveMode,
                panel = panelMode,
                shifted = shifted,
                fieldContext = fieldContext,
                layoutProfile = layoutProfile,
                cornerModeEnabled = cornerModeEnabled,
                debugTouchOverlayEnabled = debugTouchOverlayEnabled,
                keyVibrationEnabled = keyVibrationEnabled,
                keyVibrationIntensity = keyVibrationIntensity,
                keySoundEnabled = keySoundEnabled,
                keySoundIntensity = keySoundIntensity,
                spellingSuggestionsEnabled = spellingSuggestionsEnabled,
                specialKeyCornersEnabled = specialKeyCornersEnabled,
                frenchLanguageEnabled = frenchLanguageEnabled,
                englishLanguageEnabled = englishLanguageEnabled,
                doubleSpacePeriodEnabled = doubleSpacePeriodEnabled,
                punctuationAutoSpacingEnabled = punctuationAutoSpacingEnabled,
                keyboardHeightScale = keyboardHeightScale,
                keyboardHorizontalPaddingScale = keyboardHorizontalPaddingScale,
                keyboardVerticalPaddingScale = keyboardVerticalPaddingScale,
                compactModeEnabled = compactModeEnabled,
                autoCloseModesEnabled = autoCloseModesEnabled,
                symbolPage = symbolPage,
                emojiCategory = emojiCategory,
                recentEmojis = recentEmojis,
                recentSymbols = recentSymbols,
                enterLabel = enterLabel,
                clipboardAllowed = fieldPolicy.clipboardAllowed,
                clipboardEntries = clipboardEntries,
                voiceAllowed = fieldPolicy.voiceAllowed,
                snippetsAllowed = fieldPolicy.snippetsAllowed,
                mediaControlsEnabled = mediaControlsEnabled,
                snippets = snippets,
                suggestions = suggestions,
                actionBarState = actionBarState,
                mediaNowPlayingLabel = mediaNowPlayingLabel,
                cornerConfig = cornerConfig,
                themePresetId = themeConfig.presetId,
                fieldPolicy = fieldPolicy,
            ),
        )
    }

    private fun keyValueForSelection(
        key: KeyboardKeySpec,
        selection: GestureSelection,
    ): KeyboardKeyValue? {
        return if (selection == GestureSelection.PrimaryTap) {
            val ctrlPromoted = ctrlPrimaryCornerActionValue(key)
            if (ctrlPromoted != null) {
                return ctrlPromoted
            }
            val raw = key.glyph?.primary ?: key.label
            key.keyValue ?: KeyboardKeyValue.text(raw, key.label)
        } else {
            key.cornerAssignments.forSelection(selection)?.value
        }
    }

    private fun displayLabel(key: KeyboardKeySpec): String {
        if (voicePermissionRequired && key.action == KeyboardKeyAction.Voice) {
            return "⛔"
        }
        if (isCtrlModifierKey(key)) {
            return ctrlModifierDisplayLabel()
        }
        if (key.id == "media-now-playing-label" && key.label.length > 52) {
            return key.label.take(49) + "..."
        }
        if (key.action != KeyboardKeyAction.Text) {
            return key.label
        }
        if (isCtrlHoldVisualModeActive()) {
            val ctrlPrimary = ctrlPrimaryCornerActionLabel(key)
            if (ctrlPrimary != null) {
                return ctrlPrimary
            }
        }
        val primary = key.glyph?.primary ?: key.label
        if (primary == " ") {
            return key.label
        }
        if (!shifted || layoutSnapshot.mode != KeyboardLayoutMode.Letters) {
            return primary
        }
        return if (primary.length == 1 && primary[0].isLetter()) {
            primary.uppercase()
        } else {
            primary
        }
    }

    private fun ctrlPrimaryCornerActionValue(key: KeyboardKeySpec): KeyboardKeyValue? {
        return ctrlPrimaryCornerAction(key)?.value
    }

    private fun ctrlPrimaryCornerActionLabel(key: KeyboardKeySpec): String? {
        return ctrlPrimaryCornerAction(key)?.let(KeyboardActionSurfacePolicy::displayLabel)
    }

    private fun ctrlPrimaryCornerAction(key: KeyboardKeySpec): KeyboardCornerAssignment? {
        if (key.action != KeyboardKeyAction.Text || key.id == "space") {
            return null
        }
        if (!isCtrlHoldVisualModeActive()) {
            return null
        }
        val candidates = listOfNotNull(
            key.cornerAssignments.up,
            key.cornerAssignments.topRight,
            key.cornerAssignments.right,
            key.cornerAssignments.bottomRight,
            key.cornerAssignments.down,
            key.cornerAssignments.bottomLeft,
            key.cornerAssignments.left,
            key.cornerAssignments.topLeft,
        )
        return candidates.firstOrNull { it.value.kind in setOf(KeyboardKeyValueKind.Action, KeyboardKeyValueKind.Macro) }
    }

    private fun displayLabelForRect(
        key: KeyboardKeySpec,
        rect: RectF,
    ): String {
        val label = displayLabel(key)
        if (label.length <= 1 || !key.id.startsWith("clip-row-entry-")) {
            return label
        }
        val horizontalInset = dp(if (key.actionSurface) 8f else 10f)
        val maxTextWidth = (rect.width() - horizontalInset * 2f).coerceAtLeast(dp(8f))
        if (textPaint.measureText(label) <= maxTextWidth) {
            return label
        }
        return fitClipboardActionLabel(label, maxTextWidth)
    }

    private fun fitClipboardActionLabel(
        label: String,
        maxTextWidth: Float,
    ): String {
        val ellipsis = "..."
        if (textPaint.measureText(ellipsis) >= maxTextWidth) {
            return ellipsis
        }
        var end = label.length
        while (end > 0) {
            val candidate = label.take(end) + ellipsis
            if (textPaint.measureText(candidate) <= maxTextWidth) {
                return candidate
            }
            end -= 1
        }
        return ellipsis
    }

    private fun isCtrlModifierKey(key: KeyboardKeySpec): Boolean {
        return key.keyValue?.kind == KeyboardKeyValueKind.Modifier &&
            key.keyValue.modifier == KeyboardSystemModifier.Ctrl
    }

    private fun ctrlModifierDisplayLabel(): String {
        return when {
            ctrlActionSurfaceLocked -> "Ctrl Lock"
            KeyboardSystemModifier.Alt in activeSystemModifiers -> "Alt"
            KeyboardSystemModifier.Fn in activeSystemModifiers -> "Fn"
            else -> "Ctrl"
        }
    }

    private fun keyTextSize(key: KeyboardKeySpec): Float {
        return when {
            isEmojiKey(key) && key.actionSurface && actionRowHeightScale <= 0.35f -> sp(12f)
            isEmojiKey(key) && key.actionSurface && actionRowHeightScale <= 0.65f -> sp(15f)
            isEmojiKey(key) -> sp(23f)
            key.actionSurface && actionRowHeightScale <= 0.35f -> sp(7f)
            key.actionSurface && actionRowHeightScale <= 0.65f -> sp(9f)
            key.label.length <= 1 -> sp(19f)
            key.id == "media-now-playing-label" -> sp(10f)
            key.weight >= 3f -> sp(15f)
            key.label.length >= 5 -> sp(11f)
            else -> sp(12.5f)
        }
    }

    private fun isEmojiKey(key: KeyboardKeySpec): Boolean {
        val value = key.keyValue?.text ?: key.glyph?.primary ?: key.label
        return isEmojiRecentCandidate(value)
    }

    private fun hitTest(x: Float, y: Float): KeyFrame? {
        return keyFrames.firstOrNull { it.touchRect.width() > 0f && it.touchRect.height() > 0f && it.touchRect.contains(x, y) }
    }

    private fun rowHeightFor(index: Int): Float {
        val firstPanelIndex = 1 + layoutSnapshot.suggestionRowCount
        return when {
            isActionRow(index) -> scaledActionRowHeight()
            isActionSurfaceRow(index) -> scaledActionRowHeight()
            layoutSnapshot.suggestionRowCount > 0 && index in 1..layoutSnapshot.suggestionRowCount -> scaledPanelRowHeight()
            layoutSnapshot.panelRowCount > 0 && index in firstPanelIndex until firstPanelIndex + layoutSnapshot.panelRowCount -> scaledPanelRowHeight()
            index == layoutSnapshot.rows.lastIndex -> scaledControlRowHeight()
            else -> scaledTextRowHeight()
        }
    }

    private fun isActionRow(index: Int): Boolean {
        return layoutSnapshot.rows.getOrNull(index)?.rowId?.startsWith("action-row-") == true
    }

    private fun isActionSurfaceRow(index: Int): Boolean {
        val row = layoutSnapshot.rows.getOrNull(index) ?: return false
        return row.keys.isNotEmpty() && row.keys.all { it.actionSurface }
    }

    private fun scaledActionRowHeight(): Float {
        return actionRowHeight * actionRowHeightScale * keyboardHeightScale
    }

    private fun scaledTextRowHeight(): Float {
        return textRowHeight * keyboardHeightScale
    }

    private fun scaledControlRowHeight(): Float {
        return controlRowHeight * keyboardHeightScale
    }

    private fun scaledPanelRowHeight(): Float {
        return panelRowHeight * keyboardHeightScale
    }

    private fun desiredKeyboardHeight(viewWidth: Int): Int {
        val rowCount = layoutSnapshot.rows.size
        val horizontalPadding = computedHorizontalPadding(viewWidth.toFloat())
        val verticalPadding = computedVerticalPadding(viewWidth.toFloat())
        val contentWidth = (viewWidth.toFloat() - (baseOuterPadding + horizontalPadding) * 2).coerceAtLeast(dp(48f))
        val rowsHeight =
            if (usesVerticalPanelScroll()) {
                scaledActionRowHeight() + visiblePanelHeight()
            } else {
                layoutSnapshot.rows.indices.sumOf { index ->
                    rowHeightFor(index).toDouble()
                }.toFloat()
        }
        val effectiveRowCount = if (usesVerticalPanelScroll()) 2 else rowCount
        val baseHeight =
            baseOuterPadding * 2 +
                verticalPadding * 2 +
                statusHeightFor(contentWidth) +
                rowsHeight +
                rowGap() * effectiveRowCount
        return baseHeight.toInt()
    }

    private fun usesVerticalPanelScroll(): Boolean {
        return panelMode == KeyboardPanelMode.ClipboardFull ||
            (panelMode == KeyboardPanelMode.Settings && compactModeEnabled)
    }

    private fun firstPanelRowIndex(): Int {
        return 1 + layoutSnapshot.suggestionRowCount
    }

    private fun visiblePanelHeight(): Float {
        val visibleRows =
            if (panelMode == KeyboardPanelMode.Settings) {
                3
            } else if (compactModeEnabled) {
                2
            } else {
                3
            }
        return scaledPanelRowHeight() * visibleRows + rowGap() * (visibleRows - 1)
    }

    private fun toggleCompactMode() {
        compactModeEnabled = !compactModeEnabled
        callbacks.onCompactModeChanged(compactModeEnabled)
        setStatus(if (compactModeEnabled) "Compact keyboard on" else "Compact keyboard off")
        requestLayout()
        refreshLayout()
    }

    private fun toggleAutoCloseModes() {
        autoCloseModesEnabled = !autoCloseModesEnabled
        callbacks.onAutoCloseModesChanged(autoCloseModesEnabled)
        setStatus(if (autoCloseModesEnabled) "Auto close modes on" else "Auto close modes off")
        refreshLayout()
    }

    private fun updateKeyboardHeightScale(delta: Float) {
        if (delta < 0f &&
            !compactModeEnabled &&
            keyboardHeightScale <= KeyboardStateStore.KEYBOARD_HEIGHT_MIN + 0.001f
        ) {
            compactModeEnabled = true
            callbacks.onCompactModeChanged(true)
            setStatus("Compact keyboard on")
            requestLayout()
            refreshLayout()
            return
        }
        if (delta > 0f && compactModeEnabled) {
            compactModeEnabled = false
            callbacks.onCompactModeChanged(false)
            setStatus("Compact keyboard off")
            requestLayout()
            refreshLayout()
            return
        }
        val next = (keyboardHeightScale + delta).coerceIn(
            KeyboardStateStore.KEYBOARD_HEIGHT_MIN,
            KeyboardStateStore.KEYBOARD_HEIGHT_MAX,
        )
        if (next == keyboardHeightScale) {
            setStatus(if (compactModeEnabled) "Compact keyboard on" else "Keyboard height ${(keyboardHeightScale * 100).toInt()}%")
            return
        }
        keyboardHeightScale = next
        callbacks.onKeyboardHeightScaleChanged(next)
        setStatus("Keyboard height ${(keyboardHeightScale * 100).toInt()}%")
        requestLayout()
        refreshLayout()
    }

    private fun computedHorizontalPadding(availableWidth: Float): Float {
        return (availableWidth * keyboardHorizontalPaddingScale) + keyboardThemeBorderEdgePadding()
    }

    private fun computedVerticalPadding(availableWidth: Float): Float {
        return (availableWidth * keyboardVerticalPaddingScale) + keyboardThemeBorderEdgePadding()
    }

    private fun keyboardThemeBorderEdgePadding(): Float {
        if (fieldPolicy.privateMode || keyBorderPaint.strokeWidth <= 0f || Color.alpha(keyBorderPaint.color) <= 0) {
            return 0f
        }
        return (keyBorderPaint.strokeWidth + keyboardVisualHairline() + dp(2f)).coerceAtLeast(0f)
    }

    private fun keyboardThemeMinimumRowGap(): Float {
        if (fieldPolicy.privateMode) {
            return 0f
        }
        var minimumGap = 0f
        if (keyBorderPaint.strokeWidth > 0f && Color.alpha(keyBorderPaint.color) > 0) {
            minimumGap = max(minimumGap, keyBorderPaint.strokeWidth + keyboardVisualHairline())
        }
        if (themeConfig.keyReliefEnabled && themeConfig.keyReliefDepth > 0f) {
            minimumGap = max(minimumGap, dp(themeConfig.keyReliefDepth) + keyboardVisualHairline())
        }
        return minimumGap
    }

    private fun keyboardVisualHairline(): Float = 1f

    private fun updateKeyboardHorizontalPadding(delta: Float) {
        val next = (keyboardHorizontalPaddingScale + delta).coerceIn(
            0f,
            KeyboardStateStore.KEYBOARD_PADDING_PERCENT_MAX / 100f,
        )
        if (next == keyboardHorizontalPaddingScale) {
            setStatus("Keyboard horizontal margin ${(keyboardHorizontalPaddingScale * 100).toInt()}%")
            return
        }
        keyboardHorizontalPaddingScale = next
        callbacks.onHorizontalKeyboardPaddingChanged(next)
        setStatus("Keyboard horizontal margin ${(keyboardHorizontalPaddingScale * 100).toInt()}%")
        requestLayout()
        refreshLayout()
    }

    private fun updateKeyboardVerticalPadding(delta: Float) {
        val next = (keyboardVerticalPaddingScale + delta).coerceIn(
            0f,
            KeyboardStateStore.KEYBOARD_PADDING_PERCENT_MAX / 100f,
        )
        if (next == keyboardVerticalPaddingScale) {
            setStatus("Keyboard vertical margin ${(keyboardVerticalPaddingScale * 100).toInt()}%")
            return
        }
        keyboardVerticalPaddingScale = next
        callbacks.onVerticalKeyboardPaddingChanged(next)
        setStatus("Keyboard vertical margin ${(keyboardVerticalPaddingScale * 100).toInt()}%")
        requestLayout()
        refreshLayout()
    }

    private fun drawDebugOverlay(canvas: Canvas) {
        keyFrames.forEach { frame ->
            canvas.drawRoundRect(frame.touchRect, resolvedKeyRadius, resolvedKeyRadius, debugStrokePaint)
            canvas.drawRoundRect(frame.visualRect, resolvedKeyRadius, resolvedKeyRadius, debugVisualStrokePaint)
        }
        val dx = debugPrimaryPointerX - debugPrimaryStartX
        val dy = debugPrimaryPointerY - debugPrimaryStartY
        val direction = directionFrom(dx, dy)
        debugTextPaint.textSize = sp(10f)
        val activeKeys = activePointerPressedKeyIds.joinToString(",").ifBlank { "-" }
        val debugLine =
            "debug keys=$activeKeys dir=$direction sel=${debugGestureText}"
        canvas.drawText(debugLine, baseOuterPadding, height - dp(6f), debugTextPaint)
    }

    private fun directionFrom(dx: Float, dy: Float): String {
        if (abs(dx) < 1f && abs(dy) < 1f) {
            return "center"
        }
        val horizontal = if (dx >= 0f) "R" else "L"
        val vertical = if (dy >= 0f) "D" else "U"
        return "$horizontal$vertical"
    }

    private fun refreshLayout() {
        runKeyboardSafely("refreshLayout") {
            clearHorizontalRowVisualState()
            layoutSnapshot = buildSnapshot()
            layoutRefreshGeneration += 1
            requestLayout()
            invalidate()
        }
    }

    private fun scheduleVisibleMediaNowPlayingRefresh() {
        if (mediaNowPlayingLabel == null) {
            return
        }
        removeCallbacks(mediaNowPlayingRefreshRunnable)
        postDelayed(mediaNowPlayingRefreshRunnable, MEDIA_NOW_PLAYING_REFRESH_DELAY_MS)
    }

    private fun refreshVisibleMediaNowPlaying() {
        if (mediaNowPlayingLabel == null) {
            return
        }
        mediaNowPlayingLabel = callbacks.onMediaNowPlaying()
        setStatus(mediaNowPlayingLabel ?: "Now playing unavailable")
        refreshLayout()
    }

    private fun layoutFingerprint(): LayoutFingerprint {
        return LayoutFingerprint(
            layoutMode = layoutMode,
            panelMode = panelMode,
            shifted = shifted,
            shiftLocked = shiftLocked,
            fieldContext = fieldContext,
            layoutProfile = layoutProfile,
            cornerModeEnabled = cornerModeEnabled,
            debugTouchOverlayEnabled = debugTouchOverlayEnabled,
            keyVibrationEnabled = keyVibrationEnabled,
            keyVibrationIntensity = keyVibrationIntensity,
            keySoundEnabled = keySoundEnabled,
            keySoundIntensity = keySoundIntensity,
            spellingSuggestionsEnabled = spellingSuggestionsEnabled,
            specialKeyCornersEnabled = specialKeyCornersEnabled,
            frenchLanguageEnabled = frenchLanguageEnabled,
            englishLanguageEnabled = englishLanguageEnabled,
            doubleSpacePeriodEnabled = doubleSpacePeriodEnabled,
            punctuationAutoSpacingEnabled = punctuationAutoSpacingEnabled,
            keyboardHeightScale = keyboardHeightScale,
            keyboardHorizontalPaddingScale = keyboardHorizontalPaddingScale,
            keyboardVerticalPaddingScale = keyboardVerticalPaddingScale,
            compactModeEnabled = compactModeEnabled,
            symbolPage = symbolPage,
            emojiCategory = emojiCategory,
            recentEmojis = recentEmojis,
            recentSymbols = recentSymbols,
            enterLabel = enterLabel,
            clipboardEntries = clipboardEntries,
            snippets = snippets,
            suggestions = suggestions,
            actionBarState = actionBarState,
            mediaNowPlayingLabel = mediaNowPlayingLabel,
            cornerConfig = cornerConfig,
            themePresetId = themeConfig.presetId,
            privateMode = fieldPolicy.privateMode,
            clipboardAllowed = fieldPolicy.clipboardAllowed,
            voiceAllowed = fieldPolicy.voiceAllowed,
            snippetsAllowed = fieldPolicy.snippetsAllowed,
            mediaControlsEnabled = mediaControlsEnabled,
        )
    }

    private fun <T> runKeyboardSafely(
        actionId: String,
        block: () -> T,
    ): T? {
        return try {
            block()
        } catch (error: Throwable) {
            recoverFromKeyboardError(actionId, error)
            null
        }
    }

    private fun recoverFromKeyboardError(
        actionId: String,
        error: Throwable,
    ) {
        if (recoveringFromKeyboardError) {
            return
        }
        recoveringFromKeyboardError = true
        try {
            stopRepeat()
            cancelAllPointerGestures("error")
            clearHorizontalRowScrollState()
            val source =
                when {
                    themeConfig.useImage -> "image"
                    themeConfig.useGradient -> "gradient"
                    else -> "solid"
                }
            KeyboardCrashReporter.report(
                context = context,
                crashContext =
                    KeyboardCrashContext(
                        actionId = actionId,
                        panel = panelMode.name,
                        mode = layoutMode.name,
                        layoutProfile = layoutProfile.name,
                        compactMode = compactModeEnabled,
                        heightScale = keyboardHeightScale,
                        themePresetId = themeConfig.presetId,
                        themeSource = source,
                        privateMode = fieldPolicy.privateMode,
                    ),
                error = error,
            )
            layoutMode = KeyboardLayoutMode.Letters
            symbolPage = 0
            panelMode = KeyboardPanelMode.None
            layoutSnapshot = KeyboardLayoutBuilder.safeFallback()
            themeConfig = KeyboardThemeConfig()
            themeImagePath = null
            themeBitmap = null
            applyThemeMode(KeyboardStateStore.THEME_SYSTEM)
            statusText = "Keyboard recovered"
            requestLayout()
            invalidate()
        } catch (_: Throwable) {
            layoutSnapshot = KeyboardLayoutBuilder.safeFallback()
            statusText = "Keyboard recovered"
        } finally {
            recoveringFromKeyboardError = false
        }
    }

    private fun drawRecoveredFallback(canvas: Canvas) {
        runCatching {
            canvas.drawColor(nativeColors.background)
            statusPaint.color = nativeColors.statusText
            statusPaint.textSize = sp(14f)
            canvas.drawText("Keyboard recovered", width / 2f, max(dp(28f), height / 2f), statusPaint)
        }
    }

    private fun dp(value: Float): Float = value * density

    private fun sp(value: Float): Float = value * resources.displayMetrics.scaledDensity

    private companion object {
        const val SYMBOL_PAGE_COUNT = 3
        const val KEYBOARD_OPACITY_MIN = 0.25f
        const val KEYBOARD_BACKGROUND_OPACITY_BOOST = 0f
        const val KEYBOARD_SURFACE_OPACITY_BOOST = 0f
        const val KEYBOARD_SHADOW_OPACITY_BOOST = 0f
        const val KEYBOARD_BORDER_OPACITY_BOOST = 0.48f
        const val KEYBOARD_TEXT_OPACITY_BOOST = 0.58f
        const val MASCOT_KEY_PRESS_FACTOR = 0.36f
        const val MEDIA_NOW_PLAYING_REFRESH_DELAY_MS = 450L
    }
}
