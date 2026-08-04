import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../app/commandglows_app.dart';
import '../../../core/bootstrap/app_build_info.dart';
import '../../../core/bootstrap/firebase_bootstrap.dart';
import '../../../core/bootstrap/sentry_bootstrap.dart';
import '../../../core/diagnostics/app_diagnostics.dart';
import '../../../core/diagnostics/sensitive_redactor.dart';
import '../../../core/sync/cloud_sync_overview.dart';
import '../../../core/sync/sync_status.dart';
import '../../../core/platform/android_keyboard_bridge.dart';
import '../../../core/platform/android_overlay_bridge.dart';
import '../../../core/platform/platform_capabilities.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_components.dart';
import '../../auth/application/auth_session_provider.dart';
import '../../auth/domain/auth_session_store.dart';
import '../../auth/domain/product_entitlement.dart';
import '../../auth/presentation/sign_in_screen.dart';
import '../../clipboard/application/clipboard_store_provider.dart';
import '../../custom_action_buttons/application/custom_action_bar_preferences.dart';
import '../../dictionary/application/dictionary_store_provider.dart';
import '../../keyboard/domain/keyboard_models.dart';
import '../../keyboard/presentation/keyboard_corner_shortcuts_screen.dart';
import '../../keyboard/presentation/keyboard_navigation_diagnostics_screen.dart';
import '../../keyboard/presentation/keyboard_sync_panel.dart';
import '../../keyboard/presentation/keyboard_theme_studio_screen.dart';
import '../../auth/application/suite_identity_provider.dart';
import '../../snippets/application/snippet_store_provider.dart';
import '../../auth/domain/suite_identity.dart';
import '../domain/onboarding_permission_contract.dart';
import '../domain/settings_store.dart';
import '../../voice/application/transcription_store_provider.dart';
import '../../voice/application/language_pack_catalog_provider.dart';
import '../../voice/domain/language_pack_catalog.dart';
import '../application/cloud_sync_overview_provider.dart';
import '../application/settings_platform_controllers.dart';
import '../application/settings_store_provider.dart';
import '../data/local_settings_store.dart';
import '../data/secure_secret_store.dart';

part 'settings_screen_sections.dart';

final _secretStoreProvider = Provider<SecureSecretStore>(
  (ref) => SecureSecretStore(),
);
final _storageStatusProvider = FutureProvider<SecretStorageStatus>(
  (ref) => ref.watch(_secretStoreProvider).status(),
);

typedef _KeyboardPreferenceChanged =
    Future<void> Function({
      bool? voiceEnabled,
      bool? customActionBarEnabled,
      bool? clipboardSyncDesired,
      bool? clipboardSensitiveFieldHistoryEnabled,
      bool? mediaControlsEnabled,
      int? mediaVolumeStepPercent,
      int? mediaBrightnessStepPercent,
      KeyboardLayoutProfile? layoutProfile,
      bool? cornerModeEnabled,
      bool? debugTouchOverlayEnabled,
      bool? keyVibrationEnabled,
      bool? keySoundEnabled,
      bool? spellingSuggestionsEnabled,
      bool? specialKeyCornersEnabled,
      bool? frenchLanguageEnabled,
      bool? englishLanguageEnabled,
      bool? doubleSpacePeriodEnabled,
      bool? punctuationAutoSpacingEnabled,
      double? keyboardHeightScale,
      double? actionRowHeightScale,
      bool? compactModeEnabled,
      bool? autoCloseModesEnabled,
      KeyboardPrivacyMode? privacyMode,
    });

typedef _OverlayAppearanceChanged =
    Future<void> Function({required double sizeScale, required double opacity});

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({
    super.key,
    this.initialSectionId,
    this.onResumeOnboarding,
    this.highlightOnboardingResume = false,
  });

  final String? initialSectionId;
  final VoidCallback? onResumeOnboarding;
  final bool highlightOnboardingResume;

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

enum _SettingsPageMode {
  hub,
  account,
  voice,
  keyboard,
  overlay,
  keys,
  maintenance,
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  static final _sectionGap = SizedBox(height: AppSectionMetrics.sectionGap);

  late final TextEditingController _openAiController;
  late final TextEditingController _anthropicController;
  late final ScrollController _scrollController;
  final _keyboardController = const SettingsKeyboardController();
  final _overlayController = const SettingsOverlayController();
  bool _loading = true;
  bool _onboardingLoading = true;
  bool _saving = false;
  bool _onboardingTileDismissed = false;
  bool _localSpeechNoticeDismissed = false;
  bool _overlayNoticeDismissed = false;
  DateTime? _localSpeechNoticeSnoozedUntil;
  DateTime? _overlayNoticeSnoozedUntil;
  static const _onboardingOverlayFallback = AndroidOverlayStatus(
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
    serviceState: 'unknown',
  );
  AndroidOverlayStatus? _overlayStatus;
  bool _overlayBusy = false;
  AndroidKeyboardStatus? _keyboardStatus;
  bool _keyboardBusy = false;
  UserSettingsSnapshot? _onboardingSettings;
  String? _message;
  String? _postAuthMessage;
  AppSyncStatus _appearanceSyncStatus = const AppSyncStatus(
    kind: AppSyncStatusKind.idle,
  );
  AppSyncStatus _secretsSyncStatus = const AppSyncStatus(
    kind: AppSyncStatusKind.idle,
  );
  UserSettingsSnapshot? _pendingAppearanceSettings;
  final Map<String, bool> _expandedSections = {
    'account_cloud': true,
    'appearance': true,
    'keyboard': false,
    'voice_packs': false,
    'keys': false,
    'overlay': false,
    'maintenance': false,
  };
  static const _noticeSnoozeDuration = Duration(hours: 24);

  @override
  void initState() {
    super.initState();
    _applyInitialSectionFocus();
    _openAiController = TextEditingController();
    _anthropicController = TextEditingController();
    _scrollController = ScrollController();
    _loadSecrets();
    _loadOverlayState();
    _loadKeyboardState();
    _loadOnboardingSettings();
  }

  void _applyInitialSectionFocus() {
    final sectionId = widget.initialSectionId?.trim();
    if (sectionId == null || sectionId.isEmpty) {
      return;
    }
    if (!_expandedSections.containsKey(sectionId)) {
      return;
    }
    for (final key in _expandedSections.keys) {
      _expandedSections[key] = key == sectionId;
    }
  }

  _SettingsPageMode _pageMode() {
    final sectionId = widget.initialSectionId?.trim();
    return switch (sectionId) {
      'account_cloud' => _SettingsPageMode.account,
      'voice_packs' => _SettingsPageMode.voice,
      'keyboard' => _SettingsPageMode.keyboard,
      'overlay' => _SettingsPageMode.overlay,
      'keys' => _SettingsPageMode.keys,
      'maintenance' => _SettingsPageMode.maintenance,
      _ => _SettingsPageMode.hub,
    };
  }

  @override
  void dispose() {
    _openAiController.dispose();
    _anthropicController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadSecrets() async {
    final store = ref.read(_secretStoreProvider);
    final openAiKey = await store.readOpenAiKey() ?? '';
    final anthropicKey = await store.readAnthropicKey() ?? '';
    if (!mounted) {
      return;
    }
    setState(() {
      _openAiController.text = openAiKey;
      _anthropicController.text = anthropicKey;
      _loading = false;
    });
  }

  Future<void> _loadOnboardingSettings() async {
    final store = ref.read(settingsStoreProvider);
    try {
      final settings = await store.load();
      if (!mounted) {
        return;
      }
      setState(() {
        _onboardingSettings = settings;
        _appearanceSyncStatus = _settingsSyncStatusFromSnapshot(settings);
        _localSpeechNoticeDismissed = false;
        _overlayNoticeDismissed = false;
        _localSpeechNoticeSnoozedUntil = null;
        _overlayNoticeSnoozedUntil = null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Impossible de charger la progression de l\'onboarding : $error',
      );
    } finally {
      if (mounted) {
        setState(() => _onboardingLoading = false);
      }
    }
  }

  Future<void> _persistNoticeDismissal({
    bool? localSpeechNoticeDismissedForever,
    bool? overlayNoticeDismissedForever,
    bool? onboardingNoticeDismissedForever,
  }) async {
    final store = ref.read(settingsStoreProvider);
    final current = _onboardingSettings ?? await store.load();
    final next = current.copyWith(
      localSpeechNoticeDismissedForever:
          localSpeechNoticeDismissedForever ??
          current.localSpeechNoticeDismissedForever,
      overlayNoticeDismissedForever:
          overlayNoticeDismissedForever ??
          current.overlayNoticeDismissedForever,
      onboardingNoticeDismissedForever:
          onboardingNoticeDismissedForever ??
          current.onboardingNoticeDismissedForever,
    );
    await _persistAppearanceSettings(next);
  }

  bool _isNoticeSnoozed(DateTime? until) =>
      until != null && until.isAfter(DateTime.now());

  void _dismissLocalSpeechNotice() {
    setState(() {
      _localSpeechNoticeDismissed = true;
      _localSpeechNoticeSnoozedUntil = null;
    });
  }

  void _snoozeLocalSpeechNotice() {
    setState(() {
      _localSpeechNoticeDismissed = false;
      _localSpeechNoticeSnoozedUntil = DateTime.now().add(
        _noticeSnoozeDuration,
      );
    });
  }

  void _dismissLocalSpeechNoticeForever() {
    setState(() {
      _localSpeechNoticeDismissed = true;
      _localSpeechNoticeSnoozedUntil = null;
    });
    unawaited(_persistNoticeDismissal(localSpeechNoticeDismissedForever: true));
  }

  void _dismissOverlayNotice() {
    setState(() {
      _overlayNoticeDismissed = true;
      _overlayNoticeSnoozedUntil = null;
    });
  }

  void _snoozeOverlayNotice() {
    setState(() {
      _overlayNoticeDismissed = false;
      _overlayNoticeSnoozedUntil = DateTime.now().add(_noticeSnoozeDuration);
    });
  }

  void _dismissOverlayNoticeForever() {
    setState(() {
      _overlayNoticeDismissed = true;
      _overlayNoticeSnoozedUntil = null;
    });
    unawaited(_persistNoticeDismissal(overlayNoticeDismissedForever: true));
  }

  void _dismissOnboardingTile() {
    setState(() {
      _onboardingTileDismissed = true;
    });
    unawaited(_persistNoticeDismissal(onboardingNoticeDismissedForever: true));
  }

  Future<void> _setConfirmDestructiveActions(bool value) async {
    final store = ref.read(settingsStoreProvider);
    final current = _onboardingSettings ?? await store.load();
    final next = current.copyWith(confirmDestructiveActions: value);
    await _persistAppearanceSettings(
      next,
      confirmMessage: value
          ? 'Confirmations de suppression activées.'
          : 'Confirmations de suppression désactivées.',
    );
  }

  OnboardingReadiness _onboardingReadiness() {
    final settings =
        _onboardingSettings ?? const UserSettingsSnapshot.defaults();
    return evaluateOnboardingReadiness(
      isPlatformSupported:
          PlatformCapabilities.isAndroid &&
          PlatformCapabilities.overlaySupported,
      overlayStatus: _overlayStatus ?? _onboardingOverlayFallback,
      keyboardStatus: _keyboardStatus ?? AndroidKeyboardStatus.unsupported(),
      persistedStep: settings.onboardingCurrentStep,
      onboardingCompleted: settings.onboardingCompleted,
      clipboardSkipped: settings.onboardingClipboardSkipped,
      accessibilitySkipped: settings.onboardingAccessibilitySkipped,
      microphoneSkipped: settings.onboardingMicrophoneSkipped,
      mediaAccessSkipped: settings.onboardingMediaAccessSkipped,
      brightnessSkipped: settings.onboardingBrightnessSkipped,
      overlaySkipped: settings.onboardingOverlaySkipped,
    );
  }

  Future<void> _saveSecrets() async {
    final store = ref.read(_secretStoreProvider);
    setState(() {
      _saving = true;
      _message = null;
      _secretsSyncStatus = const AppSyncStatus(
        kind: AppSyncStatusKind.saving,
        message: 'Enregistrement des clés...',
      );
    });
    try {
      await store.writeOpenAiKey(_openAiController.text);
      await store.writeAnthropicKey(_anthropicController.text);
      if (!mounted) {
        return;
      }
      setState(() {
        _message = 'Clés enregistrées localement.';
        _secretsSyncStatus = AppSyncStatus(
          kind: AppSyncStatusKind.localOnly,
          message: 'Clés enregistrées localement.',
          timestamp: DateTime.now(),
        );
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _message = 'Enregistrement des clés impossible : $error';
        _secretsSyncStatus = AppSyncStatus(
          kind: AppSyncStatusKind.error,
          message: 'Échec de l’enregistrement local.',
          timestamp: DateTime.now(),
        );
      });
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _setThemeMode(AppThemeMode mode) async {
    final store = ref.read(settingsStoreProvider);
    final current = _onboardingSettings ?? await store.load();
    final next = current.copyWith(themeMode: mode.materialMode);
    ref.read(appThemeModeProvider.notifier).previewMode(mode);
    await _persistAppearanceSettings(next);
  }

  Future<void> _persistAppearanceSettings(
    UserSettingsSnapshot snapshot, {
    String? confirmMessage,
  }) async {
    _pendingAppearanceSettings = snapshot;
    setState(() {
      _message = null;
      _appearanceSyncStatus = const AppSyncStatus(
        kind: AppSyncStatusKind.saving,
        message: 'Enregistrement des préférences en cours.',
      );
    });
    final localStore = ref.read(localSettingsStoreProvider);
    final activeStore = ref.read(settingsStoreProvider);

    try {
      await localStore.save(snapshot);
      setState(() {
        _onboardingSettings = snapshot;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _appearanceSyncStatus = AppSyncStatus(
          kind: AppSyncStatusKind.error,
          message:
              'Impossible d’enregistrer localement: ${_sanitizeDiagnostic(error)}',
          timestamp: DateTime.now(),
        ),
      );
      return;
    }

    var remoteSaved = false;
    Object? remoteError;
    if (activeStore is! LocalSettingsStore) {
      setState(() {
        _appearanceSyncStatus = const AppSyncStatus(
          kind: AppSyncStatusKind.syncing,
          message: 'Synchronisation des préférences en cours.',
        );
      });
      try {
        await activeStore.save(snapshot);
        remoteSaved = true;
      } catch (error) {
        remoteError = error;
      }
    }

    if (!mounted) {
      return;
    }
    if (remoteSaved) {
      setState(() {
        _appearanceSyncStatus = AppSyncStatus(
          kind: AppSyncStatusKind.synced,
          message: 'Préférences synchronisées.',
          timestamp: DateTime.now(),
        );
        if (confirmMessage != null) {
          _message = confirmMessage;
        }
      });
      return;
    }

    setState(() {
      _appearanceSyncStatus = AppSyncStatus(
        kind: AppSyncStatusKind.localOnly,
        message: remoteError == null
            ? 'Enregistré localement (synchronisation distante indisponible).'
            : 'Enregistré localement; synchronisation distante en attente: ${_sanitizeDiagnostic(remoteError)}.',
        timestamp: DateTime.now(),
      );
      if (confirmMessage != null) {
        _message = confirmMessage;
      }
    });
  }

  Future<void> _retryAppearanceFromStatus() async {
    if (_appearanceSyncStatus.isBusy) {
      return;
    }
    final snapshot =
        _pendingAppearanceSettings ??
        _onboardingSettings ??
        const UserSettingsSnapshot.defaults();
    await _persistAppearanceSettings(snapshot);
  }

  AppSyncStatus _settingsSyncStatusFromSnapshot(UserSettingsSnapshot settings) {
    final health = settings.syncStatus.health;
    final kind = () {
      if (health == SyncHealth.localOnly || health == SyncHealth.unavailable) {
        return AppSyncStatusKind.localOnly;
      }
      if (health == SyncHealth.pending) {
        return AppSyncStatusKind.pending;
      }
      if (health == SyncHealth.syncing) {
        return AppSyncStatusKind.syncing;
      }
      if (health == SyncHealth.synced) {
        return AppSyncStatusKind.synced;
      }
      return AppSyncStatusKind.error;
    }();
    return AppSyncStatus(kind: kind, message: _settingsSyncStatusMessage(kind));
  }

  String _settingsSyncStatusMessage(AppSyncStatusKind kind) {
    return switch (kind) {
      AppSyncStatusKind.localOnly => 'Données locales uniquement.',
      AppSyncStatusKind.pending => 'Synchronisation en attente.',
      AppSyncStatusKind.syncing => 'Synchronisation en cours.',
      AppSyncStatusKind.synced => 'Synchronisé.',
      AppSyncStatusKind.saving => 'Enregistrement.',
      AppSyncStatusKind.loading => 'Chargement.',
      AppSyncStatusKind.saved => 'Enregistré.',
      AppSyncStatusKind.error => 'Erreur.',
      AppSyncStatusKind.conflict => 'Conflit.',
      AppSyncStatusKind.idle => 'Rien à synchroniser.',
    };
  }

  Future<void> _retrySecretsFromStatus() async {
    if (_secretsSyncStatus.isBusy || _saving) {
      return;
    }
    await _saveSecrets();
  }

  Future<void> _loadOverlayState() async {
    if (!PlatformCapabilities.overlaySupported) {
      return;
    }
    AppDiagnostics.record('overlay_status_load', 'start');
    setState(() => _overlayBusy = true);
    try {
      final status = await _overlayController.loadStatus();
      if (!mounted) {
        return;
      }
      setState(() {
        _overlayStatus = status;
      });
      AppDiagnostics.record(
        'overlay_status_load',
        _overlayController.statusSummary(status),
      );
    } on AndroidOverlayBridgeException catch (error) {
      AppDiagnostics.record(
        'overlay_status_error',
        '${error.code}: ${error.message}',
      );
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Erreur d\'état de l\'overlay (${error.code}) : ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _overlayBusy = false);
      }
      _loadOnboardingSettings();
    }
  }

  Future<void> _loadKeyboardState() async {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return;
    }
    setState(() => _keyboardBusy = true);
    try {
      final status = await _keyboardController.loadStatus();
      if (!mounted) {
        return;
      }
      setState(() => _keyboardStatus = status);
      unawaited(
        ref
            .read(appThemeModeProvider.notifier)
            .syncFromKeyboardThemeModeValue(status.themeMode),
      );
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Erreur d\'état du clavier (${error.code}) : ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _keyboardBusy = false);
      }
      _loadOnboardingSettings();
    }
  }

  Future<void> _openKeyboardSettings() async {
    try {
      await _keyboardController.openInputMethodSettings();
      await _loadKeyboardState();
      await _loadOnboardingSettings();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message = 'Impossible d\'ouvrir les réglages clavier : $error',
      );
    }
  }

  Future<void> _showKeyboardPicker() async {
    try {
      await _keyboardController.showInputMethodPicker();
      await _loadKeyboardState();
      await _loadOnboardingSettings();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message = 'Impossible d\'ouvrir le sélecteur clavier : $error',
      );
    }
  }

  Future<void> _openCornerShortcuts() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const KeyboardCornerShortcutsScreen(),
      ),
    );
    if (mounted) {
      await _loadKeyboardState();
    }
  }

  Future<void> _openKeyboardThemeStudio() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const KeyboardThemeStudioScreen(),
      ),
    );
    if (mounted) {
      await _loadKeyboardState();
    }
  }

  Future<void> _openKeyboardNavigationDiagnostics() async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const KeyboardNavigationDiagnosticsScreen(),
      ),
    );
  }

  Future<void> _setKeyboardPreferences({
    bool? voiceEnabled,
    bool? customActionBarEnabled,
    bool? clipboardSyncDesired,
    bool? clipboardSensitiveFieldHistoryEnabled,
    bool? mediaControlsEnabled,
    int? mediaVolumeStepPercent,
    int? mediaBrightnessStepPercent,
    KeyboardLayoutProfile? layoutProfile,
    bool? cornerModeEnabled,
    bool? debugTouchOverlayEnabled,
    bool? keyVibrationEnabled,
    bool? keySoundEnabled,
    bool? spellingSuggestionsEnabled,
    bool? specialKeyCornersEnabled,
    bool? frenchLanguageEnabled,
    bool? englishLanguageEnabled,
    bool? doubleSpacePeriodEnabled,
    bool? punctuationAutoSpacingEnabled,
    double? keyboardHeightScale,
    double? actionRowHeightScale,
    bool? compactModeEnabled,
    bool? autoCloseModesEnabled,
    KeyboardPrivacyMode? privacyMode,
  }) async {
    final current = _keyboardStatus ?? AndroidKeyboardStatus.unsupported();
    setState(() => _keyboardBusy = true);
    try {
      final status = await _keyboardController.setPreferences(
        current: current,
        voiceEnabled: voiceEnabled,
        customActionBarEnabled: customActionBarEnabled,
        clipboardSyncDesired: clipboardSyncDesired,
        clipboardSensitiveFieldHistoryEnabled:
            clipboardSensitiveFieldHistoryEnabled,
        mediaControlsEnabled: mediaControlsEnabled,
        mediaVolumeStepPercent: mediaVolumeStepPercent,
        mediaBrightnessStepPercent: mediaBrightnessStepPercent,
        layoutProfile: layoutProfile,
        cornerModeEnabled: cornerModeEnabled,
        debugTouchOverlayEnabled: debugTouchOverlayEnabled,
        keyVibrationEnabled: keyVibrationEnabled,
        keySoundEnabled: keySoundEnabled,
        spellingSuggestionsEnabled: spellingSuggestionsEnabled,
        specialKeyCornersEnabled: specialKeyCornersEnabled,
        frenchLanguageEnabled: frenchLanguageEnabled,
        englishLanguageEnabled: englishLanguageEnabled,
        doubleSpacePeriodEnabled: doubleSpacePeriodEnabled,
        punctuationAutoSpacingEnabled: punctuationAutoSpacingEnabled,
        keyboardHeightScale: keyboardHeightScale,
        actionRowHeightScale: actionRowHeightScale,
        compactModeEnabled: compactModeEnabled,
        autoCloseModesEnabled: autoCloseModesEnabled,
        privacyMode: privacyMode,
      );
      if (!mounted) {
        return;
      }
      setState(() => _keyboardStatus = status);
      if (customActionBarEnabled != null) {
        await ref
            .read(customActionBarEnabledProvider.notifier)
            .setEnabled(status.customActionBarEnabled);
      }
      unawaited(
        ref
            .read(appThemeModeProvider.notifier)
            .syncFromKeyboardThemeModeValue(status.themeMode),
      );
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Mise à jour des paramètres clavier impossible (${error.code}) : ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _keyboardBusy = false);
      }
    }
  }

  Future<void> _setKeyboardThemePreset(String presetId) async {
    final brightness = Theme.of(context).brightness;
    setState(() => _keyboardBusy = true);
    try {
      await AndroidKeyboardBridge.setKeyboardThemeConfig(
        KeyboardThemePresetCatalog.configFor(presetId, brightness: brightness),
      );
      final status = await _keyboardController.loadStatus();
      if (!mounted) {
        return;
      }
      setState(() => _keyboardStatus = status);
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Mise à jour du thème clavier impossible (${error.code}) : ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _keyboardBusy = false);
      }
    }
  }

  Future<void> _setKeyboardRelief(bool enabled) async {
    setState(() => _keyboardBusy = true);
    try {
      final current = await AndroidKeyboardBridge.getKeyboardThemeConfig();
      await AndroidKeyboardBridge.setKeyboardThemeConfig(
        current.copyWith(
          keyReliefEnabled: enabled,
          keyReliefDepth: current.keyReliefDepth <= 0
              ? 2
              : current.keyReliefDepth,
        ),
      );
      final status = await _keyboardController.loadStatus();
      if (!mounted) {
        return;
      }
      setState(() => _keyboardStatus = status);
    } on AndroidKeyboardBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Mise à jour du relief clavier impossible (${error.code}) : ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _keyboardBusy = false);
      }
    }
  }

  Future<void> _openOverlaySettings() async {
    try {
      AppDiagnostics.record('overlay_permission_settings', 'open');
      await _overlayController.openPermissionSettings();
      await _loadOverlayState();
      await _loadOnboardingSettings();
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message = 'Impossible d\'ouvrir les réglages overlay : $error',
      );
    }
  }

  Future<void> _toggleOverlay(bool value) async {
    AppDiagnostics.record('overlay_toggle', 'requested=$value');
    setState(() => _overlayBusy = true);
    try {
      final status = await _overlayController.setEnabled(value);
      if (!mounted) {
        return;
      }
      setState(() {
        _overlayStatus = status;
      });
      AppDiagnostics.record(
        'overlay_toggle_result',
        _overlayController.statusSummary(status),
      );
    } on AndroidOverlayBridgeException catch (error) {
      AppDiagnostics.record(
        'overlay_toggle_error',
        '${error.code}: ${error.message}',
      );
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Impossible d\'activer/désactiver l\'overlay (${error.code}) : ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _overlayBusy = false);
      }
    }
  }

  Future<void> _setOverlayAppearance({
    required double sizeScale,
    required double opacity,
  }) async {
    AppDiagnostics.record(
      'overlay_appearance',
      'size=$sizeScale; opacity=$opacity',
    );
    setState(() => _overlayBusy = true);
    try {
      final status = await _overlayController.setAppearance(
        sizeScale: sizeScale,
        opacity: opacity,
      );
      if (!mounted) {
        return;
      }
      setState(() => _overlayStatus = status);
      AppDiagnostics.record(
        'overlay_appearance_result',
        _overlayController.statusSummary(status),
      );
    } on AndroidOverlayBridgeException catch (error) {
      AppDiagnostics.record(
        'overlay_appearance_error',
        '${error.code}: ${error.message}',
      );
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Mise à jour de l\'apparence overlay impossible (${error.code}) : ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _overlayBusy = false);
      }
    }
  }

  Future<void> _startOverlay() async {
    AppDiagnostics.record('overlay_start', 'requested');
    setState(() => _overlayBusy = true);
    try {
      final status = await _overlayController.startRecording();
      if (!mounted) {
        return;
      }
      setState(() {
        _overlayStatus = status;
        _message = status.running
            ? 'Overlay recording started.'
            : 'Overlay start requested, but the native service is not running yet '
                  '(state=${status.serviceState}). Copiez le diagnostic si cela reste bloqué.';
      });
      AppDiagnostics.record(
        'overlay_start_result',
        _overlayController.statusSummary(status),
      );
    } on AndroidOverlayBridgeException catch (error) {
      AppDiagnostics.record(
        'overlay_start_error',
        '${error.code}: ${error.message}',
      );
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Impossible de démarrer l\'overlay (${error.code}) : ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _overlayBusy = false);
      }
    }
  }

  Future<void> _stopOverlay() async {
    AppDiagnostics.record('overlay_stop', 'requested');
    setState(() => _overlayBusy = true);
    try {
      final status = await _overlayController.stopRecording();
      if (!mounted) {
        return;
      }
      setState(() {
        _overlayStatus = status;
        _message = 'Enregistrement overlay arrêté.';
      });
      AppDiagnostics.record(
        'overlay_stop_result',
        _overlayController.statusSummary(status),
      );
    } on AndroidOverlayBridgeException catch (error) {
      AppDiagnostics.record(
        'overlay_stop_error',
        '${error.code}: ${error.message}',
      );
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Impossible d\'arrêter l\'overlay (${error.code}) : ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _overlayBusy = false);
      }
    }
  }

  Future<void> _cancelOverlay() async {
    AppDiagnostics.record('overlay_cancel', 'requested');
    setState(() => _overlayBusy = true);
    try {
      final status = await _overlayController.cancelRecording();
      if (!mounted) {
        return;
      }
      setState(() {
        _overlayStatus = status;
        _message = 'Enregistrement overlay annulé.';
      });
      AppDiagnostics.record(
        'overlay_cancel_result',
        _overlayController.statusSummary(status),
      );
    } on AndroidOverlayBridgeException catch (error) {
      AppDiagnostics.record(
        'overlay_cancel_error',
        '${error.code}: ${error.message}',
      );
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Impossible d\'annuler l\'overlay (${error.code}) : ${error.message}',
      );
    } finally {
      if (mounted) {
        setState(() => _overlayBusy = false);
      }
    }
  }

  Future<void> _openAccessibilitySettings() async {
    try {
      AppDiagnostics.record('overlay_accessibility_settings', 'open');
      await _overlayController.openAccessibilitySettings();
      await _loadOverlayState();
      await _loadOnboardingSettings();
    } on AndroidOverlayBridgeException catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Impossible d\'ouvrir l\'accessibilité (${error.code}) : ${error.message}',
      );
    }
  }

  Future<void> _signOut() async {
    await ref.read(authSessionStoreProvider).signOut();
    ref.read(localAuthModeProvider.notifier).disable();
    if (!mounted) {
      return;
    }
    setState(() {
      _postAuthMessage = null;
      _message = 'Déconnexion effectuée.';
    });
  }

  Future<void> _connectCloudAccount() async {
    final connected = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => SignInScreen(
          remoteOnly: true,
          onAuthenticated: () => Navigator.of(context).pop(true),
        ),
      ),
    );
    if (connected != true || !mounted) {
      return;
    }
    ref.read(localAuthModeProvider.notifier).disable();
    setState(() {
      _message = null;
      _postAuthMessage = 'Vérification du compte cloud en cours…';
    });
    await Future<void>.delayed(Duration.zero);
    if (!mounted) {
      return;
    }
    final authAsync = ref.read(authSessionProvider);
    final suiteIdentityAsync = ref.read(suiteIdentityProvider);
    setState(() {
      _postAuthMessage = _cloudConnectFeedback(
        authAsync: authAsync,
        suiteIdentityAsync: suiteIdentityAsync,
      );
    });
  }

  String _cloudConnectFeedback({
    required AsyncValue<AuthSessionSnapshot> authAsync,
    required AsyncValue<SuiteIdentitySnapshot> suiteIdentityAsync,
  }) {
    return authAsync.when(
      data: (session) {
        if (session.isLocalFallback) {
          return 'Compte cloud connecté, mais en mode local de secours.';
        }
        if (!session.isSignedIn) {
          return 'Connexion cloud non confirmée pour l’instant.';
        }
        return suiteIdentityAsync.when(
          data: (identity) {
            final suiteStatus = identity.statusFor(ProductId.commandglowsApp);
            if (suiteStatus == SuiteAccountStatus.accessActive) {
              return 'Compte cloud vérifié. Accès CommandGlows actif; '
                  'les catégories synchronisables sont évaluées.';
            }
            if (suiteStatus == SuiteAccountStatus.linkingRequired) {
              return 'Compte cloud vérifié. Liaison CommandGlows requise. '
                  'Les données restent locales pour l’instant.';
            }
            return 'Compte cloud vérifié. Pas encore d’accès CommandGlows actif; '
                'les données restent locales.';
          },
          loading: () =>
              'Compte cloud vérifié. Vérification de l’accès CommandGlows en cours.',
          error: (error, _) =>
              'Compte cloud vérifié, mais l’accès CommandGlows n’a pu être vérifié.',
        );
      },
      loading: () => 'Compte cloud en cours de vérification.',
      error: (error, _) =>
          'La connexion cloud n’a pas pu être validée immédiatement.',
    );
  }

  Future<void> _copyBackendDiagnostic() async {
    final suiteIdentityAsync = ref.read(suiteIdentityProvider);
    await Clipboard.setData(
      ClipboardData(text: _backendDiagnosticText(suiteIdentityAsync)),
    );
    if (!mounted) {
      return;
    }
    setState(() => _message = 'Diagnostic backend copié.');
  }

  Future<void> _clearDiagnosticLogs() async {
    AppDiagnostics.clear();
    AndroidKeyboardStatus? status;
    if (PlatformCapabilities.keyboardImeSupported) {
      try {
        status = await _keyboardController.clearDiagnostics();
      } on AndroidKeyboardBridgeException catch (error) {
        AppDiagnostics.record(
          'keyboard_diagnostics_clear_error',
          '${error.code}: ${error.message}',
        );
      }
    }
    if (!mounted) {
      return;
    }
    setState(() {
      if (status != null) {
        _keyboardStatus = status;
      }
      _message = 'Journaux de diagnostic effacés.';
    });
  }

  String _backendDiagnosticText(
    AsyncValue<SuiteIdentitySnapshot> suiteIdentityAsync,
  ) {
    final authAsync = ref.read(authSessionProvider);
    final storageStatus = ref.read(_storageStatusProvider);
    final suiteStatus = suiteIdentityAsync.when(
      data: (snapshot) => snapshot.supportSummary,
      loading: () => 'status=loading',
      error: (error, _) =>
          'status=unavailable; issue=${_sanitizeDiagnostic(error)}',
    );
    final status = _backendStatus(authAsync);
    final lines = <String>[
      'CommandGlows backend diagnostic',
      'diagnostic_version: 5',
      'generated_at_utc: ${DateTime.now().toUtc().toIso8601String()}',
      'secret_values_redacted: true',
      ...AppBuildInfo.diagnosticHeader,
      'provider_contract: backend-agnostic',
      'status: $status',
      'build: ${AppBuildInfo.diagnosticSummary}',
      'platform_capabilities: ${_platformDiagnostic()}',
      'firebase_initialized: ${FirebaseBootstrap.isInitialized}',
      'firebase_configured: ${FirebaseBootstrap.isConfigured}',
      'firebase_detail: ${_sanitizeDiagnostic(FirebaseBootstrap.initError ?? 'configured_or_not_required')}',
      'sentry_configured: ${SentryBootstrap.isConfigured}',
      'sentry_initialized: ${SentryBootstrap.isInitialized}',
      'sentry_environment: ${SentryBootstrap.environment}',
      'sentry_release: ${SentryBootstrap.release ?? 'auto_or_unset'}',
      'sentry_dist: ${SentryBootstrap.dist ?? 'unset'}',
      'sentry_detail: ${_sanitizeDiagnostic(SentryBootstrap.initError ?? 'configured_or_not_required')}',
      'auth_store: ${ref.read(authSessionStoreProvider).runtimeType}',
      'auth_session: ${_authDiagnostic(authAsync)}',
      'suite_identity: $suiteStatus',
      'settings_store: ${ref.read(settingsStoreProvider).runtimeType}',
      'transcription_store: ${ref.read(transcriptionStoreProvider).runtimeType}',
      'clipboard_store: ${ref.read(clipboardStoreProvider).runtimeType}',
      'snippet_store: ${ref.read(snippetStoreProvider).runtimeType}',
      'dictionary_store: ${ref.read(dictionaryStoreProvider).runtimeType}',
      'secure_storage: ${_storageDiagnostic(storageStatus)}',
      'openai_key_present: ${_openAiController.text.trim().isNotEmpty}',
      'anthropic_key_present: ${_anthropicController.text.trim().isNotEmpty}',
      'overlay_status: ${_overlayDiagnostic()}',
      'keyboard_status: ${_keyboardDiagnostic()}',
      'keyboard_last_error: ${_sanitizeDiagnostic(_keyboardStatus?.lastKeyboardError ?? 'none')}',
      'voice_catalog_status: ${_voiceCatalogDiagnostic(ref.read(languagePackCatalogProvider))}',
      'recent_events: ${_recentEventsDiagnostic()}',
      'settings_message: ${_sanitizeDiagnostic(_message ?? 'none')}',
    ];
    return lines.join('\n');
  }

  String _backendStatus(AsyncValue<AuthSessionSnapshot> authAsync) {
    if (!FirebaseBootstrap.isConfigured) {
      return 'local_mode';
    }
    final session = authAsync.maybeWhen(
      data: (value) => value,
      orElse: () => null,
    );
    if (session == null) {
      return 'firebase_configured_session_pending';
    }
    if (session.isSignedIn && !session.isLocalFallback) {
      return 'firebase_remote';
    }
    if (session.isLocalFallback) {
      return 'firebase_configured_local_session';
    }
    return 'firebase_configured_signed_out';
  }

  String _appearanceSyncLabel(AsyncValue<AuthSessionSnapshot> authAsync) {
    if (!FirebaseBootstrap.isConfigured) {
      return 'Le thème est enregistré uniquement sur cet appareil.';
    }
    return authAsync.maybeWhen(
      data: (session) {
        if (session.isSignedIn && !session.isLocalFallback) {
          return 'Le thème est synchronisé avec votre compte connecté.';
        }
        if (session.isLocalFallback) {
          return 'Le thème reste local pour le moment (session locale de secours).';
        }
        return 'Le thème reste local tant que vous n\'êtes pas connecté.';
      },
      orElse: () =>
          'L\'état de synchronisation du thème est en cours de chargement.',
    );
  }

  String _appearanceSyncDetail(AsyncValue<AuthSessionSnapshot> authAsync) {
    if (!FirebaseBootstrap.isConfigured) {
      return 'Le réglage distant n\'est pas configuré. Cette option s\'applique tout de suite en local.';
    }
    return authAsync.when(
      data: (session) {
        if (session.isSignedIn && !session.isLocalFallback) {
          return 'Compte connecté et paramètres distants disponibles. Les changements sont d\'abord enregistrés en local puis synchronisés.';
        }
        if (session.isLocalFallback) {
          return 'Firebase est configuré, mais cette session est locale de secours. Les réglages restent locaux jusqu\'à ce que l\'authentification distante revienne.';
        }
        return 'Firebase est configuré mais aucun compte connecté. Les réglages restent locaux jusqu\'à la connexion.';
      },
      loading: () =>
          'Vérification de la session avant confirmation de la synchronisation distante.',
      error: (error, stackTrace) =>
          'La session d\'authentification est indisponible, la synchronisation reste locale.',
    );
  }

  String _suiteIdentitySummary(
    AsyncValue<SuiteIdentitySnapshot> suiteIdentityAsync,
  ) {
    return suiteIdentityAsync.when(
      data: (identity) => identity.status.name,
      loading: () => 'Vérification de l\'état de l\'identité suite.',
      error: (error, _) =>
          'Identité de suite indisponible : ${_sanitizeDiagnostic(error)}',
    );
  }

  String _authDiagnostic(AsyncValue<AuthSessionSnapshot> authAsync) {
    return authAsync.when(
      data: (session) {
        final user = session.user;
        return [
          'state=data',
          'signed_in=${session.isSignedIn}',
          'local_fallback=${session.isLocalFallback}',
          'provider=${user?.provider.name ?? 'none'}',
          'anonymous=${user?.isAnonymous ?? false}',
          'email_present=${user?.email?.isNotEmpty ?? false}',
          'user_id_present=${user?.id.isNotEmpty ?? false}',
          'sync_health=${session.syncStatus.health.name}',
          'sync_issue=${session.syncStatus.issue?.code ?? 'none'}',
        ].join('; ');
      },
      loading: () => 'state=loading',
      error: (error, _) => 'state=error; error=${_sanitizeDiagnostic(error)}',
    );
  }

  String _storageDiagnostic(AsyncValue<SecretStorageStatus> status) {
    return status.when(
      data: (value) => value.name,
      loading: () => 'loading',
      error: (error, _) => 'error=${_sanitizeDiagnostic(error)}',
    );
  }

  String _platformDiagnostic() {
    return [
      'android=${PlatformCapabilities.isAndroid}',
      'linux=${PlatformCapabilities.isLinux}',
      'web=${PlatformCapabilities.isWeb}',
      'local_speech=${PlatformCapabilities.localSpeechSupported}',
      'overlay=${PlatformCapabilities.overlaySupported}',
      'keyboard_ime=${PlatformCapabilities.keyboardImeSupported}',
      'secure_storage_degraded=${PlatformCapabilities.secureStorageDegraded}',
    ].join('; ');
  }

  String _overlayDiagnostic() {
    if (!PlatformCapabilities.overlaySupported) {
      return 'unsupported';
    }
    final status = _overlayStatus;
    if (status == null) {
      return 'not_loaded; busy=$_overlayBusy';
    }
    return [
      'enabled=${status.enabled}',
      'requested=${status.requestedEnabled}',
      'running=${status.running}',
      'overlay_permission=${status.overlayPermissionGranted}',
      'accessibility_permission=${status.accessibilityPermissionGranted}',
      'delivery=${status.deliveryMode.name}',
      'size=${status.sizeScale}',
      'opacity=${status.opacity}',
      'service_state=${status.serviceState}',
      'event_queue_size=${status.eventQueueSize}',
      'last_native_event=${_sanitizeDiagnostic(status.lastNativeEvent ?? 'none')}',
      'busy=$_overlayBusy',
    ].join('; ');
  }

  String _keyboardDiagnostic() {
    if (!PlatformCapabilities.keyboardImeSupported) {
      return 'unsupported';
    }
    final status = _keyboardStatus;
    if (status == null) {
      return 'not_loaded; busy=$_keyboardBusy';
    }
    return [
      'supported=${status.supported}',
      'enabled=${status.enabled}',
      'active=${status.active}',
      'voice_enabled=${status.voiceEnabled}',
      'clipboard_sync_desired=${status.clipboardSyncDesired}',
      'clipboard_sensitive_field_history=${status.clipboardSensitiveFieldHistoryEnabled}',
      'media_controls=${status.mediaControlsEnabled}',
      'media_session_access=${status.mediaSessionAccessGranted}',
      'system_settings_write=${status.systemSettingsWriteGranted}',
      'theme=${status.themeMode}',
      'theme_preset=${status.themePresetId}',
      'theme_effect=${status.themePressEffect}',
      'theme_background=${status.themeBackgroundSource}',
      'theme_config_size=${status.themeConfigSize}',
      'theme_fallback=${status.themeFallbackStatus}',
      'layout=${status.layoutProfile.name}',
      'corner_mode=${status.cornerModeEnabled}',
      'corner_preset=${status.cornerPresetId}',
      'debug_touch=${status.debugTouchOverlayEnabled}',
      'double_space=${status.doubleSpacePeriodEnabled}',
      'punct_spacing=${status.punctuationAutoSpacingEnabled}',
      'privacy_mode=${status.privacyMode.name}',
      'recovery_count=${status.keyboardRecoveryCount}',
      'voice_runtime=${status.voiceRuntimeMode}',
      'voice_language=${status.voiceLanguageTag}',
      'voice_pack=${status.voicePackId}',
      'voice_engine=${status.voiceEngine}',
      'voice_fallback_reason=${status.voiceFallbackReason}',
      'voice_last_error_code=${status.voiceLastErrorCode}',
      'last_error_at=${status.lastKeyboardErrorAt ?? 'none'}',
      'last_error=${_sanitizeDiagnostic(status.lastKeyboardError ?? 'none')}',
      'busy=$_keyboardBusy',
    ].join('; ');
  }

  String _voiceCatalogDiagnostic(LanguagePackCatalogState state) {
    final installed = state.installedPacks.values
        .map(
          (pack) =>
              '${pack.packId}:${pack.installState.wireName}:${pack.runtimeMode.wireName}:${pack.fallbackReason.wireName}',
        )
        .join(',');
    return [
      'load_state=${state.loadState.name}',
      'entries=${state.catalog.entries.length}',
      'allow_cloud_fallback=${state.allowCloudFallback}',
      'installed=${installed.isEmpty ? 'none' : installed}',
      'retry_counts=${state.retryCounts.isEmpty ? 'none' : state.retryCounts}',
      'last_error=${_sanitizeDiagnostic(state.lastErrorCode ?? 'none')}',
    ].join('; ');
  }

  LanguagePackDeviceProfile _deviceProfileFromKeyboardStatus(
    AndroidKeyboardStatus status,
  ) {
    if (!status.supported) {
      return const LanguagePackDeviceProfile(
        androidSdk: 0,
        primaryAbi: 'unsupported',
        totalCapacityMb: 0,
        freeSpaceMb: 0,
        ramMb: 0,
      );
    }
    return LanguagePackDeviceProfile(
      androidSdk: status.deviceAndroidSdk,
      primaryAbi: status.devicePrimaryAbi,
      totalCapacityMb: status.deviceTotalCapacityMb,
      freeSpaceMb: status.deviceFreeSpaceMb,
      ramMb: status.deviceRamMb,
    );
  }

  Future<bool> _installSpeechPack(
    LanguagePackCatalogEntry entry,
    AndroidKeyboardStatus? keyboardStatus,
  ) async {
    final notifier = ref.read(languagePackCatalogProvider.notifier);
    final device = _deviceProfileFromKeyboardStatus(
      keyboardStatus ?? AndroidKeyboardStatus.unsupported(),
    );
    final installed = await notifier.installPackWithPreflight(
      entry: entry,
      device: device,
    );
    await _syncSpeechPackRuntime(entry, installed);
    return installed;
  }

  Future<bool> _retrySpeechPackInstall(
    LanguagePackCatalogEntry entry,
    AndroidKeyboardStatus? keyboardStatus,
  ) async {
    final notifier = ref.read(languagePackCatalogProvider.notifier);
    final device = _deviceProfileFromKeyboardStatus(
      keyboardStatus ?? AndroidKeyboardStatus.unsupported(),
    );
    final installed = await notifier.retryInstallWithPreflight(
      entry: entry,
      device: device,
    );
    await _syncSpeechPackRuntime(entry, installed);
    return installed;
  }

  Future<void> _syncSpeechPackRuntime(
    LanguagePackCatalogEntry entry,
    bool installed,
  ) async {
    final packState = ref
        .read(languagePackCatalogProvider)
        .installedStateFor(entry);
    if (!installed) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Speech pack blocked for ${entry.languageTag}: ${packState.lastErrorCode}.',
      );
      return;
    }
    try {
      await AndroidKeyboardBridge.setKeyboardVoiceRuntimeConfig(
        languageTag: entry.languageTag,
        packId: entry.packId,
        engine: entry.engine.wireName,
        modelArtifactPath: packState.modelArtifactPath,
      );
      await AndroidKeyboardBridge.probeKeyboardLocalRuntimePath(
        languageTag: entry.languageTag,
        packId: entry.packId,
        engine: entry.engine.wireName,
        modelArtifactPath: packState.modelArtifactPath,
      );
      await _loadKeyboardState();
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Speech pack installed for ${entry.languageTag}. Runtime status updated.',
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(
        () => _message =
            'Speech pack installed, but keyboard runtime sync failed: $error',
      );
    }
  }

  void _removeSpeechPack(LanguagePackCatalogEntry entry) {
    final removed = ref
        .read(languagePackCatalogProvider.notifier)
        .remove(entry);
    setState(
      () => _message = removed
          ? 'Speech pack removed for ${entry.languageTag}.'
          : 'No installed speech pack to remove for ${entry.languageTag}.',
    );
  }

  String _sanitizeDiagnostic(Object? value) {
    return SensitiveRedactor.redact(value);
  }

  String _recentEventsDiagnostic() {
    final events = AppDiagnostics.recentEvents;
    if (events.isEmpty) {
      return 'none';
    }
    return events.map((event) => _sanitizeDiagnostic(event)).join(' || ');
  }

  List<Widget> _compatibilityNotices() {
    final settings =
        _onboardingSettings ?? const UserSettingsSnapshot.defaults();
    final notices = <Widget>[];

    if (!PlatformCapabilities.localSpeechSupported &&
        !_localSpeechNoticeDismissed &&
        !_isNoticeSnoozed(_localSpeechNoticeSnoozedUntil) &&
        !settings.localSpeechNoticeDismissedForever) {
      notices.add(
        AppNotificationCard(
          icon: Icons.mic_off_outlined,
          title:
              'Dictée locale indisponible sur ${PlatformCapabilities.currentPlatformLabel}',
          message:
              '${PlatformCapabilities.localSpeechUnavailableReason} Utilise le mode Whisper avancé à la place.',
          accentColor: AppColors.warning,
          onDismiss: _dismissLocalSpeechNotice,
          primaryAction: TextButton(
            onPressed: _dismissLocalSpeechNoticeForever,
            child: const Text('Ne plus afficher'),
          ),
          secondaryAction: TextButton(
            onPressed: _snoozeLocalSpeechNotice,
            child: const Text('Plus tard'),
          ),
        ),
      );
    }

    if (!PlatformCapabilities.overlaySupported &&
        !_overlayNoticeDismissed &&
        !_isNoticeSnoozed(_overlayNoticeSnoozedUntil) &&
        !settings.overlayNoticeDismissedForever) {
      notices.add(
        AppNotificationCard(
          icon: Icons.layers_clear_outlined,
          title:
              'Overlay Android indisponible sur ${PlatformCapabilities.currentPlatformLabel}',
          message: PlatformCapabilities.overlayUnavailableReason,
          onDismiss: _dismissOverlayNotice,
          primaryAction: TextButton(
            onPressed: _dismissOverlayNoticeForever,
            child: const Text('Ne plus afficher'),
          ),
          secondaryAction: TextButton(
            onPressed: _snoozeOverlayNotice,
            child: const Text('Plus tard'),
          ),
        ),
      );
    }

    return notices;
  }

  Widget? _notificationStack(List<Widget> notices) {
    if (notices.isEmpty) {
      return null;
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < notices.length; i++) ...[
          notices[i],
          if (i + 1 < notices.length) AppGaps.x1,
        ],
      ],
    );
  }

  Widget _settingsList({required List<Widget> sections}) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final useTwoColumns =
            constraints.maxWidth >=
            AppLayoutMetrics.settingsTwoColumnBreakpoint;
        final content = useTwoColumns
            ? _settingsTwoColumnList(constraints, sections)
            : _settingsSingleColumnList(sections);
        return DecoratedBox(
          decoration: BoxDecoration(
            gradient: AppGradients.shell(Theme.of(context).brightness),
          ),
          child: content,
        );
      },
    );
  }

  Widget _settingsSingleColumnList(List<Widget> sections) {
    return Scrollbar(
      controller: _scrollController,
      thumbVisibility: true,
      child: ListView.separated(
        controller: _scrollController,
        padding: AppInsets.screen,
        itemCount: sections.length,
        separatorBuilder: (_, _) => _sectionGap,
        itemBuilder: (context, index) => sections[index],
      ),
    );
  }

  Widget _settingsTwoColumnList(
    BoxConstraints constraints,
    List<Widget> sections,
  ) {
    final totalHorizontalPadding = AppSpacing.x4 * 2;
    final columnSpacing = AppSectionMetrics.sectionColumnGap;
    final itemWidth =
        (constraints.maxWidth - totalHorizontalPadding - columnSpacing) / 2;
    return Scrollbar(
      controller: _scrollController,
      thumbVisibility: true,
      child: SingleChildScrollView(
        controller: _scrollController,
        padding: AppInsets.screen,
        child: Wrap(
          spacing: columnSpacing,
          runSpacing: AppSectionMetrics.sectionRunSpacing,
          children: [
            for (final section in sections)
              SizedBox(width: itemWidth, child: section),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    AppDiagnostics.record('screen_build', 'Settings');
    final storageStatusAsync = ref.watch(_storageStatusProvider);
    final onboardingReadiness = _onboardingReadiness();
    final onboardingSettings = _onboardingSettings;
    final onboardingNoticeDismissedForever =
        onboardingSettings?.onboardingNoticeDismissedForever == true;
    final onboardingTileDismissed =
        onboardingNoticeDismissedForever || _onboardingTileDismissed;
    _OnboardingSettingsTile? buildOnboardingTile({
      required bool canDismiss,
      required Key key,
    }) {
      final onResume = widget.onResumeOnboarding;
      if (onResume == null) {
        return null;
      }
      return _OnboardingSettingsTile(
        key: key,
        onResume: onResume,
        readiness: onboardingReadiness,
        highlightResume: widget.highlightOnboardingResume,
        onDismiss: canDismiss ? _dismissOnboardingTile : null,
      );
    }

    final topOnboardingTile =
        !onboardingReadiness.onboardingCompleted && !onboardingTileDismissed
        ? buildOnboardingTile(
            canDismiss: true,
            key: const Key('settings-onboarding-top-reminder'),
          )
        : null;
    final bottomOnboardingTile = buildOnboardingTile(
      canDismiss: false,
      key: const Key('settings-onboarding-persistent-entry'),
    );
    final notificationStack = _notificationStack([
      ..._compatibilityNotices(),
      ?topOnboardingTile,
    ]);
    if (_loading || _onboardingLoading) {
      return _settingsList(
        sections: [
          ?notificationStack,
          const Center(child: CircularProgressIndicator()),
        ],
      );
    }

    final overlayStatus = _overlayStatus;
    final keyboardStatus = _keyboardStatus;
    final themeMode = ref.watch(appThemeModeProvider);
    final authAsync = ref.watch(authSessionProvider);
    final remoteAuthConfigured = ref.watch(remoteAuthConfiguredProvider);
    final cloudOverview = ref.watch(cloudSyncOverviewProvider);
    final suiteIdentityAsync = ref.watch(suiteIdentityProvider);
    final voiceCatalogState = ref.watch(languagePackCatalogProvider);
    final pageMode = _pageMode();
    final accountSection = _AccountCloudSection(
      authAsync: authAsync,
      cloudSyncOverview: cloudOverview,
      postAuthMessage: _postAuthMessage,
      remoteAuthConfigured: remoteAuthConfigured,
      onConnectCloudAccount: _connectCloudAccount,
      onSignOut: _signOut,
    );
    final appearanceQuickSection = _AppearanceSection(
      themeMode: themeMode,
      confirmDestructiveActions:
          (_onboardingSettings ?? const UserSettingsSnapshot.defaults())
              .confirmDestructiveActions,
      syncStateLabel: _appearanceSyncLabel(authAsync),
      syncStateDetail: _appearanceSyncDetail(authAsync),
      syncActionStatus: _appearanceSyncStatus,
      onSyncOrRefresh: () {
        _retryAppearanceFromStatus();
      },
      onConfirmDestructiveActionsChanged: _setConfirmDestructiveActions,
      onChanged: _setThemeMode,
    );
    final keyboardSection = _KeyboardSettingsSection(
      status: keyboardStatus,
      busy: _keyboardBusy,
      onRefresh: _loadKeyboardState,
      onOpenInputSettings: _openKeyboardSettings,
      onShowPicker: _showKeyboardPicker,
      onOpenCornerShortcuts: _openCornerShortcuts,
      onOpenNavigationDiagnostics: _openKeyboardNavigationDiagnostics,
      onOpenKeyboardThemeStudio: _openKeyboardThemeStudio,
      onThemePresetChanged: _setKeyboardThemePreset,
      onReliefChanged: _setKeyboardRelief,
      onPreferenceChanged: _setKeyboardPreferences,
    );
    final voiceSection = _OnDeviceSpeechSection(
      state: voiceCatalogState,
      keyboardStatus: keyboardStatus,
      onRefresh: () => ref.read(languagePackCatalogProvider.notifier).refresh(),
      onAllowCloudFallbackChanged: (value) => ref
          .read(languagePackCatalogProvider.notifier)
          .setAllowCloudFallback(value),
      onInstall: (entry) => _installSpeechPack(entry, keyboardStatus),
      onRetryInstall: (entry) => _retrySpeechPackInstall(entry, keyboardStatus),
      onMarkUpdateAvailable: (entry) => ref
          .read(languagePackCatalogProvider.notifier)
          .markUpdateAvailable(entry),
      onMarkCorrupted: (entry) =>
          ref.read(languagePackCatalogProvider.notifier).markCorrupted(entry),
      onRemove: _removeSpeechPack,
    );
    final secretsSection = _SecretsSection(
      storageStatusAsync: storageStatusAsync,
      openAiController: _openAiController,
      anthropicController: _anthropicController,
      message: _message,
      saving: _saving,
      syncStatus: _secretsSyncStatus,
      onSave: _saveSecrets,
      onSignOut: _signOut,
      onRetrySync: () {
        _retrySecretsFromStatus();
      },
    );
    final overlaySection = _OverlaySettingsSection(
      status: overlayStatus,
      busy: _overlayBusy,
      onToggle: _toggleOverlay,
      onAppearanceChanged: _setOverlayAppearance,
      onOpenOverlaySettings: _openOverlaySettings,
      onOpenAccessibilitySettings: _openAccessibilitySettings,
      onStart: _startOverlay,
      onStop: _stopOverlay,
      onCancel: _cancelOverlay,
    );
    final maintenanceSection = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _BackendProviderSection(
          summary: FirebaseBootstrap.isConfigured
              ? 'Firebase est configuré comme adaptateur backend principal.'
              : 'La synchronisation distante n’est pas configurée. CommandGlows fonctionne en mode local.',
          detail:
              '${_appearanceSyncDetail(authAsync)}\nStatut du compte Suite: ${_suiteIdentitySummary(suiteIdentityAsync)}',
          diagnosticText: _backendDiagnosticText(suiteIdentityAsync),
          onCopyDiagnostic: _copyBackendDiagnostic,
          onClearDiagnosticLogs: _clearDiagnosticLogs,
        ),
        AppGaps.x3,
        const _PlatformCapabilitiesSection(),
      ],
    );

    if (pageMode != _SettingsPageMode.hub) {
      final (title, subtitle, icon, section) = switch (pageMode) {
        _SettingsPageMode.account => (
          '',
          '',
          Icons.cloud_sync_outlined,
          accountSection,
        ),
        _SettingsPageMode.voice => (
          'Voix',
          'Dictée locale, packs vocaux et fallback.',
          Icons.graphic_eq_outlined,
          voiceSection,
        ),
        _SettingsPageMode.keyboard => (
          'Clavier',
          'IME Android, thème et préférences.',
          Icons.keyboard_outlined,
          keyboardSection,
        ),
        _SettingsPageMode.overlay => (
          'Overlay Android',
          'Bulle, permissions et comportement d’injection.',
          Icons.bubble_chart_outlined,
          overlaySection,
        ),
        _SettingsPageMode.keys => (
          'Clés IA locales',
          'Secrets stockés sur cet appareil.',
          Icons.key_outlined,
          secretsSection,
        ),
        _SettingsPageMode.maintenance => (
          'Maintenance',
          'Backend, support et diagnostics.',
          Icons.admin_panel_settings_outlined,
          maintenanceSection,
        ),
        _SettingsPageMode.hub => (
          '',
          '',
          Icons.tune_outlined,
          const SizedBox.shrink(),
        ),
      };
      return _settingsList(
        sections: [
          ?notificationStack,
          if (title.isNotEmpty)
            AppPageHeroCard(
              title: title,
              subtitle: subtitle,
              leadingIcon: icon,
              syncAction: OutlinedButton.icon(
                onPressed: context.canPop() ? () => context.pop() : null,
                icon: const Icon(Icons.arrow_back_outlined),
                label: const Text('Retour'),
              ),
            ),
          section,
          ?bottomOnboardingTile,
        ],
      );
    }

    return _settingsList(
      sections: [
        ?notificationStack,
        AppPageHeroCard(
          title: 'Paramètres',
          subtitle:
              'Choisis une sous-page claire plutôt qu’un bloc unique de réglages.',
          leadingIcon: Icons.tune_outlined,
          footer: AppSectionCard(
            title: 'Apparence rapide',
            child: appearanceQuickSection,
          ),
        ),
        Wrap(
          spacing: AppSpacing.x2,
          runSpacing: AppSpacing.x2,
          children: [
            _SettingsHubTile(
              icon: Icons.cloud_sync_outlined,
              title: 'Mon compte',
              subtitle: 'Compte, accès et synchronisation',
              onTap: () => context.push('/settings?section=account_cloud'),
            ),
            _SettingsHubTile(
              icon: Icons.graphic_eq_outlined,
              title: 'Voix',
              subtitle: 'Dictée locale et packs',
              onTap: () => context.push('/settings?section=voice_packs'),
            ),
            if (PlatformCapabilities.keyboardImeSupported)
              _SettingsHubTile(
                icon: Icons.keyboard_outlined,
                title: 'Clavier',
                subtitle: 'IME, thème et préférences',
                onTap: () => context.push('/settings?section=keyboard'),
              ),
            if (PlatformCapabilities.overlaySupported)
              _SettingsHubTile(
                icon: Icons.bubble_chart_outlined,
                title: 'Overlay',
                subtitle: 'Bulle et permissions',
                onTap: () => context.push('/settings?section=overlay'),
              ),
            _SettingsHubTile(
              icon: Icons.key_outlined,
              title: 'Clés IA locales',
              subtitle: 'Secrets stockés sur l’appareil',
              onTap: () => context.push('/settings?section=keys'),
            ),
            _SettingsHubTile(
              icon: Icons.admin_panel_settings_outlined,
              title: 'Maintenance',
              subtitle: 'Backend et diagnostics',
              onTap: () => context.push('/settings?section=maintenance'),
            ),
          ],
        ),
        ?bottomOnboardingTile,
      ],
    );
  }
}

class _OnboardingSettingsTile extends StatefulWidget {
  const _OnboardingSettingsTile({
    super.key,
    required this.onResume,
    required this.readiness,
    required this.highlightResume,
    this.onDismiss,
  });

  final VoidCallback onResume;
  final OnboardingReadiness readiness;
  final bool highlightResume;
  final VoidCallback? onDismiss;

  @override
  State<_OnboardingSettingsTile> createState() =>
      _OnboardingSettingsTileState();
}

class _SettingsHubTile extends StatelessWidget {
  const _SettingsHubTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: AppLayoutMetrics.settingsFeatureCardWidth,
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadii.lg),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.x3),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: Theme.of(context).colorScheme.primary),
                AppGaps.horizontalX2,
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
                        subtitle,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OnboardingSettingsTileState extends State<_OnboardingSettingsTile>
    with SingleTickerProviderStateMixin {
  late final AnimationController _glowController;

  @override
  void initState() {
    super.initState();
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    );
    if (widget.highlightResume) {
      _startGlow();
    }
  }

  @override
  void didUpdateWidget(covariant _OnboardingSettingsTile oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.highlightResume && !oldWidget.highlightResume) {
      _startGlow();
    } else if (!widget.highlightResume && oldWidget.highlightResume) {
      _glowController.stop();
      _glowController.value = 0;
    }
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  void _startGlow() {
    _glowController
      ..stop()
      ..value = 0
      ..repeat(reverse: true, count: 4);
  }

  @override
  Widget build(BuildContext context) {
    final pending = widget.readiness.steps
        .where((step) => step.requiresAction)
        .length;
    final fullyConfigured =
        widget.readiness.onboardingCompleted &&
        widget.readiness.steps.isNotEmpty &&
        widget.readiness.steps.every((step) => step.satisfied);
    final actionLabel = fullyConfigured
        ? 'Revisiter'
        : widget.readiness.shouldShowOnboarding
        ? 'Reprendre'
        : widget.readiness.onboardingCompleted
        ? 'Voir le récapitulatif'
        : 'Reprendre';

    final subtitle = !widget.readiness.platformSupported
        ? 'Non requis sur ${PlatformCapabilities.currentPlatformLabel}: ${PlatformCapabilities.overlayUnavailableReason}'
        : fullyConfigured
        ? 'Tout est configuré'
        : widget.readiness.shouldShowOnboarding
        ? '$pending accès encore disponible${pending == 1 ? '' : 's'}'
        : 'Onboarding terminé';

    final tile = AppNotificationCard(
      icon: Icons.flag_outlined,
      title: 'Onboarding permissions',
      message: subtitle,
      onDismiss: widget.onDismiss,
      primaryAction: TextButton(
        onPressed: widget.onResume,
        child: Text(actionLabel),
      ),
      secondaryAction: widget.onDismiss == null
          ? null
          : TextButton(
              onPressed: widget.onDismiss,
              child: const Text('Plus tard'),
            ),
    );

    return AnimatedBuilder(
      animation: _glowController,
      child: tile,
      builder: (context, child) {
        final glow = widget.highlightResume ? _glowController.value : 0.0;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.lg),
            boxShadow: glow > 0
                ? [
                    BoxShadow(
                      color: Theme.of(
                        context,
                      ).colorScheme.primary.withValues(alpha: 0.38 * glow),
                      blurRadius: 10 + (18 * glow),
                      spreadRadius: 1 + (3 * glow),
                    ),
                  ]
                : null,
          ),
          child: child,
        );
      },
    );
  }
}
