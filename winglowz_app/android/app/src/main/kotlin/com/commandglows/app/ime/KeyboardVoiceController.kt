package com.commandglows.app.ime

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.commandglows.app.MicrophoneSessionCoordinator
import java.util.Locale

class KeyboardVoiceController(
    private val context: Context,
    private val stateStore: KeyboardStateStore,
    private val onState: (String) -> Unit,
    private val onPermissionRequiredChanged: (Boolean) -> Unit,
    private val onActiveChanged: (Boolean) -> Unit,
    private val onResult: (String) -> Unit,
) {
    companion object {
        const val MICROPHONE_PERMISSION_REQUIRED_MESSAGE = "Microphone permission required"
        const val LOCAL_RUNTIME_STARTUP_TIMEOUT_MS = 10_000L
        const val ANDROID_FALLBACK_SEGMENT_WINDOW_MS = 60_000L
        const val ANDROID_FALLBACK_RESTART_DELAY_MS = 350L
        const val ANDROID_FALLBACK_MAX_RUNTIME_RESTARTS = 3

        fun androidFallbackStatus(
            phase: String,
            fallbackReason: String?,
        ): String {
            val reason =
                fallbackReason
                    ?.trim()
                    ?.takeIf { it.isNotEmpty() && it != "none" }
                    ?: "missing_pack"
            return "Android speech fallback: $phase ($reason)"
        }

        fun shouldContinueAndroidFallbackAfterError(error: Int): Boolean {
            return error == SpeechRecognizer.ERROR_NO_MATCH ||
                error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ||
                error == SpeechRecognizer.ERROR_CLIENT ||
                error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY
        }

        fun isAndroidFallbackRuntimeRestartError(error: Int): Boolean {
            return error == SpeechRecognizer.ERROR_CLIENT ||
                error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY
        }

        fun mergedAndroidFallbackText(
            committedSegments: List<String>,
            pendingSegment: String,
        ): String {
            val parts = committedSegments
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .toMutableList()
            val pending = pendingSegment.trim()
            if (pending.isNotEmpty() && parts.lastOrNull() != pending) {
                parts += pending
            }
            return parts.joinToString(" ")
        }
    }

    private enum class LocalRuntimeStartResult {
        StartedLocal,
        UseAndroidFallback,
        FallbackUnavailable,
    }

    private data class LocalRuntimeStartDecision(
        val result: LocalRuntimeStartResult,
        val fallbackReason: String = "none",
        val lastErrorCode: String = "none",
    )

    private var recognizer: SpeechRecognizer? = null
    private var localVoiceEngine: KeyboardLocalVoiceEngine? = null
    private var localRuntimeActive = false
    private var localRuntimeStartupInProgress = false
    private val localRuntimeStartupTimeoutHandler = Handler(Looper.getMainLooper())
    private var localRuntimeStartupTimeoutTask: Runnable? = null
    private var localRuntimeStartupTimeoutFired = false
    private var androidFallbackRestartTask: Runnable? = null
    private var androidFallbackRuntimeRestartErrors = 0
    private var listening = false
    private var pauseRequested = false
    private var manualStopRequested = false
    private var activeAndroidFallbackReason: String? = null
    private var latestPartialResult: String = ""
    private val committedAndroidFallbackSegments = mutableListOf<String>()
    private var active = false

    fun isListening(): Boolean = listening
    fun isActive(): Boolean = active || localRuntimeActive || listening

    fun start() {
        if (listening) {
            stop()
            return
        }
        if (localRuntimeActive) {
            stopLocalRuntime()
            return
        }
        if (active || recognizer != null || androidFallbackRestartTask != null) {
            stop()
            return
        }
        if (!hasAudioPermission()) {
            onPermissionRequiredChanged(true)
            setActive(false)
            recordUnavailable("permission_denied")
            onState(MICROPHONE_PERMISSION_REQUIRED_MESSAGE)
            return
        }
        onPermissionRequiredChanged(false)
        if (!MicrophoneSessionCoordinator.requestKeyboardSession(context)) {
            setActive(false)
            recordUnavailable("voice_session_active")
            onState("Microphone already active on another surface")
            return
        }
        clearAndroidFallbackTimeout()
        pauseRequested = false
        manualStopRequested = false
        latestPartialResult = ""
        committedAndroidFallbackSegments.clear()
        androidFallbackRuntimeRestartErrors = 0
        val localStartDecision = tryStartLocalRuntimePath()
        when (localStartDecision.result) {
            LocalRuntimeStartResult.StartedLocal -> return
            LocalRuntimeStartResult.FallbackUnavailable -> {
                MicrophoneSessionCoordinator.clearSession(
                    context,
                    MicrophoneSessionCoordinator.SURFACE_KEYBOARD,
                )
                onState("Local runtime unavailable")
                return
            }
            LocalRuntimeStartResult.UseAndroidFallback -> Unit
        }
        recordAndroidFallback(
            localStartDecision.lastErrorCode,
            localStartDecision.fallbackReason,
        )
        onState(androidFallbackStatus("starting", localStartDecision.fallbackReason))
        startAndroidFallback(
            localStartDecision.lastErrorCode,
            localStartDecision.fallbackReason,
        )
    }

    fun stop() {
        if (localRuntimeActive) {
            stopLocalRuntime()
            return
        }
        clearAndroidFallbackTimeout()
        pauseRequested = false
        manualStopRequested = true
        if (recognizer == null) {
            val finalText = mergedAndroidFallbackText(
                committedAndroidFallbackSegments,
                latestPartialResult,
            )
            setActive(false)
            if (finalText.isNotEmpty()) {
                recordAndroidFallback("none", activeAndroidFallbackReason)
                onResult(finalText)
                onState(androidFallbackStatus("inserted", activeAndroidFallbackReason))
            } else {
                onState(androidFallbackStatus("no speech detected", activeAndroidFallbackReason))
            }
            destroy()
            return
        }
        recognizer?.stopListening()
        listening = false
        setActive(false)
        onState("Processing")
    }

    fun pause() {
        if (localRuntimeActive) {
            stopLocalRuntime()
            onState("Local runtime paused")
            return
        }
        if (!listening) {
            onState("Dictation already paused")
            return
        }
        clearAndroidFallbackTimeout()
        pauseRequested = true
        manualStopRequested = true
        recognizer?.stopListening()
        listening = false
        setActive(false)
        MicrophoneSessionCoordinator.clearSession(
            context,
            MicrophoneSessionCoordinator.SURFACE_KEYBOARD,
        )
        onState("Dictation paused")
    }

    fun resume() {
        if (localRuntimeActive) {
            onState("Local runtime active")
            return
        }
        if (listening) {
            onState("Recording")
            return
        }
        start()
    }

    fun restart() {
        cancel()
        start()
    }

    fun cancel() {
        if (localRuntimeActive) {
            stopLocalRuntime()
        }
        clearAndroidFallbackTimeout()
        pauseRequested = false
        manualStopRequested = false
        latestPartialResult = ""
        recognizer?.cancel()
        listening = false
        setActive(false)
        destroy()
        onState("Canceled")
    }

    fun destroy() {
        clearAndroidFallbackTimeout()
        localVoiceEngine?.cancel()
        localVoiceEngine = null
        recognizer?.destroy()
        recognizer = null
        activeAndroidFallbackReason = null
        onPermissionRequiredChanged(!hasAudioPermission())
        MicrophoneSessionCoordinator.clearSession(
            context,
            MicrophoneSessionCoordinator.SURFACE_KEYBOARD,
        )
    }

    private fun startAndroidFallback(
        lastErrorCode: String,
        fallbackReasonOverride: String? = null,
    ) {
        clearAndroidFallbackTimeout()
        recordAndroidFallback(
            lastErrorCode = lastErrorCode,
            fallbackReasonOverride = fallbackReasonOverride,
        )
        activeAndroidFallbackReason =
            fallbackReasonOverride
                ?.trim()
                ?.ifBlank { null }
                ?: if (lastErrorCode == "none") "missing_pack" else lastErrorCode
        onState(androidFallbackStatus("starting", activeAndroidFallbackReason))
        val speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
        recognizer = speechRecognizer
        speechRecognizer.setRecognitionListener(
            object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    androidFallbackRuntimeRestartErrors = 0
                    listening = true
                    setActive(true)
                    onState(androidFallbackStatus("listening", activeAndroidFallbackReason))
                }

                override fun onBeginningOfSpeech() {
                    onState(androidFallbackStatus("recording", activeAndroidFallbackReason))
                }

                override fun onRmsChanged(rmsdB: Float) = Unit
                override fun onBufferReceived(buffer: ByteArray?) = Unit
                override fun onEndOfSpeech() {
                    onState("Processing")
                }

                override fun onError(error: Int) {
                    val fallback = latestPartialResult.trim()
                    val wasManualStop = manualStopRequested
                    val wasPaused = pauseRequested
                    val didTimeout = localRuntimeStartupTimeoutFired
                    val fallbackReason = activeAndroidFallbackReason
                    listening = false
                    pauseRequested = false
                    manualStopRequested = false
                    localRuntimeStartupTimeoutFired = false
                    clearAndroidFallbackTimeout()
                    destroy()
                    if (didTimeout) {
                        setActive(false)
                        recordAndroidFallback("runtime_timeout", "runtime_timeout")
                        onState(androidFallbackStatus("timeout", "runtime_timeout"))
                    } else if (wasManualStop && !wasPaused && fallback.isNotEmpty()) {
                        setActive(false)
                        recordAndroidFallback("none", fallbackReason)
                        onResult(
                            mergedAndroidFallbackText(
                                committedAndroidFallbackSegments,
                                fallback,
                            ),
                        )
                        onState(androidFallbackStatus("inserted", fallbackReason))
                    } else if (wasPaused) {
                        setActive(false)
                        recordAndroidFallback("none")
                        onState(androidFallbackStatus("paused", fallbackReason))
                    } else if (shouldContinueAndroidFallbackAfterError(error)) {
                        if (
                            isAndroidFallbackRuntimeRestartError(error) &&
                            ++androidFallbackRuntimeRestartErrors >
                                ANDROID_FALLBACK_MAX_RUNTIME_RESTARTS
                        ) {
                            setActive(false)
                            recordAndroidFallback("runtime_load_failed")
                            onState(androidFallbackStatus("failed", "runtime_load_failed"))
                            return
                        }
                        appendAndroidFallbackSegment(fallback)
                        restartAndroidFallback(fallbackReason)
                    } else {
                        setActive(false)
                        recordAndroidFallback("runtime_load_failed")
                        onState(androidFallbackStatus("failed", "runtime_load_failed"))
                    }
                }

                override fun onResults(results: Bundle?) {
                    listening = false
                    val wasPaused = pauseRequested
                    val wasManualStop = manualStopRequested
                    val fallbackReason = activeAndroidFallbackReason
                    pauseRequested = false
                    manualStopRequested = false
                    val didTimeout = localRuntimeStartupTimeoutFired
                    localRuntimeStartupTimeoutFired = false
                    clearAndroidFallbackTimeout()
                    val matches =
                        results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            .orEmpty()
                    val best = matches.firstOrNull()?.trim().orEmpty().ifEmpty {
                        latestPartialResult.trim()
                    }
                    destroy()
                    if (didTimeout) {
                        setActive(false)
                        recordAndroidFallback("runtime_timeout", "runtime_timeout")
                        onState(androidFallbackStatus("timeout", "runtime_timeout"))
                    } else if (!wasPaused && !wasManualStop) {
                        androidFallbackRuntimeRestartErrors = 0
                        appendAndroidFallbackSegment(best)
                        restartAndroidFallback(fallbackReason)
                    } else if (best.isNotEmpty()) {
                        setActive(false)
                        recordAndroidFallback("none", fallbackReason)
                        onResult(
                            mergedAndroidFallbackText(
                                committedAndroidFallbackSegments,
                                best,
                            ),
                        )
                        onState(
                            androidFallbackStatus(
                                if (wasPaused) "paused" else "inserted",
                                fallbackReason,
                            ),
                        )
                    } else if (wasPaused) {
                        setActive(false)
                        recordAndroidFallback("none")
                        onState(androidFallbackStatus("paused", fallbackReason))
                    } else {
                        setActive(false)
                        recordAndroidFallback("missing_pack")
                        onState(androidFallbackStatus("no speech detected", "missing_pack"))
                    }
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    val matches =
                        partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                            .orEmpty()
                    val best = matches.firstOrNull()?.trim().orEmpty()
                    if (best.isNotEmpty()) {
                        latestPartialResult = best
                        onState(androidFallbackStatus("recording", activeAndroidFallbackReason))
                    }
                }

                override fun onEvent(eventType: Int, params: Bundle?) = Unit
            },
        )
        speechRecognizer.startListening(
            Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
                )
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag())
                putExtra(
                    RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS,
                    ANDROID_FALLBACK_SEGMENT_WINDOW_MS,
                )
                putExtra(
                    RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS,
                    ANDROID_FALLBACK_SEGMENT_WINDOW_MS,
                )
                putExtra(
                    RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS,
                    ANDROID_FALLBACK_SEGMENT_WINDOW_MS,
                )
            },
        )
    }

    private fun appendAndroidFallbackSegment(text: String) {
        val normalized = text.trim()
        if (normalized.isEmpty()) {
            return
        }
        if (committedAndroidFallbackSegments.lastOrNull() == normalized) {
            return
        }
        committedAndroidFallbackSegments += normalized
    }

    private fun restartAndroidFallback(fallbackReason: String?) {
        if (!active) {
            return
        }
        onState(androidFallbackStatus("listening", fallbackReason))
        clearAndroidFallbackRestart()
        val restartTask = Runnable {
            androidFallbackRestartTask = null
            if (!active || manualStopRequested || pauseRequested) {
                return@Runnable
            }
            startAndroidFallback(
                lastErrorCode = "none",
                fallbackReasonOverride = fallbackReason,
            )
        }
        androidFallbackRestartTask = restartTask
        localRuntimeStartupTimeoutHandler.postDelayed(
            restartTask,
            ANDROID_FALLBACK_RESTART_DELAY_MS,
        )
    }

    private fun recordAndroidFallback(
        lastErrorCode: String,
        fallbackReasonOverride: String? = null,
    ) {
        localRuntimeActive = false
        val fallbackReason =
            fallbackReasonOverride
                ?.trim()
                ?.ifBlank { null }
                ?: if (lastErrorCode == "none") "missing_pack" else lastErrorCode
        stateStore.updateVoiceRuntimeStatus(
            runtimeMode = "android_fallback",
            languageTag = Locale.getDefault().toLanguageTag(),
            packId = "none",
            engine = "android_speech_recognizer",
            fallbackReason = fallbackReason,
            lastErrorCode = lastErrorCode,
        )
    }

    private fun recordUnavailable(lastErrorCode: String) {
        localRuntimeActive = false
        stateStore.updateVoiceRuntimeStatus(
            runtimeMode = "unavailable",
            languageTag = Locale.getDefault().toLanguageTag(),
            packId = "none",
            engine = "android_speech_recognizer",
            fallbackReason = "unsupported_language",
            lastErrorCode = lastErrorCode,
        )
    }

    private fun hasAudioPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    private fun tryStartLocalRuntimePath(): LocalRuntimeStartDecision {
        val languageTag = Locale.getDefault().toLanguageTag()
        val packId = stateStore.voicePackId
        val engine = stateStore.voiceEngine
        val modelArtifactPath = stateStore.voiceModelArtifactPath
        val androidFallbackAvailable = SpeechRecognizer.isRecognitionAvailable(context)
        val validation =
            KeyboardLocalRuntimePath.validate(
                packId = packId,
                engine = engine,
                modelArtifactPath = modelArtifactPath,
                androidFallbackAvailable = androidFallbackAvailable,
            )
        if (!validation.canStartLocal) {
            val fallbackEngine =
                if (validation.fallbackRuntimeMode == "android_fallback") {
                    "android_speech_recognizer"
                } else {
                    "unavailable"
                }
            stateStore.updateVoiceRuntimeStatus(
                runtimeMode = validation.fallbackRuntimeMode,
                languageTag = languageTag,
                packId = if (validation.fallbackRuntimeMode == "android_fallback") "none" else packId,
                engine = fallbackEngine,
                fallbackReason = validation.fallbackReason,
                lastErrorCode = validation.errorCode,
            )
            return if (validation.fallbackRuntimeMode == "android_fallback") {
                LocalRuntimeStartDecision(
                    result = LocalRuntimeStartResult.UseAndroidFallback,
                    fallbackReason = validation.fallbackReason,
                    lastErrorCode = validation.errorCode,
                )
            } else {
                LocalRuntimeStartDecision(
                    result = LocalRuntimeStartResult.FallbackUnavailable,
                    fallbackReason = validation.fallbackReason,
                    lastErrorCode = validation.errorCode,
                )
            }
        }
        val loadingStatus =
            KeyboardVoiceRuntimeStatus.normalized(
                runtimeMode = "local",
                languageTag = languageTag,
                packId = packId,
                engine = engine,
                fallbackReason = "none",
                lastErrorCode = "none",
            )
        KeyboardVoiceRuntimeEventQueue.enqueue(
            status = loadingStatus,
            runtimeStateOverride = "local_loading",
            source = "ime_local_runtime",
        )
        onState("Loading local runtime")
        val localEngine = KeyboardLocalVoiceEngineFactory.create(engine)
        scheduleLocalRuntimeStartupTimeout()
        val engineStartResult =
            localEngine.start(
                config =
                    KeyboardLocalVoiceEngineConfig(
                        languageTag = languageTag,
                        packId = packId,
                        engine = engine,
                        modelArtifactPath = modelArtifactPath,
                    ),
                callbacks =
                    KeyboardLocalVoiceEngineCallbacks(
                        onState = onState,
                        onPartialResult = { partial ->
                            latestPartialResult = partial
                            onState(partial)
                        },
                        onFinalResult = { finalText ->
                            val normalizedFinal = finalText.trim()
                            if (normalizedFinal.isNotEmpty()) {
                                onResult(normalizedFinal)
                                onState("Inserted dictation")
                            }
                        },
                    ),
            )
        if (!engineStartResult.started) {
            clearLocalRuntimeStartupTimeout()
            localEngine.cancel()
            stateStore.updateVoiceRuntimeStatus(
                runtimeMode = if (androidFallbackAvailable) "android_fallback" else "unavailable",
                languageTag = languageTag,
                packId = if (androidFallbackAvailable) "none" else packId,
                engine = if (androidFallbackAvailable) "android_speech_recognizer" else engine,
                fallbackReason = engineStartResult.fallbackReason,
                lastErrorCode = engineStartResult.lastErrorCode,
            )
            return if (androidFallbackAvailable) {
                LocalRuntimeStartDecision(
                    result = LocalRuntimeStartResult.UseAndroidFallback,
                    fallbackReason = engineStartResult.fallbackReason,
                    lastErrorCode = engineStartResult.lastErrorCode,
                )
            } else {
                LocalRuntimeStartDecision(
                    result = LocalRuntimeStartResult.FallbackUnavailable,
                    fallbackReason = engineStartResult.fallbackReason,
                    lastErrorCode = engineStartResult.lastErrorCode,
                )
            }
        }
        clearLocalRuntimeStartupTimeout()
        localVoiceEngine = localEngine
        localRuntimeActive = true
        setActive(true)
        listening = false
        stateStore.updateVoiceRuntimeStatus(
            runtimeMode = "local",
            languageTag = languageTag,
            packId = packId,
            engine = engine,
            fallbackReason = "none",
            lastErrorCode = "none",
        )
        KeyboardVoiceRuntimeEventQueue.enqueue(
            status = loadingStatus,
            runtimeStateOverride = "local_active",
            source = "ime_local_runtime",
        )
        onState("Local runtime active")
        return LocalRuntimeStartDecision(result = LocalRuntimeStartResult.StartedLocal)
    }

    private fun emitLocalRuntimeTimeoutEvent() {
        val languageTag = Locale.getDefault().toLanguageTag()
        val packId = stateStore.voicePackId
        val engine = stateStore.voiceEngine
        val timeoutStatus =
            KeyboardVoiceRuntimeStatus.normalized(
                runtimeMode = "unavailable",
                languageTag = languageTag,
                packId = packId,
                engine = engine,
                fallbackReason = "runtime_timeout",
                lastErrorCode = "local_runtime_timeout",
            )
        KeyboardVoiceRuntimeEventQueue.enqueue(
            status = timeoutStatus,
            runtimeStateOverride = "runtime_timeout",
            source = "ime_local_runtime",
        )
    }

    private fun stopLocalRuntime() {
        clearLocalRuntimeStartupTimeout()
        localVoiceEngine?.stop()
        localVoiceEngine = null
        localRuntimeActive = false
        setActive(false)
        MicrophoneSessionCoordinator.clearSession(
            context,
            MicrophoneSessionCoordinator.SURFACE_KEYBOARD,
        )
        stateStore.updateVoiceRuntimeStatus(
            runtimeMode = "unavailable",
            languageTag = Locale.getDefault().toLanguageTag(),
            packId = stateStore.voicePackId,
            engine = stateStore.voiceEngine,
            fallbackReason = "missing_pack",
            lastErrorCode = "local_runtime_stopped",
        )
    }

    private fun scheduleLocalRuntimeStartupTimeout() {
        clearLocalRuntimeStartupTimeout()
        localRuntimeStartupInProgress = true
        val timeoutTask = Runnable {
            if (!localRuntimeStartupInProgress) {
                return@Runnable
            }
            localRuntimeStartupInProgress = false
            localRuntimeStartupTimeoutFired = true
            localRuntimeActive = false
            setActive(false)
            emitLocalRuntimeTimeoutEvent()
            startAndroidFallback(
                lastErrorCode = "local_runtime_timeout",
                fallbackReasonOverride = "runtime_timeout",
            )
        }
        localRuntimeStartupTimeoutTask = timeoutTask
        localRuntimeStartupTimeoutHandler.postDelayed(
            timeoutTask,
            LOCAL_RUNTIME_STARTUP_TIMEOUT_MS,
        )
    }

    private fun clearLocalRuntimeStartupTimeout() {
        localRuntimeStartupTimeoutTask?.let {
            localRuntimeStartupTimeoutHandler.removeCallbacks(it)
        }
        localRuntimeStartupTimeoutTask = null
        localRuntimeStartupInProgress = false
        localRuntimeStartupTimeoutFired = false
    }

    private fun clearAndroidFallbackTimeout() {
        clearAndroidFallbackRestart()
        localRuntimeStartupTimeoutFired = false
        clearLocalRuntimeStartupTimeout()
    }

    private fun clearAndroidFallbackRestart() {
        androidFallbackRestartTask?.let {
            localRuntimeStartupTimeoutHandler.removeCallbacks(it)
        }
        androidFallbackRestartTask = null
    }

    private fun setActive(value: Boolean) {
        if (active == value) {
            return
        }
        active = value
        onActiveChanged(value)
    }
}
