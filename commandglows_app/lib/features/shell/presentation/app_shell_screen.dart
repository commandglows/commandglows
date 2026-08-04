import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/diagnostics/app_diagnostics.dart';
import '../../../core/platform/android_keyboard_bridge.dart';
import '../../../core/platform/android_overlay_bridge.dart';
import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../../auth/application/auth_session_provider.dart';
import '../../auth/application/suite_identity_provider.dart';
import '../../clipboard/application/clipboard_store_provider.dart';
import '../../clipboard/presentation/clipboard_screen.dart';
import '../../custom_action_buttons/presentation/custom_actions_screen.dart';
import '../../dictionary/presentation/dictionary_screen.dart';
import '../../keyboard/domain/keyboard_models.dart';
import '../../home/application/home_feed_provider.dart';
import '../../settings/application/settings_store_provider.dart';
import '../../settings/domain/onboarding_permission_contract.dart';
import '../../settings/domain/settings_store.dart';
import '../../home/presentation/home_screen.dart';
import '../../snippets/presentation/snippets_screen.dart';
import '../../voice/application/transcription_store_provider.dart';
import '../../voice/domain/transcription_draft.dart';
import '../../voice/presentation/voice_screen.dart';
import '../../../app/commandglows_app.dart';

class AppShellScreen extends ConsumerStatefulWidget {
  const AppShellScreen({
    super.key,
    this.initialIndex = 0,
    this.initialOnboardingStep,
  });

  final int initialIndex;
  final String? initialOnboardingStep;

  @override
  ConsumerState<AppShellScreen> createState() => _AppShellScreenState();
}

class _AppShellScreenState extends ConsumerState<AppShellScreen>
    with WidgetsBindingObserver {
  static const int _homeTabIndex = 0;
  static const int _voiceTabIndex = 1;
  static const int _clipboardTabIndex = 2;
  static const int _snippetTabIndex = 3;
  static const int _actionsTabIndex = 4;
  static const int _dictionaryTabIndex = 5;

  static const _unsupportedOverlayStatus = AndroidOverlayStatus(
    enabled: false,
    requestedEnabled: false,
    running: false,
    overlayPermissionGranted: false,
    accessibilityPermissionGranted: false,
    recordAudioGranted: false,
    deliveryMode: OverlayDeliveryMode.clipboardOnly,
    sizeScale: 1,
    opacity: 0.9,
    eventQueueSize: 0,
    serviceState: 'unsupported',
  );

  int _index = 0;
  int _navigationPulse = 0;
  bool _onboardingVisible = false;
  bool _onboardingDismissed = false;
  bool _onboardingOpenedManually = false;
  bool _onboardingBusy = false;
  bool _onboardingDeferPromptVisible = false;
  bool _welcomeGuideVisible = false;
  bool _clipboardImportBusy = false;
  bool _notifyClipboardAfterImport = false;
  bool _voiceImportBusy = false;
  bool _notifyVoiceAfterImport = false;
  bool _overlayImportBusy = false;
  bool _notifyOverlayAfterImport = false;
  final List<int> _tabHistory = [0];
  OnboardingReadiness? _onboardingReadiness;
  String? _onboardingMessage;
  UserSettingsSnapshot? _onboardingSettings;

  void _selectTab(int value) {
    if (value == _index) {
      setState(() {
        _navigationPulse++;
      });
      if (value == _voiceTabIndex) {
        _scheduleKeyboardVoiceSync(notifyVoice: true);
        _scheduleOverlayVoiceSync(notifyOverlay: true);
      }
      if (value == _clipboardTabIndex) {
        _scheduleKeyboardClipboardSync(notifyClipboard: true);
      }
      return;
    }
    const titles = [
      'Accueil',
      'Voix',
      'Papiers',
      'Snippets',
      'Actions',
      'Dico',
    ];
    AppDiagnostics.record(
      'tab_select',
      '${titles[_index]} -> ${titles[value]}',
    );
    setState(() {
      _index = value;
      _navigationPulse++;
      _tabHistory.remove(value);
      _tabHistory.add(value);
    });
    if (value == _voiceTabIndex) {
      _scheduleKeyboardVoiceSync(notifyVoice: true);
      _scheduleOverlayVoiceSync(notifyOverlay: true);
    }
    if (value == _clipboardTabIndex) {
      _scheduleKeyboardClipboardSync(notifyClipboard: true);
    }
  }

  void _goBackInTabs() {
    if (_tabHistory.length <= 1) {
      return;
    }
    setState(() {
      _tabHistory.removeLast();
      _index = _tabHistory.last;
    });
  }

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex.clamp(_homeTabIndex, _dictionaryTabIndex);
    _tabHistory
      ..clear()
      ..add(_index);
    WidgetsBinding.instance.addObserver(this);
    Future.microtask(_consumePendingSignupWelcome);
    Future.microtask(_refreshOnboardingState);
    _scheduleKeyboardVoiceSync();
    _scheduleOverlayVoiceSync();
    _scheduleKeyboardClipboardSync();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant AppShellScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialOnboardingStep != widget.initialOnboardingStep) {
      Future.microtask(_refreshOnboardingState);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refreshOnboardingState();
      unawaited(
        ref.read(appThemeModeProvider.notifier).syncFromKeyboardThemeMode(),
      );
      _scheduleKeyboardVoiceSync(notifyVoice: _index == _voiceTabIndex);
      _scheduleOverlayVoiceSync(notifyOverlay: _index == _voiceTabIndex);
      _scheduleKeyboardClipboardSync(
        notifyClipboard: _index == _clipboardTabIndex,
      );
    }
  }

  void _scheduleOverlayVoiceSync({bool notifyOverlay = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      unawaited(_syncOverlayVoiceEvents(notifyOverlay: notifyOverlay));
    });
  }

  Future<void> _syncOverlayVoiceEvents({bool notifyOverlay = false}) async {
    if (!PlatformCapabilities.overlaySupported) {
      return;
    }
    _notifyOverlayAfterImport = _notifyOverlayAfterImport || notifyOverlay;
    if (_overlayImportBusy) {
      return;
    }
    _overlayImportBusy = true;
    var imported = 0;
    try {
      await ref.read(suiteIdentityProvider.future);
      final events = await AndroidOverlayBridge.drainEvents();
      if (events.isEmpty) {
        return;
      }
      final store = ref.read(transcriptionStoreProvider);
      final existing = await store.list();
      final seen = existing
          .map(
            (item) =>
                '${item.rawText}|${item.cleanedText}|${item.language}|${item.source}|${item.durationMs}',
          )
          .toSet();
      for (final event in events) {
        final draftEvent = AndroidOverlayEventTextDelivery.fromOverlayEvent(
          event,
        );
        if (draftEvent == null) {
          continue;
        }
        final draft = TranscriptionDraft(
          rawText: draftEvent.rawText,
          cleanedText: draftEvent.cleanedText,
          language: draftEvent.language,
          source: draftEvent.source,
          durationMs: draftEvent.durationMs,
        );
        if (!draft.isValid) {
          continue;
        }
        final key =
            '${draft.rawText}|${draft.cleanedText}|${draft.language}|${draft.source}|${draft.durationMs}';
        if (seen.contains(key)) {
          continue;
        }
        await store.insert(draft);
        imported += 1;
        seen.add(key);
      }
      if (events.isNotEmpty) {
        AppDiagnostics.record(
          'voice_overlay_auto_import',
          'events=${events.length}; imported=$imported',
        );
      }
    } catch (error) {
      AppDiagnostics.record('overlay_voice_auto_import_error', error);
    } finally {
      final shouldNotify =
          mounted &&
          _index == _voiceTabIndex &&
          (_notifyOverlayAfterImport || imported > 0);
      _notifyOverlayAfterImport = false;
      _overlayImportBusy = false;
      if (shouldNotify) {
        final notifier = ref.read(
          transcriptionHistoryRefreshSignalProvider.notifier,
        );
        notifier.markChanged();
      }
    }
  }

  void _scheduleKeyboardVoiceSync({bool notifyVoice = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      unawaited(_syncKeyboardVoiceEvents(notifyVoice: notifyVoice));
    });
  }

  Future<void> _syncKeyboardVoiceEvents({bool notifyVoice = false}) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    _notifyVoiceAfterImport = _notifyVoiceAfterImport || notifyVoice;
    if (_voiceImportBusy) {
      return;
    }
    _voiceImportBusy = true;
    var imported = 0;
    try {
      await ref.read(suiteIdentityProvider.future);
      final events = await AndroidKeyboardBridge.drainKeyboardVoiceEvents();
      if (events.isNotEmpty) {
        final store = ref.read(transcriptionStoreProvider);
        for (final event in events) {
          final draft = TranscriptionDraft(
            rawText: event.rawText,
            cleanedText: event.cleanedText,
            language: event.language,
            source: event.source,
            durationMs: event.durationMs,
          );
          if (draft.isValid) {
            await store.insert(draft);
            imported += 1;
          }
        }
        AppDiagnostics.record(
          'keyboard_voice_auto_import',
          'events=${events.length}; imported=$imported',
        );
      }
    } catch (error) {
      AppDiagnostics.record('keyboard_voice_auto_import_error', error);
    } finally {
      final shouldNotify =
          mounted &&
          _index == _voiceTabIndex &&
          (_notifyVoiceAfterImport || imported > 0);
      _notifyVoiceAfterImport = false;
      _voiceImportBusy = false;
      if (shouldNotify) {
        final notifier = ref.read(
          transcriptionHistoryRefreshSignalProvider.notifier,
        );
        notifier.markChanged();
      }
    }
  }

  void _scheduleKeyboardClipboardSync({bool notifyClipboard = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }
      unawaited(_syncKeyboardClipboardEvents(notifyClipboard: notifyClipboard));
    });
  }

  Future<void> _syncKeyboardClipboardEvents({
    bool notifyClipboard = false,
  }) async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    _notifyClipboardAfterImport =
        _notifyClipboardAfterImport || notifyClipboard;
    if (_clipboardImportBusy) {
      return;
    }
    _clipboardImportBusy = true;
    var importedWork = false;
    try {
      await ref.read(suiteIdentityProvider.future);
      final result = await ref
          .read(keyboardClipboardEventImporterProvider)
          .drainFromAndroidKeyboard();
      importedWork = result.hasWork;
      if (result.hasWork) {
        AppDiagnostics.record(
          'keyboard_clipboard_auto_import',
          'imported=${result.imported}; failed=${result.failed}; rejected_sensitive=${result.rejectedSensitive}',
        );
      }
    } catch (error) {
      AppDiagnostics.record('keyboard_clipboard_auto_import_error', error);
    } finally {
      final shouldNotify =
          mounted &&
          _index == _clipboardTabIndex &&
          (_notifyClipboardAfterImport || importedWork);
      _notifyClipboardAfterImport = false;
      _clipboardImportBusy = false;
      if (shouldNotify) {
        final notifier = ref.read(
          clipboardHistoryRefreshSignalProvider.notifier,
        );
        notifier.markChanged();
      }
    }
  }

  Future<AndroidOverlayStatus> _loadOverlayStatusForOnboarding() async {
    if (!PlatformCapabilities.overlaySupported) {
      return _unsupportedOverlayStatus;
    }
    try {
      return await AndroidOverlayBridge.getStatus();
    } catch (_) {
      return _unsupportedOverlayStatus;
    }
  }

  Future<AndroidKeyboardStatus> _loadKeyboardStatusForOnboarding() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return AndroidKeyboardStatus.unsupported();
    }
    try {
      return await AndroidKeyboardBridge.getStatus();
    } catch (_) {
      return AndroidKeyboardStatus.unsupported();
    }
  }

  void _consumePendingSignupWelcome() {
    if (!mounted ||
        !ref.read(signupWelcomePendingProvider.notifier).consume()) {
      return;
    }
    setState(() => _welcomeGuideVisible = true);
  }

  Future<void> _saveOnboardingSettings(UserSettingsSnapshot settings) async {
    try {
      await ref.read(settingsStoreProvider).save(settings);
    } catch (_) {
      // Onboarding should stay operational even if settings persistence fails.
    }
  }

  Future<void> _refreshOnboardingState() async {
    if (!PlatformCapabilities.isAndroid ||
        !PlatformCapabilities.overlaySupported) {
      if (!mounted) {
        return;
      }
      setState(() {
        _onboardingReadiness = const OnboardingReadiness(
          platformSupported: false,
          steps: <OnboardingStepProgress>[],
          currentStep: 0,
          onboardingCompleted: false,
        );
        _onboardingVisible = false;
        _onboardingDismissed = true;
        _onboardingOpenedManually = false;
        _onboardingDeferPromptVisible = false;
      });
      return;
    }

    setState(() {
      _onboardingBusy = true;
      _onboardingMessage = null;
    });

    try {
      final store = ref.read(settingsStoreProvider);
      final rawSettings = await store.load();
      final overlayStatus = await _loadOverlayStatusForOnboarding();
      final keyboardStatus = await _loadKeyboardStatusForOnboarding();
      var readiness = evaluateOnboardingReadiness(
        isPlatformSupported: PlatformCapabilities.overlaySupported,
        overlayStatus: overlayStatus,
        keyboardStatus: keyboardStatus,
        persistedStep: rawSettings.onboardingCurrentStep,
        onboardingCompleted: rawSettings.onboardingCompleted,
        clipboardSkipped: rawSettings.onboardingClipboardSkipped,
        accessibilitySkipped: rawSettings.onboardingAccessibilitySkipped,
        microphoneSkipped: rawSettings.onboardingMicrophoneSkipped,
        mediaAccessSkipped: rawSettings.onboardingMediaAccessSkipped,
        brightnessSkipped: rawSettings.onboardingBrightnessSkipped,
        overlaySkipped: rawSettings.onboardingOverlaySkipped,
      );
      final forcedStep = _forcedOnboardingStepIndex(readiness);
      final resumeRequested = widget.initialOnboardingStep?.trim() == 'resume';
      if (forcedStep != null) {
        readiness = OnboardingReadiness(
          platformSupported: readiness.platformSupported,
          steps: readiness.steps,
          currentStep: forcedStep,
          onboardingCompleted: false,
        );
      }

      var nextSettings = rawSettings;
      if (rawSettings.onboardingCurrentStep != readiness.currentStep ||
          rawSettings.onboardingLastSeenAt == null) {
        nextSettings = rawSettings.copyWith(
          onboardingCurrentStep: readiness.currentStep,
          onboardingLastSeenAt: DateTime.now().toUtc(),
        );
        await _saveOnboardingSettings(nextSettings);
      }

      if (!mounted) {
        return;
      }
      setState(() {
        _onboardingReadiness = readiness;
        _onboardingSettings = nextSettings;
        _onboardingBusy = false;
        if (forcedStep != null || resumeRequested) {
          _onboardingVisible = true;
          _onboardingDismissed = false;
          _onboardingOpenedManually = true;
        } else if (readiness.shouldShowOnboarding && !_onboardingDismissed) {
          _onboardingVisible = true;
        }
        if (!readiness.shouldShowOnboarding && !_onboardingOpenedManually) {
          _onboardingVisible = false;
          _onboardingDismissed = true;
        }
      });

      final activeStep = readiness.activeStep?.definition.id.name ?? 'none';
      AppDiagnostics.record(
        'onboarding_refresh',
        'current=${readiness.currentStep}/${readiness.steps.length};active=$activeStep;mandatory=${readiness.hasPendingMandatory};recommended=${readiness.hasPendingRecommended};visible=$_onboardingVisible',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _onboardingBusy = false;
        _onboardingMessage = 'Impossible de charger l’onboarding: $error';
      });
    }
  }

  int? _forcedOnboardingStepIndex(OnboardingReadiness readiness) {
    final requested = widget.initialOnboardingStep?.trim();
    if (requested != 'media' &&
        requested != 'brightness' &&
        requested != 'microphone') {
      return null;
    }
    final target = switch (requested) {
      'brightness' => OnboardingStepId.brightnessSystemSettings,
      'microphone' => OnboardingStepId.microphoneForDictation,
      _ => OnboardingStepId.mediaSessionAccess,
    };
    final index = readiness.steps.indexWhere(
      (step) => step.definition.id == target,
    );
    return index < 0 ? null : index;
  }

  Future<void> _openCurrentStepPrimaryAction([OnboardingStepId? stepId]) async {
    final step = _onboardingStepDefinition(stepId);
    if (step == null) {
      return;
    }
    setState(() {
      _onboardingBusy = true;
      _onboardingMessage = null;
    });
    try {
      AppDiagnostics.record('onboarding_primary_action', step.id.name);
      if (step.id == OnboardingStepId.overlay) {
        final status = await _loadOverlayStatusForOnboarding();
        if (!status.overlayPermissionGranted) {
          await AndroidOverlayBridge.openPermissionSettings();
        } else {
          await AndroidOverlayBridge.startRecording();
        }
      } else if (step.id == OnboardingStepId.keyboardIme) {
        await AndroidKeyboardBridge.openInputMethodSettings();
      } else if (step.id == OnboardingStepId.keyboardClipboard) {
        final status = await _loadKeyboardStatusForOnboarding();
        await AndroidKeyboardBridge.setPreferences(
          voiceEnabled: status.voiceEnabled,
          customActionBarEnabled: status.customActionBarEnabled,
          clipboardSyncDesired: true,
          clipboardSensitiveFieldHistoryEnabled:
              status.clipboardSensitiveFieldHistoryEnabled,
          mediaControlsEnabled: status.mediaControlsEnabled,
          mediaVolumeStepPercent: status.mediaVolumeStepPercent,
          mediaBrightnessStepPercent: status.mediaBrightnessStepPercent,
          themeMode: status.themeMode,
          layoutProfile: status.layoutProfile,
          cornerModeEnabled: status.cornerModeEnabled,
          debugTouchOverlayEnabled: status.debugTouchOverlayEnabled,
          keyVibrationEnabled: status.keyVibrationEnabled,
          keyVibrationIntensity: status.keyVibrationIntensity,
          keySoundEnabled: status.keySoundEnabled,
          spellingSuggestionsEnabled: status.spellingSuggestionsEnabled,
          specialKeyCornersEnabled: status.specialKeyCornersEnabled,
          frenchLanguageEnabled: status.frenchLanguageEnabled,
          englishLanguageEnabled: status.englishLanguageEnabled,
          doubleSpacePeriodEnabled: status.doubleSpacePeriodEnabled,
          punctuationAutoSpacingEnabled: status.punctuationAutoSpacingEnabled,
          keyboardHeightScale: status.keyboardHeightScale,
          actionRowHeightScale: status.actionRowHeightScale,
          compactModeEnabled: status.compactModeEnabled,
          autoCloseModesEnabled: status.autoCloseModesEnabled,
          privacyMode: status.privacyMode,
        );
      } else if (step.id == OnboardingStepId.accessibility) {
        await AndroidOverlayBridge.openAccessibilitySettings();
      } else if (step.id == OnboardingStepId.mediaSessionAccess) {
        await AndroidKeyboardBridge.openNotificationListenerSettings();
      } else if (step.id == OnboardingStepId.brightnessSystemSettings) {
        await AndroidKeyboardBridge.openWriteSettingsPermission();
      } else {
        await AndroidOverlayBridge.openAppSettings();
      }
    } on AndroidOverlayBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _onboardingMessage =
            'Action impossible (${error.code}): ${error.message}',
      );
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _onboardingMessage =
            'Action clavier impossible (${error.code}): ${error.message}',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() => _onboardingMessage = 'Action impossible: $error');
    } finally {
      if (mounted) {
        setState(() => _onboardingBusy = false);
        await _refreshOnboardingState();
      }
    }
  }

  Future<void> _openCurrentStepSecondaryAction([
    OnboardingStepId? stepId,
  ]) async {
    final step = _onboardingStepDefinition(stepId);
    if (step == null || step.id != OnboardingStepId.keyboardIme) {
      return;
    }
    setState(() {
      _onboardingBusy = true;
      _onboardingMessage = null;
    });
    try {
      AppDiagnostics.record('onboarding_secondary_action', step.id.name);
      await AndroidKeyboardBridge.showInputMethodPicker();
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _onboardingMessage =
            'Impossible d’ouvrir le sélecteur (${error.code}): ${error.message}',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _onboardingMessage = 'Impossible d’ouvrir le sélecteur: $error',
      );
    } finally {
      if (mounted) {
        setState(() => _onboardingBusy = false);
        await _refreshOnboardingState();
      }
    }
  }

  Future<void> _skipCurrentStep([OnboardingStepId? stepId]) async {
    final step = _onboardingStepProgress(stepId);
    if (step == null) {
      return;
    }
    final settings = _onboardingSettings;
    if (settings == null) {
      return;
    }
    final updated = switch (step.definition.id) {
      OnboardingStepId.keyboardClipboard => settings.copyWith(
        onboardingClipboardSkipped: true,
        onboardingLastSeenAt: DateTime.now().toUtc(),
      ),
      OnboardingStepId.accessibility => settings.copyWith(
        onboardingAccessibilitySkipped: true,
        onboardingLastSeenAt: DateTime.now().toUtc(),
      ),
      OnboardingStepId.microphoneForDictation => settings.copyWith(
        onboardingMicrophoneSkipped: true,
        onboardingLastSeenAt: DateTime.now().toUtc(),
      ),
      OnboardingStepId.mediaSessionAccess => settings.copyWith(
        onboardingMediaAccessSkipped: true,
        onboardingLastSeenAt: DateTime.now().toUtc(),
      ),
      OnboardingStepId.brightnessSystemSettings => settings.copyWith(
        onboardingBrightnessSkipped: true,
        onboardingLastSeenAt: DateTime.now().toUtc(),
      ),
      OnboardingStepId.overlay => settings.copyWith(
        onboardingOverlaySkipped: true,
        onboardingLastSeenAt: DateTime.now().toUtc(),
      ),
      _ => settings.copyWith(onboardingLastSeenAt: DateTime.now().toUtc()),
    };
    await _saveOnboardingSettings(updated);
    if (!mounted) {
      return;
    }
    setState(() {
      _onboardingSettings = updated;
    });
    await _refreshOnboardingState();
  }

  OnboardingStepDefinition? _onboardingStepDefinition(
    OnboardingStepId? stepId,
  ) {
    return _onboardingStepProgress(stepId)?.definition;
  }

  OnboardingStepProgress? _onboardingStepProgress(OnboardingStepId? stepId) {
    final readiness = _onboardingReadiness;
    if (readiness == null) {
      return null;
    }
    if (stepId == null) {
      return readiness.activeStep;
    }
    for (final step in readiness.steps) {
      if (step.definition.id == stepId) {
        return step;
      }
    }
    return null;
  }

  Future<void> _completeOnboarding() async {
    final readiness = _onboardingReadiness;
    final settings = _onboardingSettings;
    if (readiness == null ||
        settings == null ||
        !readiness.shouldShowCompletion) {
      return;
    }
    setState(() {
      _onboardingBusy = true;
    });
    try {
      await _saveOnboardingSettings(
        settings.copyWith(
          onboardingCompleted: true,
          onboardingLastSeenAt: DateTime.now().toUtc(),
        ),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _onboardingVisible = false;
        _onboardingDismissed = true;
        _onboardingOpenedManually = false;
      });
      await _refreshOnboardingState();
    } finally {
      if (mounted) {
        setState(() => _onboardingBusy = false);
      }
    }
  }

  Future<void> _pauseOnboarding() async {
    final settings = _onboardingSettings;
    if (settings != null) {
      await _saveOnboardingSettings(
        settings.copyWith(onboardingLastSeenAt: DateTime.now().toUtc()),
      );
    }
    if (!mounted) {
      return;
    }
    setState(() {
      _onboardingVisible = false;
      _onboardingDismissed = true;
      _onboardingOpenedManually = false;
      _onboardingDeferPromptVisible = false;
    });
  }

  Future<void> _openSettingsFromOnboarding() async {
    await _pauseOnboarding();
    if (!mounted) {
      return;
    }
    context.push('/settings');
  }

  void _startWelcomeGuide() {
    setState(() {
      _welcomeGuideVisible = false;
      _onboardingDismissed = false;
      _onboardingOpenedManually = true;
    });
    if (PlatformCapabilities.isAndroid &&
        PlatformCapabilities.overlaySupported) {
      setState(() => _onboardingVisible = true);
      _refreshOnboardingState();
    } else {
      _selectTab(_homeTabIndex);
    }
  }

  void _showOnboardingDeferPrompt() {
    setState(() => _onboardingDeferPromptVisible = true);
  }

  Future<void> _confirmDeferOnboardingToSettings() async {
    await _pauseOnboarding();
    if (!mounted) {
      return;
    }
    setState(() {
      _onboardingDeferPromptVisible = false;
    });
    context.push('/settings');
  }

  void _openHomeSource(HomeFeedSourceType sourceType) {
    final target = switch (sourceType) {
      HomeFeedSourceType.voice => _voiceTabIndex,
      HomeFeedSourceType.clipboard => _clipboardTabIndex,
      HomeFeedSourceType.snippet => _snippetTabIndex,
      HomeFeedSourceType.dictionary => _dictionaryTabIndex,
    };
    _selectTab(target);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(onOpenSource: _openHomeSource),
      VoiceScreen(),
      ClipboardScreen(),
      const SnippetsScreen(),
      const CustomActionsScreen(),
      DictionaryScreen(),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final useRail = constraints.maxWidth >= AppBreakpoints.navigationRail;
        final colorScheme = Theme.of(context).colorScheme;
        return PopScope(
          canPop: !_onboardingVisible && _tabHistory.length <= 1,
          onPopInvokedWithResult: (didPop, result) {
            if (didPop) {
              return;
            }
            if (_onboardingVisible) {
              _pauseOnboarding();
            } else {
              _goBackInTabs();
            }
          },
          child: Scaffold(
            appBar: AppBar(
              toolbarHeight: 0,
              bottom: PreferredSize(
                preferredSize: Size.fromHeight(
                  AppNavigationMetrics.dividerThickness,
                ),
                child: Divider(
                  height: AppNavigationMetrics.dividerThickness,
                  thickness: AppNavigationMetrics.dividerThickness,
                  color: colorScheme.outlineVariant,
                ),
              ),
            ),
            body: DecoratedBox(
              decoration: BoxDecoration(
                gradient: AppGradients.shell(colorScheme.brightness),
              ),
              child: Row(
                children: [
                  if (useRail)
                    DecoratedBox(
                      decoration: BoxDecoration(
                        border: Border(
                          right: BorderSide(color: colorScheme.outlineVariant),
                        ),
                      ),
                      child: NavigationRail(
                        extended:
                            constraints.maxWidth >=
                            AppBreakpoints.navigationRailExtended,
                        selectedIndex: _index,
                        onDestinationSelected: _selectTab,
                        destinations: const [
                          NavigationRailDestination(
                            icon: Icon(Icons.home_outlined),
                            label: Text('Accueil'),
                          ),
                          NavigationRailDestination(
                            icon: Icon(Icons.keyboard_voice_outlined),
                            label: Text('Voix'),
                          ),
                          NavigationRailDestination(
                            icon: Icon(Icons.content_paste_outlined),
                            label: Text('Papiers'),
                          ),
                          NavigationRailDestination(
                            icon: Icon(Icons.text_snippet_outlined),
                            label: Text('Snippets'),
                          ),
                          NavigationRailDestination(
                            icon: Icon(Icons.smart_button_outlined),
                            label: Text('Actions'),
                          ),
                          NavigationRailDestination(
                            icon: Icon(Icons.auto_fix_high_outlined),
                            label: Text('Dico'),
                          ),
                        ],
                      ),
                    ),
                  Expanded(
                    child: Column(
                      children: [
                        Expanded(
                          child: Stack(
                            children: [
                              Positioned.fill(child: pages[_index]),
                              if (_welcomeGuideVisible)
                                _WelcomeGuideOverlay(
                                  onClose: () => setState(
                                    () => _welcomeGuideVisible = false,
                                  ),
                                  onStartGuide: _startWelcomeGuide,
                                ),
                              if (_onboardingVisible)
                                _OnboardingOverlay(
                                  readiness: _onboardingReadiness,
                                  isBusy: _onboardingBusy,
                                  message: _onboardingMessage,
                                  showDeferPrompt:
                                      _onboardingDeferPromptVisible,
                                  onClose: _pauseOnboarding,
                                  onDefer: _showOnboardingDeferPrompt,
                                  onConfirmDefer:
                                      _confirmDeferOnboardingToSettings,
                                  onOpenSettings: _openSettingsFromOnboarding,
                                  onPrimaryAction:
                                      _openCurrentStepPrimaryAction,
                                  onSecondaryAction:
                                      _onboardingReadiness
                                              ?.activeStep
                                              ?.definition
                                              .id ==
                                          OnboardingStepId.keyboardIme
                                      ? _openCurrentStepSecondaryAction
                                      : null,
                                  onSkip: _skipCurrentStep,
                                  onRefresh: _refreshOnboardingState,
                                  onComplete: _completeOnboarding,
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            bottomNavigationBar: useRail || _onboardingVisible
                ? null
                : Padding(
                    padding: const EdgeInsets.only(
                      top: AppSpacing.x2,
                      bottom: AppSpacing.x2,
                    ),
                    child: NavigationBar(
                      selectedIndex: _index,
                      onDestinationSelected: _selectTab,
                      destinations: _bottomNavigationDestinations(),
                    ),
                  ),
          ),
        );
      },
    );
  }

  List<NavigationDestination> _bottomNavigationDestinations() {
    return [
      _bottomNavigationDestination(
        index: _homeTabIndex,
        icon: Icons.home_outlined,
        selectedIcon: Icons.home,
        label: 'Accueil',
        motion: _BottomNavIconMotion.lift,
      ),
      _bottomNavigationDestination(
        index: _voiceTabIndex,
        icon: Icons.keyboard_voice_outlined,
        selectedIcon: Icons.keyboard_voice,
        label: 'Voix',
        motion: _BottomNavIconMotion.pulse,
      ),
      _bottomNavigationDestination(
        index: _clipboardTabIndex,
        icon: Icons.content_paste_outlined,
        selectedIcon: Icons.content_paste,
        label: 'Papiers',
        motion: _BottomNavIconMotion.stack,
      ),
      _bottomNavigationDestination(
        index: _snippetTabIndex,
        icon: Icons.text_snippet_outlined,
        selectedIcon: Icons.text_snippet,
        label: 'Snippets',
        motion: _BottomNavIconMotion.nudge,
      ),
      _bottomNavigationDestination(
        index: _actionsTabIndex,
        icon: Icons.smart_button_outlined,
        selectedIcon: Icons.smart_button,
        label: 'Actions',
        motion: _BottomNavIconMotion.tap,
      ),
      _bottomNavigationDestination(
        index: _dictionaryTabIndex,
        icon: Icons.auto_fix_high_outlined,
        selectedIcon: Icons.auto_fix_high,
        label: 'Dico',
        motion: _BottomNavIconMotion.spark,
      ),
    ];
  }

  NavigationDestination _bottomNavigationDestination({
    required int index,
    required IconData icon,
    required IconData selectedIcon,
    required String label,
    required _BottomNavIconMotion motion,
  }) {
    final selected = _index == index;
    final animatedIcon = _AnimatedBottomNavIcon(
      icon: icon,
      selectedIcon: selectedIcon,
      selected: selected,
      pulse: selected ? _navigationPulse : 0,
      motion: motion,
    );
    return NavigationDestination(
      icon: animatedIcon,
      selectedIcon: animatedIcon,
      label: label,
    );
  }
}

enum _BottomNavIconMotion { lift, pulse, stack, nudge, tap, spark }

class _AnimatedBottomNavIcon extends StatelessWidget {
  const _AnimatedBottomNavIcon({
    required this.icon,
    required this.selectedIcon,
    required this.selected,
    required this.pulse,
    required this.motion,
  });

  final IconData icon;
  final IconData selectedIcon;
  final bool selected;
  final int pulse;
  final _BottomNavIconMotion motion;

  static const _size = AppNavigationMetrics.bottomNavIconBoxSize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final iconColor = selected
        ? colorScheme.primary
        : colorScheme.onSurfaceVariant;
    return TweenAnimationBuilder<double>(
      key: ValueKey('$selected-$pulse-$motion'),
      tween: Tween(begin: selected ? 0 : 1, end: 1),
      duration: selected
          ? const Duration(milliseconds: 280)
          : const Duration(milliseconds: 160),
      curve: Curves.easeOutCubic,
      builder: (context, progress, child) {
        final burst = selected ? math.sin(progress * math.pi) : 0.0;
        final rotation = 0.0;
        final offset = _offsetFor(burst);
        final scale = selected ? 1 + burst * _scaleAmplitude : 1.0;
        return SizedBox.square(
          dimension: _size,
          child: Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              if (selected)
                Opacity(
                  opacity: 0.10 + burst * 0.10,
                  child: Transform.scale(
                    scale: 0.72 + burst * 0.14,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: iconColor,
                      ),
                      child: const SizedBox.square(dimension: _size),
                    ),
                  ),
                ),
              if (selected && motion == _BottomNavIconMotion.spark)
                Positioned(
                  top: AppNavigationMetrics.bottomNavSparkBadgeTop - burst * 2,
                  right: AppNavigationMetrics.bottomNavSparkBadgeRight,
                  child: Opacity(
                    opacity: 0.40 + burst * 0.45,
                    child: Icon(
                      Icons.star,
                      color: iconColor,
                      size: 8 + burst * 2,
                    ),
                  ),
                ),
              if (selected && motion == _BottomNavIconMotion.pulse)
                Opacity(
                  opacity: 0.18 + burst * 0.18,
                  child: Transform.scale(
                    scale: 0.82 + burst * 0.28,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: iconColor,
                          width: AppNavigationMetrics.bottomNavSparkBorderWidth,
                        ),
                      ),
                      child: const SizedBox.square(dimension: _size),
                    ),
                  ),
                ),
              Transform.translate(
                offset: offset,
                child: Transform.rotate(
                  angle: rotation,
                  child: Transform.scale(
                    scale: scale,
                    child: Icon(
                      selected ? selectedIcon : icon,
                      color: iconColor,
                      size: selected
                          ? AppNavigationMetrics.bottomSelectedIconSize
                          : AppNavigationMetrics.bottomIconSize,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  double get _scaleAmplitude {
    return switch (motion) {
      _BottomNavIconMotion.pulse => 0.09,
      _ => 0.07,
    };
  }

  Offset _offsetFor(double burst) {
    return switch (motion) {
      _BottomNavIconMotion.lift => Offset(0, -2.5 * burst),
      _BottomNavIconMotion.stack => Offset(1.2 * burst, -1.2 * burst),
      _BottomNavIconMotion.nudge => Offset(0, -1.5 * burst),
      _BottomNavIconMotion.spark => Offset(-0.6 * burst, -1.8 * burst),
      _ => Offset.zero,
    };
  }
}

class _WelcomeGuideOverlay extends StatelessWidget {
  const _WelcomeGuideOverlay({
    required this.onClose,
    required this.onStartGuide,
  });

  final VoidCallback onClose;
  final VoidCallback onStartGuide;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Positioned.fill(
      child: BlockSemantics(
        child: Semantics(
          scopesRoute: true,
          namesRoute: true,
          explicitChildNodes: true,
          label: 'Bienvenue dans CMDglows',
          child: ColoredBox(
            color: AppColors.overlayScrim,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.x2),
                child: Align(
                  alignment: Alignment.topCenter,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 560),
                    child: AppModalCard(
                      padding: AppInsets.onboarding,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.waving_hand_outlined,
                                color: colorScheme.primary,
                              ),
                              AppGaps.horizontalX2,
                              Expanded(
                                child: Text(
                                  'Bienvenue dans CMDglows',
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                              ),
                              IconButton(
                                tooltip: 'Fermer',
                                onPressed: onClose,
                                icon: const Icon(Icons.close_outlined),
                              ),
                            ],
                          ),
                          AppGaps.x2,
                          Text(
                            'Ton compte est prêt. Commence par configurer les accès utiles, puis ajoute tes premiers snippets, mots de dictionnaire et captures presse-papiers.',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          AppGaps.x3,
                          const _WelcomeGuideItem(
                            icon: Icons.keyboard_voice_outlined,
                            title: 'Voix',
                            message:
                                'Dicte un texte, relis le brouillon, puis envoie-le dans ton champ actif.',
                          ),
                          AppGaps.x2,
                          const _WelcomeGuideItem(
                            icon: Icons.content_paste_outlined,
                            title: 'Presse-papiers',
                            message:
                                'Retrouve les éléments capturés et épingle ceux que tu réutilises souvent.',
                          ),
                          AppGaps.x2,
                          const _WelcomeGuideItem(
                            icon: Icons.text_snippet_outlined,
                            title: 'Snippets',
                            message:
                                'Crée des raccourcis pour tes réponses, signatures et phrases fréquentes.',
                          ),
                          AppGaps.x3,
                          Wrap(
                            spacing: AppSpacing.x2,
                            runSpacing: AppSpacing.x2,
                            children: [
                              FilledButton.icon(
                                onPressed: onStartGuide,
                                icon: const Icon(Icons.flag_outlined),
                                label: const Text('Ouvrir le guide'),
                              ),
                              OutlinedButton.icon(
                                onPressed: onClose,
                                icon: const Icon(Icons.check_outlined),
                                label: const Text('Commencer'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _WelcomeGuideItem extends StatelessWidget {
  const _WelcomeGuideItem({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: colorScheme.primary),
        AppGaps.horizontalX2,
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: Theme.of(context).textTheme.titleSmall),
              AppGaps.x1,
              Text(message),
            ],
          ),
        ),
      ],
    );
  }
}

class _OnboardingOverlay extends StatelessWidget {
  const _OnboardingOverlay({
    required this.readiness,
    required this.isBusy,
    required this.message,
    required this.showDeferPrompt,
    required this.onClose,
    required this.onDefer,
    required this.onConfirmDefer,
    required this.onOpenSettings,
    required this.onPrimaryAction,
    required this.onSecondaryAction,
    required this.onSkip,
    required this.onRefresh,
    required this.onComplete,
  });

  final OnboardingReadiness? readiness;
  final bool isBusy;
  final String? message;
  final bool showDeferPrompt;
  final Future<void> Function() onClose;
  final VoidCallback onDefer;
  final Future<void> Function() onConfirmDefer;
  final VoidCallback onOpenSettings;
  final Future<void> Function(OnboardingStepId stepId) onPrimaryAction;
  final Future<void> Function(OnboardingStepId stepId)? onSecondaryAction;
  final Future<void> Function(OnboardingStepId stepId) onSkip;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onComplete;

  @override
  Widget build(BuildContext context) {
    final activeReadiness = readiness;
    final Widget onboardingContent;
    if (activeReadiness == null) {
      onboardingContent = Text(
        'Guide indisponible sur ${PlatformCapabilities.currentPlatformLabel}. ${PlatformCapabilities.overlayUnavailableReason}',
      );
    } else if (!activeReadiness.platformSupported) {
      onboardingContent = Text(
        'Guide indisponible sur ${PlatformCapabilities.currentPlatformLabel}. ${PlatformCapabilities.overlayUnavailableReason}',
      );
    } else if (showDeferPrompt) {
      onboardingContent = _OnboardingDeferredContent(
        isBusy: isBusy,
        onConfirm: onConfirmDefer,
      );
    } else if (activeReadiness.shouldShowCompletion) {
      onboardingContent = _OnboardingCompletionContent(
        readiness: activeReadiness,
        isBusy: isBusy,
        onOpenSettings: onOpenSettings,
        onComplete: onComplete,
      );
    } else {
      onboardingContent = _OnboardingOverviewContent(
        readiness: activeReadiness,
        isBusy: isBusy,
        onPrimaryAction: onPrimaryAction,
        onDefer: onDefer,
        onSecondaryAction: onSecondaryAction,
        onSkip: onSkip,
        onRefresh: onRefresh,
      );
    }
    return Positioned.fill(
      child: BlockSemantics(
        child: Semantics(
          scopesRoute: true,
          namesRoute: true,
          explicitChildNodes: true,
          label: 'Guide de configuration',
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => onClose(),
            child: ColoredBox(
              color: AppColors.overlayScrim,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.x2,
                    vertical: AppSpacing.x2,
                  ),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final overlayWidth =
                          ((constraints.maxWidth - (AppSpacing.x4 * 2)).clamp(
                            0.0,
                            constraints.maxWidth,
                          )).toDouble();
                      final cardWidth = showDeferPrompt && overlayWidth > 560
                          ? 560.0
                          : overlayWidth;
                      return Align(
                        alignment: Alignment.topCenter,
                        child: SizedBox(
                          key: const Key('onboarding-overlay-card-frame'),
                          width: cardWidth,
                          child: GestureDetector(
                            onTap: () {},
                            child: AppModalCard(
                              padding: AppInsets.onboarding,
                              child: SingleChildScrollView(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.flag_outlined,
                                          color: Theme.of(
                                            context,
                                          ).colorScheme.primary,
                                        ),
                                        AppGaps.horizontalX2,
                                        Expanded(
                                          child: Text(
                                            'Configuration CMDglows',
                                            style: Theme.of(
                                              context,
                                            ).textTheme.titleSmall,
                                          ),
                                        ),
                                        IconButton(
                                          tooltip:
                                              'Fermer (reprendre plus tard)',
                                          onPressed: () => onClose(),
                                          icon: const Icon(
                                            Icons.close_outlined,
                                          ),
                                        ),
                                      ],
                                    ),
                                    AppGaps.x2,
                                    onboardingContent,
                                    if (message != null) ...[
                                      AppGaps.x2,
                                      AppBannerCard(
                                        icon: Icons.error_outline,
                                        title: 'Action impossible',
                                        message: message!,
                                        accentColor: Theme.of(
                                          context,
                                        ).colorScheme.error,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _OnboardingOverviewContent extends StatefulWidget {
  const _OnboardingOverviewContent({
    required this.readiness,
    required this.isBusy,
    required this.onDefer,
    required this.onPrimaryAction,
    required this.onSecondaryAction,
    required this.onSkip,
    required this.onRefresh,
  });

  final OnboardingReadiness readiness;
  final bool isBusy;
  final VoidCallback onDefer;
  final Future<void> Function(OnboardingStepId stepId) onPrimaryAction;
  final Future<void> Function(OnboardingStepId stepId)? onSecondaryAction;
  final Future<void> Function(OnboardingStepId stepId) onSkip;
  final Future<void> Function() onRefresh;

  @override
  State<_OnboardingOverviewContent> createState() =>
      _OnboardingOverviewContentState();
}

class _OnboardingOverviewContentState
    extends State<_OnboardingOverviewContent> {
  var _pageIndex = 0;

  static const _pages = <_OnboardingUseCasePage>[
    _OnboardingUseCasePage(
      stepId: OnboardingStepId.microphoneForDictation,
      icon: Icons.keyboard_voice_outlined,
      title: 'Micro et voix',
      subtitle: 'Dictée vocale et injection assistée.',
    ),
    _OnboardingUseCasePage(
      stepId: OnboardingStepId.keyboardIme,
      icon: Icons.keyboard_outlined,
      title: 'Clavier',
      subtitle: 'Clavier Android CMDglows et options liées.',
    ),
    _OnboardingUseCasePage(
      stepId: OnboardingStepId.mediaSessionAccess,
      icon: Icons.notifications_active_outlined,
      title: 'Accès notifications et média',
      subtitle: 'Titre en cours, app audio et contrôles depuis le clavier.',
    ),
    _OnboardingUseCasePage(
      stepId: OnboardingStepId.brightnessSystemSettings,
      icon: Icons.brightness_6_outlined,
      title: 'Luminosité système',
      subtitle: 'Contrôle Bri- et Bri+ depuis le clavier.',
    ),
    _OnboardingUseCasePage(
      stepId: OnboardingStepId.keyboardClipboard,
      icon: Icons.content_paste_outlined,
      title: 'Presse-papiers',
      subtitle: 'Historique et synchronisation du presse-papiers clavier.',
    ),
    _OnboardingUseCasePage(
      stepId: OnboardingStepId.overlay,
      icon: Icons.open_in_new_outlined,
      title: 'Overlay flottant',
      subtitle: 'Bulle flottante hors parcours principal.',
    ),
    _OnboardingUseCasePage(
      stepId: OnboardingStepId.accessibility,
      icon: Icons.accessibility_new_outlined,
      title: 'Service Accessibilité',
      subtitle: 'Injection directe et assistance dans les champs texte.',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _syncPageIndexWithActiveStep();
  }

  @override
  void didUpdateWidget(covariant _OnboardingOverviewContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.readiness.currentStep != widget.readiness.currentStep ||
        oldWidget.readiness.steps != widget.readiness.steps) {
      _syncPageIndexWithActiveStep();
    }
  }

  void _syncPageIndexWithActiveStep() {
    final activeStepId = widget.readiness.activeStep?.definition.id;
    if (activeStepId == null) {
      return;
    }
    final pageIndex = _pages.indexWhere((page) => page.stepId == activeStepId);
    if (pageIndex < 0 || pageIndex == _pageIndex) {
      return;
    }
    _pageIndex = pageIndex;
  }

  @override
  Widget build(BuildContext context) {
    final page = _pages[_pageIndex];
    final showCompletionAction = widget.readiness.allStepsCompleted;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Choisis les usages que tu veux activer',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        AppGaps.x1,
        Text(
          'Chaque module est indépendant. Active seulement ce dont tu as besoin maintenant.',
          style: Theme.of(context).textTheme.labelMedium,
        ),
        AppGaps.x2,
        _OnboardingProgressDots(
          pages: _pages,
          readiness: widget.readiness,
          index: _pageIndex,
          isBusy: widget.isBusy,
          onSelect: (index) => setState(() => _pageIndex = index),
        ),
        AppGaps.x2,
        _OnboardingUseCaseCard(
          icon: page.icon,
          title: page.title,
          subtitle: page.subtitle,
          steps: _stepsFor(page.stepId),
          isBusy: widget.isBusy,
          onPrimaryAction: widget.onPrimaryAction,
          onSecondaryAction: widget.onSecondaryAction,
          onSkip: widget.onSkip,
        ),
        AppGaps.x2,
        Wrap(
          spacing: AppSpacing.x2,
          runSpacing: AppSpacing.x2,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            OutlinedButton.icon(
              onPressed: widget.isBusy || _pageIndex == 0
                  ? null
                  : () => setState(() => _pageIndex -= 1),
              icon: const Icon(Icons.arrow_back_outlined),
              label: const Text('Précédent'),
            ),
            FilledButton.tonalIcon(
              onPressed: widget.isBusy || _pageIndex == _pages.length - 1
                  ? null
                  : () => setState(() => _pageIndex += 1),
              icon: const Icon(Icons.arrow_forward_outlined),
              label: const Text('Suivant'),
            ),
          ],
        ),
        AppGaps.x2,
        Align(
          alignment: Alignment.centerRight,
          child: Wrap(
            alignment: WrapAlignment.end,
            spacing: AppSpacing.x2,
            runSpacing: AppSpacing.x2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (widget.isBusy)
                SizedBox(
                  width: AppNavigationMetrics.utilityIconBoxSize,
                  height: AppNavigationMetrics.utilityIconBoxSize,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                OutlinedButton.icon(
                  onPressed: () => widget.onRefresh(),
                  icon: const Icon(Icons.refresh_outlined),
                  label: const Text('Re-vérifier les accès'),
                ),
              if (!showCompletionAction)
                OutlinedButton.icon(
                  onPressed: widget.isBusy ? null : widget.onDefer,
                  icon: const Icon(Icons.schedule_outlined),
                  label: const Text('Plus tard'),
                )
              else
                Text(
                  'Bravo ! Toutes les étapes sont complétées.',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
            ],
          ),
        ),
      ],
    );
  }

  List<OnboardingStepProgress> _stepsFor(OnboardingStepId stepId) {
    return widget.readiness.steps
        .where((step) => step.definition.id == stepId)
        .toList(growable: false);
  }
}

class _OnboardingUseCasePage {
  const _OnboardingUseCasePage({
    required this.stepId,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final OnboardingStepId stepId;
  final IconData icon;
  final String title;
  final String subtitle;
}

class _OnboardingProgressDots extends StatelessWidget {
  const _OnboardingProgressDots({
    required this.pages,
    required this.readiness,
    required this.index,
    required this.isBusy,
    required this.onSelect,
  });

  final List<_OnboardingUseCasePage> pages;
  final OnboardingReadiness readiness;
  final int index;
  final bool isBusy;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        for (var i = 0; i < pages.length; i++) ...[
          Semantics(
            selected: i == index,
            child: IconButton(
              key: ValueKey('onboarding-progress-dot-${pages[i].stepId.name}'),
              tooltip: _dotTooltip(pages[i]),
              onPressed: isBusy ? null : () => onSelect(i),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints.tightFor(
                width: AppNavigationMetrics.onboardingDotSize,
                height: AppNavigationMetrics.onboardingDotSize,
              ),
              style: IconButton.styleFrom(
                fixedSize: const Size.square(
                  AppNavigationMetrics.onboardingDotSize,
                ),
                minimumSize: const Size.square(
                  AppNavigationMetrics.onboardingDotSize,
                ),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                backgroundColor: _dotColor(
                  colorScheme: colorScheme,
                  stepId: pages[i].stepId,
                  isCurrent: i == index,
                ),
                disabledBackgroundColor: _dotColor(
                  colorScheme: colorScheme,
                  stepId: pages[i].stepId,
                  isCurrent: i == index,
                ),
                foregroundColor: _iconColor(
                  colorScheme: colorScheme,
                  stepId: pages[i].stepId,
                  isCurrent: i == index,
                ),
                disabledForegroundColor: _iconColor(
                  colorScheme: colorScheme,
                  stepId: pages[i].stepId,
                  isCurrent: i == index,
                ),
                side: BorderSide(
                  color: _dotBorderColor(
                    colorScheme: colorScheme,
                    stepId: pages[i].stepId,
                    isCurrent: i == index,
                  ),
                ),
                shape: const CircleBorder(),
              ),
              icon: Icon(
                pages[i].icon,
                size: AppNavigationMetrics.onboardingDotIconSize,
              ),
            ),
          ),
          if (i != pages.length - 1) const SizedBox(width: AppSpacing.x1),
        ],
      ],
    );
  }

  String _dotTooltip(_OnboardingUseCasePage page) {
    return 'Ouvrir ${page.title} - ${_dotStatusLabel(page.stepId)}';
  }

  String _dotStatusLabel(OnboardingStepId stepId) {
    final step = _stepFor(stepId);
    if (step != null) {
      if (step.satisfied) {
        return 'terminé';
      }
      if (step.skipped) {
        return 'ignoré';
      }
      return 'à terminer';
    }
    return 'indisponible';
  }

  Color _dotColor({
    required ColorScheme colorScheme,
    required OnboardingStepId stepId,
    required bool isCurrent,
  }) {
    final step = _stepFor(stepId);
    if (step?.skipped ?? false) {
      return AppColors.danger;
    }
    if (step?.satisfied ?? false) {
      return AppColors.success;
    }
    if (isCurrent) {
      return AppColors.warning;
    }
    return colorScheme.outlineVariant;
  }

  Color _iconColor({
    required ColorScheme colorScheme,
    required OnboardingStepId stepId,
    required bool isCurrent,
  }) {
    final step = _stepFor(stepId);
    if (step?.skipped ?? false) {
      return AppColors.white;
    }
    if (isCurrent) {
      return AppColors.white;
    }
    if (step?.satisfied ?? false) {
      return AppColors.white;
    }
    return colorScheme.onSurfaceVariant;
  }

  Color _dotBorderColor({
    required ColorScheme colorScheme,
    required OnboardingStepId stepId,
    required bool isCurrent,
  }) {
    final step = _stepFor(stepId);
    if (step?.skipped ?? false) {
      return AppColors.danger;
    }
    if (step?.satisfied ?? false) {
      return AppColors.success;
    }
    if (isCurrent) {
      return AppColors.warning;
    }
    return colorScheme.outlineVariant;
  }

  OnboardingStepProgress? _stepFor(OnboardingStepId stepId) {
    for (final step in readiness.steps) {
      if (step.definition.id == stepId) {
        return step;
      }
    }
    return null;
  }
}

class _OnboardingUseCaseCard extends StatelessWidget {
  const _OnboardingUseCaseCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.steps,
    required this.isBusy,
    required this.onPrimaryAction,
    required this.onSecondaryAction,
    required this.onSkip,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final List<OnboardingStepProgress> steps;
  final bool isBusy;
  final Future<void> Function(OnboardingStepId stepId) onPrimaryAction;
  final Future<void> Function(OnboardingStepId stepId)? onSecondaryAction;
  final Future<void> Function(OnboardingStepId stepId) onSkip;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppSectionCard(
      title: title,
      subtitle: subtitle,
      leading: Icon(icon),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final step in steps) ...[
            _OnboardingPermissionRow(
              step: step,
              isBusy: isBusy,
              onPrimaryAction: onPrimaryAction,
              onSecondaryAction: onSecondaryAction,
              onSkip: onSkip,
            ),
            if (step != steps.last)
              Divider(color: theme.colorScheme.outlineVariant),
          ],
        ],
      ),
    );
  }
}

class _OnboardingPermissionRow extends StatelessWidget {
  const _OnboardingPermissionRow({
    required this.step,
    required this.isBusy,
    required this.onPrimaryAction,
    required this.onSecondaryAction,
    required this.onSkip,
  });

  final OnboardingStepProgress step;
  final bool isBusy;
  final Future<void> Function(OnboardingStepId stepId) onPrimaryAction;
  final Future<void> Function(OnboardingStepId stepId)? onSecondaryAction;
  final Future<void> Function(OnboardingStepId stepId) onSkip;

  @override
  Widget build(BuildContext context) {
    final definition = step.definition;
    final colorScheme = Theme.of(context).colorScheme;
    final color = step.satisfied
        ? AppColors.success
        : step.skipped
        ? colorScheme.outline
        : AppColors.warning;
    final isResolved = step.satisfied || step.skipped;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.x1),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(definition.description),
          AppGaps.x1,
          Text(definition.why, style: Theme.of(context).textTheme.bodySmall),
          if (step.blockerReason != null && !step.skipped) ...[
            AppGaps.x1,
            Text(
              step.blockerReason!,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.error,
              ),
            ),
          ],
          AppGaps.x2,
          Wrap(
            spacing: AppSpacing.x2,
            runSpacing: AppSpacing.x2,
            alignment: WrapAlignment.center,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              if (!step.satisfied)
                FilledButton.icon(
                  onPressed: isBusy
                      ? null
                      : () => onPrimaryAction(definition.id),
                  icon: const Icon(Icons.play_arrow_outlined),
                  label: Text(definition.openActionLabel),
                )
              else
                FilledButton.tonalIcon(
                  onPressed: isBusy
                      ? null
                      : () => onPrimaryAction(definition.id),
                  icon: const Icon(Icons.tune_outlined),
                  label: const Text('Modifier'),
                ),
              if (definition.secondaryActionLabel != null)
                OutlinedButton.icon(
                  onPressed: isBusy
                      ? null
                      : () => onSecondaryAction?.call(definition.id),
                  icon: const Icon(Icons.keyboard_alt_outlined),
                  label: Text(definition.secondaryActionLabel!),
                ),
              if (isResolved)
                _OnboardingResolvedInfo(
                  icon: step.satisfied
                      ? Icons.check_circle_outline
                      : Icons.do_not_disturb_on_outlined,
                  label: step.satisfied ? 'Activé' : 'Ignoré',
                  color: color,
                )
              else
                TextButton.icon(
                  onPressed: isBusy ? null : () => onSkip(definition.id),
                  icon: const Icon(Icons.schedule_outlined),
                  label: const Text('Plus tard'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OnboardingResolvedInfo extends StatelessWidget {
  const _OnboardingResolvedInfo({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppRadii.md),
        border: Border.all(color: color.withValues(alpha: 0.45)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x3,
          vertical: AppSpacing.x2,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: AppIconMetrics.sm),
            AppGaps.horizontalX2,
            Text(
              label,
              style: Theme.of(
                context,
              ).textTheme.labelLarge?.copyWith(color: colorScheme.onSurface),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingCompletionContent extends StatelessWidget {
  const _OnboardingCompletionContent({
    required this.readiness,
    required this.isBusy,
    required this.onOpenSettings,
    required this.onComplete,
  });

  final OnboardingReadiness readiness;
  final bool isBusy;
  final VoidCallback onOpenSettings;
  final Future<void> Function() onComplete;

  @override
  Widget build(BuildContext context) {
    final completed = readiness.steps.where((step) => step.completed).length;
    final allActive = readiness.steps.every((step) => step.satisfied);
    final stepsById = {
      for (final step in readiness.steps) step.definition.id: step,
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppBannerCard(
          icon: Icons.check_circle_outline,
          title: allActive ? 'CMDglows est prêt' : 'Configuration terminée',
          message: allActive
              ? 'Tu vas pouvoir profiter au maximum de CMDglows.'
              : 'Les modules que tu as choisis sont prêts. Tu peux terminer maintenant ou revoir les réglages.',
          accentColor: AppColors.success,
        ),
        AppGaps.x2,
        ...[
          _OnboardingPathHint(
            icon: Icons.keyboard_voice_outlined,
            title: 'Dictée depuis le clavier',
            text:
                'Utilise le micro pour transformer ta voix en texte directement là où tu écris.',
            permissions: [
              stepsById[OnboardingStepId.microphoneForDictation],
              stepsById[OnboardingStepId.accessibility],
            ],
          ),
          _OnboardingPathHint(
            icon: Icons.content_paste_outlined,
            title: 'Retrouver ton presse-papiers',
            text:
                'Garde tes copies récentes à portée de main pour les réutiliser depuis le clavier.',
            permissions: [stepsById[OnboardingStepId.keyboardClipboard]],
          ),
          _OnboardingPathHint(
            icon: Icons.tune_outlined,
            title: 'Contrôler ton téléphone plus vite',
            text:
                'Accède aux médias, à la luminosité et aux actions rapides sans quitter ton flux.',
            permissions: [
              stepsById[OnboardingStepId.mediaSessionAccess],
              stepsById[OnboardingStepId.brightnessSystemSettings],
              stepsById[OnboardingStepId.overlay],
            ],
          ),
          AppGaps.x2,
        ],
        Wrap(
          spacing: AppSpacing.x2,
          runSpacing: AppSpacing.x2,
          children: [
            AppTag(label: 'Modules $completed/${readiness.steps.length}'),
            const AppTag(label: 'Tout est optionnel'),
          ],
        ),
        AppGaps.x2,
        AppGaps.x2,
        Wrap(
          spacing: AppSpacing.x2,
          runSpacing: AppSpacing.x2,
          children: [
            if (isBusy)
              SizedBox(
                width: AppNavigationMetrics.utilityIconBoxSize,
                height: AppNavigationMetrics.utilityIconBoxSize,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else
              FilledButton.icon(
                onPressed: () => onComplete(),
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Terminer'),
              ),
            if (!isBusy)
              OutlinedButton.icon(
                onPressed: onOpenSettings,
                icon: const Icon(Icons.settings_outlined),
                label: const Text('Paramètres'),
              ),
          ],
        ),
      ],
    );
  }
}

class _OnboardingDeferredContent extends StatelessWidget {
  const _OnboardingDeferredContent({
    required this.isBusy,
    required this.onConfirm,
  });

  final bool isBusy;
  final Future<void> Function() onConfirm;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppBannerCard(
          icon: Icons.info_outline,
          title: 'Onboarding mis en pause',
          message:
              'Tu peux reprendre la configuration quand tu veux à partir des paramètres.',
          accentColor: Theme.of(context).colorScheme.primary,
        ),
        AppGaps.x3,
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton(
            onPressed: isBusy ? null : () => onConfirm(),
            child: const Text('OK'),
          ),
        ),
      ],
    );
  }
}

class _OnboardingPathHint extends StatelessWidget {
  const _OnboardingPathHint({
    required this.icon,
    required this.title,
    required this.text,
    this.permissions = const [],
  });

  final IconData icon;
  final String title;
  final String text;
  final List<OnboardingStepProgress?> permissions;

  @override
  Widget build(BuildContext context) {
    final resolvedPermissions = permissions.nonNulls.toList(growable: false);
    return Padding(
      padding: AppInsets.stack,
      child: Card(
        child: Padding(
          padding: AppInsets.compactCard,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, color: Theme.of(context).colorScheme.primary),
                  AppGaps.horizontalX3,
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        AppGaps.x1,
                        Text(
                          text,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (resolvedPermissions.isNotEmpty) ...[
                AppGaps.x2,
                Align(
                  alignment: Alignment.centerRight,
                  child: Wrap(
                    spacing: AppSpacing.x2,
                    runSpacing: AppSpacing.x2,
                    alignment: WrapAlignment.end,
                    children: [
                      for (final permission in resolvedPermissions)
                        _OnboardingPermissionBadge(step: permission),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _OnboardingPermissionBadge extends StatelessWidget {
  const _OnboardingPermissionBadge({required this.step});

  final OnboardingStepProgress step;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final color = step.satisfied
        ? AppColors.success
        : step.skipped
        ? colorScheme.outline
        : AppColors.warning;
    final icon = step.satisfied
        ? Icons.check_circle_outline
        : step.skipped
        ? Icons.do_not_disturb_on_outlined
        : Icons.radio_button_unchecked;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.x2 + AppSpacing.x1 / 2,
          vertical: AppSpacing.x1,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: AppIconMetrics.sm),
            AppGaps.horizontalX2,
            Text(
              step.definition.title,
              style: Theme.of(
                context,
              ).textTheme.labelSmall?.copyWith(color: colorScheme.onSurface),
            ),
          ],
        ),
      ),
    );
  }
}
